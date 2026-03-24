# Design DNA — Architecture Notes

## What it does

Every client gets a unique visual identity automatically derived from their brand profile.
No manual layout selection needed. The DNA system maps brand personality → visual output.

## Full resolution chain

```
BrandProfile { visualTone, typographyClass, designDnaOverridden, designDna* }
       │
       ▼
resolveDesignDNA(brandProfile)   ← src/lib/render/dna-resolver.ts
       │
       ├─ if designDnaOverridden=true → use stored designDna* fields from DB
       │   (any missing fields fall back to auto-computed)
       │
       └─ if not overridden → auto-compute:
              visualTone → EnergyLevel (TONE_TO_ENERGY map)
              typographyClass + EnergyLevel → FontKey (selectFont pattern match)
              EnergyLevel + visualTone → LayoutKey (selectLayout)
              EnergyLevel → PanelStyleDNA (high=none, refined=solid-dark, medium=glass)
              EnergyLevel → ColorIntensity (high=aggressive, refined=subtle, medium=moderate)
              visualTone → borderRadius (selectBorderRadius map)
              layoutKey → textPosition (center-panel='center', else='left')
              energyLevel → fontWeight ('refined'='700', else='900')
              visualTone → textTransform (boutique/minimal='none', else='uppercase')
       │
       ▼
DesignDNA { fontKey, fontFamily, fontWeight, textTransform, layoutKey,
            panelStyle, colorIntensity, energyLevel, borderRadius, textPosition }
       │
       ▼
renderLayout({ spec, dna, logo })  ← layouts/index.ts dispatcher
       │
       ▼
SVG string with embedded brand overlay
```

## selectFont pattern matching

`typographyClass` is a free-text string. The resolver uses `.includes()` matching:

| Pattern in typographyClass | high energy | medium/refined |
|---|---|---|
| "condensed" or "sporty" | bebas-neue | barlow-condensed-black |
| "elegant" or "serif" | playfair-display | cormorant-garamond (refined) |
| "display" | anton | anton |
| "geometric" | montserrat-black | montserrat-black |
| anything else | montserrat-black | raleway-extrabold (refined) / oswald-bold (medium) |

## Border radius per tone

| visualTone | borderRadius |
|---|---|
| performance-heavy | 0px |
| energetic | 4px |
| sale-driven | 8px |
| local | 12px |
| modern | 16px |
| minimal | 20px |
| premium | 24px |
| boutique | 32px |

## Layout descriptions

### bottom-left-panel
- Panel: glass or solid-dark rectangle bottom-left
- Image fills full canvas (background)
- Text: headline, subheadline, price in panel
- Good for: local gyms, medium-energy brands

### center-panel
- Panel: centered rectangle with thin horizontal dividers above/below
- textPosition = 'center' (only layout with centered text)
- Price, offer, CTA all centered
- Good for: premium, modern

### full-bleed-text
- No panel at all (panelStyle = 'none' for high energy)
- Heavy bottom gradient overlay (black → transparent, from bottom)
- XL left-aligned headline at bottom
- Price in bottom-left corner
- Good for: energetic, performance-heavy

### split-vertical
- Brand primary color fills left 48% as a solid panel
- Image on right 52%
- Logo at top of color panel, headline + price in color panel
- Good for: local, community brands

### top-badge-bottom-price
- Offer type as small badge at top-center
- Price display at bottom-center (large)
- Image fills middle
- Logo centered
- Good for: boutique, refined, minimal

### bottom-strip-hero
- Brand color strip fills bottom 30% of image
- Text rendered in the strip: headline left, price right
- Image fills top 70%
- Good for: sale-driven, promotions

## Adding a new layout

1. Create `src/lib/render/layouts/my-layout.ts` — export default function
2. Add the key to `LayoutKey` type in `design-dna.ts`
3. Add `case 'my-layout': return myLayout(input)` in `layouts/index.ts`
4. Add it to `dna-resolver.ts` selectLayout() function or DNA override dropdown
5. Add it to the DNA override card dropdowns in `DesignDnaOverrideCard.tsx`

## Admin override flow

Page: `/markenprofile/[clientId]` (ADMIN role required to see the card)
Component: `src/components/brand/DesignDnaOverrideCard.tsx`
API: `GET/PUT/DELETE /api/admin/brand-dna/[clientId]`

- GET: returns current computed DNA + `overridden: bool`
- PUT: saves all 6 values + sets `designDnaOverridden = true`
- DELETE: clears all `designDna*` fields + sets `designDnaOverridden = false`

The override is **per-field** internally (the resolver checks each field individually),
so technically partial overrides are possible via direct DB edits, but the UI only
does full save or full reset.

## Font registry

`FONT_REGISTRY` in `font-registry.ts` maps `FontKey` → `{ family, filename, weight, fallback }`.
- `family`: the CSS font-family name used in SVG `font-family` attribute
- `filename`: file in `public/fonts/` to read as Buffer for resvg
- `weight`: default SVG font-weight (may be overridden by dna-resolver)
- `fallback`: if file missing, resvg uses this system font name (may not render correctly)

To add a new font to the render pipeline:
1. Add TTF file to `public/fonts/`
2. Add entry to `FONT_REGISTRY`
3. Add key to `FontKey` union type in `design-dna.ts`
4. It's now available as a DNA font key
