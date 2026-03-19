"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientOption = {
  id: string;
  name: string;
  initials: string;
  brandColor: string;
};

type Campaign = {
  id: string;
  title: string;
  status: string;
  offerType: string | null;
  priceNew: string | null;
  _count: { runs: number };
  client: { id: string; name: string; initials: string; brandProfile?: { primaryColor: string } | null };
};

type Props = {
  campaigns: Campaign[];
  clients: ClientOption[];
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; rowBg: string }> = {
  BEREIT:         { label: "Bereit",         dot: "bg-success",                    text: "text-success-text",  rowBg: "" },
  FREIGEGEBEN:    { label: "Freigegeben",    dot: "bg-success",                    text: "text-success-text",  rowBg: "" },
  ZUR_PRUEFUNG:   { label: "In Prüfung",     dot: "bg-warning",                    text: "text-warning-text",  rowBg: "" },
  IN_GENERIERUNG: { label: "Läuft",          dot: "bg-accent-500 animate-pulse",   text: "text-accent-600",    rowBg: "" },
  ENTWURF:        { label: "Entwurf",        dot: "bg-border-strong",              text: "text-ink-muted",     rowBg: "" },
  EXPORTIERT:     { label: "Exportiert",     dot: "bg-success",                    text: "text-success-text",  rowBg: "" },
  ARCHIVIERT:     { label: "Archiviert",     dot: "bg-border",                     text: "text-ink-faint",     rowBg: "" },
};

const READY_STATUSES = new Set(["BEREIT", "FREIGEGEBEN", "ZUR_PRUEFUNG"]);

// ─── Offer types ──────────────────────────────────────────────────────────────

const OFFER_TYPES = [
  "Mitgliedschaft", "Probetraining", "Sonderangebot", "Neueröffnung",
  "Sommerkampagne", "Winterkampagne", "Jubiläum", "Aktionskampagne",
];

// ─── Multi-step form state ────────────────────────────────────────────────────

type FormState = {
  clientId: string;
  title: string;
  offerType: string;
  aworkTaskId: string;
  priceNew: string;
  priceOld: string;
  contractTerm: string;
  billingInterval: string;
  headline: string;
  subheadline: string;
  urgencyText: string;
  ctaText: string;
  status: string;
};

const EMPTY_FORM: FormState = {
  clientId: "", title: "", offerType: "", aworkTaskId: "",
  priceNew: "", priceOld: "", contractTerm: "", billingInterval: "",
  headline: "", subheadline: "", urgencyText: "", ctaText: "",
  status: "ENTWURF",
};

