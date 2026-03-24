# Trinity Ad Generator — CLAUDE.md
> **Complete project reference. Any developer or AI assistant should be able to pick this up with zero additional context.**

---

## 1. Project Overview

**What it is:** An internal full-stack web tool for a German fitness ad agency. It automates the creation of 12 AI-generated ad creatives per campaign, one for each combination of 6 audience segments × 2 ad placements.

**What it does:**
1. Manages agency clients and their brand profiles (colors, typography, visual tone, Design DNA)
2. Manages campaigns (headline, pricing, offer type, urgency text, CTA)
3. Generates 12 ad images per campaign using Higgsfield AI for backgrounds + a custom SVG render engine for brand overlays
4. Lets staff review, approve, flag, and download the generated assets
5. Optionally exports everything to Google Drive

**Who it's for:** The staff of a single German fitness marketing agency. Not a SaaS product. No multi-tenant concerns. Single workspace.

**What problem it solves:** Previously creating 12 ad variants per campaign was done manually in Photoshop/Canva. This tool auto-generates all variants in ~60 seconds using AI image generation + server-side brand overlays.

**Language:** UI is in German throughout (Kunden, Kampagnen, Markenprofil, etc.). Code is English.

---

## 2. Full Tech Stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| Framework | Next.js App Router | 14.2.18 | File-based routing, Server Components, API routes all in one |
| Language | TypeScript | ^5 | Type safety across frontend + backend |
| Database | PostgreSQL | local | Relational data, Prisma ecosystem |
| ORM | Prisma | ^5.22.0 | Type-safe queries, easy schema management |
| Auth | NextAuth.js | ^4.24.10 | Credentials provider (email + bcrypt password), session handling |
| Password hashing | bcryptjs | ^2.4.3 | Standard for credential auth |
| Styling | Tailwind CSS | ^3.4.1 | Utility-first CSS with custom design token extensions |
| UI font | Plus Jakarta Sans | via next/font/google | Agency-grade sans serif — **never Inter** |
| AI image provider | Higgsfield AI | REST API | Background photo generation for fitness ads |
| Image compositing | Sharp | ^0.33.5 | Server-side: resize base images, composite SVG overlays |
| SVG → PNG render | @resvg/resvg-js | ^2.6.2 | Headless SVG renderer that accepts font buffers — no browser needed |
| PDF parsing | pdf-parse | ^2.4.5 | Extract text from brand PDFs for Claude analysis |
| AI analysis | Anthropic Claude API | via HTTP | Reads brand PDFs + answers structured brand profile questions |
| File export (ZIP) | archiver | ^7.0.1 | Creates ZIP of generated assets for download |
| Google Drive | googleapis | ^144.0.0 | Optional: export runs to Drive folders |
| Validation | Zod | ^3.23.8 | Schema validation on API routes |
| Crypto | Node.js built-in crypto | — | AES-256-GCM for encrypting stored API keys |
| Class merging | clsx + tailwind-merge | latest | Conditional className composition |
| DB adapter | @auth/prisma-adapter | ^2.7.2 | NextAuth ↔ Prisma session storage |

**Scripts (package.json):**
```bash
npm run dev          # next dev
npm run build        # next build
npm run db:push      # prisma db push  ← USE THIS for schema changes
npm run db:migrate   # prisma migrate dev  ← DO NOT USE (interactive, breaks in shell)
npm run db:seed      # tsx prisma/seed.ts
npm run db:studio    # prisma studio
npm run db:reset     # prisma migrate reset
```

---

## 3. Complete File Structure

