import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { driveReadService } from "@/services/driveReadService";
import { DriveAccessError } from "@/lib/google/driveAccessGuard";

export const dynamic = "force-dynamic";

/**
 * GET /api/drive/browse?clientId=…&folderId=…&type=all|images|documents
 *
 * Returns files in an approved read folder.
 * The folder must be whitelisted for the client — unauthorized access is rejected.
 */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const folderId = searchParams.get("folderId");
  const type = searchParams.get("type") ?? "all";

  if (!clientId || !folderId) {
    return NextResponse.json({ error: "clientId und folderId erforderlich" }, { status: 400 });
  }

  try {
    let files;
    if (type === "images") {
      files = await driveReadService.listImages(clientId, folderId);
    } else if (type === "documents") {
      files = await driveReadService.listDocuments(clientId, folderId);
    } else {
      files = await driveReadService.listAll(clientId, folderId);
    }
    return NextResponse.json({ files });
  } catch (err) {
    if (err instanceof DriveAccessError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
