/**
 * Text Hierarchy – V1
 *
 * Font-size scaling, word-wrap (SVG has no native text wrapping),
 * and SVG <text> element generation with dy offsets for multi-line text.
 *
 * Character-width approximation: fontSize * 0.55 per character (good enough for
 * Arial/sans-serif at typical ad text lengths).
 */

// ─── Font size scaling ────────────────────────────────────────────────────────

/**
 * Scales font size down for longer texts so they fit within maxWidth.
 * Never goes below minFontSize.
 */
export function calculateFontSize(
  text: string,
  maxWidth: number,
  baseFontSize: number,
  minFontSize: number
): number {
  const charWidth = baseFontSize * 0.55;
  const estimatedWidth = text.length * charWidth;

  if (estimatedWidth <= maxWidth) return baseFontSize;

  const scaled = Math.floor((maxWidth / estimatedWidth) * baseFontSize);
  return Math.max(scaled, minFontSize);
}

// ─── Word wrap ────────────────────────────────────────────────────────────────

/**
 * Wraps text into lines that fit within maxWidth at the given fontSize.
 * Returns an array of line strings.
 */
export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const charWidth = fontSize * 0.55;
  const maxChars = Math.floor(maxWidth / charWidth);

  if (maxChars <= 0) return [text];

  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // If a single word exceeds maxChars, push it anyway (no hard-break in V1)
      current = word;
    }
  }
  if (current) lines.push(current);

  return lines;
}

// ─── SVG <text> element builder ───────────────────────────────────────────────

export type TextRenderOptions = {
  lines: string[];
  x: number;
  /** Baseline y of the first line */
  y: number;
  fontSize: number;
  lineHeightFactor?: number; // default 1.25
  color: string;
  fontFamily: string;
  fontWeight: string;
  textAnchor?: "start" | "middle" | "end"; // default "start"
  dominantBaseline?: string;               // default "auto"
  letterSpacing?: number;                  // px, default 0
  opacity?: number;                        // 0–1, default 1
};

/**
 * Returns a single SVG <text> element (with <tspan> children for multi-line).
 * The first line sits at y; subsequent lines are offset by fontSize * lineHeightFactor.
 */
export function renderTextLines(opts: TextRenderOptions): string {
  const {
    lines,
    x,
    y,
    fontSize,
    lineHeightFactor = 1.25,
    color,
    fontFamily,
    fontWeight,
    textAnchor = "start",
    dominantBaseline = "auto",
    letterSpacing = 0,
    opacity = 1,
  } = opts;

  if (lines.length === 0) return "";

  const dy = Math.round(fontSize * lineHeightFactor);
  const letterSpacingAttr = letterSpacing !== 0 ? ` letter-spacing="${letterSpacing}"` : "";
  const opacityAttr = opacity !== 1 ? ` opacity="${opacity}"` : "";

  const textAttrs = [
    `x="${x}"`,
    `y="${y}"`,
    `font-size="${fontSize}"`,
    `font-family="${fontFamily}"`,
    `font-weight="${fontWeight}"`,
    `fill="${color}"`,
    `text-anchor="${textAnchor}"`,
    `dominant-baseline="${dominantBaseline}"`,
    letterSpacingAttr,
    opacityAttr,
  ]
    .filter(Boolean)
    .join(" ");

  if (lines.length === 1) {
    return `<text ${textAttrs}>${escXml(lines[0])}</text>`;
  }

  // Multi-line: first tspan at dy="0", rest at dy=lineHeight
  const spans = lines
    .map((line, i) =>
      i === 0
        ? `<tspan x="${x}" dy="0">${escXml(line)}</tspan>`
        : `<tspan x="${x}" dy="${dy}">${escXml(line)}</tspan>`
    )
    .join("\n    ");

  return `<text ${textAttrs}>\n    ${spans}\n  </text>`;
}

// ─── Total rendered height helper ─────────────────────────────────────────────

/**
 * Returns the total pixel height a text block will occupy.
 */
export function textBlockHeight(
  lineCount: number,
  fontSize: number,
  lineHeightFactor = 1.25
): number {
  if (lineCount === 0) return 0;
  return Math.round(fontSize + (lineCount - 1) * fontSize * lineHeightFactor);
}

// ─── Strikethrough text ───────────────────────────────────────────────────────

/**
 * Renders a single-line text with a strikethrough line over it.
 * Used for old/crossed-out prices.
 */
export function renderStrikethrough(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  fontFamily: string,
  fontWeight: string,
  textAnchor: "start" | "middle" | "end" = "start",
  opacity = 0.7
): string {
  const approxWidth = text.length * fontSize * 0.55;
  const xStart = textAnchor === "middle" ? x - approxWidth / 2 : x;
  const xEnd = xStart + approxWidth;
  const lineY = y - Math.round(fontSize * 0.35); // mid-text height

  return [
    `<text x="${x}" y="${y}" font-size="${fontSize}" font-family="${fontFamily}"`,
    ` font-weight="${fontWeight}" fill="${color}" text-anchor="${textAnchor}"`,
    ` opacity="${opacity}" text-decoration="line-through">${escXml(text)}</text>`,
    // Belt-and-suspenders explicit line (SVG text-decoration support varies)
    `<line x1="${xStart}" y1="${lineY}" x2="${xEnd}" y2="${lineY}"`,
    ` stroke="${color}" stroke-width="${Math.max(1, Math.round(fontSize * 0.06))}"`,
    ` opacity="${opacity}"/>`,
  ].join("");
}

// ─── XML escape ───────────────────────────────────────────────────────────────

export function escXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
