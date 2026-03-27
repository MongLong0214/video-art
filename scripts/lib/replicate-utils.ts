/**
 * Replicate API utilities: retry, URL validation, version pin, token masking.
 * Extracted for testability (T7).
 */

// ---------------------------------------------------------------------------
// URL domain validation
// ---------------------------------------------------------------------------

const ALLOWED_DOMAINS = [".replicate.delivery", ".replicate.com"];

/**
 * Validate that a Replicate output URL comes from a trusted domain.
 * Rejects URLs from untrusted domains to prevent SSRF/exfiltration.
 */
export function validateReplicateUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }

  const hostname = parsed.hostname;
  const trusted = ALLOWED_DOMAINS.some(
    (domain) => hostname === domain.slice(1) || hostname.endsWith(domain),
  );

  if (!trusted) {
    throw new Error(
      `Untrusted domain: ${hostname}. Expected *.replicate.delivery or *.replicate.com`,
    );
  }
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

// ---------------------------------------------------------------------------
// Token masking for log output
// ---------------------------------------------------------------------------

/**
 * Mask an API token in text for safe logging.
 * Keeps the first 3 chars (prefix like "r8_") and replaces the rest with "***".
 */
export function maskToken(text: string, token: string): string {
  if (!token || token.length < 4) return text;
  const prefix = token.slice(0, 3);
  return text.replaceAll(token, `${prefix}***`);
}