const STEPS = [
  { label: "Basics", desc: "Kunde & Titel" },
  { label: "Angebot", desc: "Preise & Konditionen" },
  { label: "Messaging", desc: "Texte & CTA" },
  { label: "Einstellungen", desc: "Status & Optionen" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function KampagnenClient({ campaigns, clients }: Props) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const ready = campaigns.filter((c) => READY_STATUSES.has(c.status));
  const inProgress = campaigns.filter((c) => c.status === "IN_GENERIERUNG");
  const drafts = campaigns.filter((c) => c.status === "ENTWURF");
  const done = campaigns.filter((c) => c.status === "EXPORTIERT" || c.status === "ARCHIVIERT");

  const groups = [
    { title: "Bereit zur Generierung", items: ready, highlight: true },
    { title: "In Generierung",         items: inProgress, highlight: false },
    { title: "Entwürfe",               items: drafts, highlight: false },
    { title: "Abgeschlossen",          items: done, highlight: false },
  ].filter((g) => g.items.length > 0);

  function openPanel() {
    setForm(EMPTY_FORM);
    setStep(0);
    setError(null);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
  }

  function set(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function canAdvance(): boolean {
    if (step === 0) return !!form.clientId && form.title.length >= 2 && !!form.offerType;
    if (step === 1) return true;
    if (step === 2) return form.headline.length >= 2;
    return true;
  }

  async function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/kampagnen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: form.clientId,
            title: form.title,
            offerType: form.offerType,
            aworkTaskId: form.aworkTaskId || undefined,
            priceNew: form.priceNew || undefined,
            priceOld: form.priceOld || undefined,
            contractTerm: form.contractTerm || undefined,
            billingInterval: form.billingInterval || undefined,
            headline: form.headline,
            subheadline: form.subheadline || undefined,
            urgencyText: form.urgencyText || undefined,
            ctaText: form.ctaText || undefined,
            status: form.status,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Fehler beim Anlegen");
        }
        const campaign = await res.json();
        closePanel();
        router.push(`/kampagnen/${campaign.id}`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      }
    });
  }

  return (
    <div className="px-8 py-10 max-w-5xl space-y-8">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Kampagnen</h1>
          <p className="text-sm text-ink-muted mt-1">
            {campaigns.length === 0
              ? "Noch keine Kampagnen vorhanden"
              : `${campaigns.length} Kampagne${campaigns.length !== 1 ? "n" : ""}`}
          </p>
        </div>
        <button
          onClick={openPanel}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 text-white text-[13px] font-semibold hover:bg-accent-700 transition-colors shadow-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Kampagne anlegen
        </button>
      </div>

      {/* ── Empty state ── */}
      {campaigns.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-border bg-white px-6 py-16 text-center space-y-4">
          <p className="text-sm text-ink-muted">Noch keine Kampagnen vorhanden.</p>
          <button
            onClick={openPanel}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 transition-colors"
          >
            Erste Kampagne anlegen
          </button>
        </div>
      )}

      {/* ── Groups ── */}
      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          {/* Section header */}
          <div className={`flex items-center gap-3 px-4 py-2 rounded-lg ${group.highlight ? "bg-accent-50 border border-accent-100" : ""}`}>
            <h2 className={`text-xs font-semibold uppercase tracking-widest ${group.highlight ? "text-accent-700" : "text-ink-muted"}`}>
              {group.title}
            </h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${group.highlight ? "bg-accent-600 text-white" : "bg-border text-ink-muted"}`}>
              {group.items.length}
            </span>
          </div>

          <div className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
            {group.items.map((c, idx) => {
              const st = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.ENTWURF;
              const brandColor = c.client.brandProfile?.primaryColor ?? "#1E3A5F";

              return (
                <div
                  key={c.id}
                  className={`flex items-center gap-4 px-4 py-3.5 hover:bg-surface transition-colors ${
                    idx < group.items.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  {/* Avatar */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 text-white"
                    style={{ background: brandColor }}
                  >
                    {c.client.initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/kampagnen/${c.id}`}
                      className="text-[13px] font-semibold text-ink hover:text-accent-600 transition-colors block truncate"
                    >
                      {c.title}
                    </Link>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-ink-muted">{c.client.name}</span>
                      {c.offerType && (
                        <>
                          <span className="text-border-strong">·</span>
                          <span className="text-xs px-1.5 py-0.5 bg-surface border border-border rounded text-ink-muted">
                            {c.offerType}
                          </span>
                        </>
                      )}
                      {c.priceNew && (
                        <>
                          <span className="text-border-strong">·</span>
                          <span className="text-xs font-semibold text-ink-secondary">
                            {formatCurrency(Number(c.priceNew))}
                          </span>
                        </>
                      )}
                      {c._count.runs > 0 && (
                        <>
                          <span className="text-border-strong">·</span>
                          <span className="text-xs text-ink-muted">
                            {c._count.runs} Run{c._count.runs !== 1 ? "s" : ""}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Status + actions */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`hidden sm:flex items-center gap-1.5 text-xs font-medium ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                    {READY_STATUSES.has(c.status) && (
                      <Link
                        href={`/kampagnen/${c.id}?tab=generierung`}
                        className="px-3 py-1.5 rounded-lg bg-accent-600 text-white text-xs font-semibold hover:bg-accent-700 transition-colors"
                      >
                        Starten
                      </Link>
                    )}
                    {c._count.runs > 0 && (
                      <Link href={`/kampagnen/${c.id}?tab=verlauf`} className="text-xs text-ink-muted hover:text-accent-600 font-medium">
                        Ergebnisse
                      </Link>
                    )}
                    <Link href={`/kampagnen/${c.id}/bearbeiten`} className="text-xs text-ink-faint hover:text-ink-muted">
                      Bearbeiten
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* ── Side panel overlay ── */}
      {panelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-ink/30 backdrop-blur-sm"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="relative w-full max-w-lg bg-white h-full shadow-panel flex flex-col overflow-hidden">

            {/* Panel header */}
            <div className="px-6 py-5 border-b border-border flex items-start justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-ink">Kampagne anlegen</h2>
                <p className="text-xs text-ink-muted mt-0.5">Schritt {step + 1} von {STEPS.length}</p>
              </div>
              <button
                onClick={closePanel}
                className="text-ink-faint hover:text-ink transition-colors p-1"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Step indicator */}
            <div className="px-6 pt-5 pb-4 flex items-center gap-2">
              {STEPS.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${
                      i < step
                        ? "bg-success text-white"
                        : i === step
                        ? "bg-accent-600 text-white"
                        : "bg-border text-ink-faint"
                    }`}
                  >
                    {i < step ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className={`text-[11px] font-medium hidden sm:block ${i === step ? "text-ink" : "text-ink-faint"}`}>
                    {s.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`w-6 h-px mx-1 ${i < step ? "bg-success" : "bg-border"}`} />
                  )}
                </div>
              ))}
            </div>

            {/* Form content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="space-y-5">

                {/* Step 0: Basics */}
                {step === 0 && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Kunde *</label>
                      <select
                        value={form.clientId}
                        onChange={(e) => set("clientId", e.target.value)}
                        className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                      >
                        <option value="">Kunde auswählen …</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Kampagnentitel *</label>
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => set("title", e.target.value)}
                        placeholder="z.B. Sommer-Mitgliedschaft 2025"
                        className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder:text-ink-faint"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Angebotsart *</label>
                      <select
                        value={form.offerType}
                        onChange={(e) => set("offerType", e.target.value)}
                        className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                      >
                        <option value="">Angebotsart wählen …</option>
                        {OFFER_TYPES.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">awork Task-ID</label>
                      <input
                        type="text"
                        value={form.aworkTaskId}
                        onChange={(e) => set("aworkTaskId", e.target.value)}
                        placeholder="Optional"
                        className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder:text-ink-faint"
                      />
                    </div>
                  </>
                )}

                {/* Step 1: Angebot */}
                {step === 1 && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Neuer Preis (€)</label>
                        <input
                          type="text"
                          value={form.priceNew}
                          onChange={(e) => set("priceNew", e.target.value)}
                          placeholder="z.B. 29,90"
                          className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder:text-ink-faint"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Alter Preis (€)</label>
                        <input
                          type="text"
                          value={form.priceOld}
                          onChange={(e) => set("priceOld", e.target.value)}
                          placeholder="z.B. 49,90"
                          className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder:text-ink-faint"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Vertragslaufzeit</label>
                      <input
                        type="text"
                        value={form.contractTerm}
                        onChange={(e) => set("contractTerm", e.target.value)}
                        placeholder="z.B. 12 Monate Mindestlaufzeit"
                        className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder:text-ink-faint"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Abrechnungsintervall</label>
                      <select
                        value={form.billingInterval}
                        onChange={(e) => set("billingInterval", e.target.value)}
                        className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500"
                      >
                        <option value="">Bitte wählen …</option>
                        <option value="monatlich">Monatlich</option>
                        <option value="quartalweise">Quartalweise</option>
                        <option value="halbjährlich">Halbjährlich</option>
                        <option value="jährlich">Jährlich</option>
                        <option value="einmalig">Einmalig</option>
                      </select>
                    </div>
                  </>
                )}

                {/* Step 2: Messaging */}
                {step === 2 && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Headline *</label>
                      <input
                        type="text"
                        value={form.headline}
                        onChange={(e) => set("headline", e.target.value)}
                        placeholder="z.B. Jetzt Mitglied werden!"
                        className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder:text-ink-faint"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Subheadline</label>
                      <input
                        type="text"
                        value={form.subheadline}
                        onChange={(e) => set("subheadline", e.target.value)}
                        placeholder="z.B. Fitness ohne Kompromisse"
                        className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder:text-ink-faint"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Dringlichkeitstext</label>
                      <input
                        type="text"
                        value={form.urgencyText}
                        onChange={(e) => set("urgencyText", e.target.value)}
                        placeholder="z.B. Nur bis 31. Juli!"
                        className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder:text-ink-faint"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Call to Action</label>
                      <input
                        type="text"
                        value={form.ctaText}
                        onChange={(e) => set("ctaText", e.target.value)}
                        placeholder="z.B. Jetzt kostenlos testen"
                        className="w-full rounded-lg border border-border-medium px-3 py-2.5 text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-500 placeholder:text-ink-faint"
                      />
                    </div>
                  </>
                )}

                {/* Step 3: Settings */}
                {step === 3 && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">Status beim Anlegen</label>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { value: "ENTWURF", label: "Entwurf", desc: "Noch nicht bereit zur Generierung" },
                          { value: "BEREIT",  label: "Bereit",  desc: "Sofort zur Generierung freigeben" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => set("status", opt.value)}
                            className={`text-left p-3.5 rounded-xl border transition-all ${
                              form.status === opt.value
                                ? "border-accent-500 bg-accent-50 ring-1 ring-accent-500"
                                : "border-border bg-white hover:bg-surface"
                            }`}
                          >
                            <p className={`text-sm font-semibold ${form.status === opt.value ? "text-accent-700" : "text-ink"}`}>
                              {opt.label}
                            </p>
                            <p className="text-xs text-ink-muted mt-0.5 leading-snug">{opt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="rounded-xl border border-border bg-surface px-4 py-4 space-y-2 mt-4">
                      <p className="text-[11px] font-semibold text-ink-muted uppercase tracking-wide">Zusammenfassung</p>
                      {[
                        ["Kunde", clients.find((c) => c.id === form.clientId)?.name ?? "–"],
                        ["Titel", form.title || "–"],
                        ["Angebotsart", form.offerType || "–"],
                        ["Preis", form.priceNew ? `${form.priceNew} €` : "–"],
                        ["Headline", form.headline || "–"],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between text-xs">
                          <span className="text-ink-muted">{label}</span>
                          <span className="text-ink font-medium">{val}</span>
                        </div>
                      ))}
                    </div>

                    {error && (
                      <div className="rounded-lg border border-danger-border bg-danger-bg px-3 py-2.5 text-xs text-danger-text">
                        {error}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Panel footer */}
            <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
              <button
                onClick={step > 0 ? () => setStep((s) => s - 1) : closePanel}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-ink-secondary hover:bg-surface transition-colors"
              >
                {step > 0 ? "Zurück" : "Abbrechen"}
              </button>

              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canAdvance()}
                  className="px-5 py-2 rounded-lg bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Weiter
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="px-5 py-2 rounded-lg bg-accent-600 text-white text-sm font-semibold hover:bg-accent-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {isPending && (
                    <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Kampagne anlegen
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
