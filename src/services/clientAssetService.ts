import { clientAssetRepository } from "@/repositories/clientAssetRepository";
import { storage, MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from "@/lib/storage";
import { ASSET_TYPE_LABELS } from "@/lib/assetTypes";
import type { ClientAssetType } from "@prisma/client";

export { ASSET_TYPE_LABELS };

export const clientAssetService = {
  async listByClient(clientId: string) {
    return clientAssetRepository.findAllByClient(clientId);
  },

  async upload(params: {
    clientId: string;
    assetType: ClientAssetType;
    file: File;
  }) {
    const { clientId, assetType, file } = params;

    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`Datei zu groß. Maximale Dateigröße: ${MAX_FILE_SIZE / 1024 / 1024} MB`);
    }

    if (!ALLOWED_MIME_TYPES[file.type]) {
      throw new Error(`Dateityp nicht erlaubt: ${file.type}`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await storage.upload({
      buffer,
      originalName: file.name,
      mimeType: file.type,
      folder: `clients/${clientId}`,
    });

    return clientAssetRepository.create({
      clientId,
      assetType,
      fileName: result.fileName,
      fileUrl: result.url,
      fileSize: result.fileSize,
      mimeType: result.mimeType,
      source: "upload",
    });
  },

  async delete(assetId: string) {
    const asset = await clientAssetRepository.findById(assetId);
    if (!asset) throw new Error("Asset nicht gefunden");

    // Delete from storage if it was a local upload
    if (asset.source === "upload" && asset.fileUrl.startsWith("/uploads/")) {
      const key = asset.fileUrl.replace("/uploads/", "");
      await storage.delete(key).catch(() => {}); // best-effort
    }

    return clientAssetRepository.softDelete(assetId);
  },
};
