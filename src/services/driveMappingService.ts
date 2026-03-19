/**
 * Drive Mapping Service – V1
 *
 * CRUD for ClientDriveMapping and live folder validation.
 */

import { prisma } from "@/lib/prisma";
import { getDriveClient } from "@/lib/google/googleDriveClient";

export type DriveMappingInput = {
  brandReadFolderId?: string | null;
  referencesReadFolderId?: string | null;
  campaignsReadFolderId?: string | null;
  exportWriteFolderId?: string | null;
};

export type FolderValidationResult = {
  folderId: string;
  accessible: boolean;
  name?: string;
  error?: string;
};

export const driveMappingService = {
  async getMapping(clientId: string) {
    return prisma.clientDriveMapping.findUnique({ where: { clientId } });
  },

  async upsertMapping(clientId: string, data: DriveMappingInput) {
    // Clean up empty strings → null
    const cleaned: DriveMappingInput = {};
    for (const [k, v] of Object.entries(data)) {
      (cleaned as Record<string, string | null>)[k] = v && v.trim() ? v.trim() : null;
    }

    const existing = await prisma.clientDriveMapping.findUnique({ where: { clientId } });
    if (existing) {
      return prisma.clientDriveMapping.update({ where: { clientId }, data: cleaned });
    }
    return prisma.clientDriveMapping.create({ data: { clientId, ...cleaned } });
  },

  /** Check if a single folder ID is accessible via Drive API. */
  async validateFolder(folderId: string): Promise<FolderValidationResult> {
    const drive = getDriveClient();
    if (!drive) {
      return { folderId, accessible: false, error: "Drive nicht konfiguriert" };
    }
    try {
      const res = await drive.files.get({
        fileId: folderId,
        fields: "id, name, mimeType, trashed",
      });
      if (res.data.trashed) {
        return { folderId, accessible: false, error: "Ordner ist im Papierkorb" };
      }
      if (res.data.mimeType !== "application/vnd.google-apps.folder") {
        return { folderId, accessible: false, error: "Die ID verweist auf keine Ordner" };
      }
      return { folderId, accessible: true, name: res.data.name ?? undefined };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { folderId, accessible: false, error: msg };
    }
  },

  /** Validate all configured folders for a client simultaneously. */
  async validateAllFolders(clientId: string): Promise<
    Record<keyof DriveMappingInput, FolderValidationResult | null>
  > {
    const mapping = await this.getMapping(clientId);
    const results: Record<string, FolderValidationResult | null> = {
      brandReadFolderId: null,
      referencesReadFolderId: null,
      campaignsReadFolderId: null,
      exportWriteFolderId: null,
    };

    if (!mapping) return results as Record<keyof DriveMappingInput, FolderValidationResult | null>;

    const entries: [string, string][] = [
      ["brandReadFolderId", mapping.brandReadFolderId],
      ["referencesReadFolderId", mapping.referencesReadFolderId],
      ["campaignsReadFolderId", mapping.campaignsReadFolderId],
      ["exportWriteFolderId", mapping.exportWriteFolderId],
    ].filter(([, id]) => !!id) as [string, string][];

    await Promise.all(
      entries.map(async ([key, id]) => {
        results[key] = await this.validateFolder(id);
      })
    );

    return results as Record<keyof DriveMappingInput, FolderValidationResult | null>;
  },
};
