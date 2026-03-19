/**
 * POST /api/admin/providers/higgsfield/test
 * Tests the Higgsfield connection using server-side credentials.
 * Never exposes the API key. Returns only safe status info.
 */
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { providerHealthService } from "@/services/providerHealthService";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  if (session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Nur Administratoren" }, { status: 403 });
  }

  const result = await providerHealthService.testAndStore("higgsfield");
  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
