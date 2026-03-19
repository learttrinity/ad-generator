/**
 * Drive Folder Resolver – V1
 *
 * Creates deterministic, idempotent folder structures ONLY inside the client's
 * configured exportWriteFolderId. Never modifies unrelated folders.
 *
 * Export folder structure created:
 *   exportWriteFolderId/
 *     Ad-Generator/
 *       {campaign-slug}/
 *         run-01/
 *         run-02/
 *         …
 *
 * "Find or create" is idempotent: if a folder with the given name already
 * exists inside the parent, it is reused — not duplicated.
 */

import type { drive_v3 } from "googleapis";

const AD_GENERATOR_ROOT_NAME = "Ad-Generator";

// ─── Slug helper ──────────────────────────────────────────────────────────────

/**
 * Converts a campaign title to a safe Drive folder name.
 * Strips diacritics, keeps alphanumerics/spaces/hyphens/underscores, max 80 chars.
 */
export function slugifyFolderName(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")    // strip accents
    .replace(/[^a-zA-Z0-9\s\-_]/g, "") // keep safe chars
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return slug || "kampagne";
}

// ─── Core "find or create" ────────────────────────────────────────────────────

/**
 * Finds a folder by name inside a given parent, or creates it.
 * Only creates — never deletes or renames.
 */
export async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId: string
): Promise<string> {
  // Search for existing folder with this exact name inside the parent
  const escapedName = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const res = await drive.files.list({
    q: `name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and '${parentId}' in parents and trashed = false`,
    fields: "files(id, name)",
    spaces: "drive",
    pageSize: 10,
  });

  const existing = res.data.files?.[0];
  if (existing?.id) return existing.id;

  // Create new folder inside the parent
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  if (!created.data.id) {
    throw new Error(`Ordner "${name}" konnte nicht in Drive erstellt werden`);
  }
  return created.data.id;
}

// ─── Export path resolver ─────────────────────────────────────────────────────

export type ResolvedExportPath = {
  adGeneratorRootId: string; // …/Ad-Generator/
  campaignFolderId: string;  // …/Ad-Generator/{campaign-slug}/
  runFolderId: string;       // …/Ad-Generator/{campaign-slug}/run-NN/
  runFolderName: string;     // "run-01"
  campaignFolderName: string;
};

/**
 * Resolves (and creates if needed) the full three-level export path for a run.
 * Always rooted inside exportWriteFolderId.
 */
export async function resolveRunExportFolder(
  drive: drive_v3.Drive,
  exportWriteFolderId: string,
  campaignTitle: string,
  runNumber: number
): Promise<ResolvedExportPath> {
  // Level 1: Ad-Generator root inside export root
  const adGeneratorRootId = await findOrCreateFolder(
    drive,
    AD_GENERATOR_ROOT_NAME,
    exportWriteFolderId
  );

  // Level 2: Campaign folder
  const campaignFolderName = slugifyFolderName(campaignTitle);
  const campaignFolderId = await findOrCreateFolder(
    drive,
    campaignFolderName,
    adGeneratorRootId
  );

  // Level 3: Run folder
  const runFolderName = `run-${String(runNumber).padStart(2, "0")}`;
  const runFolderId = await findOrCreateFolder(drive, runFolderName, campaignFolderId);

  return { adGeneratorRootId, campaignFolderId, runFolderId, runFolderName, campaignFolderName };
}
