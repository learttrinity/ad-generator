import type { ProviderHealthStatus } from "@/services/imageProviderSettingsService";

const CONFIG: Record<ProviderHealthStatus, { label: string; dot: string; badge: string }> = {
  unconfigured: {
    label: "Nicht konfiguriert",
    dot: "bg-ink-faint",
    badge: "bg-surface text-ink-muted",
  },
  partial: {
    label: "Teilweise konfiguriert",
    dot: "bg-warning",
    badge: "bg-warning-bg text-warning-text",
  },
  ready: {
    label: "Bereit",
    dot: "bg-accent-400",
    badge: "bg-accent-50 text-accent-700",
  },
  success: {
    label: "Verbindung erfolgreich",
    dot: "bg-success",
    badge: "bg-success-bg text-success-text",
  },
  failed: {
    label: "Verbindung fehlgeschlagen",
    dot: "bg-danger",
    badge: "bg-danger-bg text-danger-text",
  },
  pending: {
    label: "Test ausstehend",
    dot: "bg-ink-faint",
    badge: "bg-surface text-ink-muted",
  },
};

export function ProviderHealthBadge({ status }: { status: ProviderHealthStatus }) {
  const cfg = CONFIG[status] ?? CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.badge}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
