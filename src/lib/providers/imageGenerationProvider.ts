/**
 * Image Generation Provider – Interface
 *
 * All image generation providers must implement this interface.
 * V1 includes a mock stub and a Higgsfield/Nano Banana integration-ready stub.
 */

export type ProviderSubmitInput = {
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  referenceImageUrl?: string | null;
  /** metadata for logging/debugging — not sent to provider */
  meta?: {
    audienceKey: string;
    placementKey: string;
    directionKey: string;
    runId: string;
    assetId: string;
  };
};

export type ProviderJobStatus =
  | "submitted"
  | "queued"
  | "generating"
  | "completed"
  | "failed";

export type ProviderSubmitResult = {
  providerJobId: string | null;
  status: ProviderJobStatus;
  imageUrl: string | null;         // populated immediately for sync providers
  rawResponse: Record<string, unknown>;
  error?: string;
};

export type ProviderPollResult = {
  status: ProviderJobStatus;
  imageUrl: string | null;
  rawResponse: Record<string, unknown>;
  error?: string;
};

export interface ImageGenerationProvider {
  readonly name: string;

  /**
   * Submit a generation job. May be async (returns job ID) or sync (returns URL immediately).
   */
  submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult>;

  /**
   * Poll the status of an existing job (for async providers).
   * Sync providers can implement this as a no-op that returns the final state.
   */
  poll(jobId: string): Promise<ProviderPollResult>;
}
