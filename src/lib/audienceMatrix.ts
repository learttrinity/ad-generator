/**
 * Audience Matrix – V1
 * Single source of truth for the 6 fitness target audiences.
 * Used in GenerationSetupPanel, prompt engine, and readiness check.
 */

export type AudienceGender = "woman" | "man";

export type AudienceDefinition = {
  key: string;
  label: string;
  gender: AudienceGender;
  ageMin: number;
  ageMax: number;
  /** Short English descriptor for prompt engine */
  promptDescriptor: string;
};

export const AUDIENCE_MATRIX: AudienceDefinition[] = [
  {
    key: "frau_25_30",
    label: "Frau 25–30",
    gender: "woman",
    ageMin: 25,
    ageMax: 30,
    promptDescriptor: "athletic woman, 25 to 30 years old",
  },
  {
    key: "mann_25_30",
    label: "Mann 25–30",
    gender: "man",
    ageMin: 25,
    ageMax: 30,
    promptDescriptor: "athletic man, 25 to 30 years old",
  },
  {
    key: "frau_30_35",
    label: "Frau 30–35",
    gender: "woman",
    ageMin: 30,
    ageMax: 35,
    promptDescriptor: "fit woman, 30 to 35 years old",
  },
  {
    key: "mann_30_35",
    label: "Mann 30–35",
    gender: "man",
    ageMin: 30,
    ageMax: 35,
    promptDescriptor: "fit man, 30 to 35 years old",
  },
  {
    key: "frau_50_55",
    label: "Frau 50–55",
    gender: "woman",
    ageMin: 50,
    ageMax: 55,
    promptDescriptor: "active vital woman, 50 to 55 years old",
  },
  {
    key: "mann_50_55",
    label: "Mann 50–55",
    gender: "man",
    ageMin: 50,
    ageMax: 55,
    promptDescriptor: "active vital man, 50 to 55 years old",
  },
];

export type AudienceKey = (typeof AUDIENCE_MATRIX)[number]["key"];

export function getAudience(key: string): AudienceDefinition {
  return AUDIENCE_MATRIX.find((a) => a.key === key) ?? AUDIENCE_MATRIX[0];
}

export const PLACEMENT_OPTIONS = [
  { key: "feed_1080x1080", label: "Feed 1080×1080", width: 1080, height: 1080 },
  { key: "story_1080x1920", label: "Story 1080×1920", width: 1080, height: 1920 },
] as const;

export type PlacementKey = (typeof PLACEMENT_OPTIONS)[number]["key"];

export function getPlacement(key: string) {
  return PLACEMENT_OPTIONS.find((p) => p.key === key) ?? PLACEMENT_OPTIONS[0];
}

export type PlacementDefinition = (typeof PLACEMENT_OPTIONS)[number];
