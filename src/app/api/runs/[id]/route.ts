import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generationRunRepository } from "@/repositories/generationRunRepository";

type Context = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const run = await generationRunRepository.findByIdWithFullAssets(params.id);
  if (!run) {
    return NextResponse.json({ error: "Run nicht gefunden" }, { status: 404 });
  }

  return NextResponse.json(run);
}
