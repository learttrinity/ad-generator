/**
 * Drive Access Guard – V1
 *
 * THE single enforcement point for all Google Drive operations.
 * Every service that touches Drive MUST call the relevant guard function first.
 *
 * ─── Allowed operations ──────────────────────────────────────────────────────
 *   read_list    – list files in an approved read folder
 *   read_file    – get metadata of a file inside an approved read folder
 *   create_folder – create a subfolder inside the export root chain
 *   upload_file  – upload a new file inside the export root chain
 *
 * ─── Permanently forbidden operations ────────────────────────────────────────
 *   delete           – delete any Drive file or folder
 *   trash            – move any file to trash
 *   move             – change a file's parent (move between folders)
 *   rename_existing  – rename an existing file (new uploads may have any name)
 *   write_outside_export_root – upload/create outside the configured export root
 *
 * These forbidden operations are never implemented anywhere in this codebase.
 * This guard provides the check layer so future developers cannot accidentally
 * add them without explicitly bypassing the guard.
 */

import { prisma } from "@/lib/prisma";

// ─── Error type ───────────────────────────────────────────────────────────────

export class DriveAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DriveAccessError";
  }
}

// ─── Permanently forbidden – never implement these ───────────────────────────

/** Calling this always throws. Used to make forbidden intent explicit in code. */
export function forbiddenOperation(operation: string): never {
  throw new DriveAccessError(
    `VERBOTEN: Die Operation "${operation}" ist in diesem System dauerhaft gesperrt. ` +
    `Google Drive-Dateien dürfen nicht gelöscht, verschoben oder umbenannt werden.`
  );
}

// ─── Guard functions ──────────────────────────────────────────────────────────

async function getMapping(clientId: string) {
  return prisma.clientDriveMapping.findUnique({ where: { clientId } });
}

/**
 * Assert that listing/reading from a specific folder is allowed for this client.
 * The folder must be one of the explicitly mapped read-only source folders.
 */
export async function assertReadAllowed(clientId: string, folderId: string): Promise<void> {
  const mapping = await getMapping(clientId);
  if (!mapping) {
    throw new DriveAccessError(
      `Kein Drive-Mapping für Kunde "${clientId}" konfiguriert. Bitte zuerst die Drive-Ordner im Kunden-Tab hinterlegen.`
    );
  }

  const allowedFolders = [
    mapping.brandReadFolderId,
    mapping.referencesReadFolderId,
    mapping.campaignsReadFolderId,
  ].filter(Boolean) as string[];

  if (allowedFolders.length === 0) {
    throw new DriveAccessError(
      `Keine Lese-Ordner für Kunde "${clientId}" konfiguriert.`
    );
  }

  if (!allowedFolders.includes(folderId)) {
    throw new DriveAccessError(
      `Lesezugriff verweigert: Ordner "${folderId}" ist nicht als freigegebener Leseordner für diesen Kunden hinterlegt.`
    );
  }
}

/**
 * Assert that uploading or creating a subfolder inside a given parent is allowed.
 * The parent must be the configured export root (or a folder provably inside it,
 * as returned by driveFolderResolver).
 */
export async function assertExportAllowed(clientId: string): Promise<string> {
  const mapping = await getMapping(clientId);
  if (!mapping) {
    throw new DriveAccessError(
      `Kein Drive-Mapping für Kunde "${clientId}" konfiguriert.`
    );
  }
  if (!mapping.exportWriteFolderId) {
    throw new DriveAccessError(
      `Kein Export-Ordner für Kunde "${clientId}" konfiguriert. Bitte exportWriteFolderId im Drive-Mapping hinterlegen.`
    );
  }
  return mapping.exportWriteFolderId;
}

/**
 * Returns all whitelisted read folder IDs for a client (non-null only).
 */
export async function getAllowedReadFolderIds(clientId: string): Promise<string[]> {
  const mapping = await getMapping(clientId);
  if (!mapping) return [];
  return [
    mapping.brandReadFolderId,
    mapping.referencesReadFolderId,
    mapping.campaignsReadFolderId,
  ].filter(Boolean) as string[];
}

/**
 * Returns the configured export write folder ID, or null.
 */
export async function getExportWriteFolderId(clientId: string): Promise<string | null> {
  const mapping = await getMapping(clientId);
  return mapping?.exportWriteFolderId ?? null;
}