```
trinity-ad-generator/
├── prisma/
│   ├── schema.prisma           # Full database schema (single source of truth)
│   └── seed.ts                 # Seeds default admin user + base data
│
├── public/
│   ├── exports/                # Generated JPEG assets saved here: {runId}/{assetId}.jpg
│   └── fonts/
│       ├── Oswald-Bold.ttf            # Used as resvg fallback for ALL layouts
│       ├── Oswald-Regular.ttf         # Also loaded as resvg fallback
│       ├── Bebas_Neue-Regular.ttf     # DNA font: bebas-neue
│       ├── Barlow_Condensed-Black.ttf # DNA font: barlow-condensed-black
│       ├── Montserrat-Black.ttf       # DNA font: montserrat-black
│       ├── Anton-Regular.ttf          # DNA font: anton
│       ├── Raleway-ExtraBold.ttf      # DNA font: raleway-extrabold
│       ├── Cormorant_Garamond-Bold.ttf # DNA font: cormorant-garamond
│       ├── Teko-Bold.ttf              # DNA font: teko-bold
│       ├── Playfair_Display-Bold.ttf  # DNA font: playfair-display
│       └── custom/                    # Admin-uploaded fonts (stored but NOT yet wired into render pipeline)
│
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout: Plus Jakarta Sans font import, SessionProvider
│   │   ├── page.tsx                # Root "/" → redirect to /generator
│   │   │
│   │   ├── (auth)/
│   │   │   └── login/page.tsx      # Login page (credentials form)
│   │   │
│   │   ├── (app)/                  # All authenticated routes
│   │   │   ├── layout.tsx          # App shell: Sidebar + main content area
│   │   │   ├── generator/page.tsx  # Primary hero page — uses GeneratorClient.tsx
│   │   │   ├── kunden/
│   │   │   │   ├── page.tsx        # Client list
│   │   │   │   ├── neu/page.tsx    # Create new client
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # Client detail (⚠️ has pre-existing TS error)
│   │   │   │       └── bearbeiten/page.tsx  # Edit client
│   │   │   ├── kampagnen/
│   │   │   │   ├── page.tsx        # Campaign list (uses KampagnenClient.tsx)
│   │   │   │   ├── neu/page.tsx    # New campaign
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx    # Campaign detail
│   │   │   │       └── bearbeiten/page.tsx  # Edit campaign
│   │   │   ├── markenprofile/
│   │   │   │   ├── page.tsx        # Brand profiles list
│   │   │   │   ├── onboarding/page.tsx      # 3-step brand onboarding wizard
│   │   │   │   └── [clientId]/
│   │   │   │       ├── page.tsx    # Brand profile detail + DNA override card
│   │   │   │       └── bearbeiten/page.tsx  # Edit brand profile (may be stub)
│   │   │   ├── runs/[id]/page.tsx  # Run detail + ReviewGrid
│   │   │   ├── historie/page.tsx   # Generation history timeline
│   │   │   ├── uebersicht/page.tsx # Overview/dashboard page
│   │   │   └── admin/
│   │   │       ├── page.tsx        # Admin panel (5-tab shell via AdminPanel.tsx)
│   │   │       └── integrationen/page.tsx  # Redirects to /admin?tab=integrationen
│   │   │
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts  # NextAuth handler
│   │       ├── generator/
│   │       │   ├── start/route.ts           # POST: create campaign + start run
│   │       │   └── upload-reference/route.ts # POST: upload reference image for a run
│   │       ├── runs/[id]/
│   │       │   ├── route.ts                 # GET: poll run status + all assets
│   │       │   ├── render/route.ts          # POST: re-trigger render
│   │       │   └── download/route.ts        # GET: ZIP download of all assets
│   │       ├── assets/
│   │       │   ├── route.ts                 # GET: list assets
│   │       │   ├── [id]/route.ts            # GET/DELETE: single asset
│   │       │   └── [id]/approve/route.ts    # PATCH: toggle approved flag
│   │       ├── kunden/
│   │       │   ├── route.ts                 # GET/POST: list/create clients
│   │       │   ├── [id]/route.ts            # GET/PUT/DELETE: single client
│   │       │   └── search/route.ts          # GET: client search (max 5, excludes ARCHIVIERT)
│   │       ├── kampagnen/
│   │       │   ├── route.ts                 # GET/POST: list/create campaigns
│   │       │   ├── [id]/route.ts            # GET/PUT/DELETE: single campaign
│   │       │   └── [id]/starten/route.ts    # POST: start generation run for campaign
│   │       ├── markenprofile/[clientId]/
│   │       │   ├── route.ts                 # GET/PUT: read/save brand profile
│   │       │   ├── approve/route.ts         # POST: approve brand profile
│   │       │   └── analyse/route.ts         # POST: trigger Claude PDF analysis
│   │       ├── upload/route.ts              # POST: generic file upload
│   │       ├── admin/
│   │       │   ├── stats/route.ts           # GET: 5 aggregate metrics (ADMIN)
│   │       │   ├── activity/route.ts        # GET: merged activity feed top 10 (ADMIN)
│   │       │   ├── users/
│   │       │   │   ├── route.ts             # GET/POST: list/invite users (ADMIN)
│   │       │   │   ├── [id]/route.ts        # PATCH: update user name/email/role (ADMIN)
│   │       │   │   └── [id]/deactivate/route.ts  # PATCH: toggle user active (ADMIN)
│   │       │   ├── fonts/
│   │       │   │   ├── route.ts             # GET/POST: list/add font by name (ADMIN)
│   │       │   │   ├── [id]/route.ts        # PATCH: toggle font active (ADMIN)
│   │       │   │   └── upload/route.ts      # POST: upload font file (ADMIN)
│   │       │   ├── settings/route.ts        # GET/PATCH: AppSetting key-value store (ADMIN)
│   │       │   ├── claude-key/route.ts      # GET/PUT/DELETE: Claude API key (ADMIN)
│   │       │   ├── brand-dna/[clientId]/route.ts  # GET/PUT/DELETE: DNA override (ADMIN)
│   │       │   └── providers/
│   │       │       ├── route.ts             # GET: list providers
│   │       │       ├── activate/route.ts    # POST: set active provider
│   │       │       ├── higgsfield/test/route.ts  # POST: test Higgsfield connection
│   │       │       └── mock/test/route.ts   # POST: test mock provider
│   │       └── drive/
│   │           ├── status/route.ts          # GET: Drive connection status
│   │           ├── test/route.ts            # GET: test Drive connection
│   │           ├── browse/route.ts          # GET: browse Drive folders
│   │           ├── mappings/[clientId]/route.ts  # GET/PUT: Drive folder mapping per client
│   │           └── export/[runId]/route.ts  # POST: export run to Drive
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx         # Nav sidebar (#0A0A0A dark, 220px wide)
│   │   │   ├── Header.tsx          # Top header bar
│   │   │   └── ClientTabs.tsx      # Tab navigation for client detail pages
│   │   ├── ui/
│   │   │   ├── Button.tsx          # Shared button component
│   │   │   ├── Card.tsx            # Shared card with shadow-card token
│   │   │   ├── Badge.tsx           # Status/label badge
│   │   │   ├── Input.tsx           # Text input
│   │   │   ├── Textarea.tsx        # Textarea
│   │   │   ├── Select.tsx          # Dropdown select
│   │   │   └── PageHeader.tsx      # Page title + subtitle header
│   │   ├── generator/
│   │   │   └── GeneratorClient.tsx # Hero generator — 3-phase flow (search→form→generating→done)
│   │   ├── runs/
│   │   │   ├── ReviewGrid.tsx      # 12-asset review grid with approve/flag/lightbox
│   │   │   ├── RenderTrigger.tsx   # Button to re-trigger render for a run
│   │   │   └── RunAutoRefresh.tsx  # Auto-refresh component for in-progress runs
│   │   ├── brand/
│   │   │   ├── BrandOnboardingWizard.tsx  # 3-step wizard
│   │   │   ├── BrandProfileForm.tsx       # Brand profile edit form
│   │   │   ├── BrandStatusBadge.tsx       # Review status badge
│   │   │   ├── BrandApprovalActions.tsx   # Approve/reject actions
│   │   │   ├── ConfidenceBar.tsx          # Visual confidence score bar
│   │   │   ├── ColorPaletteEditor.tsx     # Color swatch editor
│   │   │   ├── AssetUploader.tsx          # Logo/PDF upload component
│   │   │   ├── AssetsTab.tsx              # Assets section in brand profile detail
│   │   │   ├── ClientPickerRedirect.tsx   # Redirect helper if no client selected
│   │   │   └── DesignDnaOverrideCard.tsx  # Admin card: override all 6 DNA values per client
│   │   ├── admin/
│   │   │   ├── AdminPanel.tsx       # URL-tab shell (?tab=... routing)
│   │   │   ├── OverviewTab.tsx      # Metrics + activity feed + system status
│   │   │   ├── BenutzerTab.tsx      # User CRUD with modals + role guards
│   │   │   ├── SchriftenTab.tsx     # Font library + upload
│   │   │   ├── IntegrationenTab.tsx # Provider picker + Claude key + Drive
│   │   │   └── EinstellungenTab.tsx # Agency settings (AppSetting-backed)
│   │   ├── providers/
│   │   │   ├── ClaudeApiKeyCard.tsx    # Save/edit/remove Claude key card
│   │   │   ├── ProviderCard.tsx        # Provider status card
│   │   │   └── ProviderHealthBadge.tsx # Live health indicator
│   │   ├── drive/
│   │   │   ├── DriveConnectionStatus.tsx  # Drive auth status display
│   │   │   ├── DriveMappingForm.tsx       # Map client → Drive folders
│   │   │   ├── DriveFileBrowser.tsx       # Browse Drive folder tree
│   │   │   └── DriveExportButton.tsx      # Export run to Drive button
│   │   ├── forms/
│   │   │   ├── KundeForm.tsx       # Client create/edit form
│   │   │   └── KampagneForm.tsx    # Campaign create/edit form
│   │   ├── kampagnen/
│   │   │   └── KampagnenClient.tsx  # Campaign list page (client component)
│   │   ├── generation/
│   │   │   └── GenerationSetupPanel.tsx  # Campaign setup panel for generation
│   │   └── SessionProvider.tsx     # NextAuth SessionProvider wrapper
│   │
│   ├── services/
│   │   ├── generationPipelineService.ts  # Orchestrates full run: provider → render
│   │   ├── finalRenderService.ts         # Per-asset: DNA resolve → SVG → Sharp composite
│   │   ├── generationRunService.ts       # Run creation and readiness checks
│   │   ├── brandProfileService.ts        # Brand profile CRUD + Claude PDF analysis
│   │   ├── clientService.ts              # Client CRUD
│   │   ├── campaignService.ts            # Campaign CRUD
│   │   ├── clientAssetService.ts         # ClientAsset (logos, PDFs) CRUD
│   │   ├── assetExportService.ts         # Save rendered JPEG to public/exports/
│   │   ├── driveExportService.ts         # Google Drive export
│   │   ├── driveReadService.ts           # Read assets from Drive folders
│   │   ├── driveMappingService.ts        # Manage client → Drive folder mappings
│   │   ├── integrationSettingsService.ts # Read/write IntegrationSetting table
│   │   ├── imageProviderSettingsService.ts # Provider selection logic
│   │   └── providerHealthService.ts      # Live health checks for image providers
│   │
│   ├── repositories/
│   │   ├── clientRepository.ts           # Prisma queries for Client
│   │   ├── brandProfileRepository.ts     # Prisma queries for BrandProfile
│   │   ├── campaignRepository.ts         # Prisma queries for Campaign
│   │   ├── generationRunRepository.ts    # Prisma queries for GenerationRun
│   │   ├── creativeAssetRepository.ts    # Prisma queries for CreativeAsset
│   │   └── clientAssetRepository.ts      # Prisma queries for ClientAsset
│   │
│   ├── lib/
│   │   ├── prisma.ts               # Singleton Prisma client
│   │   ├── auth.ts                 # NextAuth config (credentials + Prisma adapter)
│   │   ├── utils.ts                # General utility functions (cn(), etc.)
│   │   ├── storage.ts              # File storage helpers
│   │   ├── assetTypes.ts           # ClientAssetType enum helpers
│   │   ├── encryption.ts           # AES-256-GCM encrypt/decrypt (uses APP_ENCRYPTION_KEY)
│   │   ├── adminActivity.ts        # Silent-fail logActivity() for audit log
│   │   ├── brandAnalysis.ts        # computeProfileCompleteness() + Claude PDF analysis
│   │   ├── readinessCheck.ts       # checkReadiness() — campaign blockers, brand warnings
│   │   ├── renderSpecBuilder.ts    # buildRenderSpec() → RenderSpec for layout templates
│   │   ├── promptEngine.ts         # buildPrompt() → Higgsfield prompt from audience + brand
│   │   ├── audienceMatrix.ts       # AUDIENCE_MATRIX, PLACEMENT_OPTIONS, getPlacement()
│   │   ├── campaignNormalization.ts # Normalize campaign data before generation
│   │   ├── messagePriority.ts      # Determine message priority from campaign data
│   │   ├── directionSelector.ts    # Select creative direction for prompts
│   │   ├── fontResolver.ts         # Resolve font names for render spec
│   │   ├── textHierarchy.ts        # Text hierarchy rules per layout
│   │   ├── imageStyleFamilies.ts   # Visual style families for prompt building
│   │   ├── svgRenderer.ts          # Low-level SVG string builder helpers
│   │   ├── render/
│   │   │   ├── design-dna.ts       # Types: FontKey, LayoutKey, PanelStyleDNA, DesignDNA
│   │   │   ├── dna-resolver.ts     # resolveDesignDNA() — brand profile → full DesignDNA
│   │   │   ├── font-registry.ts    # getFontPath(), loadFontBuffer() — maps keys to TTF files
│   │   │   └── layouts/
│   │   │       ├── index.ts              # renderLayout() dispatcher
│   │   │       ├── shared.ts             # escXml(), toUpper(), strikethroughLine(), wrapText()
│   │   │       ├── bottom-left-panel.ts  # Layout: glass/solid panel bottom-left
│   │   │       ├── center-panel.ts       # Layout: centered panel with dividers
│   │   │       ├── full-bleed-text.ts    # Layout: no panel, XL left-aligned text
│   │   │       ├── split-vertical.ts     # Layout: brand color left half, image right
│   │   │       ├── top-badge-bottom-price.ts  # Layout: offer at top, price at bottom
│   │   │       └── bottom-strip-hero.ts  # Layout: brand color strip at bottom 30%
│   │   ├── providers/
│   │   │   ├── imageGenerationProvider.ts  # Provider interface: ImageGenerationProvider
│   │   │   ├── higgsfield.ts               # Higgsfield AI client (submit + poll)
│   │   │   ├── mock.ts                     # Mock provider (placehold.co placeholders)
│   │   │   ├── providerFactory.ts          # getImageProvider() — DB → env → mock
│   │   │   └── secureConfigResolver.ts     # Resolve API keys from env or encrypted DB
│   │   └── google/
│   │       ├── googleDriveClient.ts    # Authenticated Drive API client
│   │       ├── driveAccessGuard.ts     # Check Drive auth before operations
│   │       └── driveFolderResolver.ts  # Resolve Drive folder IDs for clients
│   │
│   ├── types/
│   │   └── index.ts                # Shared TypeScript types
│   │
│   └── middleware.ts               # Auth middleware — protects all (app) routes
```

