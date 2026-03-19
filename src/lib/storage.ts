import path from "path";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";

// ─── Storage Abstraction ──────────────────────────────────────────────────────
// Swap out the adapter (LocalStorageAdapter → S3Adapter, GoogleDriveAdapter, etc.)
// without touching any service or route code.

export interface UploadResult {
  url: string;      // public-facing URL to serve the file
  key: string;      // unique key for deletion
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface StorageAdapter {
  upload(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder: string; // e.g. "clients/abc123"
  }): Promise<UploadResult>;

  delete(key: string): Promise<void>;

  /** Return a full public URL for a stored key */
  getUrl(key: string): string;
}

// ─── Local File System Adapter ───────────────────────────────────────────────
// Stores files in `public/uploads/` so Next.js serves them statically in dev.
// Replace this with an S3Adapter or similar for production.

export class LocalStorageAdapter implements StorageAdapter {
  private readonly baseDir: string;
  private readonly baseUrl: string;

  constructor(
    baseDir = path.join(process.cwd(), "public", "uploads"),
    baseUrl = "/uploads",
  ) {
    this.baseDir = baseDir;
    this.baseUrl = baseUrl;
  }

  async upload({ buffer, originalName, mimeType, folder }: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder: string;
  }): Promise<UploadResult> {
    const safeName = sanitizeFileName(originalName);
    const uniqueName = `${Date.now()}-${safeName}`;
    const dir = path.join(this.baseDir, folder);

    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }

    const filePath = path.join(dir, uniqueName);
    await writeFile(filePath, buffer);

    const key = `${folder}/${uniqueName}`;

    return {
      url: `${this.baseUrl}/${folder}/${uniqueName}`,
      key,
      fileName: originalName,
      fileSize: buffer.length,
      mimeType,
    };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.baseDir, key);
    try {
      await unlink(filePath);
    } catch {
      // File may already be gone — ignore
    }
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────
// Swap this export to switch adapters globally.

export const storage: StorageAdapter = new LocalStorageAdapter();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100);
}

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "font/ttf": "ttf",
  "font/otf": "otf",
  "font/woff": "woff",
  "font/woff2": "woff2",
  "application/zip": "zip",
};

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
