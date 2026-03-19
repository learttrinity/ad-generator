/**
 * POST /api/admin/providers/activate
 * Sets the active image generation provider.
 * Validates that the provider has the required config before activating.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { imageProviderSettingsService, type ProviderKey } from "@/services/imageProviderSettingsService";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ActivateSchema = z.object({
  provider: z.enum(["higgsfield", "mock"]),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Nur Administratoren" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = ActivateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültiger Provider" }, { status: 400 });
  }

  const key = parsed.data.provider as ProviderKey;
  const info = await imageProviderSettingsService.getProviderInfo(key);

  if (!info.canActivate) {
    return NextResponse.json(
      {
        error: `Provider "${info.label}" kann nicht aktiviert werden: ${
          !info.hasApiKey ? "API-Schlüssel fehlt" : "Konfiguration unvollständig"
        }`,
      },
      { status: 422 }
    );
  }

  await imageProviderSettingsService.setActiveProvider(key);
  const updated = await imageProviderSettingsService.getProviderInfo(key);

  return NextResponse.json({
    success: true,
    message: `"${updated.label}" wurde als aktiver Provider gesetzt`,
    provider: updated,
  });
}