---

## 4. Database Schema

All models in `prisma/schema.prisma`. Use `npx prisma db push` for all schema changes (never `prisma migrate dev`).

### User
Auth and access control.
```
id            cuid — primary key
name          string — display name
email         string UNIQUE — login credential
password      string? — bcrypt hash (null = OAuth, not used here)
role          enum UserRole (ADMIN | USER) default USER
active        bool default true — deactivated users cannot log in
createdAt/updatedAt
→ accounts[]  Account (NextAuth multi-provider, not used)
→ sessions[]  Session (NextAuth session storage)
→ campaigns[] Campaign (runs they created)
→ runs[]      GenerationRun (runs they triggered)
```

### Client
A client of the agency. Core entity everything else attaches to.
```
id            cuid
initials      varchar(10) — e.g. "FIT"
name          string — full client name
website       string? — optional
instagram     string? — optional
status        enum ClientStatus (AKTIV | INAKTIV | ARCHIVIERT) default AKTIV
createdAt/updatedAt
→ brandProfile BrandProfile? (one-to-one)
→ campaigns[]  Campaign[]
→ assets[]     ClientAsset[]
→ driveMappings ClientDriveMapping?
```

### BrandProfile
One per client. Contains everything about visual identity and Design DNA.
```
id                    cuid
clientId              string UNIQUE — FK → Client
primaryColor          string default "#000000" — hex
secondaryColors       json[] — array of hex strings
accentColors          json[] — array of hex strings
neutralPalette        json[] — array of hex strings
fontPrimary           string — primary font name (e.g. "Bebas Neue")
fontSecondary         string? — secondary font
fallbackFontPrimary   string? — web-safe fallback
fallbackFontSecondary string?
typographyClass       string? — "display-heavy" | "editorial" | "clean-sans" | "technical"
visualTone            string? — see Tone → DNA table below
imageTone             string? — e.g. "dark-cinematic", "bright-energetic"
componentRules        json{} — pricing style, overlay style, logo prominence, etc.
restrictions          json{notes, forbiddenColors[], forbiddenStyles[], forbiddenWording[]}
reviewStatus          enum BrandProfileStatus (ENTWURF | IN_PRUEFUNG | FREIGEGEBEN)
approved              bool — manual approval flag
confidenceScore       float 0–1 — stale cached score (use computeProfileCompleteness() for live)

-- Design DNA (auto-computed or admin-overridden) --
designDnaFont           string? — FontKey
designDnaLayout         string? — LayoutKey
designDnaPanelStyle     string? — PanelStyleDNA
designDnaColorIntensity string? — ColorIntensity
designDnaBorderRadius   int?
designDnaEnergyLevel    string? — EnergyLevel
designDnaOverridden     bool default false — if true, use stored DNA values, not auto-resolved
```

### ClientAsset
Files uploaded for a client: logos, reference ads, brand PDFs, etc.
```
id          cuid
clientId    string — FK → Client
assetType   enum ClientAssetType (logo|logo_alt|reference_ad|screenshot|brand_pdf|font|social_reference|website_reference)
fileName    string — original file name
fileUrl     string — URL or file path
fileSize    int? — bytes
mimeType    string?
source      string default "upload" — "upload" | "drive"
driveFileId string? — if sourced from Drive
metadata    json{} — extra metadata
active      bool default true
createdAt
```

### Campaign
One campaign per client. Contains all the copy and pricing for ads.
```
id              cuid
clientId        string — FK → Client
aworkTaskId     string? — external project management ID
title           string — internal campaign title
offerType       string — "mitgliedschaft" | "probe" | "kurs" etc.
headline        string? — main ad headline
subheadline     string? — optional sub-headline
urgencyText     string? — e.g. "Nur noch 5 Plätze!"
ctaText         string? — e.g. "Jetzt anmelden"
locationLine    string? — e.g. "München Mitte"
startDate       DateTime?
priceNew        Decimal(10,2)? — new/sale price
priceOld        Decimal(10,2)? — original price (for strikethrough)
billingInterval string? — "monatlich" | "jährlich"
contractTerm    string? — "12 Monate" etc.
notes           string? — internal notes
customText      string? — additional custom text
abbuchung       string? — billing note text
status          enum CampaignStatus (ENTWURF|BEREIT|IN_GENERIERUNG|ZUR_PRUEFUNG|FREIGEGEBEN|EXPORTIERT|ARCHIVIERT)
createdById     string? — FK → User
createdAt/updatedAt
→ runs[]        GenerationRun[]
```

### GenerationRun
One "run" = one full generation job = 12 assets. Tracks progress.
```
id                       cuid
campaignId               string — FK → Campaign
runNumber                int — sequential per campaign (unique with campaignId)
directionKey             string? — creative direction identifier
directionSummary         string? — human-readable direction description
directionMode            string default "automatisch"
environmentMode          enum EnvironmentMode (STANDARD_STUDIO | KUNDENSTUDIO_REFERENZ)
messagePriority          string? — what message to emphasize
placements               json[] — list of PlacementKey
audienceMatrix           json[] — list of AudienceKey
selectedReferenceAssetId string? — reference image to guide Higgsfield
normalizedPayload        json? — full normalized campaign data used for prompts
warnings                 json[] — soft warnings logged at run start
manualOverrides          json{} — any manual overrides applied
status                   enum GenerationRunStatus (IN_VORBEREITUNG|IN_GENERIERUNG|FERTIG|FEHLER|ABGEBROCHEN)
totalAssets              int default 0 — always 12 for full runs
completedAssets          int default 0 — increments when render completes (not when provider responds)
failedAssets             int default 0
progressPercent          int default 0 — (completedAssets + failedAssets) / totalAssets × 100
triggeredById            string? — FK → User
startedAt                DateTime?
finishedAt               DateTime?
errorLog                 string? — error details if status=FEHLER
studioReferenceImageUrl  string? — URL of reference image used
createdAt
→ assets[]       CreativeAsset[]
→ driveExportLogs DriveExportLog[]
```

