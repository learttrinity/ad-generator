# Trinity Ad Generator — CLAUDE.md

Internal tool for a German fitness ad agency. Generates 12 AI-powered ad creatives per campaign across 6 audience segments × 2 placements. Not a public product.

---

## Stack

- **Framework:** Next.js 14 (App Router), TypeScript
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** NextAuth.js (credentials, no OAuth)
- **Styling:** Tailwind CSS + custom design tokens (see Design System below)
- **Font:** Plus Jakarta Sans (via `next/font/google`) — never Inter
- **Image generation:** Higgsfield AI (real) / Mock provider (testing)
- **Image compositing:** Sharp (server-side SVG overlay + JPEG export)
- **File exports:** Google Drive API (optional integration)

---

## Core Workflow

```
Kunde anlegen → Markenprofil → Kampagne → Generator → Review (Runs)
```

1. **Kunden** — clients with brand color, initials, status
2. **Markenprofile** — brand profile per client: colors, fonts, visual tone, component rules, restrictions
3. **Kampagnen** — campaign details: headline, price, offer type, CTA, urgency text
4. **Generator** — hero page: pick client → fill form → generate → see results inline
5. **Runs/Review** — review generated assets, approve/flag, download or export to Drive

---

## Generation Pipeline

### What it generates
12 assets per run: 6 audiences × 2 placements

**Audiences:** `frau_25_30`, `mann_25_30`, `frau_30_35`, `mann_30_35`, `frau_50_55`, `mann_50_55`
**Placements:** `feed_1080x1080` (1:1), `story_1080x1920` (9:16)

### Two-stage render architecture

**Stage 1 — Background image (Higgsfield AI)**
- POST `https://platform.higgsfield.ai/v1/text2image/soul`
- Auth: `Authorization: Key {HIGGSFIELD_API_KEY}`
- Request body: `{ arguments: { prompt, aspect_ratio, quality: "1080p", batch_size: 1 } }`
- Poll: `GET https://platform.higgsfield.ai/requests/{request_id}/status`
- Response image at: `data.images[0].url`
- **2 automatic retries with 5s delay** on failure
- **On failure: uses fallback gradient background** (brand primary color → dark) — never marks asset as failed

**Stage 2 — Ad render (local, Sharp + SVG)**
- Composites SVG overlay onto base image (or fallback gradient)
- Overlay includes: gradient overlay, logo, headline, subheadline, price (new + old with strikethrough), billing interval, urgency badge, CTA
- Layout archetypes: `price_dominant`, `headline_dominant`, `offer_focused`, `urgency_dominant`
- Output: JPEG 90%, saved to `public/exports/{runId}/{assetId}.jpg`

### Fallback logic (P0 — implemented)
Generation **never produces zero output**. If Higgsfield fails:
1. Log the error internally (never surface to user as "generation failed")
2. Generate a `linear-gradient(135deg, brandColor → #0d1b2a → #060d14)` background via Sharp
3. Render the full ad on top of the gradient background
4. Mark asset as `FERTIG` (not `FEHLGESCHLAGEN`)
5. `completedAssets` counts both real and fallback renders
6. Run status `FEHLER` only if the render engine itself crashed on **all** assets

### Provider activation
Resolution order:
1. DB `IntegrationSetting { key: "image_provider.active", value: "higgsfield" }`
2. `GENERATION_PROVIDER=higgsfield` env var (currently set in `.env.local`)
3. Default: mock provider (placehold.co placeholders)

---

## Database Models (Prisma)

| Model | Purpose |
|---|---|
| `User` | Auth — ADMIN / USER roles |
| `Client` | Agency clients |
| `BrandProfile` | One-to-one with Client — colors, fonts, tone, rules |
| `ClientAsset` | Logo, reference ads, brand PDFs per client |
| `Campaign` | Campaign details (headline, prices, offer type) |
| `GenerationRun` | One run = 12 assets, tracks progress & status |
| `CreativeAsset` | One per audience/placement pair — base image + final render |
| `FontLibrary` | Available fonts |
| `ClientDriveMapping` | Google Drive folder IDs per client |
| `IntegrationSetting` | Key-value store for admin settings (e.g. active provider) |
| `DriveExportLog` | Audit log for Drive exports |

### CreativeAsset status flow
```
ANGEFRAGT → IN_GENERIERUNG → FERTIG (render succeeded, with or without fallback)
                            → FEHLGESCHLAGEN (render engine crashed — rare)
```

