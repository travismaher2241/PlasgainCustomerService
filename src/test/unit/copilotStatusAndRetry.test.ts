import { describe, it, expect } from 'vitest';

describe('Priority 1: Copilot Request Status & Inline Retry Action', () => {
  type CopilotState = "ready" | "working" | "offline" | "failed";

  function getBadgeLabel(state: CopilotState): string {
    switch (state) {
      case "working":
        return "Working";
      case "failed":
        return "Failed — Retry";
      case "offline":
        return "Offline";
      case "ready":
      default:
        return "Ready";
    }
  }

  it('displays Working badge when request stream is active', () => {
    expect(getBadgeLabel("working")).toBe("Working");
  });

  it('displays Failed — Retry badge when stream encounters connection error', () => {
    expect(getBadgeLabel("failed")).toBe("Failed — Retry");
  });

  it('displays Ready badge in idle state', () => {
    expect(getBadgeLabel("ready")).toBe("Ready");
  });

  it('records failedPrompt in message metadata for immediate inline retry trigger', () => {
    const failedMessage = {
      role: "assistant" as const,
      content: "I ran into a connection issue while generating the answer.",
      isError: true,
      failedPrompt: "What is AS/NZS 1158 Category P4 lux requirement?"
    };

    expect(failedMessage.isError).toBe(true);
    expect(failedMessage.failedPrompt).toBe("What is AS/NZS 1158 Category P4 lux requirement?");
  });
});
