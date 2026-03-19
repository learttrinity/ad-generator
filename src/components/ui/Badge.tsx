import { cn } from "@/lib/utils";
import type { ClientStatus, CampaignStatus, BrandProfileStatus } from "@prisma/client";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral" | "navy";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:  "bg-border text-ink-secondary",
  success:  "bg-success-bg text-success-text border border-success-border",
  warning:  "bg-warning-bg text-warning-text border border-warning-border",
  danger:   "bg-danger-bg text-danger-text border border-danger-border",
  info:     "bg-accent-50 text-accent-700 border border-accent-100",
  neutral:  "bg-surface text-ink-muted border border-border",
  navy:     "bg-accent-navy text-white",
};

const dotColors: Record<BadgeVariant, string> = {
  default:  "bg-ink-muted",
  success:  "bg-success",
  warning:  "bg-warning",
  danger:   "bg-danger",
  info:     "bg-accent-500",
  neutral:  "bg-ink-faint",
  navy:     "bg-white",
};

export function Badge({ children, variant = "default", className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variantClasses[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant])} />
      )}
      {children}
    </span>
  );
}

// ─── Pre-built status badges ──────────────────────────────────────────────────

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const config: Record<ClientStatus, { label: string; variant: BadgeVariant }> = {
    AKTIV:      { label: "Aktiv",      variant: "success" },
    INAKTIV:    { label: "Inaktiv",    variant: "neutral" },
    ARCHIVIERT: { label: "Archiviert", variant: "warning" },
  };
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function CampaignStatusBadge({ status }: { status: CampaignStatus }) {
  const config: Record<CampaignStatus, { label: string; variant: BadgeVariant }> = {
    ENTWURF:        { label: "Entwurf",        variant: "neutral" },
    BEREIT:         { label: "Bereit",          variant: "info" },
    IN_GENERIERUNG: { label: "In Generierung",  variant: "info" },
    ZUR_PRUEFUNG:   { label: "Zur Prüfung",     variant: "warning" },
    FREIGEGEBEN:    { label: "Freigegeben",     variant: "success" },
    EXPORTIERT:     { label: "Exportiert",      variant: "success" },
    ARCHIVIERT:     { label: "Archiviert",      variant: "default" },
  };
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}

export function BrandStatusBadge({ status }: { status: BrandProfileStatus }) {
  const config: Record<BrandProfileStatus, { label: string; variant: BadgeVariant }> = {
    ENTWURF:     { label: "Entwurf",     variant: "neutral" },
    IN_PRUEFUNG: { label: "In Prüfung",  variant: "warning" },
    FREIGEGEBEN: { label: "Freigegeben", variant: "success" },
  };
  const { label, variant } = config[status];
  return <Badge variant={variant} dot>{label}</Badge>;
}
