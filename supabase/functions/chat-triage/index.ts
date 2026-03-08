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

const BASE_SYSTEM_PROMPT = `You are Almans Assistant — the friendly, helpful, and knowledgeable AI support assistant for Almans, a fashion e-commerce brand in Bangladesh.

Your name is "Almans Assistant". Always introduce yourself as such if asked.

Your job:
- Help customers with questions about Almans products, orders, shipping, returns, payments, and anything related to the shop.
- Give clear, warm, and helpful responses. Always be polite and professional.
- If a customer asks about their order and provides an order number, use any order context provided to answer accurately.

About Almans:
- Fashion brand based in Bangladesh selling clothing, accessories, and apparel.
- Shipping: Inside Dhaka (2-3 business days, 60 BDT), Outside Dhaka (3-7 business days, 130 BDT).
- Returns: Accepted within 7 days for unused/unworn items with original tags.
- Payment methods: bKash, Nagad, credit/debit card, Cash on Delivery (COD).
- Products include shirts, t-shirts, pants, trousers, caps, accessories, and more.

Rules:
1. ONLY answer questions related to Almans, its products, orders, shipping, returns, and payments.
2. If the customer asks about ANYTHING unrelated to Almans or shopping (e.g., weather, politics, sports, cooking, general knowledge), respond EXACTLY: "I'm sorry, I can only help with questions about Almans products, orders, and services. For other matters, I'd suggest speaking with one of our human agents who may be able to assist further. Type 'human' to connect with an agent."
3. If the customer explicitly says "human", "talk to agent", "speak to agent", or similar — respond ONLY with: [HANDOVER_REQUIRED] User requested human agent
4. If the customer seems very frustrated or angry and you cannot resolve their issue — respond ONLY with: [HANDOVER_REQUIRED] Customer needs human assistance
5. Keep replies concise and friendly — 2-4 sentences maximum for routine queries.
6. Ask at most one clarifying question per message.
7. Never ask for passwords, full card numbers, or sensitive personal information.
8. Always suggest talking to a human agent for complex unresolved issues after 2-3 tries.
9. When discussing products, mention name, price, available sizes/colors, and stock status if available.

Response format: Either a helpful customer reply OR exactly: [HANDOVER_REQUIRED] <brief reason>`;

const GREETING_TEXT = `Hi! Welcome to Almans 👋 I'm Almans Assistant, your AI support. I can help you with orders, products, shipping, returns, and more. What can I help you with today?\n\n(Type "human" anytime to talk to a real agent.)`;

async function saveMessage(supabaseUrl: string, serviceRoleKey: string, conversationId: string, message: string) {
  const resp = await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ conversation_id: conversationId, sender_type: 'bot', sender_id: null, message })
  });
  return resp.ok;
}

