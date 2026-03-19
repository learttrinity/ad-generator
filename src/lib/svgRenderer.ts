/**
 * SVG Renderer – V2
 *
 * Transparent-background SVG overlay assembled from layered components.
 * @resvg/resvg-js renders it with Oswald fonts; Sharp composites onto base image.
 *
 * Component stack (bottom → top):
 *   1. Gradient overlay      — darkens background for legibility
 *   2. Glass panel           — semi-transparent rounded container
 *   3. Logo                  — top-center
 *   4. Headline badge        — optional pill below logo
 *   5. Offer content         — inside glass panel (MONATLICH/KÜNDBAR, price, etc.)
 *   6. Bottom strip          — optional full-width urgency bar
 *
 * Fonts: Oswald Bold (700) for display/price, Oswald Regular (400) for secondary.
 * Character width approximation for uppercase Oswald: ~0.52 × font-size.
 */

import { escXml } from "./textHierarchy";
import type { RenderSpec } from "./renderSpecBuilder";

// ─── Public entry point ────────────────────────────────────────────────────────

export function buildOverlaySvg(spec: RenderSpec, logoBase64: string | null): string {
  const { width, height } = spec;
  const isStory = height > width;
  const font    = { family: "Oswald", bold: "700", regular: "400" };

  const layout = computeLayout(spec, isStory);

  const parts: string[] = [];

  // 1. Gradient overlay
  parts.push(gradientOverlay(width, height, isStory));

  // 2. Glass panel
  parts.push(glassPanel(layout));

  // 3. Logo (top-center, no logo → skip entirely)
  if (spec.showLogo && logoBase64) {
    parts.push(logoElement(width, logoBase64, isStory));
  }

  // 4. Headline badge (optional pill below logo)
  if (spec.showHeadline && spec.headline.trim()) {
    parts.push(headlineBadge(spec, layout, font, isStory, width));
  }

  // 5. Offer content inside glass panel
  parts.push(...offerContent(spec, layout, font, isStory));

  // 6. Bottom strip (urgency)
  if (spec.urgencyText?.trim()) {
    parts.push(bottomStrip(spec, layout, font, width, isStory));
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>${gradientDef(isStory)}</defs>
  ${parts.join("\n  ")}
</svg>`;
}

// ─── Layout ───────────────────────────────────────────────────────────────────

type Layout = {
  panelX:   number;
  panelY:   number;
  panelW:   number;
  panelH:   number;
  panelR:   number;
  padX:     number;
  padY:     number;
  contentX: number;
  contentW: number;
  contentY: number;
  cx:       number;   // text center
  stripH:   number;
  stripY:   number;
  logoY:    number;
  badgeY:   number;
};

function computeLayout(spec: RenderSpec, isStory: boolean): Layout {
  const W = spec.width, H = spec.height;

  // Panel horizontal dimensions
  const panelX = isStory ? 60 : 50;
  const panelW = isStory ? W - 120 : 560;   // Story: full-width-ish; Feed: left half
  const panelR = isStory ? 24 : 20;
  const padX   = isStory ? 48 : 36;
  const padY   = isStory ? 44 : 40;
  const contentW = panelW - padX * 2;
  const cx = isStory ? Math.round(W / 2) : panelX + Math.round(panelW / 2);

  // Strip
  const hasStrip = !!(spec.urgencyText?.trim());
  const stripH   = isStory ? 96 : 80;
  const bottomMargin = hasStrip ? stripH + 12 : 24;

  // Estimate content height so panel fits snugly
  const estH = estimateContentHeight(spec, contentW, isStory);
  const panelH = estH + padY * 2 + 16;  // slight breathing room
  const panelY = H - panelH - bottomMargin;

  const stripY = H - stripH;

  return {
    panelX, panelY, panelW, panelH, panelR,
    padX, padY,
    contentX: panelX + padX,
    contentW,
    contentY: panelY + padY,
    cx,
    stripH, stripY,
    logoY:  isStory ? 80  : 52,
    badgeY: isStory ? 240 : 150,
  };
}

/**
 * Estimates the total pixel height the offer content will occupy,
 * so the glass panel can be sized to fit it snugly.
 */
function estimateContentHeight(spec: RenderSpec, contentW: number, isStory: boolean): number {
  const offerType = normalizeOfferType(spec.offerType);
  let h = 0;

  if (offerType === "monatskuendbar") {
    const heroFs   = clampHeroFs(isStory ? 108 : 92, contentW, 9);  // "MONATLICH" = 9 chars
    const heroLineH = Math.round(heroFs * 1.08);
    h += heroFs + heroLineH;                              // "MONATLICH" + "KÜNDBAR"
    h += Math.round(heroFs * 0.48) + 20;                 // gap after hero block
    if (spec.showOldPrice && spec.priceOld) h += (isStory ? 30 : 26) + 14;
    if (spec.showPrice && spec.priceNew) {
      const priceFs = clampPriceFs(isStory ? 100 : 86, contentW, spec.priceNew);
      h += priceFs + 8;
      if (spec.showBillingInterval && spec.billingInterval) h += isStory ? 34 : 28;
    }
  } else if (offerType === "preisaktion") {
    if (spec.showOldPrice && spec.priceOld) h += (isStory ? 34 : 30) + 14;
    else h += 20;
    if (spec.showPrice && spec.priceNew) {
      const priceFs = clampPriceFs(isStory ? 130 : 110, contentW, spec.priceNew);
      h += priceFs + 8;
      if (spec.showBillingInterval && spec.billingInterval) h += isStory ? 38 : 32;
    }
  } else if (offerType === "custom") {
    if (spec.customText) {
      let fs   = isStory ? 90 : 78;
      let lines = wrapOswald(spec.customText.toUpperCase(), contentW, fs);
      while (lines.length > 2 && fs > 32) { fs = Math.round(fs * 0.88); lines = wrapOswald(spec.customText.toUpperCase(), contentW, fs); }
      h += fs * lines.length + (lines.length - 1) * Math.round(fs * 0.1) + 24;
    }
    if (spec.showOldPrice && spec.priceOld) h += (isStory ? 30 : 26) + 12;
    if (spec.showPrice && spec.priceNew) {
      const priceFs = clampPriceFs(isStory ? 96 : 82, contentW, spec.priceNew);
      h += priceFs + 8;
      if (spec.showBillingInterval && spec.billingInterval) h += isStory ? 34 : 28;
    }
  } else {
    h = isStory ? 460 : 400; // safe default
  }

  return h;
}

// ─── Helpers: font-size clamping ─────────────────────────────────────────────

function clampHeroFs(maxFs: number, contentW: number, charCount: number): number {
  const safe = Math.floor(contentW / (charCount * 0.52));
  return Math.min(maxFs, safe);
}

function clampPriceFs(maxFs: number, contentW: number, priceText: string): number {
  const safe = Math.floor(contentW / (priceText.length * 0.62));
  return Math.min(maxFs, Math.max(safe, 40));
}

function normalizeOfferType(ot: string): string {
  return (ot || "").toLowerCase()
    .replace(/ü/g, "ue").replace(/ä/g, "ae").replace(/ö/g, "oe")
    .replace(/\s+/g, "");
}

// ─── Component: gradient defs ─────────────────────────────────────────────────

function gradientDef(isStory: boolean): string {
  if (isStory) {
    return `<linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%"   stop-color="#000000" stop-opacity="0.20"/>
      <stop offset="44%"  stop-color="#000000" stop-opacity="0.05"/>
      <stop offset="65%"  stop-color="#000000" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.88"/>
    </linearGradient>`;
  }
  return `<linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stop-color="#000000" stop-opacity="0"/>
    <stop offset="40%"  stop-color="#000000" stop-opacity="0"/>
    <stop offset="72%"  stop-color="#000000" stop-opacity="0.52"/>
    <stop offset="100%" stop-color="#000000" stop-opacity="0.82"/>
  </linearGradient>`;
}

// ─── Component 1: gradient overlay ───────────────────────────────────────────

function gradientOverlay(w: number, h: number, _isStory: boolean): string {
  return `<rect x="0" y="0" width="${w}" height="${h}" fill="url(#grad)"/>`;
}

// ─── Component 2: glass panel ─────────────────────────────────────────────────

function glassPanel(l: Layout): string {
  const { panelX: x, panelY: y, panelW: w, panelH: h, panelR: r } = l;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="#000000" fill-opacity="0.60"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" ry="${r}" fill="none" stroke="#ffffff" stroke-opacity="0.10" stroke-width="1"/>`
  );
}