### CreativeAsset
One per audience/placement pair within a run. The actual generated image.
```
id               cuid
generationRunId  string — FK → GenerationRun (cascade delete)
audienceKey      string — e.g. "frau_25_30"
placement        string — "feed_1080x1080" | "story_1080x1920"
dimensions       string? — "1080x1080" | "1080x1920"
imagePrompt      string? — the prompt sent to Higgsfield
negativePrompt   string?
promptBlocks     json? — structured prompt blocks before joining
renderSpec       json{} — full RenderSpec used for the overlay render
baseImageUrl     string? — URL of the Higgsfield background image
finalAssetUrl    string? — relative path to the final JPEG in public/exports/
provider         string? — "higgsfield" | "mock" | "gradient" (fallback)
providerJobId    string? — Higgsfield request ID
providerResponse json? — raw Higgsfield API response
errorMessage     string? — error if any stage failed
renderStatus     string? — render outcome detail
renderWarnings   json[] — non-fatal render warnings
renderedAt       DateTime? — when render completed
finalWidth       int? — output image width
finalHeight      int? — output image height
status           enum CreativeAssetStatus (AUSSTEHEND|IN_VORBEREITUNG|ANGEFRAGT|IN_GENERIERUNG|FERTIG|FEHLGESCHLAGEN|FREIGEGEBEN)
approved         bool default false — reviewer approved this asset
createdAt/updatedAt
```

### FontLibrary
Registry of fonts available in the system (Google Fonts by name or uploaded files).
```
id             cuid
name           string UNIQUE — exact font name
classification string — "display" | "sans-serif" | "serif" | "condensed" etc.
fileUrl        string? — path to uploaded font file (null = Google Fonts by name)
active         bool default true
createdAt
```

### ClientDriveMapping
Google Drive folder IDs per client for the Drive integration.
```
id                     cuid
clientId               string UNIQUE — FK → Client (cascade delete)
brandReadFolderId      string? — folder to read brand assets from
referencesReadFolderId string? — folder to read reference ads from
campaignsReadFolderId  string? — folder to read campaign data from
exportWriteFolderId    string? — folder to write exported ads to
createdAt/updatedAt
```

### IntegrationSetting
Key-value store for integration configuration. Keys used:
- `image_provider.active` — "higgsfield" | "mock"
- `anthropic.api_key` — encrypted Claude API key
- `google.drive.credentials` — encrypted Drive credentials
```
id        cuid
key       string UNIQUE
value     string — may be AES-256-GCM encrypted
updatedAt
```

### AppSetting
Key-value store for agency-level configuration. Keys used:
- `agency.name` — agency display name
- `agency.timezone` — timezone string
- `generation.default_offer_type` — default offer type
- `generation.max_runs_per_day` — rate limit
- `notifications.email_enabled` — bool string
```
id        cuid
key       string UNIQUE
value     string
updatedAt
updatedBy string? — user ID who last updated
```

### ActivityLog
Audit trail. Written via `logActivity()` in `src/lib/adminActivity.ts` (silent-fail).
```
id        cuid
userId    string — who did it
userName  string — denormalized for display
action    string — e.g. "Benutzer erstellt", "Run gestartet"
entity    string? — entity type
entityId  string? — entity ID
details   string? — extra context
createdAt
```

### DriveExportLog
Audit trail for Drive exports.
```
id              cuid
generationRunId string — FK → GenerationRun (cascade delete)
clientId        string
driveFolderId   string
driveFileIds    json[] — IDs of uploaded Drive files
status          string — "success" | "partial" | "failed"
assetCount      int — total assets attempted
exportedCount   int — successfully uploaded
errorMessage    string?
exportedById    string? — user ID
exportedAt      DateTime
```

### Enums
```
UserRole:             ADMIN | USER
ClientStatus:         AKTIV | INAKTIV | ARCHIVIERT
BrandProfileStatus:   ENTWURF | IN_PRUEFUNG | FREIGEGEBEN
CampaignStatus:       ENTWURF | BEREIT | IN_GENERIERUNG | ZUR_PRUEFUNG | FREIGEGEBEN | EXPORTIERT | ARCHIVIERT
GenerationRunStatus:  IN_VORBEREITUNG | IN_GENERIERUNG | FERTIG | FEHLER | ABGEBROCHEN
CreativeAssetStatus:  AUSSTEHEND | IN_VORBEREITUNG | ANGEFRAGT | IN_GENERIERUNG | FERTIG | FEHLGESCHLAGEN | FREIGEGEBEN
EnvironmentMode:      STANDARD_STUDIO | KUNDENSTUDIO_REFERENZ
ClientAssetType:      logo | logo_alt | reference_ad | screenshot | brand_pdf | font | social_reference | website_reference
```

---

## 5. Generation Pipeline — Step by Step

**Trigger:** User fills the generator form and clicks "12 Ads generieren".

### Step 1 — Form submission
`POST /api/generator/start` receives:
```json
{
  "clientId": "...",
  "offerType": "mitgliedschaft",
  "headline": "Jetzt Mitglied werden",
  "priceNew": "29.90",
  "priceOld": "49.90",
  "ctaText": "Kostenlos testen",
  "urgencyText": "Nur noch 5 Plätze!",
  "environmentMode": "STANDARD_STUDIO",
  "directionMode": "automatisch"
}
```

The route handler:
1. Creates a `Campaign` record with the submitted data
2. Creates a `GenerationRun` record (status: `IN_VORBEREITUNG`, totalAssets: 12)
3. Calls `runGenerationPipeline(run.id)` **without awaiting** (fire-and-forget)
4. Returns `{ runId, campaignId }` immediately so the client can start polling

### Step 2 — Pipeline starts (`generationPipelineService.ts`)
`runGenerationPipeline(runId)`:
1. Load run from DB with campaign + client + brand profile
2. Resolve active image provider (`getImageProvider()` → DB → env → mock)
3. Load logo file as base64 data URI (if exists in ClientAsset)
4. Build the audience × placement matrix = 12 combinations
5. Pre-create all 12 `CreativeAsset` records (status: `ANGEFRAGT`) so the UI can render slots immediately
6. Update run status to `IN_GENERIERUNG`
7. Process all 12 assets **in parallel** (Promise.all)

### Step 3 — Per-asset generation (inside Promise.all)
For each asset:
1. Build the Higgsfield prompt via `buildPrompt(audience, campaign, brandProfile)`
2. Mark asset `IN_GENERIERUNG`
3. Call `submitWithRetry(provider, input)` — up to 3 attempts with 5s delay
4. **If provider succeeds:** `baseImageUrl` = Higgsfield image URL
5. **If provider fails after all retries:** `baseImageUrl` = null (fallback gradient will be used)
6. Call `renderSingleAsset(assetId, baseImageUrl)` — always proceeds regardless of provider result

### Step 4 — Per-asset render (`finalRenderService.ts`)
`renderSingleAsset(assetId, baseImageUrl)`:
1. Load asset from DB with full run + campaign + brand profile context
2. Call `buildRenderSpec(asset, campaign, brandProfile)` → `RenderSpec` (dimensions, text, visibility flags, colors)
3. **Load base image:**
   - If `baseImageUrl` provided: `fetch()` the image bytes
   - If `baseImageUrl` is null: generate a gradient via Sharp: `linear-gradient(135deg, brandPrimaryColor → #0d1b2a → #060d14)`
4. Load logo as base64 data URI from file system (if brand has a logo ClientAsset)
5. Resolve Design DNA: `resolveDesignDNA(brandProfile)` → `{ font, layout, panelStyle, colorIntensity, borderRadius, energyLevel }`
6. Load DNA font buffer: `loadFontBuffer(dna.font)` → reads TTF file from `public/fonts/`
7. Build SVG overlay string: `renderLayout({ spec, dna, logo })` → dispatches to correct layout template
8. Render SVG → PNG via `@resvg/resvg-js`:
   - Passes DNA font buffer + Oswald Bold fallback
   - Returns PNG buffer
