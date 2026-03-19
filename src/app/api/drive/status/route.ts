import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isDriveConfigured } from "@/lib/google/googleDriveClient";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const configured = isDriveConfigured();

  return NextResponse.json({
    configured,
    mode: configured ? "service_account" : null,
    envHint: configured
      ? null
      : "Setze GOOGLE_SERVICE_ACCOUNT_JSON oder GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY",
  });
}
