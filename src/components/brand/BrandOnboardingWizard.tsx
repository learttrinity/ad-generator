"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AssetUploader } from "@/components/brand/AssetUploader";
import { BrandProfileForm } from "@/components/brand/BrandProfileForm";
import { ConfidenceBar } from "@/components/brand/ConfidenceBar";
import { Button, LinkButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import type { Client, ClientAsset, BrandProfile } from "@prisma/client";
import type { BrandSuggestions } from "@/lib/brandAnalysis";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

interface WizardProps {
  clients: Pick<Client, "id" | "name" | "initials">[];
  /** Pre-selected client (e.g. when started from client detail page) */
  initialClientId?: string;
}

const STEP_LABELS: Record<Step, string> = {
  1: "Material hochladen",
  2: "Vorschläge prüfen",
  3: "Profil finalisieren",
  4: "Freigeben",
};

// ─── Wizard ───────────────────────────────────────────────────────────────────

export function BrandOnboardingWizard({ clients, initialClientId }: WizardProps) {
  const router = useRouter();

  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [step, setStep] = useState<Step>(initialClientId ? 1 : 1);
  const [assets, setAssets] = useState<ClientAsset[]>([]);
  const [suggestions, setSuggestions] = useState<BrandSuggestions | null>(null);
  const [savedProfile, setSavedProfile] = useState<BrandProfile | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState("");

  const selectedClient = clients.find((c) => c.id === clientId);

  // ─── Asset handlers ──────────────────────────────────────────────────────

  const handleAssetUploaded = useCallback((asset: ClientAsset) => {
    setAssets((prev) => [asset, ...prev]);
  }, []);

  const handleAssetDeleted = useCallback((id: string) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // ─── Step navigation ─────────────────────────────────────────────────────

  async function goToStep2() {
    if (!clientId) { setError("Bitte Kunden auswählen"); return; }
    setError("");

    // Load existing assets for this client
    const res = await fetch(`/api/assets?clientId=${clientId}`);
    if (res.ok) {
      const existing: ClientAsset[] = await res.json();
      setAssets(existing);
    }
    setStep(2);
  }

  async function goToStep3() {
    setAnalysing(true);
    setError("");
    try {
      const res = await fetch(`/api/markenprofile/${clientId}/analyse`, { method: "POST" });
      if (!res.ok) throw new Error("Analyse fehlgeschlagen");
      const data: BrandSuggestions = await res.json();
      setSuggestions(data);
      setStep(3);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler bei der Analyse");
    } finally {
      setAnalysing(false);
    }
  }

  function handleProfileSaved(profile: BrandProfile) {
    setSavedProfile(profile);
    setStep(4);
  }

  async function handleApprove(status: "ENTWURF" | "IN_PRUEFUNG" | "FREIGEGEBEN") {
    setApproving(true);
    setError("");
    try {
      const res = await fetch(`/api/markenprofile/${clientId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Statusänderung fehlgeschlagen");
      router.push(`/kunden/${clientId}?tab=markenprofil`);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Fehler beim Freigeben");
    } finally {
      setApproving(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-0">
        {([1, 2, 3, 4] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                s < step ? "bg-brand-600 text-white" :
                s === step ? "bg-brand-600 text-white ring-4 ring-brand-100" :
                "bg-gray-100 text-gray-400"
              }`}>
                {s < step ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : s}
              </div>
              <span className={`text-xs hidden sm:block ${s === step ? "text-brand-700 font-medium" : "text-gray-400"}`}>
                {STEP_LABELS[s]}
              </span>
            </div>
            {i < 3 && (
              <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${s < step ? "bg-brand-400" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ─── Step 1: Kunde auswählen + Material hochladen ──────────────── */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Client selection */}
          {!initialClientId && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-700">Kunde auswählen</h2>
              </CardHeader>
              <CardBody>
                <select
                  value={clientId}
                  onChange={(e) => { setClientId(e.target.value); setError(""); }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">– Kunden auswählen –</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.initials} – {c.name}</option>
                  ))}
                </select>
              </CardBody>
            </Card>
          )}

          {/* Upload */}
          {clientId && (
            <Card>
              <CardHeader>
                <h2 className="text-sm font-semibold text-gray-700">
                  Schritt 1: Material hochladen
                  {selectedClient && <span className="text-gray-400 font-normal ml-1">– {selectedClient.name}</span>}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Lade Logos, frühere Anzeigen, Screenshots, Brand-PDFs oder Schriften hoch.
                </p>
              </CardHeader>
              <CardBody>
                <AssetUploader
                  clientId={clientId}
                  assets={assets}
                  onUploaded={handleAssetUploaded}
                  onDeleted={handleAssetDeleted}
                />
              </CardBody>
            </Card>
          )}

          <div className="flex justify-between">
            <LinkButton href="/markenprofile" variant="ghost">Abbrechen</LinkButton>
            <Button onClick={goToStep2} disabled={!clientId}>
              Weiter zur Analyse →
            </Button>
          </div>
        </div>
      )}

      {/* ─── Step 2: Vorschläge analysieren ─────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Schritt 2: Vorschläge prüfen</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Automatisch erkannte Vorschläge basierend auf {assets.length} hochgeladenem Material
              </p>
            </CardHeader>
            <CardBody className="space-y-4">
              {!suggestions ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Klicke auf &quot;Analyse starten&quot; um Vorschläge zu generieren.
                </p>
              ) : (
                <>
                  {/* Confidence */}
                  <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Konfidenz</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(suggestions.confidenceScore * 100)}%
                      </span>
                    </div>
                    <ConfidenceBar value={Math.round(suggestions.confidenceScore * 100)} />

                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Vollständigkeit</span>
                      <span className="text-sm font-semibold text-gray-900">
                        {Math.round(suggestions.completenessScore * 100)}%
                      </span>
                    </div>
                    <ConfidenceBar value={Math.round(suggestions.completenessScore * 100)} />
                  </div>

                  {/* Suggestion values */}
                  <div className="grid grid-cols-2 gap-3">
                    <SuggestionRow label="Primärfarbe" value={
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded border border-gray-200 inline-block"
                          style={{ background: suggestions.primaryColor }} />
                        <span className="font-mono text-xs">{suggestions.primaryColor}</span>
                      </span>
                    } />
                    <SuggestionRow label="Typografie-Klasse" value={suggestions.typographyClass} />
                    <SuggestionRow label="Visueller Ton" value={suggestions.visualTone} />
                    <SuggestionRow label="Bildwelt" value={suggestions.imageTone} />
                  </div>

                  {/* Notes / hints */}
                  {suggestions.notes.length > 0 && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                      <p className="text-xs font-semibold text-amber-700 mb-2">Hinweise</p>
                      <ul className="space-y-1">
                        {suggestions.notes.map((note, i) => (
                          <li key={i} className="text-xs text-amber-700 flex gap-1.5">
                            <span className="shrink-0">•</span>{note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>

          <div className="flex justify-between">
            <Button variant="secondary" onClick={() => setStep(1)}>← Zurück</Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={goToStep3} loading={analysing}>
                {suggestions ? "Neu analysieren" : "Analyse starten"}
              </Button>
              {suggestions && (
                <Button onClick={() => setStep(3)}>
                  Profil bearbeiten →
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 3: Profil finalisieren ─────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-sm text-gray-500 bg-brand-50 border border-brand-100 rounded-lg px-4 py-3">
            <strong className="text-brand-700">Schritt 3: Profil finalisieren</strong>
            {" "}– Überprüfe und ergänze alle Markenprofil-Felder.
          </div>

          <BrandProfileForm
            clientId={clientId}
            clientName={selectedClient?.name ?? ""}
            initialProfile={null}
            wizardMode
            onSaved={handleProfileSaved}
          />

          <div className="flex justify-start">
            <Button variant="ghost" onClick={() => setStep(2)}>← Zurück</Button>
          </div>
        </div>
      )}

      {/* ─── Step 4: Freigeben ───────────────────────────────────────────── */}
      {step === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-gray-700">Schritt 4: Freigeben</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Das Markenprofil ist gespeichert. Wähle jetzt den Freigabestatus.
              </p>
            </CardHeader>
            <CardBody className="space-y-4">
              {savedProfile && (
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                  <SummaryRow label="Primärfarbe" value={
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded border border-gray-200 inline-block"
                        style={{ background: savedProfile.primaryColor }} />
                      {savedProfile.primaryColor}
                    </span>
                  } />
                  <SummaryRow label="Hauptschrift" value={savedProfile.fontPrimary} />
                  <SummaryRow label="Typografie-Klasse" value={savedProfile.typographyClass ?? "–"} />
                  <SummaryRow label="Visueller Ton" value={savedProfile.visualTone ?? "–"} />
                  <SummaryRow label="Bildwelt" value={savedProfile.imageTone ?? "–"} />
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700">Freigabestatus festlegen:</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => handleApprove("ENTWURF")}
                    disabled={approving}
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="block font-semibold">Als Entwurf speichern</span>
                    <span className="text-xs text-gray-400">Noch in Bearbeitung</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove("IN_PRUEFUNG")}
                    disabled={approving}
                    className="flex-1 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-medium text-yellow-800 hover:bg-yellow-100 transition-colors text-left"
                  >
                    <span className="block font-semibold">Zur Prüfung markieren</span>
                    <span className="text-xs text-yellow-600">Bereit zur Überprüfung</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApprove("FREIGEGEBEN")}
                    disabled={approving}
                    className="flex-1 rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 hover:bg-green-100 transition-colors text-left"
                  >
                    <span className="block font-semibold">Freigeben</span>
                    <span className="text-xs text-green-600">Bereit für die Generierung</span>
                  </button>
                </div>
              </div>

              {approving && (
                <p className="text-sm text-gray-500 text-center">Wird gespeichert…</p>
              )}
            </CardBody>
          </Card>

          <div className="flex justify-start">
            <Button variant="ghost" onClick={() => setStep(3)}>← Zurück</Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SuggestionRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 text-right">{value}</span>
    </div>
  );
}
