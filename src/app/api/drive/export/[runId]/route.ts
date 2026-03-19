import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { driveExportService } from "@/services/driveExportService";

export const dynamic = "force-dynamic";

/**
 * POST /api/drive/export/[runId]
 *
 * Exports all final-rendered assets for a run to Google Drive.
 * Creates a /Ad-Generator/{campaign}/{run-NN}/ folder structure inside the
 * client's configured export root. Uploads JPGs + metadata JSON.
 *
 * Only writes inside the approved exportWriteFolderId — enforced by the guard.
 */
export async function POST(
  _req: Request,
  { params }: { params: { runId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const result = await driveExportService.exportRunToDrive(
    params.runId,
    (session.user as { id?: string }).id
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.errorMessage },
      { status: result.errorMessage?.includes("nicht gefunden") ? 404 : 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `${result.exportedCount} von ${result.assetCount} Assets nach Google Drive exportiert`,
    driveFolderPath: result.driveFolderPath,
    driveFolderId: result.driveFolderId,
    exportedCount: result.exportedCount,
    assetCount: result.assetCount,
  });
}

/**
 * GET /api/drive/export/[runId]
 * Returns the export log history for a run.
 */
export async function GET(
  _req: Request,
  { params }: { params: { runId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const logs = await driveExportService.getExportLogs(params.runId);
  return NextResponse.json({ logs });
}
