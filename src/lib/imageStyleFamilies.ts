/**
 * Image Style Families – V1
 * Maps creative direction keys to visual style archetypes and lighting families.
 * These feed directly into the prompt engine.
 */

import type { DirectionKey } from "./directionSelector";

export type ImageStyleFamily =
  | "premium_moody_editorial"
  | "studio_gradient_commercial"
  | "flash_editorial_performance";

export type LightingFamily =
  | "premium_moody"
  | "clean_commercial"
  | "flash_editorial"
  | "high_contrast_rimlight";

export type PoseMode =
  | "hero_portrait"
  | "controlled_fitness_pose"
  | "active_exercise_pose";

export type StyleProfile = {
  styleFamily: ImageStyleFamily;
  lightingFamily: LightingFamily;
  poseMode: PoseMode;
  styleSummary: string;
  lightingSummary: string;
};

const STYLE_MAP: Record<DirectionKey, StyleProfile> = {
  klar_preisfokus: {
    styleFamily: "studio_gradient_commercial",
    lightingFamily: "clean_commercial",
    poseMode: "hero_portrait",
    styleSummary: "clean commercial studio, sharp contrast, neutral gradient backdrop",
    lightingSummary: "soft box key light, even fill, clean commercial studio lighting",
  },
  modern_aktiv: {
    styleFamily: "studio_gradient_commercial",
    lightingFamily: "clean_commercial",
    poseMode: "controlled_fitness_pose",
    styleSummary: "modern active studio, energetic composition, clean athletic feel",
    lightingSummary: "bright clean studio lighting, slight warmth, dynamic feel",
  },
  premium_reduziert: {
    styleFamily: "premium_moody_editorial",
    lightingFamily: "premium_moody",
    poseMode: "hero_portrait",
    styleSummary: "editorial premium aesthetic, minimal, high-end fitness campaign quality",
    lightingSummary: "moody directional key light, soft gradient shadow, luxury editorial feel",
  },
  dynamisch_direkt: {
    styleFamily: "flash_editorial_performance",
    lightingFamily: "flash_editorial",
    poseMode: "active_exercise_pose",
    styleSummary: "high-energy editorial flash look, performance-focused, bold contrast",
    lightingSummary: "hard flash key light, strong rim light, high contrast editorial look",
  },
  lokal_nahbar: {
    styleFamily: "studio_gradient_commercial",
    lightingFamily: "clean_commercial",
    poseMode: "controlled_fitness_pose",
    styleSummary: "approachable warm studio, relatable and friendly fitness aesthetic",
    lightingSummary: "warm natural-feeling studio light, soft shadows, inviting quality",
  },
  clean_studio: {
    styleFamily: "studio_gradient_commercial",
    lightingFamily: "clean_commercial",
    poseMode: "hero_portrait",
    styleSummary: "clean minimal studio, neutral palette, versatile commercial look",
    lightingSummary: "even soft box lighting, clean white/grey backdrop, no harsh shadows",
  },
};

export function getStyleProfile(directionKey: string): StyleProfile {
  return STYLE_MAP[directionKey as DirectionKey] ?? STYLE_MAP["clean_studio"];
}

// Pose description map for prompt engine
export const POSE_MODE_DESCRIPTIONS: Record<PoseMode, string> = {
  hero_portrait:
    "standing in a confident composed pose, looking slightly off-camera, relaxed and assured, premium fitness model posture",
  controlled_fitness_pose:
    "in a controlled athletic stance, engaged posture, fitness-ready position, natural and motivating",
  active_exercise_pose:
    "mid-movement in a dynamic fitness exercise, full energy, natural action, performance-focused",
};
