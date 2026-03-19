/**
 * Provider Factory – V1
 *
 * Resolves the active image generation provider.
 *
 * Resolution order:
 *   1. DB setting (image_provider.active) — set by admin in Integrationen UI
 *   2. GENERATION_PROVIDER env var — fallback for local dev
 *   3. "mock" — always-available development fallback
 *
 * The factory is now async so it can read from the database.
 * No singleton cache — active-provider changes take effect immediately.
 */

import type { ImageGenerationProvider } from "./imageGenerationProvider";
import { HiggsfieldProvider } from "./higgsfield";
import { MockProvider } from "./mock";

export type SupportedProvider = "higgsfield" | "mock";

/**
 * Returns the currently active image generation provider.
 * Always await — active provider is resolved from DB + env.
 */
export async function getImageProvider(): Promise<ImageGenerationProvider> {
  const key = await resolveActiveProviderKey();
  return buildProvider(key);
}

/** Returns the active provider key without building the full provider object. */
export async function getActiveProviderKey(): Promise<SupportedProvider> {
  return resolveActiveProviderKey();
}

// ─── Internal ─────────────────────────────────────────────────────────────────

async function resolveActiveProviderKey(): Promise<SupportedProvider> {
  // 1. DB setting — admin-configured via Integrationen UI
  try {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.integrationSetting.findUnique({
      where: { key: "image_provider.active" },
      select: { value: true },
    });
    if (row?.value === "higgsfield" || row?.value === "mock") {
      return row.value as SupportedProvider;
    }
  } catch {
    // DB not reachable (e.g. during build) — fall through
  }

  // 2. Env var fallback (backward compat with existing deployments)
  if (process.env.GENERATION_PROVIDER === "higgsfield") return "higgsfield";

  // 3. Default: mock
  return "mock";
}

function buildProvider(key: SupportedProvider): ImageGenerationProvider {
  switch (key) {
    case "higgsfield":
      return new HiggsfieldProvider();
    case "mock":
    default:
      return new MockProvider();
  }
}
