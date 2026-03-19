"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientInfo = {
  id: string;
  name: string;
  initials: string;
  brandColor: string;
  reviewStatus: string | null;
  approved: boolean;
  campaignCount: number;
  confidencePct: number;
};

type RecentCampaign = {
  id: string;
  title: string;
  offerType: string | null;
  headline: string | null;
  customText: string | null;
  priceNew: string | null;
  priceOld: string | null;
  billingInterval: string | null;
  clientId: string;
};

type RunData = {
  id: string;
  status: string;
  totalAssets: number;
  completedAssets: number;
  progressPercent: number;
};

type FormState = {
  offerType: string;
  priceNew: string;
  abbuchung: string;
  priceOld: string;
  headline: string;
  customText: string;
  title: string;
};

type Props = {
  clients: ClientInfo[];
  recentCampaigns: RecentCampaign[];
  providerReady: boolean;
  isMockProvider: boolean;
  providerLabel: string | null;
  preselectedClientId?: string | null;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const OFFER_TYPES = [
  "Monatskündbar",
  "Preisaktion",
  "Custom",
];

const EMPTY_FORM: FormState = {
  offerType: "",
  priceNew: "",
  abbuchung: "",
  priceOld: "",
  headline: "",
  customText: "",
  title: "",
};

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? "#1A1A1A" : "#FFFFFF";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GeneratorClient({
  clients,
  recentCampaigns,
  providerReady,
  isMockProvider,
  providerLabel,
  preselectedClientId,
}: Props) {
  const hasPreselect = !!preselectedClientId && clients.some((c) => c.id === preselectedClientId);
  const [phase, setPhase] = useState<"pick-client" | "fill-form" | "generating" | "done">(
    hasPreselect ? "fill-form" : "pick-client"
  );
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    hasPreselect ? preselectedClientId : null
  );
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [environmentMode, setEnvironmentMode] = useState<"STANDARD_STUDIO" | "KUNDENSTUDIO_REFERENZ">("STANDARD_STUDIO");
  const [studioImageUrl, setStudioImageUrl] = useState<string | null>(null);
  const [studioImagePreview, setStudioImagePreview] = useState<string | null>(null);
  const [isUploadingStudio, setIsUploadingStudio] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [runData, setRunData] = useState<RunData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [apiWarnings, setApiWarnings] = useState<string[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [mockDismissed, setMockDismissed] = useState(false);
  const [previousExpanded, setPreviousExpanded] = useState(false);

  const router = useRouter();
  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;
  const clientCampaigns = recentCampaigns.filter((c) => c.clientId === selectedClientId).slice(0, 5);

  const isGenerating = runData && (runData.status === "IN_GENERIERUNG" || runData.status === "IN_VORBEREITUNG");
  // ── Poll run status ──────────────────────────────────────────────────────────
  const pollRun = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/runs/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setRunData(data);
      if (data.status === "FERTIG" || data.status === "FEHLER") {
        router.push(`/runs/${id}`);
      }
    } catch { /* ignore */ }
  }, [router]);

  useEffect(() => {
    if (!runId || !isGenerating) return;
    const interval = setInterval(() => pollRun(runId), 2000);
    return () => clearInterval(interval);
  }, [runId, isGenerating, pollRun]);

  function selectClient(clientId: string) {
    setSelectedClientId(clientId);
    setForm(EMPTY_FORM);
    setPreviousExpanded(false);
    setError(null);
    setStudioImageUrl(null);
    setStudioImagePreview(null);
    setPhase("fill-form");
  }

  function handleEnvironmentChange(mode: typeof environmentMode) {
    setEnvironmentMode(mode);
    if (mode === "STANDARD_STUDIO") {
      setStudioImageUrl(null);
      setStudioImagePreview(null);
    }
    setError(null);
  }

  async function handleStudioUpload(file: File) {
    setIsUploadingStudio(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/generator/upload-reference", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setError(data.error ?? "Upload fehlgeschlagen."); return; }
      setStudioImageUrl(data.url);
      setStudioImagePreview(URL.createObjectURL(file));
    } catch {
      setError("Upload fehlgeschlagen.");
    } finally {
      setIsUploadingStudio(false);
    }
  }

  function loadPrevious(c: RecentCampaign) {
    setForm({
      offerType: c.offerType ?? "",
      priceNew: c.priceNew ?? "",
      abbuchung: c.billingInterval ?? "",
      priceOld: c.priceOld ?? "",
      headline: c.headline ?? "",
      customText: c.customText ?? "",
      title: c.title,
    });
    setPreviousExpanded(false);
  }

  function updateForm(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function startGeneration() {
    if (!selectedClientId) return;
    if (!form.offerType) { setError("Bitte Angebotstyp auswählen."); return; }

    if (form.offerType === "Monatskündbar" || form.offerType === "Preisaktion") {
      if (!form.priceNew) { setError("Bitte Preis eingeben."); return; }
      if (!form.abbuchung.trim()) { setError("Bitte Abbuchung eingeben (z. B. MTL.)."); return; }
    }
    if (form.offerType === "Custom") {
      if (!form.customText.trim()) { setError("Bitte Custom Text eingeben."); return; }
    }
    if (environmentMode === "KUNDENSTUDIO_REFERENZ" && !studioImageUrl) {
      setError("Bitte lade ein Studio-Bild hoch um Kundenstudio zu verwenden.");
      return;
    }

    setError(null);
    setIsStarting(true);
    setPhase("generating");
    setApiWarnings([]);

    try {
      const res = await fetch("/api/generator/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          title: form.title.trim() || null,
          offerType: form.offerType,
          headline: form.headline.trim() || null,
          customText: form.customText.trim() || null,
          priceNew: form.priceNew || null,
          priceOld: form.priceOld || null,
          abbuchung: form.abbuchung.trim() || null,
          environmentMode,
          studioReferenceImageUrl: studioImageUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Generierung konnte nicht gestartet werden");
        setPhase("fill-form");
        return;
      }

      const data = await res.json();
      if (data.warnings?.length) setApiWarnings(data.warnings);
      setRunId(data.runId);
      await pollRun(data.runId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      setPhase("fill-form");
    } finally {
      setIsStarting(false);
    }
  }

  // ── Input field helper ────────────────────────────────────────────────────────
  function field(
    label: string,
    key: keyof FormState,
    opts?: { required?: boolean; type?: string; suffix?: string; placeholder?: string }
  ) {
    const isRequired = opts?.required;
    const missing = isRequired && !form[key];
    return (
      <div>
        <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
          {label}
          {isRequired && <span className="text-danger ml-0.5">*</span>}
        </label>
        <div className="relative">
          <input
            type={opts?.type ?? "text"}
            value={form[key]}
            onChange={(e) => updateForm(key, e.target.value)}
            placeholder={opts?.placeholder ?? ""}
            className={`w-full rounded-lg border px-3 py-2 text-sm text-ink bg-white outline-none transition-colors focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 ${
              missing ? "border-warning" : "border-border"
            } ${opts?.suffix ? "pr-8" : ""}`}
          />
          {opts?.suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-faint pointer-events-none">
              {opts.suffix}
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Phase: pick-client ─────────────────────────────────────────────────────
  if (phase === "pick-client") {
    return (
      <div className="px-8 py-10 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink">Generator</h1>
          <p className="text-sm text-ink-muted mt-1">Wähle einen Kunden aus, um Ads zu generieren</p>
        </div>

        {/* Provider banner (info only — generation always works via fallback) */}
        {!providerReady && (
          <div className="mb-6 rounded-xl border border-border bg-surface px-4 py-3 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-ink-faint shrink-0" />
            <p className="text-xs text-ink-muted">
              Kein Bildgenerator konfiguriert — Ads werden mit Gradient-Hintergrund generiert.{" "}
              <a href="/admin/integrationen" className="font-semibold underline hover:no-underline">Einrichten →</a>
            </p>
          </div>
        )}
        {providerReady && isMockProvider && (
          <div className="mb-6 rounded-lg border border-border bg-surface px-3 py-2 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-ink-faint shrink-0" />
            <p className="text-xs text-ink-muted">
              Testmodus aktiv ({providerLabel}) — Bilder werden simuliert, nicht echt generiert
            </p>
          </div>
        )}

        {/* No clients empty state */}
        {clients.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center space-y-4">
            <p className="text-sm text-ink-muted">Noch keine Kunden vorhanden.</p>
            <a
              href="/kunden/neu"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 transition-colors"
            >
              Ersten Kunden anlegen →
            </a>
          </div>
        )}

        {/* Client cards grid */}
        {clients.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((client) => {
              const textColor = contrastColor(client.brandColor);
              const hasBrand = !!client.reviewStatus;
              const isApproved = client.reviewStatus === "FREIGEGEBEN";

              return (
                <button
                  key={client.id}
                  onClick={() => selectClient(client.id)}
                  className="group text-left rounded-2xl border border-border bg-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-150 overflow-hidden focus:outline-none focus:ring-2 focus:ring-accent-500"
                >
                  {/* Brand color header */}
                  <div
                    className="px-5 pt-5 pb-4"
                    style={{ background: `${client.brandColor}14` }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 shadow-sm transition-transform group-hover:scale-105"
                        style={{ background: client.brandColor, color: textColor }}
                      >
                        {client.initials}
                      </div>
                      {/* Status badge */}
                      {hasBrand ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            isApproved
                              ? "bg-success-bg text-success-text border-success-border"
                              : "bg-warning-bg text-warning-text border-warning-border"
                          }`}
                        >
                          <span className={`w-1 h-1 rounded-full ${isApproved ? "bg-success" : "bg-warning"}`} />
                          {isApproved ? "Freigegeben" : client.reviewStatus === "ZUR_PRUEFUNG" ? "In Prüfung" : "Entwurf"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface text-ink-faint border border-border">
                          Kein Profil
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] font-bold text-ink leading-tight">{client.name}</p>
                    <p className="text-xs text-ink-muted mt-0.5">
                      {client.campaignCount} Kampagne{client.campaignCount !== 1 ? "n" : ""}
                    </p>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs font-semibold text-accent-600 group-hover:text-accent-700 transition-colors flex items-center gap-1">
                      Ads generieren
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                    {hasBrand && (
                      <span className="text-[11px] text-ink-faint">
                        {client.confidencePct}% Profil
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Phase: fill-form ───────────────────────────────────────────────────────
  if (phase === "fill-form" && selectedClient) {
    const textColor = contrastColor(selectedClient.brandColor);

    return (
      <div className="px-8 py-8 max-w-3xl">
        {/* Selected client bar */}
        <div
          className="rounded-xl border border-border mb-6 flex items-center gap-3 px-4 py-3 shadow-card"
          style={{ background: `${selectedClient.brandColor}10`, borderColor: `${selectedClient.brandColor}30` }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: selectedClient.brandColor, color: textColor }}
          >
            {selectedClient.initials}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-ink">{selectedClient.name}</p>
            <p className="text-xs text-ink-muted">Kunde ausgewählt</p>
          </div>
          <button
            onClick={() => { setPhase("pick-client"); setError(null); }}
            className="text-xs text-ink-muted hover:text-ink-secondary font-medium border border-border rounded-lg px-3 py-1.5 hover:bg-white transition-colors"
          >
            Ändern
          </button>
        </div>

        {/* Provider / mock notice (info only — generation always works) */}
        {(!providerReady || isMockProvider) && !mockDismissed && (
          <div className="mb-4 rounded-lg border border-border bg-surface px-3 py-2 flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-ink-faint shrink-0" />
            <p className="text-xs text-ink-muted flex-1">
              {isMockProvider
                ? "Testmodus — Bilder werden simuliert"
                : "Kein Bildgenerator konfiguriert — Gradient-Hintergrund wird verwendet"}
            </p>
            <button onClick={() => setMockDismissed(true)} className="text-ink-faint hover:text-ink-muted">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Brand profile notices (info — never block generation) */}
        {!selectedClient.approved && selectedClient.reviewStatus && (
          <div className="mb-4 rounded-lg border border-border bg-surface px-3 py-2.5 flex items-start gap-2">
            <span className="text-ink-faint mt-0.5 text-xs">ℹ</span>
            <p className="text-xs text-ink-muted">
              Markenprofil noch nicht freigegeben — Ads werden trotzdem generiert.
            </p>
          </div>
        )}
        {!selectedClient.reviewStatus && (
          <div className="mb-4 rounded-lg border border-border bg-surface px-3 py-2.5 flex items-start gap-2">
            <span className="text-ink-faint mt-0.5 text-xs">ℹ</span>
            <p className="text-xs text-ink-muted">
              Kein Markenprofil vorhanden — Ads werden mit Standardwerten generiert.{" "}
              <a href={`/markenprofile/onboarding?client=${selectedClient.id}`} className="font-semibold underline hover:no-underline">
                Profil anlegen
              </a>
            </p>
          </div>
        )}

        {/* Previous campaigns quick-load */}
        {clientCampaigns.length > 0 && (
          <div className="mb-5">
            <button
              onClick={() => setPreviousExpanded((v) => !v)}
              className="flex items-center gap-2 text-xs font-semibold text-ink-muted hover:text-ink-secondary transition-colors"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${previousExpanded ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              Vorherige Kampagne laden ({clientCampaigns.length})
            </button>
            {previousExpanded && (
              <div className="mt-2 rounded-xl border border-border bg-white overflow-hidden shadow-card">
                {clientCampaigns.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => loadPrevious(c)}
                    className={`w-full text-left px-4 py-3 hover:bg-surface transition-colors ${
                      i < clientCampaigns.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <p className="text-xs font-semibold text-ink truncate">{c.title}</p>
                    <p className="text-[10px] text-ink-muted mt-0.5">
                      {c.offerType && <span>{c.offerType} · </span>}
                      {c.priceNew && <span>{c.priceNew} € · </span>}
                      {c.headline}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Campaign form */}
        <div className="rounded-xl border border-border bg-white shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Kampagnendetails</p>
          </div>
          <div className="px-5 py-5 space-y-4">
            {/* Angebotstyp — always shown, required */}
            <div>
              <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                Angebotstyp <span className="text-danger">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {OFFER_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { updateForm("offerType", t); setError(null); }}
                    className={`py-2.5 px-3 rounded-lg border text-sm font-semibold transition-all ${
                      form.offerType === t
                        ? "border-accent-500 bg-accent-50 text-accent-700"
                        : "border-border text-ink-muted hover:bg-surface hover:text-ink-secondary"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Fields for Monatskündbar */}
            {form.offerType === "Monatskündbar" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {field("Preis", "priceNew", { required: true, type: "number", suffix: "€", placeholder: "29.90" })}
                  <div>
                    <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                      Abbuchung <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={form.abbuchung}
                      onChange={(e) => updateForm("abbuchung", e.target.value)}
                      placeholder="MTL."
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-ink bg-white outline-none transition-colors focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 ${
                        !form.abbuchung ? "border-warning" : "border-border"
                      }`}
                    />
                    <p className="mt-1 text-[10px] text-ink-faint">z.B. MTL. · 4-WTL. · WTL.</p>
                  </div>
                </div>
                {field("Stattpreis", "priceOld", { type: "number", suffix: "€", placeholder: "49.90 (optional)" })}
                {field("Headline", "headline", { placeholder: "optional" })}
              </>
            )}

            {/* Fields for Preisaktion — same inputs, different render */}
            {form.offerType === "Preisaktion" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {field("Preis", "priceNew", { required: true, type: "number", suffix: "€", placeholder: "29.90" })}
                  <div>
                    <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                      Abbuchung <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      value={form.abbuchung}
                      onChange={(e) => updateForm("abbuchung", e.target.value)}
                      placeholder="MTL."
                      className={`w-full rounded-lg border px-3 py-2 text-sm text-ink bg-white outline-none transition-colors focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 ${
                        !form.abbuchung ? "border-warning" : "border-border"
                      }`}
                    />
                    <p className="mt-1 text-[10px] text-ink-faint">z.B. MTL. · 4-WTL. · WTL.</p>
                  </div>
                </div>
                {field("Stattpreis", "priceOld", { type: "number", suffix: "€", placeholder: "49.90 (optional)" })}
                {field("Headline", "headline", { placeholder: "optional" })}
              </>
            )}

            {/* Fields for Custom */}
            {form.offerType === "Custom" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                    Custom Text <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.customText}
                    onChange={(e) => updateForm("customText", e.target.value)}
                    placeholder="z. B. 4 Wochen gratis trainieren"
                    className={`w-full rounded-lg border px-3 py-2 text-sm text-ink bg-white outline-none transition-colors focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500 ${
                      !form.customText ? "border-warning" : "border-border"
                    }`}
                  />
                </div>
                {field("Preis", "priceNew", { type: "number", suffix: "€", placeholder: "optional" })}
                {form.priceNew && (
                  <div>
                    <label className="block text-xs font-semibold text-ink-secondary mb-1.5">Abbuchung</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={form.abbuchung}
                      onChange={(e) => updateForm("abbuchung", e.target.value)}
                      placeholder="MTL. (optional)"
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm text-ink bg-white outline-none transition-colors focus:ring-2 focus:ring-accent-500/20 focus:border-accent-500"
                    />
                    <p className="mt-1 text-[10px] text-ink-faint">z.B. MTL. · 4-WTL. · WTL.</p>
                  </div>
                )}
                {field("Stattpreis", "priceOld", { type: "number", suffix: "€", placeholder: "optional" })}
                {field("Headline", "headline", { placeholder: "optional" })}
              </>
            )}

            {/* Placeholder state — no type selected */}
            {!form.offerType && (
              <div className="rounded-lg border border-dashed border-border bg-surface px-4 py-6 text-center">
                <p className="text-xs text-ink-faint">Angebotstyp auswählen um Felder anzuzeigen</p>
              </div>
            )}
          </div>
        </div>

        {/* Settings */}
        <div className="mt-4 rounded-xl border border-border bg-white shadow-card overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border">
            <p className="text-[11px] font-bold text-ink-muted uppercase tracking-widest">Einstellungen</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {/* Umgebung */}
            <div>
              <p className="text-xs font-semibold text-ink-secondary mb-2">Umgebung</p>
              <div className="flex gap-2 mb-2.5">
                {[
                  { value: "STANDARD_STUDIO", label: "Standard Studio" },
                  { value: "KUNDENSTUDIO_REFERENZ", label: "Kundenstudio" },
                ].map((opt) => {
                  const isActive = environmentMode === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleEnvironmentChange(opt.value as typeof environmentMode)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                        isActive
                          ? "border-accent-600 bg-accent-600 text-white shadow-sm"
                          : "border-border text-ink-muted hover:border-ink-muted hover:text-ink-secondary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Standard Studio description */}
              {environmentMode === "STANDARD_STUDIO" && (
                <p className="text-xs text-ink-muted">
                  Professioneller Studio-Hintergrund, abgestimmt auf die Markenfarben von{" "}
                  <span className="font-semibold text-ink-secondary">{selectedClient?.name}</span>
                </p>
              )}

              {/* Kundenstudio — upload zone */}
              {environmentMode === "KUNDENSTUDIO_REFERENZ" && (
                <div className="space-y-2">
                  <p className="text-xs text-ink-muted">
                    Lade ein Foto deines Studios hoch. Das Modell wird in deiner Umgebung generiert.
                  </p>
                  {studioImagePreview ? (
                    <div className="relative rounded-lg overflow-hidden border border-border bg-surface">
                      <img src={studioImagePreview} alt="Studio Vorschau" className="w-full h-28 object-cover" />
                      <button
                        type="button"
                        onClick={() => { setStudioImageUrl(null); setStudioImagePreview(null); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-black/40">
                        <p className="text-[10px] text-white font-semibold">Studio-Bild hochgeladen</p>
                      </div>
                    </div>
                  ) : (
                    <label className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
                      isUploadingStudio
                        ? "border-accent-300 bg-accent-50/50"
                        : "border-border bg-surface hover:border-accent-400 hover:bg-accent-50/30"
                    }`}>
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        className="sr-only"
                        disabled={isUploadingStudio}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleStudioUpload(file);
                          e.target.value = "";
                        }}
                      />
                      {isUploadingStudio ? (
                        <svg className="animate-spin w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-ink-faint" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                        </svg>
                      )}
                      <div className="text-center">
                        <p className="text-xs font-semibold text-ink-secondary">
                          {isUploadingStudio ? "Wird hochgeladen …" : "Studio-Bild hochladen"}
                        </p>
                        <p className="text-[10px] text-ink-faint mt-0.5">JPG oder PNG, max. 10 MB</p>
                      </div>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-text">
            {error}
          </div>
        )}

        {/* Generate CTA */}
        <div className="mt-6 flex items-center justify-between gap-4 py-5 border-t border-border">
          <p className="text-xs text-ink-muted">
            12 Ads werden generiert für <span className="font-semibold text-ink-secondary">{selectedClient.name}</span>
          </p>
          <button
            onClick={startGeneration}
            disabled={isStarting}
            className="px-8 py-3 rounded-xl bg-accent-600 text-white font-bold text-sm hover:bg-accent-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md inline-flex items-center gap-2.5"
          >
            {isStarting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Startet …
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                12 Ads generieren
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Phase: generating ─────────────────────────────────────────────────────
  const completedAssets = runData?.completedAssets ?? 0;
  const totalAssets = runData?.totalAssets ?? 12;
  const progressPercent = runData?.progressPercent ?? 0;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#F8F8F7]">
      {/* Top progress bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-border overflow-hidden">
        <div
          className="h-full bg-accent-600 transition-all duration-700 ease-out"
          style={{ width: `${progressPercent || 5}%` }}
        />
      </div>

      {/* Center content */}
      <div className="flex flex-col items-center gap-6 text-center">
        {/* Spinner */}
        <svg className="animate-spin w-8 h-8 text-accent-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>

        <div>
          <p className="text-base font-semibold text-ink">Ads werden generiert…</p>
          <p className="text-sm text-ink-muted mt-1">Das kann einen Moment dauern.</p>
        </div>

        <p className="text-sm font-medium text-ink-muted tabular-nums">
          {completedAssets} / {totalAssets}
        </p>
      </div>
    </div>
  );
}
