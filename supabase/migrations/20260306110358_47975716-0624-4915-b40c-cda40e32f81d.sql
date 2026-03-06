-- Allow bot messages to be inserted (edge function uses service role which bypasses RLS)
CREATE POLICY "Bot messages can be inserted"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (sender_type = 'bot');