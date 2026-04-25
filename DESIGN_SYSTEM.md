# Design System · The VA Store v2

This document is the single source of truth for all visual decisions in
the **v2 storefront**. When adding new UI, look here first. When a token
is missing, add it here before using it anywhere else.

---

## Fonts

| Role | Family | Weight | Notes |
|---|---|---|---|
| Display / headings | Cormorant Garamond | 300 (Light) | Loaded via Google Fonts in root layout |
| Body / UI | Inter | 300 (Light), 400 (Regular), 500 (Medium) | Loaded via Google Fonts in root layout |

> **Consistency note:** Both families are loaded from Google Fonts with
> `display=swap` in the HTML `<head>`. For maximum cross-browser
> rendering consistency a future improvement is to migrate to
> `next/font/google`, which self-hosts the fonts and eliminates
> network-dependent FOUT.

---

## Colour Tokens

All tokens are defined in `app/globals.css` under `:root` and in
`@theme {}` (available as Tailwind utilities via `--color-*`).

### Raw palette

| Token | Value | Use |
|---|---|---|
| `--v2-dark` | `#1C1C1C` | Dark backgrounds, primary text, primary buttons |
| `--v2-light` | `#EFECE8` | Light backgrounds, reversed text |
| `--v2-accent` | `#D7B56D` | Gold accent, hover states on dark backgrounds |
| `--v2-parchment` | `#D9CBB9` | Image placeholder backgrounds, warm neutrals |
| `--v2-muted` | `#A78B65` | Muted accent, low-stock indicators |

### Opacity variants

Use Tailwind's opacity modifier (`text-[#1C1C1C]/45`) instead of custom tokens:

| Usage | Example class |
|---|---|
| Eyebrow / label copy | `text-[#1C1C1C]/40` |
| Secondary body copy | `text-[#1C1C1C]/60` |
| Disabled / placeholder | `text-[#1C1C1C]/30` |
| Reversed label on dark bg | `text-[#EFECE8]/40` |
| Reversed body on dark bg | `text-[#EFECE8]/65` |

### Borders

| Token | Value | Use |
|---|---|---|
| `--v2-border-light` | `rgba(28,28,28,0.10)` | Dividers and card borders on light backgrounds |
| `--v2-border-dark` | `rgba(239,236,232,0.12)` | Borders on dark backgrounds (nav, footer) |

---

## Typography Scale

All typography classes are defined in `app/globals.css`. Use them
instead of raw `text-*` Tailwind classes.

### Headings (Cormorant Garamond, font-weight 300)

| Class | Size | Line-height | Tracking | Transform | Use |
|---|---|---|---|---|---|
| `.v2-heading-display` | `clamp(2.4rem, 5.8vw, 4.8rem)` | 0.94 | −0.02em | uppercase | Hero / page titles |
| `.v2-heading-xl` | `clamp(1.7rem, 3.2vw, 2.85rem)` | 1.02 | −0.01em | uppercase | Section titles |
| `.v2-heading-lg` | `clamp(1.2rem, 2.2vw, 1.9rem)` | 1.1 | 0.04em | uppercase | Card names, sub-sections |

### Body & UI (Inter)

| Class | Size | Line-height | Notes |
|---|---|---|---|
| `.v2-label` | 11px | 1.5 | Uppercase, 0.24em tracking. Eyebrows, filter labels, meta |
| `.v2-body` | 15px | 1.65 | Main body copy, descriptions |
| `.v2-body-sm` | 13px | 1.6 | Secondary copy, footer, captions |
| `.v2-price` | 15px | – | Product prices (font-weight 400) |

---

## Spacing

Use the built-in Tailwind spacing scale. Reserved tokens:

| Token | Value | Use |
|---|---|---|
| `--v2-container-px` | `clamp(1rem, 4vw, 3rem)` | Horizontal page padding (applied by `.v2-container`) |
| `--v2-section-gap` | `clamp(3.5rem, 8vw, 6rem)` | Vertical section padding (applied by `.v2-section`) |
| `--v2-nav-height` | `4rem` | Fixed nav height; used for `padding-top` on content |

---

## Layout Utilities

