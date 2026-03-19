import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { brandProfileService } from "@/services/brandProfileService";

type Params = { params: { clientId: string } };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  try {
    const suggestions = await brandProfileService.runAnalysis(params.clientId);
    return NextResponse.json(suggestions);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Analyse fehlgeschlagen";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