async function updateConversation(supabaseUrl: string, serviceRoleKey: string, conversationId: string, patch: Record<string, unknown>) {
  await fetch(`${supabaseUrl}/rest/v1/chat_conversations?id=eq.${conversationId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() })
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  try {
    const body = await req.json();
    const { conversation_id, message, type, user_id, user_name, user_email, guest_session_id } = body;

    // ── TYPE: start ── Create conversation + send greeting server-side
    // Works for both authenticated users (user_id provided) and guests (guest_session_id provided)
    if (type === 'start') {
      const isGuest = !user_id && !!guest_session_id;

      if (!user_id && !guest_session_id) {
        return new Response(JSON.stringify({ error: 'missing_user_id_or_guest_session_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Close any existing open conversation for this user/guest
      if (user_id) {
        await fetch(
          `${supabaseUrl}/rest/v1/chat_conversations?customer_id=eq.${user_id}&status=eq.open`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ status: 'closed', updated_at: new Date().toISOString() })
          }
        );
      } else if (guest_session_id) {
        // Close previous guest conversations with same session
        await fetch(
          `${supabaseUrl}/rest/v1/chat_conversations?guest_session_id=eq.${encodeURIComponent(guest_session_id)}&status=eq.open`,
          {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${serviceRoleKey}`,
              'apikey': serviceRoleKey,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ status: 'closed', updated_at: new Date().toISOString() })
          }
        );
      }

      // Create new conversation server-side (bypasses RLS)
      const conversationPayload: Record<string, unknown> = {
        customer_name: isGuest ? (user_name || 'Guest') : (user_name || 'Customer'),
        customer_email: user_email || null,
        status: 'open',
        handled_by: 'bot',
        bot_turn_count: 0,
      };

      if (user_id) conversationPayload.customer_id = user_id;
      if (guest_session_id) conversationPayload.guest_session_id = guest_session_id;

      const createResp = await fetch(`${supabaseUrl}/rest/v1/chat_conversations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(conversationPayload)
      });

      if (!createResp.ok) {
        const err = await createResp.text();
        console.error('Failed to create conversation:', err);
        return new Response(JSON.stringify({ error: 'failed_to_create_conversation' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const [conv] = await createResp.json();
      const newConvId = conv.id;

      // Save greeting server-side
      await saveMessage(supabaseUrl, serviceRoleKey, newConvId, GREETING_TEXT);

      return new Response(JSON.stringify({ conversation_id: newConvId, reply: GREETING_TEXT, saved: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── TYPE: greet ── Send greeting to existing conversation (legacy)
    if (type === 'greet') {
      if (!conversation_id) {
        return new Response(JSON.stringify({ error: 'missing_conversation_id' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      await saveMessage(supabaseUrl, serviceRoleKey, conversation_id, GREETING_TEXT);
      return new Response(JSON.stringify({ saved: true, reply: GREETING_TEXT }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ── TYPE: guest_message (legacy) OR type: 'message' ── Save customer message + trigger AI
    // Handles both authenticated users and guests — service role bypasses RLS for customer message save
    if (type === 'guest_message' || type === 'message') {
      if (!conversation_id || !message) {
        return new Response(JSON.stringify({ error: 'missing_fields' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // For guest: validate the conversation belongs to this session
      if (guest_session_id) {
        const convResp = await fetch(
          `${supabaseUrl}/rest/v1/chat_conversations?id=eq.${conversation_id}&guest_session_id=eq.${encodeURIComponent(guest_session_id)}&select=id,handled_by`,
          { headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey } }
        );
        if (convResp.ok) {
          const convData = await convResp.json();
          if (!convData || convData.length === 0) {
            return new Response(JSON.stringify({ error: 'unauthorized' }), {
              status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
      }

      // For authenticated: validate the conversation belongs to this user
      if (user_id) {
        const convResp = await fetch(
          `${supabaseUrl}/rest/v1/chat_conversations?id=eq.${conversation_id}&customer_id=eq.${user_id}&select=id,handled_by`,
          { headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey } }
        );
        if (convResp.ok) {
          const convData = await convResp.json();
          if (!convData || convData.length === 0) {
            return new Response(JSON.stringify({ error: 'unauthorized' }), {
              status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }
      }

      // Save customer message server-side (service role bypasses RLS)
      const senderPayload: Record<string, unknown> = {
        conversation_id,
        sender_type: 'customer',
        sender_id: user_id || null,
        message
      };
      const msgResp = await fetch(`${supabaseUrl}/rest/v1/chat_messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'apikey': serviceRoleKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify(senderPayload)
      });

      if (!msgResp.ok) {
        const errText = await msgResp.text();
        console.error('Failed to save customer message:', errText);
        return new Response(JSON.stringify({ error: 'failed_to_save_message' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // For legacy guest_message type, just return saved (no AI trigger)
      if (type === 'guest_message') {
        const [savedMsg] = await msgResp.json();
        return new Response(JSON.stringify({ saved: true, message: savedMsg }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // For type: 'message' — fall through to AI processing below
      // (conversation_id and message are already set)
    }

    if (!conversation_id) {
      return new Response(JSON.stringify({ error: 'missing_conversation_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!message) {
      return new Response(JSON.stringify({ error: 'missing_message' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for immediate handover triggers before calling AI
    const lowerMsg = message.toLowerCase();
    const hasHandoverKeyword = HANDOVER_KEYWORDS.some(kw => lowerMsg.includes(kw));
    const hasAngryLanguage = ANGRY_PATTERNS.test(message);

    if (hasHandoverKeyword || hasAngryLanguage) {
      const reason = hasHandoverKeyword ? 'user_requested_human' : 'angry_language';
      const transferMsg = "I'm connecting you with a human agent now. They'll review your chat and reply shortly. Thank you for your patience!";
      await saveMessage(supabaseUrl, serviceRoleKey, conversation_id, transferMsg);
      await updateConversation(supabaseUrl, serviceRoleKey, conversation_id, { handled_by: 'agent', escalation_reason: reason });
      return new Response(JSON.stringify({ handover: true, escalation_reason: reason, saved: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch full conversation history from DB for context
    const histResp = await fetch(
      `${supabaseUrl}/rest/v1/chat_messages?conversation_id=eq.${conversation_id}&order=created_at.asc&limit=20`,
      { headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey } }
    );

    let conversationHistory: Array<{ role: string; content: string }> = [];
    if (histResp.ok) {
      const msgs = await histResp.json();
      conversationHistory = msgs.map((m: { sender_type: string; message: string }) => ({
        role: m.sender_type === 'customer' ? 'user' : 'assistant',
        content: m.message,
      }));
    }

    // Try to detect order ID and fetch order context
    let orderContext = null;
    const orderMatch = message.match(ORDER_REGEX);
    if (orderMatch) {
      const orderNum = orderMatch[1];
      const resp = await fetch(
        `${supabaseUrl}/rest/v1/orders?order_number=ilike.${encodeURIComponent(orderNum)}&select=id,order_number,status,total,tracking_number,created_at,order_items(product_name,quantity,price)&limit=1`,
        { headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey } }
      );
      if (resp.ok) {
        const orders = await resp.json();
        if (orders?.length > 0) {
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

    // Fetch active products for knowledge base
    let productKnowledge = '';
    try {
      const prodResp = await fetch(
        `${supabaseUrl}/rest/v1/products?is_active=eq.true&select=name,price,sale_price,short_description,sizes,colors,stock&limit=60&order=is_featured.desc`,
        { headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey } }
      );
      if (prodResp.ok) {
        const products = await prodResp.json();
        if (products?.length > 0) {
          const productLines = products.map((p: {
            name: string; price: number; sale_price?: number;
            short_description?: string; sizes?: string[]; colors?: string[]; stock: number;
          }) => {
            const priceStr = p.sale_price ? `৳${p.sale_price} (sale, was ৳${p.price})` : `৳${p.price}`;
            const sizesStr = p.sizes?.length ? `Sizes: ${p.sizes.join(', ')}` : '';
            const colorsStr = p.colors?.length ? `Colors: ${p.colors.join(', ')}` : '';
            const stockStr = p.stock <= 0 ? 'Out of stock' : p.stock <= 5 ? `Low stock (${p.stock} left)` : 'In stock';
            const details = [priceStr, sizesStr, colorsStr, stockStr].filter(Boolean).join(' | ');
            return `- ${p.name}: ${details}${p.short_description ? `. ${p.short_description}` : ''}`;
          });
          productKnowledge = `\n\nCurrent Almans Product Catalog:\n${productLines.join('\n')}`;
        }
      }
    } catch (e) {
      console.error('Failed to fetch products:', e);
    }

    const systemPrompt = BASE_SYSTEM_PROMPT + productKnowledge;
    const userContent = orderContext
      ? `${message}\n\n[Order found in system: ${JSON.stringify(orderContext)}]`
      : message;

    // Call Lovable AI Gateway
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'ai_not_configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${lovableApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: userContent },
        ],
        max_tokens: 500,
        temperature: 0.6,
      })
    });

    if (!aiResp.ok) {
      const err = await aiResp.text();
      console.error('AI Gateway error:', aiResp.status, err);
      const errorReply = aiResp.status === 429
        ? "I'm a bit busy right now, please try again in a moment!"
        : "Sorry, I'm having trouble right now. Please try again or type 'human' to speak with an agent.";
      await saveMessage(supabaseUrl, serviceRoleKey, conversation_id, errorReply);
      return new Response(JSON.stringify({ error: 'ai_error', reply: errorReply, saved: true }), {
        status: aiResp.status === 429 ? 429 : 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResp.json();
    const reply: string = aiData.choices?.[0]?.message?.content?.trim() || '';

    if (!reply) {
      const fallback = "Sorry, I couldn't generate a response. Please try again or type 'human' to speak with an agent.";
      await saveMessage(supabaseUrl, serviceRoleKey, conversation_id, fallback);
      return new Response(JSON.stringify({ reply: fallback, handover: false, saved: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const isHandover = reply.includes('[HANDOVER_REQUIRED]');

    if (isHandover) {
      const escalationSummary = reply.replace('[HANDOVER_REQUIRED]', '').trim();
      const transferMsg = "I'm connecting you with a human agent now. They'll review your chat and reply shortly. Thank you for your patience!";
      await saveMessage(supabaseUrl, serviceRoleKey, conversation_id, transferMsg);
      await updateConversation(supabaseUrl, serviceRoleKey, conversation_id, { handled_by: 'agent', escalation_reason: escalationSummary });
      return new Response(JSON.stringify({ handover: true, escalation_reason: escalationSummary, saved: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Save bot reply server-side
    await saveMessage(supabaseUrl, serviceRoleKey, conversation_id, reply);

    // Increment bot_turn_count
    const convResp = await fetch(
      `${supabaseUrl}/rest/v1/chat_conversations?id=eq.${conversation_id}&select=bot_turn_count`,
      { headers: { 'Authorization': `Bearer ${serviceRoleKey}`, 'apikey': serviceRoleKey } }
    );
    let newCount = 1;
    if (convResp.ok) {
      const convData = await convResp.json();
      newCount = (convData[0]?.bot_turn_count || 0) + 1;
    }
    const shouldHandover = newCount >= 10;
    await updateConversation(supabaseUrl, serviceRoleKey, conversation_id, {
      bot_turn_count: newCount,
      ...(shouldHandover ? { handled_by: 'agent', escalation_reason: 'bot_limit_reached' } : {})
    });

    return new Response(JSON.stringify({
      reply, handover: shouldHandover,
      escalation_reason: shouldHandover ? 'bot_limit_reached' : null,
      order: orderContext, saved: true,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error('chat-triage error:', err);
    return new Response(JSON.stringify({
      error: 'server_error',
      reply: "Something went wrong. Please try again or type 'human' to speak with an agent."
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
