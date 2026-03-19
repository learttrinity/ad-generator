/**
 * Integration Settings Service – V1
 *
 * Typed get/set/delete for the IntegrationSetting key-value store.
 * Used to persist non-secret provider metadata such as:
 *   – active provider name
 *   – last test status + timestamp
 *   – optional workspace/account label
 *
 * Secrets are NEVER stored here — they live in env vars only.
 */

import { prisma } from "@/lib/prisma";

export const integrationSettingsService = {
  async get(key: string): Promise<string | null> {
    const row = await prisma.integrationSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    await prisma.integrationSetting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  },

  async delete(key: string): Promise<void> {
    await prisma.integrationSetting.deleteMany({ where: { key } });
  },

  /** Returns all keys matching a prefix as a flat key→value map. */
  async getPrefix(prefix: string): Promise<Record<string, string>> {
    const rows = await prisma.integrationSetting.findMany({
      where: { key: { startsWith: prefix } },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  },
};