// ─── Component 3: logo ────────────────────────────────────────────────────────

function logoElement(canvasW: number, logoBase64: string, isStory: boolean): string {
  const maxW = isStory ? 260 : 210;
  const maxH = isStory ? 90  : 74;
  const x    = Math.round((canvasW - maxW) / 2);
  const y    = isStory ? 80 : 52;
  return `<image href="${logoBase64}" x="${x}" y="${y}" width="${maxW}" height="${maxH}" preserveAspectRatio="xMidYMid meet"/>`;
}

// ─── Component 4: headline badge ──────────────────────────────────────────────

function headlineBadge(
  spec: RenderSpec,
  l: Layout,
  font: { family: string; bold: string; regular: string },
  isStory: boolean,
  canvasW: number,
): string {
  const text    = spec.headline.trim().toUpperCase();
  const fs      = isStory ? 22 : 20;
  const padX    = 20;
  const padY    = 10;
  const textW   = Math.ceil(text.length * fs * 0.52);
  const badgeW  = textW + padX * 2;
  const badgeH  = fs + padY * 2;
  const primary = spec.primaryColor || "#1a1a2e";

  const badgeX  = isStory
    ? Math.round((canvasW - badgeW) / 2)
    : l.panelX;
  const textX   = badgeX + Math.round(badgeW / 2);
  const textY   = l.badgeY + padY + Math.round(fs * 0.80);

  return (
    `<rect x="${badgeX}" y="${l.badgeY}" width="${badgeW}" height="${badgeH}" rx="6" fill="${escXml(primary)}"/>` +
    `<text x="${textX}" y="${textY}" font-family="${font.family}" font-weight="${font.bold}" font-size="${fs}" fill="#ffffff" text-anchor="middle" letter-spacing="1">${escXml(text)}</text>`
  );
}