| Class | Description |
|---|---|
| `.v2-page` | Root page wrapper. Sets `min-height: 100vh`, background, and text colour |
| `.v2-container` | Centred, max-width 1280px, fluid horizontal padding |
| `.v2-section` | Vertical padding via `--v2-section-gap` |
| `.v2-divider` | `<hr>` styled as a 1px border using `--v2-border-light` |

---

## Buttons

All button classes extend `.v2-btn` which sets the shared structure.

| Variant class | Appearance | Use |
|---|---|---|
| `.v2-btn-primary` | Dark fill (#1C1C1C) | Primary CTA on light backgrounds |
| `.v2-btn-primary-light` | Light fill (#EFECE8) | Primary CTA on dark backgrounds |
| `.v2-btn-secondary` | Transparent, dark border | Secondary actions on light backgrounds |
| `.v2-btn-ghost-light` | Transparent, faint light border | Ghost CTA on dark backgrounds |

Example:
```html
<a href="/v2/collections" class="v2-btn v2-btn-primary">
  Shop Collections
</a>
```

---

## Product Card

The `.v2-product-card` CSS class set handles the hover animation and
image aspect-ratio. Use the `<ProductCard>` component:

```jsx
import ProductCard from '../components/v2/ProductCard';

<ProductCard product={normalizedProduct} />
```

---

## Transitions & Animation

Do **not** use GSAP or Lenis in v2 components. Use only CSS transitions.

| Token | Value |
|---|---|
| `--v2-transition` | `0.25s cubic-bezier(0.16, 1, 0.3, 1)` |
| `--v2-transition-lg` | `0.45s cubic-bezier(0.16, 1, 0.3, 1)` |
| `--v2-ease` | `cubic-bezier(0.16, 1, 0.3, 1)` (for `transition-timing-function`) |

---

## Radii

| Token | Value | Use |
|---|---|---|
| `--v2-radius-xs` | 2px | Image corners, subtle rounding |
| `--v2-radius-sm` | 4px | Cards, inputs |
| `--v2-radius-md` | 8px | Modals, larger surfaces |
| `--v2-radius-lg` | 16px | Pills, tags |

---

## Breakpoints

Standard Tailwind breakpoints apply:

| Name | Min-width | Use |
|---|---|---|
| `sm` | 640px | 2-column product grid |
| `md` | 768px | Nav switches to desktop, section layout shifts |
| `lg` | 1024px | Product detail 2-column, collections 3-column |
| `xl` | 1280px | Collections 4-column |

---

## Component Inventory

| Component | Path | Notes |
|---|---|---|
| `Nav` | `components/v2/Nav.jsx` | Fixed dark header, mobile hamburger, reads cart count |
| `Footer` | `components/v2/Footer.jsx` | Dark footer, link groups, social links |
| `ProductCard` | `components/v2/ProductCard.jsx` | Reusable card with hover animation |
| `CollectionsClient` | `components/v2/CollectionsClient.jsx` | Client-side filter + grid |

---

## Route Map

| Route | File | Description |
|---|---|---|
| `/v2` | `app/v2/page.jsx` | Home: hero, featured products, brand story, bespoke CTA |
| `/v2/collections` | `app/v2/collections/page.jsx` | Full product grid with filter |
| `/v2/product/[id]` | `app/v2/product/[id]/page.jsx` | Product detail: gallery, info, add to cart |
| `/v2/cart` | `app/v2/cart/page.jsx` | Cart summary and checkout link |

All other routes (`/account`, `/checkout`, `/contact`, `/admin`, etc.)
continue to use the v1 shell until they are migrated.

---

## What to Do vs. What to Avoid

| ✅ Do | ❌ Avoid |
|---|---|
| Use `.v2-*` CSS classes for all typography | Raw `text-sm`, `font-serif`, `tracking-widest` Tailwind classes |
| Use CSS custom properties for spacing and colour | Arbitrary Tailwind values like `text-[#1C1C1C]/62` |
| Use CSS transitions only | GSAP, Lenis, or other JS animation in v2 |
| Define new tokens in `globals.css (:root)` | Inline `style` attributes for design values |
| Keep editor logic in `components/site-copy/` | Importing `EditableText` in v2 components |
| Use `normalizeProductRecord` / `resolveStorefrontProduct` | Raw Supabase rows without normalisation |
