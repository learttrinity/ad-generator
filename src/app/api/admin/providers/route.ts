/**
 * GET /api/admin/providers
 * Returns safe (non-secret) status information for all image generation providers.
 * Never exposes API keys or credentials.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { imageProviderSettingsService } from "@/services/imageProviderSettingsService";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Nur Administratoren" }, { status: 403 });
  }

  const providers = await imageProviderSettingsService.getAllProviderInfos();
  return NextResponse.json({ providers });
}
