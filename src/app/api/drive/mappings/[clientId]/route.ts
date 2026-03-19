import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { driveMappingService } from "@/services/driveMappingService";
import { z } from "zod";

export const dynamic = "force-dynamic";

type Params = { params: { clientId: string } };

// GET – return current mapping
export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const mapping = await driveMappingService.getMapping(params.clientId);
  return NextResponse.json({ mapping });
}

const MappingSchema = z.object({
  brandReadFolderId: z.string().optional().nullable(),
  referencesReadFolderId: z.string().optional().nullable(),
  campaignsReadFolderId: z.string().optional().nullable(),
  exportWriteFolderId: z.string().optional().nullable(),
});

// PUT – upsert mapping
export async function PUT(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const body = await req.json();
  const parsed = MappingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Eingabe", details: parsed.error.issues }, { status: 400 });
  }

  const mapping = await driveMappingService.upsertMapping(params.clientId, parsed.data);
  return NextResponse.json({ mapping });
}

// POST – validate all folders
export async function POST(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const results = await driveMappingService.validateAllFolders(params.clientId);
  return NextResponse.json({ validation: results });
}