// ─── Component 5: offer content ──────────────────────────────────────────────

function offerContent(
  spec: RenderSpec,
  l: Layout,
  font: { family: string; bold: string; regular: string },
  isStory: boolean,
): string[] {
  const ot = normalizeOfferType(spec.offerType);
  if (ot === "monatskuendbar") return offerMonatskuendbar(spec, l, font, isStory);
  if (ot === "preisaktion")    return offerPreisaktion(spec, l, font, isStory);
  if (ot === "custom")         return offerCustom(spec, l, font, isStory);
  return offerPreisaktion(spec, l, font, isStory); // default fallback
}

// ── Monatskündbar ────────────────────────────────────────────────────────────
// "MONATLICH" / "KÜNDBAR" hero → STATT row → price → abbuchung

function offerMonatskuendbar(
  spec: RenderSpec,
  l: Layout,
  font: { family: string; bold: string; regular: string },
  isStory: boolean,
): string[] {
  const { cx, contentW } = l;
  const acc = spec.accentColor || "#EA580C";
  const parts: string[] = [];

  const heroFs   = clampHeroFs(isStory ? 108 : 92, contentW, 9);
  const heroLineH = Math.round(heroFs * 1.08);

  let y = l.contentY + heroFs;

  parts.push(txt(cx, y, "MONATLICH", heroFs, "#ffffff", font.family, font.bold, "middle", 1));
  y += heroLineH;
  parts.push(txt(cx, y, "KÜNDBAR",   heroFs, "#ffffff", font.family, font.bold, "middle", 1));
  y += Math.round(heroFs * 0.48) + 20;

  if (spec.showOldPrice && spec.priceOld) {
    const stattFs = isStory ? 30 : 26;
    y += stattFs;
    const r = stattRowEl(cx, y, stattFs, spec.priceOld, acc, font);
    parts.push(r.statt, r.price, r.line);
    y += 14;
  }

  if (spec.showPrice && spec.priceNew) {
    const priceFs = clampPriceFs(isStory ? 100 : 86, contentW, spec.priceNew);
    y += priceFs;
    parts.push(txt(cx, y, spec.priceNew, priceFs, "#ffffff", font.family, font.bold, "middle"));
    y += 8;
    if (spec.showBillingInterval && spec.billingInterval) {
      const biFs = isStory ? 34 : 28;
      y += biFs;
      parts.push(txt(cx, y, spec.billingInterval, biFs, "#ffffff", font.family, font.regular, "middle", 0, 0.75));
    }
  }

  return parts;
}

