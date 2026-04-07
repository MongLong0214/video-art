/**
 * Replicate API utilities: retry, URL validation, version pin, token masking.
 * Extracted for testability (T7).
 */

// ---------------------------------------------------------------------------
// Token retrieval
// ---------------------------------------------------------------------------

/**
 * Read REPLICATE_API_TOKEN from environment, throwing if unset.
 */
export function getToken(): string {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN is not set. Add it to .env file.\n" +
        "Get your token at https://replicate.com/account/api-tokens",
    );
  }
  return token;
}

// ---------------------------------------------------------------------------
// Version pin enforcement
// ---------------------------------------------------------------------------

/**
 * Enforce version pin in production mode.
 * A pinned version is a 64-char hex SHA -- anything else is rejected.
 */
export function enforceVersionPin(
  version: string | undefined,
  production: boolean,
): void {
  if (!production) return;

  if (!version || version === "latest" || !/^[a-f0-9]{64}$/i.test(version)) {
    throw new Error(
      "Version must be pinned to an exact SHA in production mode. " +
        "Received: " +
        (version ?? "undefined"),
    );
  }
}

// ---------------------------------------------------------------------------
// Extract URL from Replicate output (various formats)
// ---------------------------------------------------------------------------

export function extractUrl(output: unknown): string {
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    const str = String(output);
    if (str.startsWith("http")) return str;
    if ("url" in output) {
      const urlVal = (output as Record<string, unknown>).url;
      return typeof urlVal === "function" ? (urlVal as () => string)() : String(urlVal);
    }
  }
  return String(output);
}

// ---------------------------------------------------------------------------
// Retry with exponential backoff + Retry-After support
// ---------------------------------------------------------------------------

export interface RetryOptions {
  maxAttempts?: number;
  /** Custom backoff schedule (ms). Overrides default [1000, 3000, 9000]. */
  backoffMs?: number[];
  /** Called before each retry delay. Useful for testing/logging. */
  onRetry?: (attempt: number, delayMs: number) => void;
}

const DEFAULT_BACKOFF_MS = [1000, 3000, 9000]; // 1s, 3s, 9s

/**
 * Generic retry wrapper with exponential backoff.
 * - Respects `retryAfterMs` property on thrown errors (from Retry-After header).
 * - Default max 3 attempts, backoff 1s/3s/9s.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const backoff = opts.backoffMs ?? DEFAULT_BACKOFF_MS;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= maxAttempts) {
        throw err;
      }

      // Determine delay: Retry-After header value takes priority
      const retryAfterMs =
        err && typeof err === "object" && "retryAfterMs" in err
          ? (err as { retryAfterMs: number }).retryAfterMs
          : backoff[attempt - 1] ?? 9000;

      opts.onRetry?.(attempt, retryAfterMs);

      await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
    }
  }

  // Should be unreachable, but TypeScript needs it
  throw new Error("withRetry: exhausted all attempts");
}

