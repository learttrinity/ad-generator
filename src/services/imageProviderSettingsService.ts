/**
 * Image Provider Settings Service – V1
 *
 * Manages which image generation provider is active, and stores per-provider
 * non-secret metadata (test results, labels) in IntegrationSetting.
 *
 * Key schema:
 *   image_provider.active                        → "higgsfield" | "mock"
 *   image_provider.{key}.last_test_status        → "success" | "failed"
 *   image_provider.{key}.last_tested_at          → ISO timestamp
 *   image_provider.{key}.workspace_label         → optional human-readable label
 *
 * Secrets (API keys) are NEVER stored here.
 */

import { integrationSettingsService } from "./integrationSettingsService";
import { hasHiggsfieldApiKey } from "@/lib/providers/secureConfigResolver";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProviderKey = "higgsfield" | "mock";

export type ProviderHealthStatus =
  | "unconfigured"  // Nicht konfiguriert
  | "partial"       // Teilweise konfiguriert (metadata OK but untested)
  | "ready"         // Bereit (config present, not yet tested)
  | "success"       // Verbindung erfolgreich
  | "failed"        // Verbindung fehlgeschlagen
  | "pending";      // Test ausstehend

export type ProviderInfo = {
  key: ProviderKey;
  label: string;
  description: string;
  isActive: boolean;
  healthStatus: ProviderHealthStatus;
  hasApiKey: boolean;          // env var presence (safe to expose)
  lastTestStatus: string | null;
  lastTestedAt: string | null;
  workspaceLabel: string | null;
  canActivate: boolean;        // true if provider is ready to be set active
};

// ─── Static provider metadata ────────────────────────────────────────────────

export const PROVIDER_META: Record<ProviderKey, { label: string; description: string }> = {
  higgsfield: {
    label: "Higgsfield / Nano Banana",
    description: "KI-Bildgenerierung spezialisiert auf Fitness- und Lifestyle-Creatives",
  },
  mock: {
    label: "Mock-Provider (Entwicklung)",
    description: "Generiert Platzhaltergrafiken – kein API-Zugang nötig",
  },
};

export const ALL_PROVIDER_KEYS: ProviderKey[] = ["higgsfield", "mock"];

// ─── Service ──────────────────────────────────────────────────────────────────

export const imageProviderSettingsService = {
  /**
   * Returns the currently configured active provider.
   * Order: DB setting → GENERATION_PROVIDER env var → "mock" fallback.
   */
  async getActiveProvider(): Promise<ProviderKey> {
    const stored = await integrationSettingsService.get("image_provider.active");
    if (stored === "higgsfield" || stored === "mock") return stored;
    const envVal = process.env.GENERATION_PROVIDER;
    if (envVal === "higgsfield") return "higgsfield";
    return "mock";
  },

  async setActiveProvider(key: ProviderKey): Promise<void> {
    await integrationSettingsService.set("image_provider.active", key);
  },

  async getProviderInfo(key: ProviderKey): Promise<ProviderInfo> {
    const meta = PROVIDER_META[key];
    const activeKey = await this.getActiveProvider();

    const hasApiKey = key === "mock" ? true : hasHiggsfieldApiKey();
    const lastTestStatus = await integrationSettingsService.get(
      `image_provider.${key}.last_test_status`
    );
    const lastTestedAt = await integrationSettingsService.get(
      `image_provider.${key}.last_tested_at`
    );
    const workspaceLabel = await integrationSettingsService.get(
      `image_provider.${key}.workspace_label`
    );

    let healthStatus: ProviderHealthStatus;
    if (!hasApiKey) {
      healthStatus = "unconfigured";
    } else if (lastTestStatus === "success") {
      healthStatus = "success";
    } else if (lastTestStatus === "failed") {
      healthStatus = "failed";
    } else {
      healthStatus = "ready";
    }

    return {
      key,
      label: meta.label,
      description: meta.description,
      isActive: activeKey === key,
      healthStatus,
      hasApiKey,
      lastTestStatus,
      lastTestedAt,
      workspaceLabel,
      canActivate: hasApiKey,
    };
  },

  async getAllProviderInfos(): Promise<ProviderInfo[]> {
    return Promise.all(ALL_PROVIDER_KEYS.map((k) => this.getProviderInfo(k)));
  },

  async storeTestResult(
    key: ProviderKey,
    status: "success" | "failed",
    workspaceLabel?: string
  ): Promise<void> {
    await integrationSettingsService.set(
      `image_provider.${key}.last_test_status`,
      status
    );
    await integrationSettingsService.set(
      `image_provider.${key}.last_tested_at`,
      new Date().toISOString()
    );
    if (workspaceLabel) {
      await integrationSettingsService.set(
        `image_provider.${key}.workspace_label`,
        workspaceLabel
      );
    }
  },

  /** Returns true if the active provider has what it needs to generate. */
  async isActiveProviderReady(): Promise<boolean> {
    const key = await this.getActiveProvider();
    if (key === "mock") return true;
    if (key === "higgsfield") return hasHiggsfieldApiKey();
    return false;
  },
};
