

## Implementation Plan: Avatar Banner + Visual Enhancements

### 1. Avatar Upload Banner for Email Users
**File: `src/pages/Account.tsx`**
- Add a warm gradient banner inside the profile tab, right above the profile form (between the "My Profile" heading and the form content)
- The banner checks `!profile?.avatar_url` and shows only when no avatar is set
- Includes a Camera icon, friendly message ("Complete your profile by adding a photo"), and a "Upload Photo" button
- Fully responsive: stacks vertically on mobile, horizontal on tablet/desktop
- Uses `rounded-xl` with a warm `bg-gradient-to-r from-primary/10 via-almans-gold/5 to-accent` background
- Dismissible with a subtle close button (but reappears on next visit if still no avatar)

### 2. Hero Section -- Shimmer and Floating Particles
**File: `src/components/Hero.tsx`**
- Add a subtle animated shimmer overlay across the hero that sweeps horizontally every few seconds using framer-motion
- Add 3-4 small floating particle dots (using framer-motion) near the CTA area that gently drift up and fade, creating a premium feel
- Only render particles when `!shouldReduceAnimations` for performance

### 3. Collection Cards -- Hover Glow
**File: `src/components/CollectionSection.tsx`**
- Add a warm golden border-glow on hover for each collection card using a CSS class
- Make the gradient overlay slightly more dramatic (deeper `from-almans-chocolate/85`)
- Add a subtle scale transition on the card container itself (not just the image)

### 4. Product Cards -- Warm Shadow and Badge Pulse
**File: `src/components/ProductCard.tsx`**
- Add a warm golden shadow glow on hover for desktop (`hover:shadow-[0_8px_30px_-8px_hsl(38_50%_52%/0.3)]`)
- Add a gentle CSS pulse animation on the "sale" badge to draw attention
- These effects are skipped when `shouldReduceAnimations` is true

### 5. Category Grid -- Enhanced Entrance and Background
**File: `src/components/ShopCategoriesGrid.tsx`**
- Add subtle slow-moving animation to the decorative background blobs using framer-motion
- Add staggered entrance animation to category cards (already partially there via `index` prop)

### 6. New CSS Utility Classes
**File: `src/index.css`**
- Add `.glow-gold` class for the golden hover glow shadow
- Add `.card-hover-glow` class combining scale + glow for collection/product cards
- Add `@keyframes gentlePulse` for the sale badge animation
- Add `.badge-pulse` utility class

### Technical Details

**Files to modify (7 files):**
1. `src/pages/Account.tsx` -- Avatar upload banner (add ~25 lines after line 474)
2. `src/components/Hero.tsx` -- Shimmer overlay + floating particles (~20 lines)
3. `src/components/CollectionSection.tsx` -- Hover glow class on cards, deeper gradient
4. `src/components/ProductCard.tsx` -- Warm hover shadow, sale badge pulse
5. `src/components/ShopCategoriesGrid.tsx` -- Animated background blobs
6. `src/index.css` -- New utility classes (glow-gold, card-hover-glow, badge-pulse)
7. `src/components/account/AvatarUpload.tsx` -- Add subtle pulse animation on camera icon when no avatar is set

**No database changes needed.** All existing schema and OAuth triggers are sufficient.

**Responsive approach:**
- All new visual effects use Tailwind responsive prefixes
- Hover effects only apply on `hover:` (no effect on touch devices)
- Animations are disabled when `shouldReduceAnimations` is true
- Touch targets remain at minimum 44px on mobile
- The avatar banner uses `flex-col sm:flex-row` for proper stacking