9. Sharp composite:
   - Resize base image to exact placement dimensions (1080×1080 or 1080×1920)
   - Composite PNG overlay on top
   - Output JPEG at 90% quality
10. Save: `saveExportedAsset(runId, assetId, jpegBuffer)` → `public/exports/{runId}/{assetId}.jpg`
11. Update `CreativeAsset` in DB: status=`FERTIG`, `finalAssetUrl`, `renderedAt`, dimensions
12. Increment `GenerationRun.completedAssets`, update `progressPercent`

### Step 5 — Run completion
After all 12 assets processed:
- If `completedAssets > 0`: run status → `FERTIG`
- If `completedAssets === 0` (render engine crashed on all): run status → `FEHLER`
- `finishedAt` = now

### Step 6 — Client polling
`GeneratorClient.tsx` polls `GET /api/runs/{runId}` every 2 seconds.
Returns `{ run: { status, progressPercent, completedAssets, assets: [...] } }`.
Each asset has `finalAssetUrl` once rendered.
Polling stops when `run.status === "FERTIG"` or `"FEHLER"`.

### Key invariant
**An asset is NEVER marked FEHLGESCHLAGEN due to Higgsfield failing.** Only a crash in the Sharp/resvg render engine marks it FEHLGESCHLAGEN. The gradient fallback ensures 12 outputs always exist.

---

## 6. Design DNA System

### What it is
Every client gets a unique visual identity for their ads. Instead of one static layout for all clients, the DNA system auto-assigns font + layout + panel style + color intensity from the brand profile.

### How it's resolved (`src/lib/render/dna-resolver.ts`)
`resolveDesignDNA(brandProfile)` returns a full `DesignDNA` object:
1. If `brandProfile.designDnaOverridden === true`: return the stored `designDna*` field values from DB
2. Otherwise auto-derive from `visualTone` + `typographyClass`:
   - Map `visualTone` → `EnergyLevel`
   - Map `typographyClass` + energy → `FontKey`
   - Map energy + tone → `LayoutKey`
   - Derive `panelStyle`, `colorIntensity`, `borderRadius` from same inputs

### Tone → DNA auto-assignment table
| visualTone | EnergyLevel | LayoutKey | FontKey |
|---|---|---|---|
| `energetic` | high | `full-bleed-text` | `bebas-neue` |
| `performance-heavy` | high | `full-bleed-text` | `bebas-neue` |
| `sale-driven` | high | `bottom-strip-hero` | `montserrat-black` |
| `local` | medium | `split-vertical` | `oswald-bold` |
| `modern` | medium | `center-panel` | `oswald-bold` |
| `premium` | refined | `center-panel` | `raleway-extrabold` |
| `boutique` | refined | `top-badge-bottom-price` | `cormorant-garamond` |
| `minimal` | refined | `top-badge-bottom-price` | `raleway-extrabold` |

### DNA types (`src/lib/render/design-dna.ts`)
```typescript
type FontKey = 'oswald-bold' | 'bebas-neue' | 'barlow-condensed-black' | 'montserrat-black'
             | 'anton' | 'raleway-extrabold' | 'cormorant-garamond' | 'teko-bold' | 'playfair-display'

type LayoutKey = 'bottom-left-panel' | 'center-panel' | 'full-bleed-text'
               | 'split-vertical' | 'top-badge-bottom-price' | 'bottom-strip-hero'

type PanelStyleDNA = 'glass' | 'solid-dark' | 'none' | 'strip'
type EnergyLevel   = 'high' | 'medium' | 'refined'
type ColorIntensity = 'aggressive' | 'moderate' | 'subtle'

// IMPORTANT: actual interface shape — use these exact field names when working with DesignDNA
interface DesignDNA {
  fontKey: FontKey;              // logical key for font registry
  fontFamily: string;            // CSS font-family for SVG text (e.g. "Bebas Neue")
  fontWeight: string;            // "700" for refined, "900" for all others
  textTransform: 'uppercase' | 'none';  // none only for boutique/minimal tones
  layoutKey: LayoutKey;
  panelStyle: PanelStyleDNA;
  colorIntensity: ColorIntensity;
  energyLevel: EnergyLevel;
  borderRadius: number;          // pixels
  textPosition: 'left' | 'center';  // center only for center-panel layout
}
```

**Important detail on font selection:** `selectFont()` in `dna-resolver.ts` pattern-matches against `typographyClass` string using `.includes()`:
- contains "condensed" or "sporty" → bebas-neue (high) / barlow-condensed-black (other)
- contains "elegant" or "serif" → cormorant-garamond (refined) / playfair-display (other)
- contains "display" → anton
- contains "geometric" → montserrat-black
- anything else ("neo-grotesk", etc.) → raleway-extrabold (refined) / montserrat-black (high) / oswald-bold (medium)

### Layout templates (`src/lib/render/layouts/`)
All layouts receive `LayoutInput = { spec: RenderSpec, dna: DesignDNA, logo: string | null }` and return an SVG string.

| LayoutKey | File | Description |
|---|---|---|
| `bottom-left-panel` | `bottom-left-panel.ts` | Glass/solid panel bottom-left, image fills canvas. Good for local gyms. |
| `center-panel` | `center-panel.ts` | Centered panel with top/bottom dividers, symmetric. Good for premium/modern. |
| `full-bleed-text` | `full-bleed-text.ts` | No panel, heavy bottom gradient, XL left-aligned text. High energy/performance. |
| `split-vertical` | `split-vertical.ts` | Brand color fills left 48%, image on right. Community/local brands. |
| `top-badge-bottom-price` | `top-badge-bottom-price.ts` | Offer type at top badge, price at bottom, image in middle. Boutique/refined. |
| `bottom-strip-hero` | `bottom-strip-hero.ts` | Brand color strip at bottom 30%, text in strip. Sale-driven/promotions. |

`renderLayout(input)` in `layouts/index.ts` dispatches to the correct template based on `input.dna.layout`.

Shared SVG helpers in `layouts/shared.ts`:
- `escXml(str)` — escape XML special chars
- `toUpper(str)` — uppercase text
- `strikethroughLine(x, y, width, color)` — SVG line for strikethrough price
- `wrapText(text, maxChars)` — simple word wrap

### Installed fonts (`public/fonts/`)
| File | FontKey | Family | CSS Weight |
|---|---|---|---|
| `Oswald-Bold.ttf` | `oswald-bold` | Oswald | 700 |
| `Bebas_Neue-Regular.ttf` | `bebas-neue` | Bebas Neue | 400 (inherently heavy) |
| `Barlow_Condensed-Black.ttf` | `barlow-condensed-black` | Barlow Condensed | 900 |
| `Montserrat-Black.ttf` | `montserrat-black` | Montserrat | 900 |
| `Anton-Regular.ttf` | `anton` | Anton | 400 (inherently heavy) |
| `Raleway-ExtraBold.ttf` | `raleway-extrabold` | Raleway | 800 |
| `Cormorant_Garamond-Bold.ttf` | `cormorant-garamond` | Cormorant Garamond | 700 |
| `Teko-Bold.ttf` | `teko-bold` | Teko | 700 |
| `Playfair_Display-Bold.ttf` | `playfair-display` | Playfair Display | 700 |

Oswald-Bold and Oswald-Regular are always loaded at module init in `finalRenderService.ts` as the universal fallback for resvg. The DNA font is loaded additionally per render.

### Admin DNA override
- On `/markenprofile/[clientId]` (ADMIN only): **Design DNA** card in right sidebar
- Dropdowns for all 6 values. Saving sets `designDnaOverridden = true`.
- Reset button clears all `designDna*` fields and sets `designDnaOverridden = false`
- API: `GET/PUT/DELETE /api/admin/brand-dna/[clientId]`

### Custom fonts (partial — not yet wired into render)
Admin can upload TTF/OTF/WOFF2 fonts via Admin → Schriften → Datei hochladen.
Files save to `public/fonts/custom/`. FontLibrary record created with `fileUrl`.
**However**: `font-registry.ts` only has the 9 hardcoded FontKey entries. Custom fonts are NOT yet usable in the render pipeline. This is a known gap.

---

## 7. Brand Onboarding Flow