// ── Preisaktion ───────────────────────────────────────────────────────────────
// STATT row → large price hero → abbuchung

function offerPreisaktion(
  spec: RenderSpec,
  l: Layout,
  font: { family: string; bold: string; regular: string },
  isStory: boolean,
): string[] {
  const { cx, contentW } = l;
  const acc = spec.accentColor || "#EA580C";
  const parts: string[] = [];

  let y = l.contentY;

  if (spec.showOldPrice && spec.priceOld) {
    const stattFs = isStory ? 34 : 30;
    y += stattFs;
    const r = stattRowEl(cx, y, stattFs, spec.priceOld, acc, font);
    parts.push(r.statt, r.price, r.line);
    y += 14;
  } else {
    y += 20;
  }

  if (spec.showPrice && spec.priceNew) {
    const priceFs = clampPriceFs(isStory ? 130 : 110, contentW, spec.priceNew);
    y += priceFs;
    parts.push(txt(cx, y, spec.priceNew, priceFs, "#ffffff", font.family, font.bold, "middle"));
    y += 8;
    if (spec.showBillingInterval && spec.billingInterval) {
      const biFs = isStory ? 38 : 32;
      y += biFs;
      parts.push(txt(cx, y, spec.billingInterval, biFs, "#ffffff", font.family, font.regular, "middle", 0, 0.75));
    }
  }

  return parts;
}

// ── Custom ────────────────────────────────────────────────────────────────────
// Custom text hero → optional price → optional abbuchung

function offerCustom(
  spec: RenderSpec,
  l: Layout,
  font: { family: string; bold: string; regular: string },
  isStory: boolean,
): string[] {
  const { cx, contentW } = l;
  const acc = spec.accentColor || "#EA580C";
  const parts: string[] = [];

  let y = l.contentY;

  if (spec.customText) {
    const raw  = spec.customText.trim().toUpperCase();
    let fs     = isStory ? 90 : 78;
    let lines  = wrapOswald(raw, contentW, fs);
    while (lines.length > 2 && fs > 32) { fs = Math.round(fs * 0.88); lines = wrapOswald(raw, contentW, fs); }
    const lineH = Math.round(fs * 1.1);
    for (let i = 0; i < lines.length; i++) {
      parts.push(txt(cx, y + fs + i * lineH, lines[i], fs, "#ffffff", font.family, font.bold, "middle", 1));
    }
    y += fs + (lines.length - 1) * lineH + 24;
  }

  if (spec.showOldPrice && spec.priceOld && spec.showPrice) {
    const stattFs = isStory ? 30 : 26;
    y += stattFs;
    const r = stattRowEl(cx, y, stattFs, spec.priceOld, acc, font);
    parts.push(r.statt, r.price, r.line);
    y += 12;
  }

  if (spec.showPrice && spec.priceNew) {
    const priceFs = clampPriceFs(isStory ? 96 : 82, contentW, spec.priceNew);
    y += priceFs;
    parts.push(txt(cx, y, spec.priceNew, priceFs, "#ffffff", font.family, font.bold, "middle"));
    y += 8;
    if (spec.showBillingInterval && spec.billingInterval) {
      const biFs = isStory ? 34 : 28;
      y += biFs;
      parts.push(txt(cx, y, spec.billingInterval, biFs, "#ffffff", font.family, font.regular, "middle", 0, 0.75));
    }
  }

  return parts;
}

