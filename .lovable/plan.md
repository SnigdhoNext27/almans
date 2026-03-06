
## Root Cause Analysis

**Critical Bug — Bot replies silently blocked by RLS:**

The `addBotMessage` function in `LiveChatWidget.tsx` inserts messages with `sender_type: 'admin'` from the **customer's browser** (with customer JWT). The RLS policy for `chat_messages` INSERT for `admin` type requires `has_admin_access(auth.uid())` — which the customer does NOT have. So every bot reply silently fails and nothing is saved.

This is confirmed by the database:
- Conversations with `bot_turn_count: 0` and `bot_msgs: 0` despite `customer_msgs > 0` — edge function ran, returned a reply, but the client-side insert was blocked by RLS.
- Only the one conversation that actually worked (`6d4d8e50`) has bot replies.

**Additional Issues:**
1. The greeting message also fails for same reason (new conversations have `bot_msgs: 0`)
2. Product knowledge not in the AI system prompt
3. No unread badge on admin sidebar

## Fix Plan

### 1. Move bot message saving into the edge function (core fix)

The `chat-triage` edge function runs with `SUPABASE_SERVICE_ROLE_KEY` — it bypasses RLS. Instead of returning the reply to the client and having the client save it, **the edge function should save the bot message directly to `chat_messages`** and return confirmation.

Changes to `supabase/functions/chat-triage/index.ts`:
- After generating the AI reply, insert the bot message into `chat_messages` using the service role key
- For handover, update `chat_conversations.handled_by = 'agent'` and insert the transfer message
- Also handle the greeting: add a `type: 'start'` parameter so the edge function can save the greeting on conversation start
- Return `{ saved: true, reply: ..., handover: ... }` — client just reads, doesn't save

Changes to `LiveChatWidget.tsx`:
- Remove `addBotMessage()` calls after `sendMessage`
- Remove bot-reply insert from `startChat` greeting — instead call edge function with `{ type: 'greet', conversation_id }`
- The realtime subscription already picks up new messages, so UI auto-updates

### 2. Add product knowledge to edge function

Fetch active products from DB inside `chat-triage` and inject into the system prompt:
```
const products = await fetch(`${supabaseUrl}/rest/v1/products?is_active=eq.true&select=name,price,sale_price,description,sizes,stock,category:categories(name)&limit=50`)
```
Then build a compact product list string and append to `TRIAGE_SYSTEM_PROMPT`.

### 3. Add unread badge to admin sidebar

In `AdminLayout.tsx`:
- Add a `useEffect` that subscribes to `chat_conversations` table changes
- Count conversations where `status = 'open'` AND `handled_by = 'agent'` (need human attention)
- Show a red badge count on the "Live Chats" nav item

### 4. Also fix: Allow unauthenticated/guest users to insert bot messages

Add an RLS policy allowing insert with `sender_type = 'bot'` (or keep inserting via edge function which bypasses RLS — preferred, cleaner).

## Files to Change

1. **`supabase/functions/chat-triage/index.ts`** — save bot reply + handle greeting + add products to prompt
2. **`src/components/chat/LiveChatWidget.tsx`** — remove client-side bot message saving, call triage for greeting
3. **`src/pages/admin/AdminLayout.tsx`** — add unread chat badge with live count

## Technical Detail

The `addBotMessage` function in `LiveChatWidget.tsx` (line 94-101) uses `sender_type: 'admin'` + `sender_id: null` from the customer's session. The RLS policy `Admins can send messages` checks `has_admin_access(auth.uid())` which is false for customers. This needs to move server-side.

The greeting (`startChat` → `addBotMessage`) has the same problem — greeting never gets saved for most users, explaining the screenshot showing only customer "Hi" messages with no bot replies.
