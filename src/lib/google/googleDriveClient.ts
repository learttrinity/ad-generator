/**
 * Google Drive Client – V1
 *
 * Provides an authenticated Google Drive v3 API client.
 * Uses Service Account authentication — the recommended approach for internal
 * server-side tools where users do not need individual OAuth flows.
 *
 * ─── Setup ───────────────────────────────────────────────────────────────────
 *
 * 1. Go to https://console.cloud.google.com
 * 2. Create a project (or use an existing one)
 * 3. Enable the "Google Drive API" for that project
 * 4. Go to IAM & Admin → Service Accounts → Create Service Account
 * 5. Download the JSON key file
 * 6. Share each Drive folder the app needs to access WITH the service account email
 *    (as Viewer for read folders, Editor for the export folder)
 *
 * ─── Environment variables (choose one option) ───────────────────────────────
 *
 * Option A – single base64-encoded JSON key (recommended for production):
 *   GOOGLE_SERVICE_ACCOUNT_JSON=<base64 of the downloaded JSON key file>
 *   Generate with: base64 -i service-account.json | tr -d '\n'
 *
 * Option B – separate email + private key (easier for local dev):
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-sa@project.iam.gserviceaccount.com
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
 *
 * ─── Important ───────────────────────────────────────────────────────────────
 * The service account has its own Drive namespace. Folders must be explicitly
 * shared with the service account email to be accessible.
 */

import { google } from "googleapis";
import type { drive_v3 } from "googleapis";

const DRIVE_SCOPES = ["https://www.googleapis.com/auth/drive"];

// Singleton instance — reset on cold starts
let _driveClient: drive_v3.Drive | null = null;

function buildAuth(): InstanceType<typeof google.auth.GoogleAuth> | null {
  // Option A: base64-encoded JSON key file
  const saJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (saJson) {
    try {
      const keyFile = JSON.parse(Buffer.from(saJson, "base64").toString("utf-8"));
      return new google.auth.GoogleAuth({
        credentials: keyFile,
        scopes: DRIVE_SCOPES,
      });
    } catch {
      return null;
    }
  }

  // Option B: separate email + private key
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (email && key) {
    return new google.auth.GoogleAuth({
      credentials: {
        client_email: email,
        private_key: key,
        type: "service_account",
      },
      scopes: DRIVE_SCOPES,
    });
  }

  return null;
}

/** Returns an authenticated Drive v3 client, or null if not configured. */
export function getDriveClient(): drive_v3.Drive | null {
  if (_driveClient) return _driveClient;
  const auth = buildAuth();
  if (!auth) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _driveClient = google.drive({ version: "v3", auth: auth as any });
  return _driveClient;
}

/** True if any service account credentials are present in the environment. */
export function isDriveConfigured(): boolean {
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
  );
}

/** Performs a minimal API call to verify credentials work. */
export async function testDriveConnection(): Promise<{
  ok: boolean;
  email?: string;
  error?: string;
}> {
  const drive = getDriveClient();
  if (!drive) {
    return {
      ok: false,
      error: "Keine Service-Account-Zugangsdaten konfiguriert. Bitte GOOGLE_SERVICE_ACCOUNT_JSON oder GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY setzen.",
    };
  }
  try {
    const res = await drive.about.get({ fields: "user" });
    return { ok: true, email: res.data.user?.emailAddress ?? undefined };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
