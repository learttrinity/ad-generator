/**
 * PATCH /api/assets/[id]/approve
 * Persists the approved state for a CreativeAsset.
 * Body: { approved: boolean }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Context = { params: { id: string } };

export async function PATCH(req: NextRequest, { params }: Context) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  let approved: boolean;
  try {
    const body = await req.json();
    if (typeof body.approved !== "boolean") {
      return NextResponse.json(
        { error: "approved muss ein Boolean sein" },
        { status: 400 }
      );
    }
    approved = body.approved;
  } catch {
    return NextResponse.json({ error: "Ungültiger Request-Body" }, { status: 400 });
  }

  const asset = await prisma.creativeAsset.findUnique({
    where: { id: params.id },
    select: { id: true },
  });

  if (!asset) {
    return NextResponse.json({ error: "Asset nicht gefunden" }, { status: 404 });
  }

  const updated = await prisma.creativeAsset.update({
    where: { id: params.id },
    data: {
      approved,
      // Freigegeben status if approved, back to FERTIG if un-approved
      status: approved ? "FREIGEGEBEN" : "FERTIG",
    },
    select: { id: true, approved: true, status: true },
  });

  return NextResponse.json(updated);
}
