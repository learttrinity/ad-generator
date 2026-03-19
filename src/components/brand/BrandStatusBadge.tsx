import { Badge } from "@/components/ui/Badge";
import type { BrandProfileStatus } from "@prisma/client";

const config: Record<BrandProfileStatus, { label: string; variant: "success" | "warning" | "neutral" | "info" }> = {
  ENTWURF:     { label: "Entwurf",    variant: "neutral"  },
  IN_PRUEFUNG: { label: "In Prüfung", variant: "warning"  },
  FREIGEGEBEN: { label: "Freigegeben",variant: "success"  },
};

export function BrandStatusBadge({ status }: { status: BrandProfileStatus }) {
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}
