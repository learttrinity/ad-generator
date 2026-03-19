import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { clientAssetService } from "@/services/clientAssetService";
import type { ClientAssetType } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const clientId = formData.get("clientId") as string | null;
    const assetType = formData.get("assetType") as ClientAssetType | null;

    if (!file || !clientId || !assetType) {
      return NextResponse.json({ error: "Fehlende Parameter: file, clientId, assetType" }, { status: 400 });
    }

    const asset = await clientAssetService.upload({ clientId, assetType, file });
    return NextResponse.json(asset, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
