# Render Pipeline — Architecture Notes

## Data flow: click → JPEG

```
GeneratorClient.tsx
  └─ POST /api/generator/start
       └─ Creates Campaign + GenerationRun (IN_VORBEREITUNG)
       └─ Fires runGenerationPipeline(runId) — NO AWAIT (background)
       └─ Returns { runId } immediately

runGenerationPipeline (generationPipelineService.ts)
  ├─ Load run + campaign + client + brandProfile from DB
  ├─ Resolve provider: getImageProvider() → DB → env → mock
  ├─ Load logo as base64 (clientAssetRepository → fs.readFileSync)
  ├─ Build 12 asset combinations (6 audiences × 2 placements)
  ├─ Pre-create 12 CreativeAsset rows (ANGEFRAGT) — enables UI slots immediately
  ├─ Update run to IN_GENERIERUNG
  └─ Promise.all → process all 12 assets in parallel
       └─ per asset:
            ├─ buildPrompt(audience, campaign, brandProfile) → prompt string
            ├─ Mark asset IN_GENERIERUNG
            ├─ submitWithRetry(provider, input) → max 3 attempts, 5s delay
            │    ├─ SUCCESS → baseImageUrl = Higgsfield URL
            │    └─ FAILURE → baseImageUrl = null (gradient fallback)
            └─ renderSingleAsset(assetId, baseImageUrl)
```

## renderSingleAsset (finalRenderService.ts)

```
1. Load CreativeAsset + full context from DB
2. buildRenderSpec(asset, campaign, brandProfile) → RenderSpec
   - Sets: width, height, headline, subheadline, priceNew, priceOld,
     ctaText, urgencyText, locationLine, primaryColor, logoDataUri,
     showStrikethrough, showUrgency, audienceKey, placement
3. Load base image:
   - If baseImageUrl: fetch(url) → Buffer
   - If null: Sharp gradient → Buffer
     sharp({ create: { width, height, channels: 4, background } })
     .composite([SVG gradient overlay]) → PNG buffer
4. Load logo as data URI from ClientAsset file
5. resolveDesignDNA(brandProfile) → DesignDNA
   - If designDnaOverridden=true: use stored DB values
   - Otherwise: auto-derive from visualTone + typographyClass
6. loadFontBuffer(dna.fontKey) → Buffer | null
7. renderLayout({ spec, dna, logo }) → SVG string
   - Dispatches to layout template by dna.layoutKey
   - Returns SVG with embedded font-family, all text, panel, price
8. svgToPng(svgString, [dnaFontBuffer]) → PNG Buffer
   - Resvg with font buffers: [dnaFont, oswald-bold, oswald-regular]
   - fitTo: "original" (keeps SVG viewBox dimensions)
9. Sharp composite:
   - sharp(baseImageBuffer).resize(width, height, { fit: 'cover' })
   - .composite([{ input: pngBuffer, top: 0, left: 0 }])
   - .jpeg({ quality: 90 })
   - .toBuffer()
10. saveExportedAsset(runId, assetId, jpegBuffer)
    - mkdir -p public/exports/{runId}/
    - writeFileSync public/exports/{runId}/{assetId}.jpg
11. Update CreativeAsset: status=FERTIG, finalAssetUrl, renderedAt, dimensions
12. generationRunRepository.incrementCompleted(runId)
```

## Fallback gradient generation

When Higgsfield fails or returns no URL:
```typescript
// Sharp creates a gradient via SVG rect with linearGradient
const gradientSvg = `<svg>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${brandColor}"/>
      <stop offset="60%" stop-color="#0d1b2a"/>
      <stop offset="100%" stop-color="#060d14"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
</svg>`

sharp({ create: { width, height, channels: 4, background: { r:0, g:0, b:0, alpha:1 } } })
  .composite([{ input: Buffer.from(gradientSvg), blend: 'over' }])
  .png().toBuffer()
```
The `provider` field on the asset is set to `"gradient"` so it can be identified later.

## SVG layout contract

Every layout file exports a default function:
```typescript
export default function render(input: LayoutInput): string
```
Where:
```typescript
type LayoutInput = {
  spec: RenderSpec;   // dimensions, text, colors, visibility flags
  dna: DesignDNA;     // font, layout, panel style, border radius, etc.
  logo: string | null; // base64 data URI or null
}
```
Returns a complete SVG string with the same `viewBox` as the placement dimensions.

## Important: resvg font loading

resvg requires fonts to be embedded as `Buffer[]` in opts. It does NOT:
- Fetch from URLs
- Use system fonts when fontBuffers is provided
- Merge with system fonts

So every font used in the SVG must be in the `fontBuffers` array. The render service passes:
```
[dnaFontBuffer, oswald-bold, oswald-regular].filter(Boolean)
```
If any font name in SVG doesn't match a loaded buffer's font-family, the text renders in the fallback.

## Module-level font loading

`finalRenderService.ts` loads Oswald fonts **once at module init** (not per request):
```typescript
const FONT_OSWALD_BOLD    = tryReadFont("Oswald-Bold.ttf");    // cached
const FONT_OSWALD_REGULAR = tryReadFont("Oswald-Regular.ttf"); // cached
```
DNA fonts are loaded fresh per render via `loadFontBuffer(dna.fontKey)`.
