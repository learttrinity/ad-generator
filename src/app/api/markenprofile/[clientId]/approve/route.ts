import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { brandProfileService } from "@/services/brandProfileService";
import { BrandProfileStatus } from "@prisma/client";

type Params = { params: { clientId: string } };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    const { status } = await req.json() as { status: BrandProfileStatus };

    if (!Object.values(BrandProfileStatus).includes(status)) {
      return NextResponse.json({ error: "Ungültiger Status" }, { status: 400 });
    }

    const profile = await brandProfileService.setStatus(params.clientId, status);
    return NextResponse.json(profile);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Fehler beim Statuswechsel";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
