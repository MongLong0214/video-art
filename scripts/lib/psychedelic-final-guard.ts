import { createHash } from "node:crypto";
import fs from "node:fs";
import { z } from "zod";

const humanOverrideSchema = z.object({
  approvedBy: z.literal("isaac"),
  reason: z.string().min(1),
  at: z.string().min(1),
});

const gateReportSchema = z.object({
  status: z.union([z.literal("PASS"), z.literal("REJECT")]),
  scene: z.object({ sha256: z.string().regex(/^[a-f0-9]{64}$/) }),
  humanOverride: humanOverrideSchema.optional(),
});

export class PsychedelicFinalGuardError extends Error {
  override readonly name = "PsychedelicFinalGuardError";
}

function sha256File(filePath: string): string {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function assertPsychedelicFullRenderGate(reportPath: string, scenePath: string): void {
  if (!fs.existsSync(reportPath)) throw new PsychedelicFinalGuardError(`psychedelic gate report not found: ${reportPath}`);
  if (!fs.existsSync(scenePath)) throw new PsychedelicFinalGuardError(`scene not found for psychedelic gate: ${scenePath}`);
  const parsed = gateReportSchema.safeParse(JSON.parse(fs.readFileSync(reportPath, "utf8")) as unknown);
  if (!parsed.success) throw new PsychedelicFinalGuardError(`invalid psychedelic gate report: ${reportPath}`);
  const allowed =
    parsed.data.status === "PASS" ||
    (parsed.data.status === "REJECT" && parsed.data.humanOverride?.approvedBy === "isaac");
  if (!allowed) {
    throw new PsychedelicFinalGuardError(
      "full render is blocked because the candidate gate did not pass (Isaac humanOverride required for REJECT)",
    );
  }
  if (parsed.data.scene.sha256 !== sha256File(scenePath)) {
    throw new PsychedelicFinalGuardError("full render is blocked because the gate report does not match the current scene.json");
  }
}
