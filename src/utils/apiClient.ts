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

/**
 * POSTs JSON and returns the parsed body.
 *
 * Throws AIUnavailableError when the AI is down, ApiError otherwise. Callers
 * should let AIUnavailableError reach an explicit "AI unavailable" UI state.
 */
export async function apiPost<T = any>(url: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
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
