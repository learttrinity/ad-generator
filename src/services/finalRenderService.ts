/**
 * Final Render Service – V2
 *
 * Per-asset render pipeline:
 *   1. Load asset with full run + campaign + brand context
 *   2. Build RenderSpec
 *   3. Load base image (or generate fallback gradient)
 *   4. Load logo as data URI (if available)
 *   5. Build transparent SVG overlay (svgRenderer)
 *   6. Render SVG → PNG via @resvg/resvg-js (real fonts: Oswald Bold/Regular)
 *   7. Sharp: resize base image + composite PNG overlay → JPEG
 *   8. Save and update DB
 *
 * The render engine NEVER fails due to a missing background image.
 */

import sharp from "sharp";
import { Resvg } from "@resvg/resvg-js";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { buildRenderSpec } from "@/lib/renderSpecBuilder";
import { buildOverlaySvg } from "@/lib/svgRenderer";
import { saveExportedAsset } from "@/services/assetExportService";
import { creativeAssetRepository } from "@/repositories/creativeAssetRepository";
import { getPlacement } from "@/lib/audienceMatrix";

// ─── Font loading (cached at module init) ──────────────────────────────────────

function tryReadFont(filename: string): Buffer | null {
  const fontPath = path.join(process.cwd(), "public", "fonts", filename);
  if (fs.existsSync(fontPath)) {
    try {
      return fs.readFileSync(fontPath);
    } catch {
      return null;
    }
  }
  return null;
}

const FONT_OSWALD_BOLD    = tryReadFont("Oswald-Bold.ttf");
const FONT_OSWALD_REGULAR = tryReadFont("Oswald-Regular.ttf");

const FONT_BUFFERS: Buffer[] = [
  FONT_OSWALD_BOLD,
  FONT_OSWALD_REGULAR,
].filter((b): b is Buffer => b !== null);

const HAS_FONTS = FONT_BUFFERS.length > 0;

if (HAS_FONTS) {
  console.log(`[render] Oswald fonts loaded: Bold=${!!FONT_OSWALD_BOLD}, Regular=${!!FONT_OSWALD_REGULAR}`);
} else {
  console.warn("[render] No custom fonts found — falling back to system fonts");
}

// ─── SVG → PNG via resvg (with Oswald font) ───────────────────────────────────

async function svgToPng(svgString: string): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: any = {
    fonts: {
      fontBuffers: FONT_BUFFERS,
      loadSystemFonts: !HAS_FONTS,
      defaultFontFamily: HAS_FONTS ? "Oswald" : "Arial",
    },
    fitTo: { mode: "original" },
  };
  const resvg = new Resvg(svgString, opts);
  const rendered = resvg.render();
  return Buffer.from(rendered.asPng());
}

// ─── Price formatting helpers ──────────────────────────────────────────────────

