# UI Conventions & Design System

## Typography

- **Font:** Plus Jakarta Sans — imported in `src/app/layout.tsx` via `next/font/google`
  - CSS variable: `--font-jakarta`
  - Applied via Tailwind: `font-sans` (configured in `tailwind.config.ts`)
- **Never use:** Inter, system-ui alone, or any other sans-serif

## Color tokens (from tailwind.config.ts)

```
// Backgrounds
bg-surface          #F8F8F7  ← main content area background
bg-white                      ← card backgrounds

// Sidebar
bg-sidebar          #0A0A0A
bg-sidebar-hover    #141414
bg-sidebar-active   #1C1C1C
border-sidebar-border #1F1F1F
text-sidebar-muted  #6A6A6A
text-sidebar-text   #E8E8E6

// Primary CTA / accent (electric blue)
bg-accent-600       #2B5EE8  ← buttons, links, active states
bg-accent-500       #3B6EF8
bg-accent-700       #1B4ED8  ← hover state for buttons
text-accent-600
border-accent-200   #B8CFFF

// Text
text-ink            #1A1A1A  ← primary body text
text-ink-secondary  #4A4A4A  ← secondary labels
text-ink-muted      #7A7A7A  ← placeholder, helper text
text-ink-faint      #A8A8A6  ← very muted, disabled

// Borders
border-border       #EBEBEA  ← default dividers
border-border-medium #E0DFDB ← slightly more visible
border-border-strong #C8C7C3 ← prominent borders

// Semantic
success: text-success bg-success-bg border-success-border  (#16A34A, #F0FDF4, #BBF7D0)
warning: text-warning bg-warning-bg border-warning-border  (#D97706, #FFFBEB, #FDE68A)
danger:  text-danger  bg-danger-bg  border-danger-border   (#DC2626, #FEF2F2, #FECACA)
```

## Shadows

```
shadow-card       0 1px 3px rgba(0,0,0,0.06) ...   ← default card
shadow-card-hover 0 4px 16px rgba(0,0,0,0.09) ...  ← hovered card
shadow-panel      0 24px 64px rgba(0,0,0,0.18) ...  ← modals/drawers
```

## Page layout

```tsx
<div className="px-8 py-10 max-w-5xl">   // standard content pages
<div className="px-8 py-10 max-w-6xl">   // admin panel
```

Use `space-y-8` between major sections.

## Card pattern

```tsx
<div className="bg-white rounded-xl shadow-card hover:shadow-card-hover transition-shadow p-6">
  {/* content */}
</div>
```

## Button pattern

Primary: `bg-accent-600 hover:bg-accent-700 text-white rounded-lg px-4 py-2 font-medium`
Secondary: `bg-white border border-border hover:bg-surface text-ink rounded-lg px-4 py-2`
Danger: `bg-danger text-white hover:bg-danger/90 rounded-lg px-4 py-2`

## Badge/status pattern

```tsx
// Success/active
<span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-text border border-success-border">
  Aktiv
</span>
```

## Client avatar

```tsx
// Use client's primaryColor as background, compute text color from contrast
const textColor = isLightColor(primaryColor) ? '#1A1A1A' : '#FFFFFF';
<div style={{ backgroundColor: primaryColor, color: textColor }} className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm">
  {client.initials}
</div>
```

## Sidebar structure

```
src/components/layout/Sidebar.tsx
```
Width: 220px, background: `bg-sidebar` (#0A0A0A)
Nav items: text-sidebar-text, hover:bg-sidebar-hover, active:bg-sidebar-active
Current nav items (as of March 2026):
- Generator (primary entry)
- Kunden
- Kampagnen
- Admin (ADMIN role only)

Removed from nav: Markenprofile, numbered steps, Uebersicht

## Form inputs

Use components from `src/components/ui/`:
- `Button` — primary, secondary, danger variants
- `Input` — text inputs with label + error state
- `Textarea` — multi-line text
- `Select` — dropdown
- `Badge` — status badges
- `Card` — card container
- `PageHeader` — page title + subtitle

## Loading/error states

- Loading: use `text-ink-muted` spinner or skeleton
- Error: `bg-danger-bg border border-danger-border text-danger text-sm rounded-lg p-3`
- Success toast: `bg-success-bg border border-success-border text-success-text`

## Modal pattern

No modal library — use plain `fixed inset-0 z-50` overlay with `shadow-panel`:
```tsx
<div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
  <div className="bg-white rounded-2xl shadow-panel p-6 w-full max-w-md mx-4">
    {/* content */}
  </div>
</div>
```
