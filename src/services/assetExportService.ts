/**
 * Asset Export Service – V1
 *
 * Persists a final-render JPG buffer to disk (public/exports/{runId}/{assetId}.jpg)
 * and returns the public URL path.
 */

import fs from "fs";
import path from "path";

const EXPORT_ROOT = path.join(process.cwd(), "public", "exports");

/**
 * Saves a JPG buffer and returns the public URL path (e.g. "/exports/run123/asset456.jpg").
 */
export async function saveExportedAsset(
  runId: string,
  assetId: string,
  jpgBuffer: Buffer
): Promise<string> {
  const dir = path.join(EXPORT_ROOT, runId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const fileName = `${assetId}.jpg`;
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, jpgBuffer);

  return `/exports/${runId}/${fileName}`;
}
