/**
 * Prompt Engine – V1
 * Block-based image prompt generation for the base image layer.
 *
 * IMPORTANT: This system generates prompts for base images only.
 * The AI model must NOT generate final ad designs, prices, text overlays,
 * logos, or badges. Those are added in the render phase.
 */

import { getAudience, getPlacement } from "./audienceMatrix";
import { getStyleProfile, POSE_MODE_DESCRIPTIONS } from "./imageStyleFamilies";
import type { AudienceKey, PlacementKey } from "./audienceMatrix";
import type { DirectionKey } from "./directionSelector";
import type { MessagePriority } from "./messagePriority";

// ─── Input & Output types ─────────────────────────────────────────────────────

export type PromptBlocks = {
  qualityPreamble: string;
  subjectBlock: string;
  poseBlock: string;
  wardrobeBlock: string;
  environmentBlock: string;
  compositionBlock: string;
  lightingBlock: string;
  finishBlock: string;
};

export type NegativePromptBlocks = {
  base: string;
  environment: string;
  style: string;
};

export type PromptEngineInput = {
  audienceKey: AudienceKey | string;
  placementKey: PlacementKey | string;
  environmentMode: "STANDARD_STUDIO" | "KUNDENSTUDIO_REFERENZ";
  directionKey: DirectionKey | string;
  messagePriority: MessagePriority | string;
  offerType?: string | null;
  brandPrimaryColor?: string | null;
  brandVisualTone?: string | null;
  brandImageTone?: string | null;
  /** From brand restrictions.forbiddenColors — added to negative prompt */
  brandForbiddenColors?: string[] | null;
  /** From brand restrictions.bannedCheapSaleLook — tightens negative prompt */
  brandBannedCheapSaleLook?: boolean | null;
  referenceAssetUrl?: string | null;
};

export type PromptResult = {
  finalPrompt: string;
  finalNegativePrompt: string;
  blocks: PromptBlocks;
  negativeBlocks: NegativePromptBlocks;
  styleFamily: string;
  lightingFamily: string;
  poseMode: string;
  dimensions: string;
};

// ─── Block builders ───────────────────────────────────────────────────────────

function buildQualityPreamble(): string {
  return "ultra-realistic commercial fitness photography, 50mm lens, full-frame camera, sharp focus, professional advertising quality";
}

function buildSubjectBlock(audienceKey: string): string {
  const audience = getAudience(audienceKey);
  const physique = audience.ageMin >= 50
    ? "active and vital, healthy natural physique, not exaggerated"
    : "athletic and toned, natural realistic physique, approachable commercial look, not bodybuilder";
  return `${audience.promptDescriptor}, ${physique}, premium fitness campaign subject`;
}

function buildPoseBlock(poseMode: string, audienceKey: string, offerType?: string | null): string {
  const base = POSE_MODE_DESCRIPTIONS[poseMode as keyof typeof POSE_MODE_DESCRIPTIONS]
    ?? POSE_MODE_DESCRIPTIONS.hero_portrait;
  const audience = getAudience(audienceKey);
  const ageNote = audience.ageMin >= 50
    ? ", confident and experienced energy, not strained"
    : ", energetic natural presence";

  let offerNote = "";
  if (offerType) {
    const type = offerType.toLowerCase();
    if (type === "monatskündbar" || type === "monatskuendbar") {
      offerNote = ", relaxed approachable stance, open body language, warm accessible energy, not aggressive";
    } else if (type === "preisaktion") {
      offerNote = ", confident energetic forward-facing pose, dynamic athletic stance, direct eye contact, action-oriented";
    } else if (type === "custom") {
      offerNote = ", neutral versatile pose, premium editorial studio feel, clean composed stance, lifestyle-oriented";
    }
  }

  return base + ageNote + offerNote;
}

function buildWardrobeBlock(brandVisualTone?: string | null): string {
  const isPremium = brandVisualTone?.toLowerCase().includes("premium")
    || brandVisualTone?.toLowerCase().includes("boutique");
  if (isPremium) {
    return "wearing premium minimalist fitness apparel, monochrome or neutral tones, no visible logos or text, clean high-end sportswear";
  }
  return "wearing clean minimalist fitness clothing, solid neutral or dark tones, no logos, no text, unbranded athletic wear";
}

/**
 * Maps a brand hex color to a descriptive color mood for the environment prompt.
 * Used to give each client's Standard Studio a slightly different feel.
 */
function brandColorMood(hexColor: string | null | undefined): string {
  if (!hexColor || !/^#[0-9A-Fa-f]{6}$/.test(hexColor)) return "clean modern neutral-toned";

  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);

  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const saturation = max === 0 ? 0 : (max - min) / max;

  // Very dark / near-black
  if (brightness < 55) return "dark dramatic high-contrast";
  // Very light / white / neutral
  if (brightness > 210 && saturation < 0.12) return "clean minimal neutral-toned";

  // Hue-dominant
  if (r >= g && r >= b) {
    // Orange: red dominant but green is significant
    if (g > b && g > 100 && r - g < 80) return "vibrant energetic warm";
    return "warm energetic red-toned";
  }
  if (g >= r && g >= b) return "fresh natural green-toned";
  if (b >= r && b >= g) return "cool modern blue-toned";

  return "clean modern neutral-toned";
}

