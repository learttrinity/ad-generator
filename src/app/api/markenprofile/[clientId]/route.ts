import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { brandProfileService } from "@/services/brandProfileService";

type Params = { params: { clientId: string } };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const profile = await brandProfileService.getByClientId(params.clientId);
  if (!profile) return NextResponse.json({ error: "Markenprofil nicht gefunden" }, { status: 404 });
  return NextResponse.json(profile);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    const body = await req.json();
    const profile = await brandProfileService.save(params.clientId, body);
    return NextResponse.json(profile);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fehler beim Speichern";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
