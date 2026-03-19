/**
 * Higgsfield Provider – V3 (platform.higgsfield.ai)
 *
 * Integration with the Higgsfield AI platform API.
 * - Submit:  POST {apiBase}/{application}
 * - Poll:    GET  {apiBase}/requests/{requestId}/status
 *
 * Auth: Authorization: Key {apiKey}
 * Default model: v1/text2image/soul
 *
 * submit() polls synchronously until completion or timeout (90s).
 * If the job is still running at timeout, it returns status="submitted"
 * with the jobId so the caller can poll separately via poll().
 */

import type {
  ImageGenerationProvider,
  ProviderSubmitInput,
  ProviderSubmitResult,
  ProviderPollResult,
} from "./imageGenerationProvider";
import { resolveHiggsfieldConfig } from "./secureConfigResolver";

/** How long to wait in submit() before giving up and returning jobId for later polling */
const SUBMIT_POLL_TIMEOUT_MS = 90_000;
/** How often to check job status during submit() */
const POLL_INTERVAL_MS = 3_000;

type HiggsfieldSubmitResponse = {
  request_id?: string;
  status_url?: string;
  cancel_url?: string;
  error?: string | null;
  message?: string | null;
};

type HiggsfieldStatusResponse = {
  status: "queued" | "in_progress" | "completed" | "failed" | "nsfw" | "cancelled" | string;
  request_id?: string;
  images?: Array<{ url?: string }>;
  video?: { url?: string };
  error?: string | null;
  message?: string | null;
};

/** Compute aspect_ratio string from pixel dimensions */
function toAspectRatio(width: number, height: number): string {
  if (width === height) return "1:1";
  if (width < height) return "9:16";
  return "16:9";
}

function mapStatus(
  status: string
): "submitted" | "generating" | "completed" | "failed" {
  switch (status) {
    case "completed":
      return "completed";
    case "failed":
    case "nsfw":
    case "cancelled":
      return "failed";
    case "queued":
      return "submitted";
    default:
      // in_progress, processing, etc.
      return "generating";
  }
}

export class HiggsfieldProvider implements ImageGenerationProvider {
  readonly name = "higgsfield";

  async submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult> {
    let config: ReturnType<typeof resolveHiggsfieldConfig>;
    try {
      config = resolveHiggsfieldConfig();
    } catch (err) {
      return {
        providerJobId: null,
        status: "failed",
        imageUrl: null,
        rawResponse: {},
        error: err instanceof Error ? err.message : "API-Schlüssel nicht konfiguriert",
      };
    }

    const application = process.env.HIGGSFIELD_APPLICATION?.trim() || "v1/text2image/soul";
    const endpoint = `${config.apiBase}/${application}`;

    // ── Submit job ────────────────────────────────────────────────────────────
    let submitData: HiggsfieldSubmitResponse;
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Key ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          arguments: {
            prompt: input.prompt,
            aspect_ratio: toAspectRatio(input.width, input.height),
            quality: "1080p",
            batch_size: 1,
            ...(input.referenceImageUrl
              ? { image_reference_url: input.referenceImageUrl }
              : {}),
          },
        }),
        signal: AbortSignal.timeout(30_000),
      });

      if (res.status === 401 || res.status === 403) {
        const body = await res.text().catch(() => "");
        return {
          providerJobId: null,
          status: "failed",
          imageUrl: null,
          rawResponse: { body },
          error: `Higgsfield API-Schlüssel ungültig (HTTP ${res.status})`,
        };
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          providerJobId: null,
          status: "failed",
          imageUrl: null,
          rawResponse: { body },
          error: `Higgsfield API Fehler ${res.status}: ${body.slice(0, 200)}`,
        };
      }

      submitData = (await res.json()) as HiggsfieldSubmitResponse;
    } catch (err) {
      return {
        providerJobId: null,
        status: "failed",
        imageUrl: null,
        rawResponse: {},
        error: `Netzwerkfehler beim Einreichen: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    const requestId = submitData.request_id ?? null;

    if (!requestId) {
      return {
        providerJobId: null,
        status: "failed",
        imageUrl: null,
        rawResponse: submitData as unknown as Record<string, unknown>,
        error: submitData.error ?? submitData.message ?? "Higgsfield API hat keine request_id zurückgegeben",
      };
    }

    // ── Poll until complete or timeout ────────────────────────────────────────
    const deadline = Date.now() + SUBMIT_POLL_TIMEOUT_MS;

    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);

      const pollResult = await this.poll(requestId);

      if (pollResult.status === "completed") {
        return {
          providerJobId: requestId,
          status: "completed",
          imageUrl: pollResult.imageUrl,
          rawResponse: pollResult.rawResponse,
        };
      }

      if (pollResult.status === "failed") {
        return {
          providerJobId: requestId,
          status: "failed",
          imageUrl: null,
          rawResponse: pollResult.rawResponse,
          error: pollResult.error ?? "Job fehlgeschlagen",
        };
      }

      // still generating — continue loop
    }

    // Timeout: hand off job ID for external polling
    return {
      providerJobId: requestId,
      status: "submitted",
      imageUrl: null,
      rawResponse: submitData as unknown as Record<string, unknown>,
      error: `Job läuft noch nach ${SUBMIT_POLL_TIMEOUT_MS / 1000}s — request_id: ${requestId}`,
    };
  }

  async poll(requestId: string): Promise<ProviderPollResult> {
    let config: ReturnType<typeof resolveHiggsfieldConfig>;
    try {
      config = resolveHiggsfieldConfig();
    } catch {
      return { status: "failed", imageUrl: null, rawResponse: {}, error: "API-Schlüssel fehlt" };
    }

    try {
      const res = await fetch(`${config.apiBase}/requests/${requestId}/status`, {
        headers: {
          Authorization: `Key ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        return {
          status: "failed",
          imageUrl: null,
          rawResponse: { body },
          error: `Poll API Fehler ${res.status}: ${body.slice(0, 200)}`,
        };
      }

      const data = (await res.json()) as HiggsfieldStatusResponse;
      const mapped = mapStatus(data.status);

      const imageUrl =
        mapped === "completed" ? (data.images?.[0]?.url ?? null) : null;

      return {
        status: mapped,
        imageUrl,
        rawResponse: data as unknown as Record<string, unknown>,
        error: mapped === "failed" ? (data.error ?? data.message ?? undefined) : undefined,
      };
    } catch (err) {
      return {
        status: "failed",
        imageUrl: null,
        rawResponse: {},
        error: `Netzwerkfehler beim Polling: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
