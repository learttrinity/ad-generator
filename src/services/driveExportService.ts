/**
 * Drive Export Service – V1
 *
 * Exports final render assets to the client's configured Google Drive export folder.
 *
 * Safety guarantees:
 * - Only writes to exportWriteFolderId and its subfolders (created by us)
 * - Creates a deterministic /Ad-Generator/{campaign}/{run-NN}/ path
 * - No delete, move, or rename of existing files — ever
 * - Logs every export attempt in DriveExportLog
 */

import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { prisma } from "@/lib/prisma";
import { getDriveClient } from "@/lib/google/googleDriveClient";
import { assertExportAllowed } from "@/lib/google/driveAccessGuard";
import { resolveRunExportFolder } from "@/lib/google/driveFolderResolver";
import type { drive_v3 } from "googleapis";

export type ExportedFileEntry = {
  assetId: string;
  driveFileId: string;
  fileName: string;
};

export type DriveExportResult = {
  success: boolean;
  driveFolderId?: string;
  driveFolderPath?: string;
  driveFileIds: ExportedFileEntry[];
  assetCount: number;
  exportedCount: number;
  errorMessage?: string;
};

// ─── Main export function ─────────────────────────────────────────────────────

export const driveExportService = {
  /**
   * Export all final-rendered assets for a run to Drive.
   * Creates the folder structure and uploads JPGs + a metadata JSON.
   */
  async exportRunToDrive(runId: string, exportedById?: string): Promise<DriveExportResult> {
    const drive = getDriveClient();
    if (!drive) {
      return {
        success: false,
        driveFileIds: [],
        assetCount: 0,
        exportedCount: 0,
        errorMessage: "Google Drive ist nicht konfiguriert. Bitte Zugangsdaten in den Umgebungsvariablen hinterlegen.",
      };
    }

    // Load run with campaign + ready assets
    const run = await prisma.generationRun.findUnique({
      where: { id: runId },
      include: {
        campaign: { select: { id: true, title: true, clientId: true } },
        assets: {
          where: { status: "FERTIG", finalAssetUrl: { not: null } },
          select: { id: true, finalAssetUrl: true, placement: true, audienceKey: true },
        },
      },
    });

    if (!run) {
      return { success: false, driveFileIds: [], assetCount: 0, exportedCount: 0, errorMessage: "Run nicht gefunden" };
    }

    const clientId = run.campaign.clientId;

    // Guard: get + validate export root
    let exportRootId: string;
    try {
      exportRootId = await assertExportAllowed(clientId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, driveFileIds: [], assetCount: 0, exportedCount: 0, errorMessage: msg };
    }

    const readyAssets = run.assets.filter((a) => !!a.finalAssetUrl);
    if (readyAssets.length === 0) {
      return {
        success: false,
        driveFileIds: [],
        assetCount: 0,
        exportedCount: 0,
        errorMessage: "Keine fertigen Assets vorhanden. Bitte zuerst die Assets rendern.",
      };
    }

    try {
      // 1. Resolve (or create) folder structure inside export root
      const { runFolderId, runFolderName, campaignFolderName } =
        await resolveRunExportFolder(drive, exportRootId, run.campaign.title, run.runNumber);

      const driveFolderPath = `Ad-Generator/${campaignFolderName}/${runFolderName}`;
      const driveFileIds: ExportedFileEntry[] = [];
      let exportedCount = 0;

      // 2. Upload each final asset JPG
      for (const asset of readyAssets) {
        try {
          const fileName = buildAssetFileName(asset.audienceKey, asset.placement);
          const driveFileId = await uploadLocalFile(
            drive,
            runFolderId,
            fileName,
            asset.finalAssetUrl!
          );
          driveFileIds.push({ assetId: asset.id, driveFileId, fileName });
          exportedCount++;
        } catch {
          // Individual asset failure is non-fatal — continue with rest
        }
      }

      // 3. Upload generation metadata JSON
      try {
        const metadata = {
          exportedAt: new Date().toISOString(),
          runId: run.id,
          runNumber: run.runNumber,
          campaignTitle: run.campaign.title,
          driveFolderPath,
          totalAssets: readyAssets.length,
          exportedAssets: exportedCount,
          files: driveFileIds.map((f) => ({ fileName: f.fileName, driveFileId: f.driveFileId })),
        };
        const metaBuf = Buffer.from(JSON.stringify(metadata, null, 2), "utf-8");
        await uploadBuffer(drive, runFolderId, "export-info.json", metaBuf, "application/json");
      } catch {
        // Metadata upload failure is non-fatal
      }

      const status =
        exportedCount === 0
          ? "failed"
          : exportedCount < readyAssets.length
          ? "partial"
          : "success";

      // 4. Record export log
      await prisma.driveExportLog.create({
        data: {
          generationRunId: runId,
          clientId,
          driveFolderId: runFolderId,
          driveFileIds: driveFileIds as unknown as never,
          status,
          assetCount: readyAssets.length,
          exportedCount,
          exportedById: exportedById ?? null,
        },
      });

      return {
        success: status !== "failed",
        driveFolderId: runFolderId,
        driveFolderPath,
        driveFileIds,
        assetCount: readyAssets.length,
        exportedCount,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);

      await prisma.driveExportLog.create({
        data: {
          generationRunId: runId,
          clientId,
          driveFolderId: "",
          driveFileIds: [] as unknown as never,
          status: "failed",
          assetCount: readyAssets.length,
          exportedCount: 0,
          errorMessage,
          exportedById: exportedById ?? null,
        },
      });

      return {
        success: false,
        driveFileIds: [],
        assetCount: readyAssets.length,
        exportedCount: 0,
        errorMessage,
      };
    }
  },

  async getExportLogs(runId: string) {
    return prisma.driveExportLog.findMany({
      where: { generationRunId: runId },
      orderBy: { exportedAt: "desc" },
    });
  },
};

// ─── Upload helpers ───────────────────────────────────────────────────────────

/** Upload a Buffer as a new file. Never overwrites, never deletes. */
async function uploadBuffer(
  drive: drive_v3.Drive,
  parentFolderId: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const stream = Readable.from(buffer);
  const res = await drive.files.create({
    requestBody: { name: fileName, parents: [parentFolderId] },
    media: { mimeType, body: stream },
    fields: "id",
  });
  if (!res.data.id) throw new Error(`Upload fehlgeschlagen: ${fileName}`);
  return res.data.id;
}

/** Upload a local public/ file path to Drive. */
async function uploadLocalFile(
  drive: drive_v3.Drive,
  parentFolderId: string,
  fileName: string,
  publicPath: string
): Promise<string> {
  const absPath = path.join(process.cwd(), "public", publicPath);
  if (!fs.existsSync(absPath)) throw new Error(`Datei nicht gefunden: ${absPath}`);
  const buffer = fs.readFileSync(absPath);
  return uploadBuffer(drive, parentFolderId, fileName, buffer, "image/jpeg");
}

function buildAssetFileName(audienceKey: string, placement: string): string {
  return `${audienceKey}_${placement}.jpg`;
}