3-step wizard at `/markenprofile/onboarding?client=[clientId]`.
Component: `src/components/brand/BrandOnboardingWizard.tsx`.
Requires `?client=` query param — redirects to `/kunden` if missing.

### Step 1 — Farben & Schriften
Fields collected:
- `primaryColor` — hex color picker
- `secondaryColors` — color palette editor (array of hex)
- `typographyClass` — select: "display-heavy" | "editorial" | "clean-sans" | "technical"
- `fontPrimary` — text input (font name)
- `fontSecondary` — text input (optional)
- `visualTone` — select: energetic | performance-heavy | sale-driven | local | modern | premium | boutique | minimal
- `imageTone` — select: e.g. dark-cinematic, bright-energetic, natural-authentic, etc.

### Step 2 — Komponentenregeln & Einschränkungen
Fields collected:
- `componentRules` (json object):
  - `pricingStyle` — how to display prices
  - `overlayStyle` — glass | solid | minimal | none
  - `logoProminence` — large | medium | small | hidden
  - `headlineStyle` — bold | regular | light
  - `ctaStyle` — button style
- `restrictions` (json object sent as):
  ```json
  { "notes": "free text...", "forbiddenColors": [], "forbiddenStyles": [], "forbiddenWording": [] }
  ```
  Note: the wizard only fills `notes` from a textarea. The arrays are always `[]`.

### Step 3 — Assets & Analyse
- Logo upload → saves as `ClientAsset { assetType: "logo" }`
- Reference ad upload → saves as `ClientAsset { assetType: "reference_ad" }`
- Brand PDF upload → saves as `ClientAsset { assetType: "brand_pdf" }`
- "PDF analysieren" button → `POST /api/markenprofile/{clientId}/analyse`

### Claude PDF Analysis
`POST /api/markenprofile/{clientId}/analyse`:
1. Load `ClientAsset` records where `assetType = "brand_pdf"` for this client
2. Download PDF bytes from `fileUrl`
3. Parse text with `pdf-parse`
4. Resolve Claude API key: env `ANTHROPIC_API_KEY` → DB `IntegrationSetting { key: "anthropic.api_key" }` (decrypted)
5. If no key: return `{ available: false }` — wizard shows gray info note "PDF-Analyse nicht verfügbar"
6. Send to Claude: structured prompt asking for colors, fonts, visual tone, restrictions
7. Claude returns JSON → parsed → `PUT /api/markenprofile/{clientId}` to save
8. `brandProfileService.runAnalysis()` handles the full flow

The brand profile detail page (`/markenprofile/[clientId]`) shows:
- All stored values
- Confidence + completeness bars (computed live via `computeProfileCompleteness()`)
- `BrandApprovalActions` — approve/reject buttons
- **Design DNA card** (admin-only) with `DesignDnaOverrideCard` component

---

## 8. Every API Route

### Auth
| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/auth/[...nextauth]` | GET/POST | — | NextAuth handler (login, session, signout) |

### Generator
| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/generator/start` | POST | USER | `{ clientId, offerType, headline, priceNew, priceOld?, ctaText?, urgencyText?, environmentMode?, directionMode? }` | `{ runId, campaignId }` |
| `/api/generator/upload-reference` | POST | USER | multipart form with `file`, `runId` | `{ assetUrl }` |

### Runs
| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/runs/[id]` | GET | USER | — | `{ run: { id, status, progressPercent, completedAssets, totalAssets, assets: [...] } }` |
| `/api/runs/[id]/render` | POST | USER | — | `{ ok: true }` — re-triggers render for existing run |
| `/api/runs/[id]/download` | GET | USER | — | ZIP stream of all `finalAssetUrl` files |

### Assets
| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/assets/[id]/approve` | PATCH | USER | `{ approved: bool }` | `{ asset }` |

### Clients
| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/kunden` | GET | USER | `?status=AKTIV` | `{ clients: [...] }` |
| `/api/kunden` | POST | USER | `{ name, initials, website?, instagram?, status? }` | `{ client }` |
| `/api/kunden/[id]` | GET | USER | — | `{ client }` |
| `/api/kunden/[id]` | PUT | USER | partial client fields | `{ client }` |
| `/api/kunden/[id]` | DELETE | ADMIN | — | `{ ok: true }` |
| `/api/kunden/search` | GET | USER | `?q=searchterm` | `{ clients: [...] }` — max 5, excludes ARCHIVIERT |

### Campaigns
| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/kampagnen` | GET | USER | `?clientId=...` | `{ campaigns: [...] }` |
| `/api/kampagnen` | POST | USER | campaign fields | `{ campaign }` |
| `/api/kampagnen/[id]` | GET | USER | — | `{ campaign }` |
| `/api/kampagnen/[id]` | PUT | USER | partial campaign fields | `{ campaign }` |
| `/api/kampagnen/[id]` | DELETE | ADMIN | — | `{ ok: true }` |
| `/api/kampagnen/[id]/starten` | POST | USER | generation options | `{ runId }` |

### Brand Profiles
| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/markenprofile/[clientId]` | GET | USER | — | `{ profile }` |
| `/api/markenprofile/[clientId]` | PUT | USER | brand profile fields | `{ profile }` |
| `/api/markenprofile/[clientId]/approve` | POST | ADMIN | `{ approved: bool }` | `{ profile }` |
| `/api/markenprofile/[clientId]/analyse` | POST | USER | — | `{ analysed: true, fields: {...} }` or `{ available: false }` |

### Admin — Stats & Activity
| Route | Method | Auth | Response |
|---|---|---|---|
| `/api/admin/stats` | GET | ADMIN | `{ totalClients, totalRuns, totalUsers, totalAssets, activeClients }` |
| `/api/admin/activity` | GET | ADMIN | `{ activities: [...] }` — top 10 merged from ActivityLog + GenerationRun + Client |

### Admin — Users
| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/admin/users` | GET | ADMIN | — | `{ users: [...] }` |
| `/api/admin/users` | POST | ADMIN | `{ name, email, password, role }` | `{ user }` |
| `/api/admin/users/[id]` | PATCH | ADMIN | `{ name?, email?, role? }` | `{ user }` — guards: cannot demote last ADMIN |
| `/api/admin/users/[id]/deactivate` | PATCH | ADMIN | `{ active: bool }` | `{ user }` — guards: self + last active ADMIN |

### Admin — Fonts
| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/admin/fonts` | GET | ADMIN | — | `{ fonts: [...] }` |
| `/api/admin/fonts` | POST | ADMIN | `{ name, classification }` | `{ font }` — adds by Google Fonts name |
| `/api/admin/fonts/[id]` | PATCH | ADMIN | `{ active: bool }` | `{ font }` |
| `/api/admin/fonts/upload` | POST | ADMIN | multipart: `file` (TTF/OTF/WOFF2, max 5MB) | `{ font }` — saves to `public/fonts/custom/` |

### Admin — Settings & Keys
| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/admin/settings` | GET | ADMIN | — | `{ settings: { key: value, ... } }` |
| `/api/admin/settings` | PATCH | ADMIN | `{ [key]: value, ... }` | `{ settings }` |
| `/api/admin/claude-key` | GET | ADMIN | — | `{ hasKey: bool, preview: "sk-...••••" }` |
| `/api/admin/claude-key` | PUT | ADMIN | `{ key: "sk-ant-..." }` | `{ ok: true }` |
| `/api/admin/claude-key` | DELETE | ADMIN | — | `{ ok: true }` |
| `/api/admin/brand-dna/[clientId]` | GET | ADMIN | — | `{ dna, overridden: bool }` |
| `/api/admin/brand-dna/[clientId]` | PUT | ADMIN | `{ font, layout, panelStyle, colorIntensity, borderRadius, energyLevel }` | `{ profile }` |
| `/api/admin/brand-dna/[clientId]` | DELETE | ADMIN | — | `{ ok: true }` — resets override |

