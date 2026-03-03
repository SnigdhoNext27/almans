import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { conversation_id, messages } = await req.json();

    if (!conversation_id || !messages?.length) {
      return new Response(JSON.stringify({ error: 'missing_params' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ error: 'ai_not_configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const transcript = messages.map((m: { sender_type: string; message: string }) =>
      `[${m.sender_type.toUpperCase()}]: ${m.message}`
    ).join('\n');

    const systemPrompt = `You are an expert customer support agent assistant for Almans, a fashion e-commerce brand in Bangladesh.
Given a chat transcript between a customer and support, produce a JSON object with exactly these keys:
{
  "summary": "<one concise sentence summarising the customer's core issue>",
  "reply_drafts": ["<draft 1: direct and empathetic reply>", "<draft 2: alternative shorter reply>"],
  "action_checklist": ["<step 1>", "<step 2>", "<step 3>"]
}
Rules:
- summary: max 20 words
- reply_drafts: 2 options, each under 50 words
- action_checklist: exactly 3 practical next-step items for the agent
- Reply in plain text inside the draft strings (no markdown)
- Output ONLY valid JSON, no extra text`;

    const aiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: `Transcript:\n${transcript}` }] }],
          generationConfig: { maxOutputTokens: 500, responseMimeType: 'application/json' },
        })
      }
    );

    if (!aiResp.ok) {
      const err = await aiResp.text();
      console.error('AI API error:', err);
      return new Response(JSON.stringify({ error: 'ai_error' }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const aiData = await aiResp.json();
    const rawText = aiData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    let parsed: { summary: string; reply_drafts: string[]; action_checklist: string[] };
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = { summary: 'Unable to generate summary.', reply_drafts: [], action_checklist: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('agent-copilot error:', err);
    return new Response(JSON.stringify({ error: 'server_error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