function formatPrice(value: { toString(): string } | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const num = parseFloat(value.toString());
  if (isNaN(num)) return null;
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatBillingInterval(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const n = raw.trim().toLowerCase();
  if (n.includes("monat") || n === "mtl." || n === "mtl" || n === "monthly") return "/ mtl.";
  if (n.includes("jahr") || n === "jährl." || n === "yearly" || n === "annual") return "/ jährl.";
  if (n.includes("woche") || n === "wöchentl.") return "/ wöchentl.";
  // Already formatted (starts with /)
  if (n.startsWith("/")) return raw.trim();
  // Free-form: prepend /
  return `/ ${raw.trim()}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RenderResult = {
  assetId: string;
  success: boolean;
  finalAssetUrl?: string;
  error?: string;
  warnings: string[];
  usedFallbackBackground?: boolean;
};

// ─── Fallback gradient background ────────────────────────────────────────────

async function generateFallbackBackground(
  width: number,
  height: number,
  brandColor: string | null,
): Promise<Buffer> {
  const c1  = /^#[0-9A-Fa-f]{6}$/.test(brandColor ?? "") ? brandColor! : "#1E3A5F";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stop-color="${c1}"     stop-opacity="1"/>
        <stop offset="55%"  stop-color="#0d1b2a"   stop-opacity="1"/>
        <stop offset="100%" stop-color="#060d14"   stop-opacity="1"/>
      </linearGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#bg)"/>
  </svg>`;
  return sharp(Buffer.from(svg, "utf-8"))
    .resize(width, height)
    .png()
    .toBuffer();
}

// ─── Image loading helpers ────────────────────────────────────────────────────

async function loadImageBuffer(urlOrPath: string): Promise<Buffer> {
  if (urlOrPath.startsWith("http://") || urlOrPath.startsWith("https://")) {
    const res = await fetch(urlOrPath);
    if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${urlOrPath}`);
    return Buffer.from(await res.arrayBuffer());
  }
  const absPath = path.join(process.cwd(), "public", urlOrPath);
  if (!fs.existsSync(absPath)) throw new Error(`Local image not found: ${absPath}`);
  return fs.readFileSync(absPath);
}

async function loadLogoAsDataUri(logoUrl: string): Promise<string | null> {
  try {
    const buf  = await loadImageBuffer(logoUrl);
    const mime = logoUrl.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${mime};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}

// ─── Single-asset render ──────────────────────────────────────────────────────

export async function renderSingleAsset(assetId: string): Promise<RenderResult> {
  const warnings: string[] = [];

  const asset = await prisma.creativeAsset.findUnique({
    where: { id: assetId },
    include: {
      generationRun: {
        include: {
          campaign: {
            include: {
              client: {
                include: { brandProfile: true, assets: true },
              },
            },
          },
        },
      },
    },
  });

  if (!asset) return { assetId, success: false, error: "Asset nicht gefunden", warnings };

  const run      = asset.generationRun;
  const campaign = run.campaign;
  const brand    = campaign.client.brandProfile;

  await creativeAssetRepository.update(assetId, { renderStatus: "rendering" });

  try {
    // 1. Dimensions
    const placement = getPlacement(asset.placement);
    const { width, height } = placement;

    // 2. Base image or fallback gradient
    let baseBuffer: Buffer;
    let usedFallbackBackground = false;

    if (asset.baseImageUrl) {
      try {
        baseBuffer = await loadImageBuffer(asset.baseImageUrl);
      } catch (err) {
        console.warn(`[render] Base image fetch failed for ${assetId}, using fallback:`, err);
        baseBuffer = await generateFallbackBackground(width, height, brand?.primaryColor ?? null);
        usedFallbackBackground = true;
        warnings.push("Hintergrundbild nicht verfügbar – Fallback-Gradient verwendet");
      }
    } else {
      baseBuffer = await generateFallbackBackground(width, height, brand?.primaryColor ?? null);
      usedFallbackBackground = true;
      warnings.push("Kein Hintergrundbild – Fallback-Gradient verwendet");
    }

    // 3. Logo
    let logoDataUri: string | null = null;
    const logoAsset = campaign.client.assets.find((a) => a.assetType === "logo" && a.active);
    if (logoAsset) {
      logoDataUri = await loadLogoAsDataUri(logoAsset.fileUrl);
      if (!logoDataUri) warnings.push("Logo konnte nicht geladen werden – wird ausgelassen");
    }

    // 4. Build RenderSpec
    const componentRules =
      brand?.componentRules &&
      typeof brand.componentRules === "object" &&
      !Array.isArray(brand.componentRules)
        ? (brand.componentRules as Record<string, string>)
        : null;

    const spec = buildRenderSpec({
      placementKey:         asset.placement,
      directionKey:         run.directionKey ?? "clean_studio",
      messagePriority:      run.messagePriority ?? "ausgeglichen",
      offerType:            campaign.offerType ?? "",
      customText:           (campaign as Record<string, unknown>).customText as string | null ?? null,
      brandPrimaryColor:    brand?.primaryColor ?? null,
      brandSecondaryColors: brand?.secondaryColors ?? [],
      brandAccentColors:    brand?.accentColors ?? [],
      brandFontPrimary:     brand?.fontPrimary ?? null,
      brandTypographyClass: brand?.typographyClass ?? null,
      brandComponentRules:  componentRules,
      hasLogo:              !!logoDataUri,
      headline:             campaign.headline ?? "",
      subheadline:          campaign.subheadline ?? null,
      priceNew:             formatPrice(campaign.priceNew),
      priceOld:             formatPrice(campaign.priceOld),
      billingInterval:      formatBillingInterval(campaign.billingInterval),
      urgencyText:          campaign.urgencyText ?? null,
      ctaText:              campaign.ctaText ?? null,
      locationLine:         campaign.locationLine ?? null,
    });

    // 5. Build SVG overlay
    const svgString = buildOverlaySvg(spec, logoDataUri);

    // 6. Render SVG → PNG via resvg (with Oswald fonts)
    const overlayPng = await svgToPng(svgString);

    // 7. Sharp: resize base + composite PNG overlay → JPEG
    const jpgBuffer = await sharp(baseBuffer)
      .resize(spec.width, spec.height, { fit: "cover", position: "center" })
      .composite([{ input: overlayPng, top: 0, left: 0 }])
      .jpeg({ quality: 90, progressive: true })
      .toBuffer();

    // Quality checks
    const fileSizeMB = jpgBuffer.byteLength / (1024 * 1024);
    if (fileSizeMB > 2) {
      warnings.push(`Dateigröße ${fileSizeMB.toFixed(1)} MB übersteigt 2 MB Empfehlung`);
    }

    // 8. Save JPEG
    const finalUrl = await saveExportedAsset(run.id, assetId, jpgBuffer);

    // 9. Update asset
    await creativeAssetRepository.update(assetId, {
      finalAssetUrl: finalUrl,
      renderSpec:    JSON.parse(JSON.stringify(spec)),
      renderStatus:  "complete",
      renderWarnings: warnings,
      renderedAt:    new Date(),
      finalWidth:    spec.width,
      finalHeight:   spec.height,
    });

    return { assetId, success: true, finalAssetUrl: finalUrl, warnings, usedFallbackBackground };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[render] Asset ${assetId} failed:`, msg);
    await creativeAssetRepository.update(assetId, {
      renderStatus:  "failed",
      errorMessage:  msg,
    });
    return { assetId, success: false, error: msg, warnings };
  }
}

// ─── Batch render for a full run ──────────────────────────────────────────────

export async function renderRunAssets(runId: string): Promise<RenderResult[]> {
  const assets = await prisma.creativeAsset.findMany({
    where: {
      generationRunId: runId,
      finalAssetUrl:   null,
      status:          { in: ["FERTIG", "FEHLGESCHLAGEN"] },
    },
    select: { id: true },
  });

  if (assets.length === 0) return [];

  const CONCURRENCY = 4;
  const results: RenderResult[] = [];

  for (let i = 0; i < assets.length; i += CONCURRENCY) {
    const batch = assets.slice(i, i + CONCURRENCY).map(({ id }) => renderSingleAsset(id));
    const settled = await Promise.allSettled(batch);
    for (const r of settled) {
      if (r.status === "fulfilled") {
        results.push(r.value);
      } else {
        results.push({ assetId: "unknown", success: false, error: String(r.reason), warnings: [] });
      }
    }
  }

  return results;
}