function buildEnvironmentBlock(
  environmentMode: "STANDARD_STUDIO" | "KUNDENSTUDIO_REFERENZ",
  styleSummary: string,
  hasReferenceAsset: boolean,
  brandPrimaryColor?: string | null,
): string {
  if (environmentMode === "KUNDENSTUDIO_REFERENZ" && hasReferenceAsset) {
    return "fitness studio as shown in reference image, match the environment and lighting of the reference, professional fitness photography, maintain studio atmosphere";
  }
  // STANDARD_STUDIO — build a brand-color-aware studio environment
  const colorMood = brandColorMood(brandPrimaryColor);
  return `premium fitness studio interior, ${colorMood} color atmosphere, professional photography lighting, clean background, editorial commercial fitness shoot, no text, no logos`;
}

function buildCompositionBlock(placementKey: string): string {
  const placement = getPlacement(placementKey);
  if (placement.height > placement.width) {
    // Story / vertical
    return "vertical portrait composition, subject centered with breathing room above and below, generous negative space in upper and lower thirds for text overlays, safe zone maintained";
  }
  // Feed / square
  return "balanced square composition, subject clearly visible and centered, moderate negative space on sides for text copy, clean framing";
}

function buildLightingBlock(lightingSummary: string, brandImageTone?: string | null): string {
  let tone = "";
  if (brandImageTone) {
    const lower = brandImageTone.toLowerCase();
    if (lower.includes("warm")) tone = ", warm light tones, golden hour quality";
    else if (lower.includes("cool")) tone = ", cool crisp light tones, clean blue-white light";
    else if (lower.includes("neutral")) tone = ", neutral balanced light tones";
    else if (lower.includes("dark") || lower.includes("moody")) tone = ", moody low-key lighting, dramatic shadows";
    else if (lower.includes("bright") || lower.includes("hell")) tone = ", bright airy high-key lighting";
  }
  return lightingSummary + tone + ", skin texture looks natural, no harsh underexposure, no blown-out highlights";
}

function buildFinishBlock(): string {
  return "premium fitness advertising campaign quality, natural skin texture, sharp commercial focus, ad-ready composition, no watermarks, no text in image, no logos in image";
}

// ─── Negative prompt builder ──────────────────────────────────────────────────

function buildNegativeBlocks(
  environmentMode: string,
  styleFamily: string,
  forbiddenColors?: string[] | null,
  bannedCheapSaleLook?: boolean | null
): NegativePromptBlocks {
  const base =
    "text, letters, words, numbers, logos, brand marks, watermarks, signatures, extra limbs, deformed anatomy, bad proportions, mutated, ugly, low quality, blurry, pixelated, phone camera quality, amateur photograph";

  const environment =
    environmentMode === "KUNDENSTUDIO_REFERENZ"
      ? "different background, generic studio background, random gym clutter, unrelated equipment, other people in background"
      : "real gym machines, gym equipment background, locker rooms, changing rooms, random people";

  let style =
    styleFamily === "flash_editorial_performance"
      ? "flat lighting, overexposed, underlit, boring composition, stock photo look"
      : "harsh shadows, hard specular highlights, plastic skin, overly retouched, CGI look, 3D render, illustration";

  // Brand restrictions: forbidden colors
  if (forbiddenColors && forbiddenColors.length > 0) {
    style += `, ${forbiddenColors.join(" clothing, ")} clothing`;
  }

  // Brand restrictions: no cheap/sale aesthetic
  if (bannedCheapSaleLook) {
    style += ", cheap discount store aesthetic, sale price tag look, overly promotional, tacky design, cluttered visual, neon sale colors";
  }

  return { base, environment, style };
}

function assembleNegativePrompt(blocks: NegativePromptBlocks): string {
  return [blocks.base, blocks.environment, blocks.style].join(", ");
}

// ─── Main prompt engine ───────────────────────────────────────────────────────

export function buildPrompt(input: PromptEngineInput): PromptResult {
  const styleProfile = getStyleProfile(input.directionKey);
  const placement = getPlacement(input.placementKey);
  const dimensions = `${placement.width}x${placement.height}`;
  const hasReferenceAsset = input.environmentMode === "KUNDENSTUDIO_REFERENZ" && !!input.referenceAssetUrl;

  const blocks: PromptBlocks = {
    qualityPreamble: buildQualityPreamble(),
    subjectBlock: buildSubjectBlock(input.audienceKey),
    poseBlock: buildPoseBlock(styleProfile.poseMode, input.audienceKey, input.offerType),
    wardrobeBlock: buildWardrobeBlock(input.brandVisualTone),
    environmentBlock: buildEnvironmentBlock(input.environmentMode, styleProfile.styleSummary, hasReferenceAsset, input.brandPrimaryColor),
    compositionBlock: buildCompositionBlock(input.placementKey),
    lightingBlock: buildLightingBlock(styleProfile.lightingSummary, input.brandImageTone),
    finishBlock: buildFinishBlock(),
  };

  const negativeBlocks = buildNegativeBlocks(
    input.environmentMode,
    styleProfile.styleFamily,
    input.brandForbiddenColors,
    input.brandBannedCheapSaleLook
  );

  const finalPrompt = [
    blocks.qualityPreamble,
    blocks.subjectBlock,
    blocks.poseBlock,
    blocks.wardrobeBlock,
    blocks.environmentBlock,
    blocks.compositionBlock,
    blocks.lightingBlock,
    blocks.finishBlock,
  ].join(", ");

  return {
    finalPrompt,
    finalNegativePrompt: assembleNegativePrompt(negativeBlocks),
    blocks,
    negativeBlocks,
    styleFamily: styleProfile.styleFamily,
    lightingFamily: styleProfile.lightingFamily,
    poseMode: styleProfile.poseMode,
    dimensions,
  };
}