### Admin — Providers
| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/admin/providers` | GET | ADMIN | — | `{ providers: [...], active: "higgsfield" }` |
| `/api/admin/providers/activate` | POST | ADMIN | `{ provider: "higgsfield" \| "mock" }` | `{ ok: true }` |
| `/api/admin/providers/higgsfield/test` | POST | ADMIN | — | `{ ok: bool, latencyMs: number }` |
| `/api/admin/providers/mock/test` | POST | ADMIN | — | `{ ok: true }` |

### Google Drive
| Route | Method | Auth | Description |
|---|---|---|---|
| `/api/drive/status` | GET | USER | Drive connection status |
| `/api/drive/test` | GET | USER | Test Drive API connection |
| `/api/drive/browse` | GET | USER | Browse Drive folder tree |
| `/api/drive/mappings/[clientId]` | GET | USER | Get folder mapping for client |
| `/api/drive/mappings/[clientId]` | PUT | USER | Save folder mapping for client |
| `/api/drive/export/[runId]` | POST | USER | Export run assets to Drive |

### Upload
| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/upload` | POST | USER | multipart `file` + `clientId` + `assetType` | `{ asset }` |
| `/api/assets/[id]` | DELETE | USER | — | `{ ok: true }` |

---

## 9. Environment Variables

All in `.env.local` (not committed to git).

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Required** | PostgreSQL connection string, e.g. `postgresql://trinity:trinity123@localhost:5432/trinity_ad_generator` |
| `NEXTAUTH_SECRET` | **Required** | Random secret for JWT signing, e.g. `trinity-local-secret-123456789` |
| `NEXTAUTH_URL` | **Required** | App base URL, e.g. `http://localhost:3000` |
| `APP_ENCRYPTION_KEY` | **Required** | 32-byte hex string for AES-256-GCM encryption of stored API keys. Generate: `openssl rand -hex 32` |
| `HIGGSFIELD_API_KEY` | Required for real generation | 64-char hex key from Higgsfield platform |
| `HIGGSFIELD_API_BASE` | Optional | Defaults to `https://platform.higgsfield.ai` |
| `GENERATION_PROVIDER` | Optional | `"higgsfield"` or `"mock"`. Falls back to DB setting, then mock. |
| `ANTHROPIC_API_KEY` | Optional | Claude API key for PDF analysis. Can also be set via Admin UI. |
| `REDIS_URL` | Optional | `redis://localhost:6379` — noted in env but not currently used in pipeline |

```env
# .env.local template
DATABASE_URL=postgresql://trinity:trinity123@localhost:5432/trinity_ad_generator
NEXTAUTH_SECRET=trinity-local-secret-123456789
NEXTAUTH_URL=http://localhost:3000
APP_ENCRYPTION_KEY=<run: openssl rand -hex 32>

HIGGSFIELD_API_KEY=<64-char hex from Higgsfield dashboard>
HIGGSFIELD_API_BASE=https://platform.higgsfield.ai
GENERATION_PROVIDER=higgsfield

ANTHROPIC_API_KEY=<optional — or set via Admin → Integrationen>
```

---

## 10. What Is Fully Working (End to End)

- **Auth** — Login with email + password, session management, ADMIN/USER roles, middleware protection
- **Client management** — Create, edit, list, archive clients. Status badges. Initials avatar.
- **Brand profile onboarding** — Full 3-step wizard. Color picker, typography, visual tone, component rules, restrictions, asset uploads
- **Brand profile detail page** — All fields displayed, confidence bar, approval actions, Design DNA card
- **Design DNA system** — Auto-resolved from brand profile visualTone + typographyClass. 6 layouts, 9 fonts. All rendering correctly
- **Admin DNA override** — Override any of 6 DNA values per client, reset to auto. Full API.
- **Campaign management** — Create/edit campaigns with all fields. Status flow.
- **Generator hero page** — Client search (keyboard nav, avatar, status badge), form reveal, all fields, generate button
- **Generation pipeline** — Fire-and-forget, 12 assets in parallel, Higgsfield + fallback gradient, DNA render, JPEG output
- **Real-time polling** — 2s interval, progress bar, asset grid fills in as renders complete
- **Fallback rendering** — If Higgsfield fails, gradient background used. Never zero output.
- **Run review page** — 12-asset grid, approve/flag per asset, lightbox, asset details
- **Asset download** — ZIP download of all final assets in a run
- **Admin panel — 5 tabs** — All tabs fully functional
- **Admin user management** — Create, edit, deactivate users. Role guards. Last-admin protection.
- **Admin font library** — List fonts, add by Google Fonts name, toggle active/inactive
- **Admin font upload** — Upload TTF/OTF/WOFF2, saved to `public/fonts/custom/`, FontLibrary record created
- **Admin activity log** — Merged feed from 3 sources, top 10
- **Admin Claude API key** — Save/edit/remove encrypted key via UI
- **Admin settings (AppSetting)** — Agency name, timezone, generation defaults, notification toggle
- **Google Drive integration** — Connect, map client folders, export runs, browse folders
- **Brand PDF analysis** — Claude reads PDFs and fills brand profile fields
- **Provider switching** — Switch between Higgsfield and Mock via Admin UI or env var
- **Prompt engine** — Audience-specific Higgsfield prompts built from brand data

---

## 11. What Is Partially Working

- **Brand profile edit page** (`/markenprofile/[clientId]/bearbeiten`) — File exists but may be a stub. The main detail page at `/markenprofile/[clientId]` shows all data; the edit flow is unclear.
- **Historie page** (`/historie`) — Page exists with timeline grouped by client, but filtering by date/client/status is not implemented.
- **Uebersicht page** (`/uebersicht`) — Page exists but root now redirects to `/generator` not `/uebersicht`.
- **Admin font library ↔ render pipeline** — Fonts added via Admin Schriften tab are in the DB and appear in the UI, but they are **not** available as `FontKey` choices in the DNA system. The render pipeline only knows the 9 hardcoded TTF keys. Custom fonts cannot be selected in DNA overrides.

---

## 12. What Is Not Built Yet

- **Re-render single asset** — No per-asset retry button in ReviewGrid. The `/api/runs/[id]/render` route exists (re-renders whole run) but no per-slot button.
- **Higgsfield model selection** — Admin UI to pick which Higgsfield model (soul, seedream, etc.). `HIGGSFIELD_APPLICATION` is commented out in env.
- **Historie filters** — Filter runs by client, date range, status.
- **Drive auto-export** — Trigger Drive export automatically after generation completes.
- **Custom font → DNA pipeline** — Uploaded fonts in `public/fonts/custom/` need dynamic entries in `font-registry.ts` to be usable in the render engine.
- **DNA preview** — Live mini-preview of layout + font in the DNA override card.
- **Per-user client scoping** — Currently all users see all clients. No per-user workspace isolation.
- **Notification system** — Email toggle exists in settings but no email sending is implemented.

---

## 13. Known Bugs

| Bug | Location | Impact | Fix |
|---|---|---|---|
| TypeScript error: `Property '0' does not exist on type...` | `src/app/(app)/kunden/[id]/page.tsx` | Low — pre-existing, doesn't affect runtime | Fix array access pattern in the relevant query result |
| `confidenceScore` in DB goes stale | `BrandProfile.confidenceScore` | Low — display only | Already mitigated: `computeProfileCompleteness()` computes live from actual fields. DB value is ignored for display. |
| Custom uploaded fonts not usable in renders | `src/lib/render/font-registry.ts` | Medium | Add dynamic font registry loading that reads from `public/fonts/custom/` and maps to FontKey |

---

## 14. Design Decisions

### Why Higgsfield (not Dall-E, Midjourney, etc.)
Best-in-class for fitness lifestyle photography. Produces realistic gym, outdoor workout, and athlete imagery that matches client expectations. The app's render engine handles all branding on top.

### Why fallback gradient (not failure state)
A brand-colored gradient with properly rendered text is a usable ad. An "error" page is not. The fallback makes the tool production-safe even when Higgsfield is down or rate-limited.

### Why inline render (not separate step)
Earlier architecture had a separate `/render` step after provider. Now render happens immediately inline after each provider response. Progress bar reflects actual rendered output, not "provider submitted" events.

### Why confidence computed live (not from DB)
`BrandProfile.confidenceScore` in the DB goes stale as fields are added/removed. `computeProfileCompleteness()` reads the current actual field values fresh every time. The DB column exists but is not the source of truth.

### Why brand issues don't block generation
Brand warnings (no profile, not approved, low confidence) are soft notices. Users must be able to run generations for clients that are still being onboarded. The tool should never be blocked by incomplete brand data.

