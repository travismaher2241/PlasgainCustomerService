/**
 * Single entry point for every call to the Plasgain API.
 *
 * The rule this file exists to enforce: the app must never present generated
 * content as grounded when the AI did not actually produce it. When the server
 * cannot reach Gemini it replies 503 with `degraded: true` and no business
 * payload, and we surface that to the rep as an explicit unavailable state
 * rather than substituting sample data.
 */

/** Thrown when the server could not reach the AI. Carries text fit for the UI. */
export class AIUnavailableError extends Error {
  public readonly detail: string;
  public readonly guidance: string;
  constructor(detail: string, guidance: string) {
    super(detail);
    this.name = "AIUnavailableError";
    this.detail = detail;
    this.guidance = guidance;
  }
}

/** Thrown for ordinary request problems (validation, rate limit, server error). */
export class ApiError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export interface StreamProgressStage {
  stage: string;
  label: string;
  detail?: string;
  status?: "pending" | "active" | "complete" | "failed";
}

export interface StreamOptions<T = any> {
  onChunk?: (delta: string) => void;
  onStage?: (stage: StreamProgressStage) => void;
  onComplete?: (result: T) => void;
  signal?: AbortSignal;
}

/**
 * POSTs JSON and returns the parsed body.
 *
 * Throws AIUnavailableError when the AI is down, ApiError otherwise. Callers
 * should let AIUnavailableError reach an explicit "AI unavailable" UI state.
 */
export async function apiPost<T = any>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal
    });
  } catch (err: any) {
    if (err?.name === "AbortError" || signal?.aborted) {
      throw err;
    }
    throw new ApiError(0, "Could not reach the Plasgain server. Check your connection and retry.");
  }

  // The server always answers JSON; anything else means something upstream broke.
  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    const text = await res.text().catch(() => "");
    throw new ApiError(
      res.status,
      `Unexpected response from the server (${res.status}). ${text.slice(0, 120)}`.trim()
    );
  }

  const data = await res.json().catch(() => null);

  if (res.status === 503 && data && data.degraded) {
    throw new AIUnavailableError(
      data.detail || "The AI service is unavailable.",
      data.guidance ||
        "No analysis was generated. Do not quote or send anything from this screen until the AI service is restored."
    );
  }

  if (!res.ok) {
    throw new ApiError(res.status, (data && data.error) || `Request failed (${res.status}).`);
  }

  return data as T;
}

/**
 * POSTs JSON and consumes Server-Sent Events (SSE) or ndjson stream.
 * Supports progressive chunk updates, discrete progress stages, and AbortController.
 */
export async function apiStreamPost<T = any>(
  url: string,
  body: unknown,
  options: StreamOptions<T>
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json"
      },
      body: JSON.stringify(body),
      signal: options.signal
    });
  } catch (err: any) {
    if (err?.name === "AbortError" || options.signal?.aborted) {
      throw err;
    }
    throw new ApiError(0, "Could not reach the Plasgain server. Check your connection and retry.");
  }

  if (res.status === 503) {
    const data = await res.json().catch(() => null);
    throw new AIUnavailableError(
      data?.detail || "The AI service is unavailable.",
      data?.guidance || "No stream was generated."
    );
  }

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error || `Stream request failed (${res.status}).`);
  }

  const contentType = res.headers.get("content-type") || "";

  // If server responded with standard JSON instead of text/event-stream
  if (contentType.includes("application/json")) {
    const data = await res.json();
    options.onComplete?.(data);
    return data as T;
  }

  // Handle SSE stream
  if (!res.body) {
    throw new ApiError(res.status, "Readable stream not supported by browser or response.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let finalResult: T | null = null;
  let currentEventName = "message";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          currentEventName = "message";
          continue;
        }

        if (trimmed.startsWith("event:")) {
          currentEventName = trimmed.slice(6).trim();
          continue;
        }

        if (trimmed.startsWith("data:")) {
          const rawData = trimmed.slice(5).trim();
          if (rawData === "[DONE]") continue;

          try {
            const parsed = JSON.parse(rawData);

            if (currentEventName === "stage" || parsed.type === "stage") {
              options.onStage?.({
                stage: parsed.stage,
                label: parsed.label || parsed.stage,
                detail: parsed.detail,
                status: parsed.status || "active"
              });
            } else if (currentEventName === "chunk" || parsed.type === "chunk") {
              if (parsed.delta) {
                options.onChunk?.(parsed.delta);
              }
            } else if (currentEventName === "complete" || parsed.type === "complete") {
              finalResult = (parsed.result !== undefined ? parsed.result : parsed) as T;
              options.onComplete?.(finalResult);
            } else if (currentEventName === "error" || parsed.type === "error") {
              throw new ApiError(500, parsed.message || "Streaming error occurred.");
            } else if (parsed.delta) {
              options.onChunk?.(parsed.delta);
            }
          } catch (jsonErr: any) {
            if (jsonErr instanceof ApiError) throw jsonErr;
            // Plain text chunk fallback
            options.onChunk?.(rawData);
          }
        }
      }
    }
  } catch (streamErr: any) {
    if (streamErr?.name === "AbortError" || options.signal?.aborted) {
      throw streamErr;
    }
    throw streamErr;
  }

  if (finalResult === null) {
    // If no explicit complete event was fired, return parsed buffer if available
    try {
      if (buffer.trim()) {
        finalResult = JSON.parse(buffer) as T;
      }
    } catch {
      // Ignore
    }
  }

  return (finalResult || {}) as T;
}

/** GETs JSON. Used for health probes; never throws on a degraded AI. */
export async function apiGet<T = any>(url: string): Promise<T> {
  const res = await fetch(url);
  const data = await res.json().catch(() => null);
  if (!data) throw new ApiError(res.status, `Request failed (${res.status}).`);
  return data as T;
}

/** Turns any thrown error into a message safe to show a rep. */
export function toUserMessage(err: unknown): string {
  if (err instanceof AIUnavailableError) return `AI unavailable — ${err.detail}`;
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
