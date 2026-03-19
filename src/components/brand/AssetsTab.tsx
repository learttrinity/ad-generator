"use client";

import { useState } from "react";
import { AssetUploader } from "@/components/brand/AssetUploader";
import type { ClientAsset } from "@prisma/client";

interface Props {
  clientId: string;
  initialAssets: ClientAsset[];
}

export function AssetsTab({ clientId, initialAssets }: Props) {
  const [assets, setAssets] = useState<ClientAsset[]>(initialAssets);

  function handleUploaded(asset: ClientAsset) {
    setAssets((prev) => [asset, ...prev]);
  }

  function handleDeleted(id: string) {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <AssetUploader
      clientId={clientId}
      assets={assets}
      onUploaded={handleUploaded}
      onDeleted={handleDeleted}
    />
  );
}