### GenerationRun status flow
```
IN_VORBEREITUNG → IN_GENERIERUNG → FERTIG (≥1 asset rendered)
                                 → FEHLER (0 assets rendered — render engine crashed on all)
```

`progressPercent` = `(completedAssets + failedAssets) / totalAssets × 100`
`completedAssets` only increments when render completes (not when Higgsfield responds).

---

## Key Files

### Services
| File | Purpose |
|---|---|
| `src/services/generationPipelineService.ts` | Orchestrates full run: provider → render, with retry + fallback |
| `src/services/finalRenderService.ts` | Per-asset render: fallback gradient, SVG overlay, Sharp composite |
| `src/services/generationRunService.ts` | Run creation, readiness checks |
| `src/services/clientService.ts` | Client CRUD |
| `src/services/campaignService.ts` | Campaign CRUD |
| `src/services/assetExportService.ts` | Saves JPG to `public/exports/` |
| `src/services/driveExportService.ts` | Google Drive export |

### Libraries
| File | Purpose |
|---|---|
| `src/lib/promptEngine.ts` | Builds Higgsfield prompts from audience + brand data |
| `src/lib/renderSpecBuilder.ts` | Builds `RenderSpec` (layout, fonts, colors, visibility flags) |
| `src/lib/svgRenderer.ts` | Generates transparent SVG overlay from RenderSpec |
| `src/lib/textHierarchy.ts` | Text sizing, wrapping, line breaks |
| `src/lib/audienceMatrix.ts` | 6 audiences + 2 placements definitions |
| `src/lib/brandAnalysis.ts` | `computeProfileCompleteness()` — live confidence % from brand fields |
| `src/lib/readinessCheck.ts` | Generation readiness (campaign blockers only, brand = warnings) |
| `src/lib/providers/higgsfield.ts` | Higgsfield API client |
| `src/lib/providers/providerFactory.ts` | Provider resolution (DB → env → mock) |

### Key Components
| File | Purpose |
|---|---|
| `src/components/generator/GeneratorClient.tsx` | Hero generator — 4 phases: pick-client, fill-form, generating, done |
| `src/components/runs/ReviewGrid.tsx` | Post-generation asset review grid |
| `src/components/layout/Sidebar.tsx` | Nav sidebar |

### API Routes
| Route | Method | Purpose |
|---|---|---|
| `/api/generator/start` | POST | Create campaign + start run in one call |
| `/api/runs/[id]` | GET | Poll run status + all assets |
| `/api/runs/[id]/render` | POST | Re-trigger render for FERTIG assets |
| `/api/runs/[id]/download` | GET | ZIP all final assets |
| `/api/assets/[id]/approve` | PATCH | Set asset approval flag |
| `/api/drive/*` | Various | Google Drive integration |

---

## Design System

### Rules (never break these)
- Font: **Plus Jakarta Sans** — never Inter, never system-ui
- Sidebar: `#0A0A0A` dark, 220px wide
- Content background: `#F8F8F7` warm off-white
- Cards: white, `shadow-card`, lift on hover (`hover:shadow-card-hover hover:-translate-y-0.5`)
- Page layout: `px-8 py-10 max-w-5xl space-y-8`

### Color tokens (Tailwind)
```
accent-*     Electric blue (#2B5EE8) — CTAs, active states, links
ink-*        Text hierarchy: ink (darkest), ink-secondary, ink-muted, ink-faint
border-*     Borders: border (main), border-medium, border-heavy
surface      Off-white card backgrounds
success-*    Green — success states, FERTIG badges
warning-*    Amber — warnings, low confidence, unapproved profiles
danger-*     Red — errors, FEHLGESCHLAGEN, destructive actions
```

### Never use
`gray-*`, `brand-*`, `green-*`, `red-*`, `amber-*`, `blue-*` — use the tokens above instead.

### Sidebar navigation structure
```
GENERIEREN    → /generator          (primary, accent highlight)
VERWALTUNG    → Kunden, Kampagnen, Historie
SYSTEM        → Übersicht, Admin (admin-only)
```
"Markenprofile" is not in the sidebar nav (accessed via client detail pages).

---

## Generator Page Flow

The generator (`/generator`) is the homepage (root redirects there).

