
-- Add guest_session_id column to chat_conversations for anonymous users
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS guest_session_id TEXT DEFAULT NULL;

-- Create index for fast guest session lookups
CREATE INDEX IF NOT EXISTS idx_chat_conversations_guest_session_id
  ON public.chat_conversations(guest_session_id)
  WHERE guest_session_id IS NOT NULL;

-- Update SELECT policy to allow guests to view their own conversation
DROP POLICY IF EXISTS "Customers can view their own conversations" ON public.chat_conversations;

CREATE POLICY "Customers can view their own conversations"
  ON public.chat_conversations
  FOR SELECT
  USING (
    customer_id = auth.uid()
    OR has_admin_access(auth.uid())
    OR (guest_session_id IS NOT NULL
        AND guest_session_id = current_setting('app.guest_session_id', true))
  );

-- Update chat_messages SELECT policy to allow guests
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.chat_messages;

CREATE POLICY "Users can view messages in their conversations"
  ON public.chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations c
      WHERE c.id = chat_messages.conversation_id
        AND (
          c.customer_id = auth.uid()
          OR has_admin_access(auth.uid())
          OR (c.guest_session_id IS NOT NULL
              AND c.guest_session_id = current_setting('app.guest_session_id', true))
        )
    )
  );

-- Allow guests to INSERT messages (sender_id will be null for guests)
-- The edge function inserts bot messages via service role which bypasses this
-- For customer messages from guests, we allow if sender_id is null (guest)
DROP POLICY IF EXISTS "Customers can send messages in own conversations" ON public.chat_messages;

CREATE POLICY "Customers can send messages in own conversations"
  ON public.chat_messages
  FOR INSERT
  WITH CHECK (
    sender_type = 'customer' AND (
      -- Authenticated user sending in their own conversation
      (sender_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = chat_messages.conversation_id
          AND c.customer_id = auth.uid()
      ))
      OR
      -- Guest user: no auth (anon role), validated by guest_session_id claim
      (auth.role() = 'anon' AND sender_id IS NULL AND EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = chat_messages.conversation_id
          AND c.guest_session_id IS NOT NULL
          AND c.guest_session_id = current_setting('app.guest_session_id', true)
      ))
    )
  );
