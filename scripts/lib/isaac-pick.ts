/**
 * Isaac's pick is the full-render permit (00 §2). The psychedelic gate is a diagnostic:
 * 5 of the last 6 Isaac finals were gate REJECT + hand-edited humanOverride. This turns that
 * hand edit into a recorded verbatim quote and leaves psychedelic-final-guard unchanged
 * (it still accepts PASS, or REJECT + humanOverride.approvedBy === "isaac").
 */
export type PickReport = Record<string, unknown> & {
  status: "PASS" | "REJECT";
  scene: { sha256: string };
  humanOverride: { approvedBy: "isaac"; reason: string; at: string };
};

export type PickRecord = {
  readonly quote: string;
  readonly at: string;
  readonly sceneSha256: string;
  readonly preview?: string;
  readonly audio?: string;
};

const SHA_RE = /^[a-f0-9]{64}$/;

export function buildPickReport(
  existing: Record<string, unknown> | undefined,
  sceneSha: string,
  quote: string,
  at: string,
): PickReport {
  const reason = quote.trim();
  if (!reason) throw new Error("Isaac quote is required verbatim — it is the permit");
  if (!SHA_RE.test(sceneSha)) throw new Error(`scene sha must be 64 hex (got ${sceneSha})`);
  const existingSha = (existing?.scene as { sha256?: unknown } | undefined)?.sha256;
  const base: Record<string, unknown> =
    existing && existingSha === sceneSha
      ? existing
      : { status: "REJECT", scene: { sha256: sceneSha }, note: "no gate for this scene sha; Isaac pick is the permit (00 §2)" };
  const status = base.status === "PASS" ? "PASS" : "REJECT";
  const scene = { ...((base.scene as Record<string, unknown> | undefined) ?? {}), sha256: sceneSha };
  return { ...base, status, scene, humanOverride: { approvedBy: "isaac", reason, at } };
}

export function buildPickRecord(input: {
  readonly quote: string;
  readonly at: string;
  readonly sceneSha256: string;
  readonly preview?: string;
  readonly audio?: string;
}): PickRecord {
  const quote = input.quote.trim();
  if (!quote) throw new Error("Isaac quote is required");
  if (input.audio !== undefined && !/@\d+:\d{2}/.test(input.audio) && !/^none$/i.test(input.audio)) {
    throw new Error(`--audio must name track and start like "Mama India @6:27" or "none" (got ${input.audio}) — R-059: never guess the start`);
  }
  return {
    quote,
    at: input.at,
    sceneSha256: input.sceneSha256,
    ...(input.preview ? { preview: input.preview } : {}),
    ...(input.audio ? { audio: input.audio } : {}),
  };
}