```
Phase 1: pick-client   → grid of client cards, click to select
Phase 2: fill-form     → inline form (Angebotstyp*, Neuer Preis*, Headline*, + optional fields)
                         + Umgebung toggle + Richtung toggle
                         + collapsible "Vorherige Kampagne laden" accordion
Phase 3: generating    → real-time 12-asset grid with polling every 2s
                         progress bar shows "X / 12 gerendert"
Phase 4: done          → inline results + "Vollansicht öffnen" link
```

**Required fields to generate:** `clientId`, `offerType`, `headline` (min 3 chars), `priceNew`
**The generate button is never blocked by provider state** — fallback rendering handles it.

---

## Generation Readiness Rules (`src/lib/readinessCheck.ts`)

**Hard blockers (prevent generation):**
- Missing headline (< 3 chars)
- Missing offerType
- Missing priceNew

**Soft warnings (shown but don't block):**
- No brand profile
- Brand profile not approved
- No logo uploaded
- Low brand confidence score

---

## Environment Variables (`.env.local`)

```
DATABASE_URL=postgresql://trinity:trinity123@localhost:5432/trinity_ad_generator
NEXTAUTH_SECRET=trinity-local-secret-123456789
NEXTAUTH_URL=http://localhost:3000

HIGGSFIELD_API_KEY=<64-char hex key>
HIGGSFIELD_API_BASE=https://platform.higgsfield.ai
# HIGGSFIELD_APPLICATION=v1/text2image/soul  ← default model
GENERATION_PROVIDER=higgsfield

REDIS_URL=redis://localhost:6379
```

---

## Decisions Made

### Why Higgsfield
Real AI background images for fitness ads. The app's local render engine adds all text/branding on top. Higgsfield's only job is the background photo.

### Why fallback gradient (not failure)
An ad with a brand-colored gradient background and proper text overlay is usable. An "error" with zero output is not. The fallback makes the tool production-safe even when the AI provider is down.

### Why inline render (not separate step)
Originally the pipeline saved `baseImageUrl` and a separate `/api/runs/[id]/render` step applied the overlay. Now render happens inline in the pipeline immediately after the provider step. Progress reflects actual rendered output, not provider responses.

### Why confidence is computed live
`BrandProfile.confidenceScore` in the DB goes stale. `computeProfileCompleteness()` in `src/lib/brandAnalysis.ts` computes the score fresh from the actual stored fields (color, font, typography class, visual tone, image tone, secondary colors, component rules).

### Why no blockers for brand issues
Brand warnings (no profile, not approved, low confidence) became info notices — not red banners, not generation blockers. Users must be able to generate ads even for unconfigured clients.

### Sidebar changes (March 2026)
Removed numbered workflow steps (1-2-3-4). Generator is now the primary entry point. Markenprofile removed from nav. Root redirect changed from `/uebersicht` to `/generator`.

---

## What's Built

- [x] Auth (NextAuth credentials)
- [x] Client management (CRUD, initials, status)
- [x] Brand profile system (colors, fonts, tone, component rules, restrictions, confidence score)
- [x] Campaign management (4-step creation panel)
- [x] Generator hero page (4-phase flow, inline results)
- [x] Generation pipeline (Higgsfield → fallback → render → FERTIG)
- [x] SVG overlay render engine (Sharp compositing)
- [x] Real-time progress polling (2s interval)
- [x] Run review page (ReviewGrid, approve/flag)
- [x] Asset download (ZIP)
- [x] Google Drive integration (export runs to Drive folders)
- [x] Admin panel (user management, integrations, provider settings)
- [x] Design token system (full Tailwind custom theme)
- [x] Prompt engine (audience + brand → Higgsfield prompt)
- [x] Mock provider (for testing without API calls)

---

## What Comes Next (Not Started)

- [ ] **Re-render single asset** — retry button per failed slot in ReviewGrid
- [ ] **Higgsfield application selection** — let admin pick model (soul, seedream, etc.)
- [ ] **Campaign field: `billingInterval`** — UI field for monthly/yearly label
- [ ] **Campaign field: `locationLine`** — city/location for local gym ads
- [ ] **Brand profile onboarding flow** — guided wizard for new clients
- [ ] **Markenprofile detail page** — view/edit full brand profile
- [ ] **Historie filters** — filter runs by client, date, status
- [ ] **Drive auto-export** — trigger Drive export automatically after generation
- [ ] **Multi-user support** — currently single-workspace, no per-user client scoping
