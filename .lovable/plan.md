
## Fix: Chat button above WhatsApp button on all screen sizes

Current values:
- Chat: `bottom-[6.5rem]` mobile / `md:bottom-24` desktop → lower on screen
- WhatsApp: `bottom-[9.5rem]` mobile / `md:bottom-6` desktop → higher on mobile, LOWER on desktop

The bug: on desktop `md:bottom-6` (24px) puts WhatsApp BELOW chat (`md:bottom-24` = 96px). Need WhatsApp ABOVE chat on both.

Fix — chat lower, WhatsApp higher:

**`src/components/chat/LiveChatWidget.tsx`** trigger button:
- `bottom-20` mobile (80px), `md:bottom-24` desktop (96px) — sits just above bottom nav

**`src/components/WhatsAppButton.tsx`**:
- `bottom-[8rem]` mobile (128px), `md:bottom-36` desktop (144px) — sits above chat button

This ensures WhatsApp > Chat in `bottom` value on ALL screen sizes = WhatsApp is visually higher.