// ─── Component 6: bottom strip ────────────────────────────────────────────────

function bottomStrip(
  spec: RenderSpec,
  l: Layout,
  font: { family: string; bold: string; regular: string },
  canvasW: number,
  isStory: boolean,
): string {
  const text    = spec.urgencyText!.trim().toUpperCase();
  const primary = spec.primaryColor || "#1a1a2e";
  const fs      = isStory ? 28 : 24;
  const textY   = l.stripY + Math.round(l.stripH / 2) + Math.round(fs * 0.38);
  return (
    `<rect x="0" y="${l.stripY}" width="${canvasW}" height="${l.stripH}" fill="${escXml(primary)}"/>` +
    `<text x="${Math.round(canvasW / 2)}" y="${textY}" font-family="${font.family}" font-weight="${font.bold}" font-size="${fs}" fill="#ffffff" text-anchor="middle" letter-spacing="2">${escXml(text)}</text>`
  );
}

// ─── Helper: "STATT" + strikethrough price row ────────────────────────────────

function stattRowEl(
  cx: number,
  y: number,
  fs: number,
  priceOld: string,
  accent: string,
  font: { family: string; bold: string; regular: string },
): { statt: string; price: string; line: string } {
  const stattW   = Math.ceil(5 * fs * 0.52);     // "STATT" (5 chars)
  const priceW   = Math.ceil(priceOld.length * fs * 0.60);
  const gap      = 10;
  const totalW   = stattW + gap + priceW;
  const startX   = cx - Math.round(totalW / 2);
  const priceX   = startX + stattW + gap;
  const priceMidX = priceX + Math.round(priceW / 2);
  const lineY    = y - Math.round(fs * 0.32);
  const sw       = Math.max(1, Math.round(fs * 0.07));

  return {
    statt: `<text x="${startX}" y="${y}" font-family="${font.family}" font-weight="${font.bold}" font-size="${fs}" fill="${escXml(accent)}" text-anchor="start">STATT</text>`,
    price: `<text x="${priceMidX}" y="${y}" font-family="${font.family}" font-weight="${font.regular}" font-size="${fs}" fill="#ffffff" fill-opacity="0.55" text-anchor="middle">${escXml(priceOld)}</text>`,
    line:  `<line x1="${priceX}" y1="${lineY}" x2="${priceX + priceW}" y2="${lineY}" stroke="#ffffff" stroke-opacity="0.55" stroke-width="${sw}"/>`,
  };
}

// ─── Helper: simple text element ──────────────────────────────────────────────

function txt(
  x: number,
  y: number,
  content: string,
  fs: number,
  fill: string,
  family: string,
  weight: string,
  anchor: "start" | "middle" | "end" = "start",
  ls = 0,
  opacity = 1,
): string {
  const attrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-family="${family}"`,
    `font-weight="${weight}"`,
    `font-size="${fs}"`,
    `fill="${escXml(fill)}"`,
    `text-anchor="${anchor}"`,
    ls      ? `letter-spacing="${ls}"` : "",
    opacity < 1 ? `fill-opacity="${opacity}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `<text ${attrs}>${escXml(content)}</text>`;
}

// ─── Helper: word-wrap with Oswald uppercase metrics ─────────────────────────

function wrapOswald(text: string, maxWidth: number, fs: number): string[] {
  const charW   = fs * 0.52;   // Oswald uppercase ≈ 52% of font-size
  const maxChars = Math.max(1, Math.floor(maxWidth / charW));
  const words   = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}