### Why Design DNA (not one layout for all)
Every client getting the same layout looked generic. The DNA system gives each client a distinct visual personality derived from their brand profile, with no manual work needed from staff. High-energy brands get Bebas Neue + full-bleed. Refined brands get Cormorant Garamond + centered panels.

### Why local TTF files (not Google Fonts at runtime)
`@resvg/resvg-js` renders SVG headlessly on the server without a browser. It cannot download fonts from URLs. All fonts must be loaded as Buffer from disk before rendering. Hence all fonts in `public/fonts/` as TTF files.

### Why `prisma db push` (not `prisma migrate dev`)
`prisma migrate dev` requires interactive terminal prompts for naming migrations. The shell environment where this runs doesn't support interactive prompts. `prisma db push` applies schema changes directly without migrations.

### Sidebar navigation (as of March 2026)
Removed numbered workflow steps (1 Kunden → 2 Markenprofile → etc.). Generator is now the primary entry point. Markenprofile was removed from nav (accessible via client detail). Root redirect is `/generator`.

### Why Plus Jakarta Sans (not Inter)
Inter is the default for every Tailwind template. Plus Jakarta Sans gives the UI a more distinct, agency-grade typographic feel without looking like every other admin panel.

### Design token system
Custom Tailwind tokens defined in `tailwind.config.js`:
- `surface` — warm off-white background
- `sidebar.*` — dark sidebar colors
- `accent.*` — electric blue CTA color
- `ink.*` — text colors (never gray-*)
- `border.*` — border colors
- `success.*`, `warning.*`, `danger.*` — status colors
- `shadow-card`, `shadow-card-hover` — card elevation tokens

**Never use:** gray-*, raw blue-*, default tailwind bg-white for content areas, Inter font.

---

## 15. Gotchas & Non-Obvious Rules

### Native modules — never import server libs in client components
`sharp`, `@resvg/resvg-js`, `pdf-parse`, and `fs` are server-only. They're in `serverComponentsExternalPackages` in `next.config.mjs`. If you accidentally import them in a client component or any file that ships to the browser, the build breaks with a webpack error about `.node` binaries.

### `next.config.mjs` must stay as-is
```js
experimental: {
  serverComponentsExternalPackages: ["@resvg/resvg-js", "sharp", "pdf-parse"],
}
```
And the `webpack.externals` override for `@resvg/resvg-js` on the server. Do not remove these.

### Middleware protects everything
`src/middleware.ts` uses `next-auth/middleware` and protects all routes **except** `/login`, `/api/auth/*`, `/_next/*`, `/favicon.ico`. Any new public route must be added to the matcher exclusion list.

### Auth: ADMIN check pattern
In API routes, check role like this:
```typescript
const session = await getServerSession(authOptions);
if (session?.user?.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

### Prisma: always `db push`, never `migrate dev`
`prisma migrate dev` requires interactive input (asks you to name the migration). It will hang in this shell environment. Use `npx prisma db push` for all schema changes.

### DesignDNA field names
The Prisma model uses `designDnaFont`, `designDnaLayout`, etc. (with `designDna` prefix).
The `DesignDNA` TypeScript interface uses `fontKey`, `layoutKey`, `panelStyle`, etc. (no prefix, shorter names).
Don't mix them up — the resolver maps from Prisma fields to the TS interface.

### SVG font rendering — resvg needs font buffers upfront
`@resvg/resvg-js` cannot load fonts from URLs or system fonts (in most cases). Fonts **must** be passed as `Buffer` via `fontBuffers` in the opts object. The render service loads Oswald Bold + Regular at module init, then loads the DNA-specific font per render. If a font file is missing from `public/fonts/`, the text silently falls back to system Arial.

### JPEG output path
Generated images are saved to `public/exports/{runId}/{assetId}.jpg` and served as static files at `/exports/{runId}/{assetId}.jpg`. The directory is created automatically by `assetExportService.ts`. Do not move or rename `public/exports/` without updating that service.

### Generation is fire-and-forget
`POST /api/generator/start` returns `{ runId }` immediately. The pipeline runs in the background with no queue — it's a plain async function launched without `await`. This means if the Next.js process restarts mid-generation, in-progress runs will be stuck at `IN_GENERIERUNG`. There's no recovery mechanism for this.

### Confidence score in DB is stale
`BrandProfile.confidenceScore` is written by older code and may not reflect current fields. Always use `computeProfileCompleteness(profile)` from `src/lib/brandAnalysis.ts` to get the live score.

### Client search excludes ARCHIVIERT
`GET /api/kunden/search` always excludes clients with `status = "ARCHIVIERT"`. This is intentional — archived clients shouldn't appear in the generator.

### Google Drive credentials storage
Drive credentials are stored as encrypted JSON in `IntegrationSetting { key: "google.drive.credentials" }`. The `APP_ENCRYPTION_KEY` env var must be set and consistent — if it changes, previously encrypted values become unreadable.

### Tailwind design tokens — quick reference
```
// Content background
bg-surface                  // #F8F8F7 warm off-white

// Sidebar
bg-sidebar                  // #0A0A0A
bg-sidebar-hover            // #141414
bg-sidebar-active           // #1C1C1C
border-sidebar-border       // #1F1F1F
text-sidebar-muted          // #6A6A6A
text-sidebar-text           // #E8E8E6

// Primary accent (electric blue)
bg-accent-600               // #2B5EE8  ← primary CTA color
bg-accent-500               // #3B6EF8
text-accent-600
border-accent-200

// Text / ink
text-ink                    // #1A1A1A  ← primary text
text-ink-secondary          // #4A4A4A
text-ink-muted              // #7A7A7A
text-ink-faint              // #A8A8A6

// Borders
border-border               // #EBEBEA
border-border-medium        // #E0DFDB
border-border-strong        // #C8C7C3

// Semantic
text-success / bg-success-bg / border-success-border
text-warning / bg-warning-bg / border-warning-border
text-danger  / bg-danger-bg  / border-danger-border

// Shadows (use on cards)
shadow-card
shadow-card-hover           // apply on hover for lift effect
shadow-panel                // for modals/overlays
```

**Rules:**
- Never use `gray-*`, `blue-*`, `white` (use `surface` for content bg), or `Inter`
- Page layout: `px-8 py-10 max-w-5xl space-y-8`
- Admin panel: `max-w-6xl`
- Cards: `bg-white rounded-xl shadow-card` with `hover:shadow-card-hover` transition

---

## 15. How to Run the Project

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.local.example .env.local  # if exists
# Edit .env.local with your DATABASE_URL, NEXTAUTH_SECRET, etc.

# 3. Generate Prisma client
npx prisma generate

# 4. Push schema to database
npx prisma db push

# 5. Seed initial data (creates admin user)
npm run db:seed

# 6. Start dev server
npm run dev

# App runs at http://localhost:3000
# Default admin: check prisma/seed.ts for credentials
```

**Prerequisites:**
- Node.js 18+
- PostgreSQL running locally (or update DATABASE_URL to point elsewhere)
- `APP_ENCRYPTION_KEY` must be set before any API keys can be stored

---

## 16. How to Reset Data

```bash
# Wipe ALL data and re-apply schema
npx prisma migrate reset
# This drops all tables, re-applies schema, re-runs seed

# Or to wipe just the data (keep schema):
# Connect to psql and run: TRUNCATE TABLE clients, brand_profiles, campaigns, ... CASCADE;

# To clear generated files:
rm -rf public/exports/*

# To re-seed only:
npm run db:seed

# To open Prisma Studio (visual DB browser):
npm run db:studio
```

---

## 17. Current State Summary (as of March 2026)

The Trinity Ad Generator is a fully functional V1. The complete workflow from client onboarding through brand profile setup, campaign creation, AI generation, review, and Google Drive export all work end-to-end. The Design DNA system is fully implemented with 6 layouts and 9 fonts auto-assigned from brand profiles, with admin override capability. The admin panel covers user management, font library, provider switching, Claude API key management, and agency settings. The primary remaining gaps are: (1) per-asset re-render button in the review grid, (2) custom uploaded fonts not yet wired into the render pipeline, (3) Higgsfield model picker for admin, and (4) drive auto-export after generation. The next priority is likely the per-asset re-render button, as it's the most operationally impactful missing feature — if one of 12 assets renders poorly, there's currently no way to retry just that slot.
