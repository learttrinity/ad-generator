/**
 * Mock Provider – V2
 *
 * Development/fallback provider. Returns no base image URL so the render
 * pipeline uses its gradient fallback — no external network calls needed.
 * No API key required. Used automatically when no real provider is configured.
 */

import type {
  ImageGenerationProvider,
  ProviderSubmitInput,
  ProviderSubmitResult,
  ProviderPollResult,
} from "./imageGenerationProvider";

export class MockProvider implements ImageGenerationProvider {
  readonly name = "mock";

  async submit(input: ProviderSubmitInput): Promise<ProviderSubmitResult> {
    const mockJobId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    return {
      providerJobId: mockJobId,
      status: "completed",
      imageUrl: null,   // render service generates gradient fallback
      rawResponse: {
        mock: true,
        job_id: mockJobId,
        prompt_preview: input.prompt.slice(0, 80) + "…",
        dimensions: `${input.width}x${input.height}`,
        meta: input.meta,
      },
    };
  }

  async poll(jobId: string): Promise<ProviderPollResult> {
    return {
      status: "completed",
      imageUrl: null,
      rawResponse: { mock: true, jobId },
    };
  }
}
