import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HANDOVER_KEYWORDS = [
  'human', 'talk to human', 'speak to agent', 'talk to agent', 'manager',
  'refund refused', 'chargeback', 'fraud', 'payment dispute',
  'lawyer', 'legal', 'sue', 'emergency',
];

const ANGRY_PATTERNS = /\b(wtf|damn|stupid|idiot|useless|terrible|horrible|worst)\b/i;
const ORDER_REGEX = /(?:order|#)\s?([A-Za-z0-9\-]{4,})/i;

const TRIAGE_SYSTEM_PROMPT = `You are Almans Assistant — the friendly, helpful, and knowledgeable AI support assistant for Almans, a fashion e-commerce brand in Bangladesh.

Your job:
- Help customers with questions about Almans products, orders, shipping, returns, payments, and anything related to the shop.
- Give clear, warm, and helpful responses. Always be polite and professional.
- If a customer asks about their order and provides an order number, use any order context provided to answer accurately.

About Almans:
- Fashion brand based in Bangladesh selling clothing, accessories, and apparel.
- Shipping: Inside Dhaka (2-3 days, 60 BDT), Outside Dhaka (3-7 days, 130 BDT).
- Returns: Accepted within 7 days for unused/unworn items with original tags.
- Payment methods: bKash, Nagad, credit/debit card, Cash on Delivery (COD).
- Products include shirts, t-shirts, pants, trousers, caps, accessories, and more.

Rules:
1. Only answer questions related to Almans, its products, orders, shipping, returns, and payments.
2. If the customer asks about something completely unrelated to Almans or shopping (e.g., weather, politics, other topics), politely say: "I'm only able to help with questions about Almans and our products. For other matters, I'd suggest speaking with one of our human agents who may be able to assist further. Type 'human' to connect with an agent."
3. If the customer explicitly says "human", "talk to agent", "speak to agent", or similar — respond ONLY with: [HANDOVER_REQUIRED] User requested human agent
4. If the customer seems very frustrated or angry and you cannot resolve their issue — respond ONLY with: [HANDOVER_REQUIRED] Customer needs human assistance
5. Keep replies concise and friendly — 2-4 sentences maximum for routine queries.
6. Ask at most one clarifying question per message (e.g., "Could you share your order number?").
7. Never ask for passwords, full card numbers, or sensitive personal information.
8. Always suggest talking to a human agent for complex unresolved issues after 2-3 tries.

Response format: Either a helpful customer reply OR exactly: [HANDOVER_REQUIRED] <brief reason>`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, message } = await req.json();

    if (!conversation_id || !message) {
      return new Response(JSON.stringify({ error: 'missing_params' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for immediate handover triggers
    const lowerMsg = message.toLowerCase();
    const hasHandoverKeyword = HANDOVER_KEYWORDS.some(kw => lowerMsg.includes(kw));
    const hasAngryLanguage = ANGRY_PATTERNS.test(message);

    if (hasHandoverKeyword || hasAngryLanguage) {
      const reason = hasHandoverKeyword ? 'user_requested_human' : 'angry_language';
      return new Response(JSON.stringify({
        handover: true,
        escalation_reason: reason,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Fetch full conversation history from DB (reliable, not stale client state)
    const histResp = await fetch(
      `${supabaseUrl}/rest/v1/chat_messages?conversation_id=eq.${conversation_id}&order=created_at.asc&limit=20`,
      {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
        }
      }
    );

    let conversationHistory: Array<{ role: string; content: string }> = [];
    if (histResp.ok) {
      const msgs = await histResp.json();
      // Map to OpenAI format — exclude the very last message (current one not saved yet)
      conversationHistory = msgs.map((m: { sender_type: string; message: string }) => ({
        role: m.sender_type === 'customer' ? 'user' : 'assistant',
        content: m.message,
      }));
    }

    // Try to detect order ID and fetch order context
    const orderMatch = message.match(ORDER_REGEX);
    let orderContext = null;

    if (orderMatch) {
      const orderNum = orderMatch[1];
      const resp = await fetch(
        `${supabaseUrl}/rest/v1/orders?order_number=ilike.${encodeURIComponent(orderNum)}&select=id,order_number,status,total,tracking_number,created_at,order_items(product_name,quantity,price)&limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${serviceRoleKey}`,
            'apikey': serviceRoleKey,
          }
        }
      );

      if (resp.ok) {
        const orders = await resp.json();
        if (orders && orders.length > 0) {
          const o = orders[0];
          orderContext = {
            order_number: o.order_number,
            status: o.status,
            total: o.total,
            tracking_number: o.tracking_number || 'Not assigned yet',
            items: (o.order_items || []).map((it: { product_name: string; quantity: number; price: number }) => ({
              name: it.product_name, qty: it.quantity, price: it.price
            }))
          };
        }
      }
    }

    // Build user message with optional order context
    const userContent = orderContext
      ? `${message}\n\n[Order found in system: ${JSON.stringify(orderContext)}]`
      : message;

    // Call Lovable AI Gateway (reliable, no API key management needed)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'ai_not_configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: TRIAGE_SYSTEM_PROMPT },
          ...conversationHistory,
          { role: 'user', content: userContent },
        ],
        max_tokens: 400,
        temperature: 0.7,
      })
    });

    if (!aiResp.ok) {
      const err = await aiResp.text();
      console.error('AI Gateway error:', aiResp.status, err);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: 'rate_limited', reply: "I'm a bit busy right now, please try again in a moment!" }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ error: 'ai_error', reply: "Sorry, I'm having trouble right now. Please try again or type 'human' to speak with an agent." }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResp.json();
    const reply: string = aiData.choices?.[0]?.message?.content?.trim() || '';

    if (!reply) {
      return new Response(JSON.stringify({
        reply: "Sorry, I couldn't generate a response. Please try again or type 'human' to speak with an agent.",
        handover: false,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const isHandover = reply.includes('[HANDOVER_REQUIRED]');
    const escalationSummary = isHandover
      ? reply.replace('[HANDOVER_REQUIRED]', '').trim()
      : null;

    return new Response(JSON.stringify({
      reply: isHandover ? null : reply,
      handover: isHandover,
      escalation_reason: escalationSummary,
      order: orderContext,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('chat-triage error:', err);
    return new Response(JSON.stringify({
      error: 'server_error',
      reply: "Something went wrong. Please try again or type 'human' to speak with an agent."
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
