

## Plan: Avatar Banner, OAuth Testing, and Visual Enhancement

### 1. Avatar Upload Banner for Email Users
Add a visually appealing banner inside the profile tab that appears when the user has no avatar uploaded. The banner will:
- Show a friendly message encouraging the user to upload a profile picture
- Include an illustration/icon and a call-to-action button that triggers the file picker
- Automatically hide once the user uploads a photo
- Be fully responsive across mobile, tablet, and desktop

**File: `src/pages/Account.tsx`**
- Add a conditional banner above the profile form (inside the profile tab) that checks `!profile?.avatar_url`
- The banner will use a warm gradient background with a Camera icon, heading text, and a button linking to the AvatarUpload file picker

**File: `src/components/account/AvatarUpload.tsx`**
- Expose a ref or add a prop so the banner can trigger the file input click externally
- Add a subtle animation (pulse on the camera icon) when no avatar is set to draw attention

### 2. Test OAuth Avatar Sync
The OAuth avatar sync is already implemented in `src/lib/auth.tsx` (syncOAuthAvatar) and the database trigger (`handle_new_user`). To verify:
- Sign in with Google on the preview
- Check that the avatar appears in the Account sidebar and profile section
- This is a manual verification step -- no code changes needed

### 3. Visual Enhancements -- Eye-Catching and Responsive

**File: `src/components/Hero.tsx`**
- Add a subtle animated gradient shimmer overlay that sweeps across the hero periodically, creating a more dynamic first impression
- Add a floating particle/sparkle effect near the CTA button area using framer-motion

**File: `src/components/CollectionSection.tsx`**
- Add a subtle hover glow effect on collection cards (a warm golden border glow on hover)
- Improve the gradient overlay to be more dramatic and cinematic

**File: `src/components/ProductCard.tsx`**
- Add a subtle warm shadow glow on hover for desktop users
- Improve the badge styling with a slight animation (gentle pulse for "sale" badge)

**File: `src/components/ShopCategoriesGrid.tsx`**
- Add a subtle entrance stagger animation for category cards
- Enhance the decorative background blobs with gentle movement animation

**File: `src/index.css`**
- Add new utility classes for golden glow shadows and cinematic card hover effects
- Add a subtle gradient animation keyframe for hero shimmer effect

### 4. Responsive Improvements

All changes will use Tailwind responsive prefixes (sm:, md:, lg:) to ensure:
- The avatar banner stacks vertically on mobile, horizontal on desktop
- Hero text sizes scale properly across breakpoints (already mostly in place)
- Collection cards and category grid remain visually balanced on all screen sizes
- Touch targets remain accessible (min 44px) on mobile

### Technical Details

**Files to modify:**
1. `src/pages/Account.tsx` -- Add avatar upload banner with conditional rendering
2. `src/components/account/AvatarUpload.tsx` -- Add optional `showBanner` prop or expose ref
3. `src/components/Hero.tsx` -- Add shimmer overlay animation
4. `src/components/CollectionSection.tsx` -- Add hover glow on cards
5. `src/components/ProductCard.tsx` -- Add warm hover shadow
6. `src/components/ShopCategoriesGrid.tsx` -- Enhance entrance animations
7. `src/index.css` -- Add new utility classes for glow and shimmer effects

**No database changes needed** -- all existing schema and triggers are sufficient.

