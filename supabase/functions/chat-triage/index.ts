import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Handover keywords that trigger immediate escalation
const HANDOVER_KEYWORDS = [
  'human', 'talk to human', 'speak to agent', 'talk to agent', 'manager',
  'refund refused', 'chargeback', 'fraud', 'payment dispute',
  'lawyer', 'legal', 'sue', 'emergency', 'urgent help',
];

const ANGRY_PATTERNS = /\b(wtf|damn|hell|stupid|idiot|useless|terrible|awful|horrible|worst)\b/i;
const ORDER_REGEX = /(?:order|#)\s?([A-Za-z0-9\-]{4,})/i;

const TRIAGE_SYSTEM_PROMPT = `You are Almans Assistant — friendly, concise, and authoritative for Almans, a fashion e-commerce brand in Bangladesh.
Primary objective: Resolve routine ecommerce queries: order status, tracking, returns, refunds policy, shipping windows, product info/sizing, payment methods, simple product recommendations.

Hard rules:
1. Keep routine replies ≤ 3 short sentences; prefer simple direct language.
2. Ask at most one clarifying question when needed (e.g., "Can I have your order number?").
3. Use ISO dates (YYYY-MM-DD).
4. NEVER request full credit card numbers, passports, or passwords.
5. Minimize PII: include only safe order fields in replies (order id, status, expected_delivery, carrier, item names).
6. If the user explicitly asks for a human or any handover rule applies, respond exactly: [HANDOVER_REQUIRED] <one-line summary>
7. If you cannot confidently resolve the issue in two messages, respond with the same token.

About Almans: Fashion brand from Bangladesh. Ships within Dhaka (2-3 days, 60 BDT) and outside Dhaka (3-7 days, 130 BDT). Returns accepted within 7 days for unused items. Payment: bKash, Nagad, card, COD.

Return: either a short customer-facing reply OR the exact token "[HANDOVER_REQUIRED] <summary>".`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, message, transcript = [] } = await req.json();

    if (!conversation_id || !message) {
      return new Response(JSON.stringify({ error: 'missing_params' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for immediate handover triggers (client-side guard too)
    const lowerMsg = message.toLowerCase();
    const hasHandoverKeyword = HANDOVER_KEYWORDS.some(kw => lowerMsg.includes(kw));
    const hasAngryLanguage = ANGRY_PATTERNS.test(message);

    if (hasHandoverKeyword || hasAngryLanguage) {
      const reason = hasHandoverKeyword ? 'user_requested_human' : 'angry_language';
      return new Response(JSON.stringify({
        reply: `[HANDOVER_REQUIRED] ${reason === 'user_requested_human' ? 'User requested human agent' : 'Angry language detected'}`,
        handover: true,
        escalation_reason: reason,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Try to detect order ID and fetch order from DB
    const orderMatch = message.match(ORDER_REGEX);
    let orderContext = null;

    if (orderMatch) {
      const orderNum = orderMatch[1];
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

      const resp = await fetch(`${supabaseUrl}/rest/v1/orders?order_number=ilike.${encodeURIComponent(orderNum)}&select=id,order_number,status,total,tracking_number,created_at,order_items(product_name,quantity,price)&limit=1`, {
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
        }
      });

      if (resp.ok) {
        const orders = await resp.json();
        if (orders && orders.length > 0) {
          const o = orders[0];
          orderContext = {
            id: o.order_number,
            status: o.status,
            total: o.total,
            tracking_number: o.tracking_number || null,
            items: (o.order_items || []).map((it: { product_name: string; quantity: number }) => ({
              name: it.product_name, qty: it.quantity
            }))
          };
        }
      }
    }

    // Build messages for Gemini AI
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'ai_not_configured', message: 'GEMINI_API_KEY secret not set' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const historyContents = transcript.slice(-10).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' || m.role === 'customer' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const userContent = orderContext
      ? `User message: ${message}\n\nOrder context found:\n${JSON.stringify(orderContext, null, 2)}`
      : message;

    const aiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: TRIAGE_SYSTEM_PROMPT }] },
          contents: [
            ...historyContents,
            { role: 'user', parts: [{ text: userContent }] },
          ],
          generationConfig: { maxOutputTokens: 300 },
        })
      }
    );

    if (!aiResp.ok) {
      const err = await aiResp.text();
      console.error('AI API error:', err);
      return new Response(JSON.stringify({ error: 'ai_error', details: err }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResp.json();
    const reply: string = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const isHandover = reply.includes('[HANDOVER_REQUIRED]');
    const escalationSummary = isHandover
      ? reply.replace('[HANDOVER_REQUIRED]', '').trim()
      : null;

    return new Response(JSON.stringify({
      reply: isHandover
        ? "I'm transferring you to a human specialist now — they'll review this chat and reply here shortly."
        : reply,
      handover: isHandover,
      escalation_reason: escalationSummary,
      order: orderContext,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('chat-triage error:', err);
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
