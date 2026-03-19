/**
 * Drive Read Service – V1
 *
 * Safe, read-only operations on approved source folders.
 * All calls are guarded — the folder must be whitelisted for the client.
 *
 * No destructive operations exist here or anywhere else in this system.
 */

import { getDriveClient } from "@/lib/google/googleDriveClient";
import { assertReadAllowed } from "@/lib/google/driveAccessGuard";

export type DriveFileItem = {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
};

const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "image/tiff",
];

const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/vnd.google-apps.document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const driveReadService = {
  /**
   * List files in an approved read folder.
   * The folder must be whitelisted for the client in ClientDriveMapping.
   */
  async listFiles(
    clientId: string,
    folderId: string,
    options?: { mimeTypes?: string[] }
  ): Promise<DriveFileItem[]> {
    await assertReadAllowed(clientId, folderId);

    const drive = getDriveClient();
    if (!drive) throw new Error("Google Drive nicht konfiguriert");

    let mimeFilter = "";
    if (options?.mimeTypes?.length) {
      const typeFilter = options.mimeTypes.map((t) => `mimeType = '${t}'`).join(" or ");
      mimeFilter = ` and (${typeFilter})`;
    }

    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false${mimeFilter}`,
      fields: "files(id, name, mimeType, size, modifiedTime, thumbnailLink, webViewLink, iconLink)",
      orderBy: "name",
      pageSize: 200,
    });

    return (res.data.files ?? []).map((f) => ({
      id: f.id!,
      name: f.name!,
      mimeType: f.mimeType!,
      size: f.size ? Number(f.size) : undefined,
      modifiedTime: f.modifiedTime ?? undefined,
      thumbnailLink: f.thumbnailLink ?? undefined,
      webViewLink: f.webViewLink ?? undefined,
      iconLink: f.iconLink ?? undefined,
    }));
  },

  async listImages(clientId: string, folderId: string): Promise<DriveFileItem[]> {
    return this.listFiles(clientId, folderId, { mimeTypes: IMAGE_MIME_TYPES });
  },

  async listDocuments(clientId: string, folderId: string): Promise<DriveFileItem[]> {
    return this.listFiles(clientId, folderId, { mimeTypes: DOCUMENT_MIME_TYPES });
  },

  async listAll(clientId: string, folderId: string): Promise<DriveFileItem[]> {
    return this.listFiles(clientId, folderId);
  },
};
