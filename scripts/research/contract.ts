import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { checkVmafAvailable } from "./metrics/vmaf.js";

export const REFERENCE_CACHE_DIR = ".cache/research/reference";
export const REFERENCE_METADATA_PATH = `${REFERENCE_CACHE_DIR}/metadata.json`;
export const REFERENCE_INPUT_PATH = `${REFERENCE_CACHE_DIR}/input.png`;
export const CALIBRATION_DIR = ".cache/research";
export const CALIBRATION_PATH = `${CALIBRATION_DIR}/calibration.json`;
export const BASELINE_PATH = `${CALIBRATION_DIR}/baseline-config.json`;
export const RESULTS_TSV_PATH = `${CALIBRATION_DIR}/results.tsv`;

export const EVAL_SCHEMA_VERSION = "2026-03-31-v3";
export const GATE_THRESHOLD = 0.01;

export type VmafMode = "libvmaf" | "fallback";

export interface ReferenceMetadata {
  width: number;
  height: number;
  fps: number;
  duration: number;
  sourcePath: string;
  sourceFingerprint: string;
  researchInputPath: string;
  researchInputFingerprint: string;
  frameCount: number;
  extractedAt: string;
}

export interface EvaluationContractFields {
  evalSchemaVersion: string;
  gateThreshold: number;
  referenceFingerprint: string;
  referenceInputFingerprint: string;
  vmafMode: VmafMode;
}

export function computeFileFingerprint(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

export function detectCurrentVmafMode(): VmafMode {
  return checkVmafAvailable() ? "libvmaf" : "fallback";
}

export function buildStaticEvaluationContract(
  referenceFingerprint: string = "unknown",
  referenceInputFingerprint: string = "unknown",
  vmafMode: VmafMode = "fallback",
): EvaluationContractFields {
  return {
    evalSchemaVersion: EVAL_SCHEMA_VERSION,
    gateThreshold: GATE_THRESHOLD,
    referenceFingerprint,
    referenceInputFingerprint,
    vmafMode,
  };
}

export function buildRuntimeEvaluationContract(
  referenceMetadata: Pick<ReferenceMetadata, "sourceFingerprint" | "researchInputFingerprint">,
): EvaluationContractFields {
  return buildStaticEvaluationContract(
    referenceMetadata.sourceFingerprint,
    referenceMetadata.researchInputFingerprint,
    detectCurrentVmafMode(),
  );
}

export function readReferenceMetadata(): ReferenceMetadata {
  if (!existsSync(REFERENCE_METADATA_PATH)) {
    throw new Error(
      "Reference not prepared. Run `npm run research:prepare -- source.mp4` first.",
    );
  }

  return JSON.parse(
    readFileSync(REFERENCE_METADATA_PATH, "utf-8"),
  ) as ReferenceMetadata;
}

export function validatePreparedReference(): ReferenceMetadata {
  const metadata = readReferenceMetadata();

  if (!metadata.sourcePath) {
    throw new Error(
      "Reference metadata is missing sourcePath. Run `npm run research:prepare -- source.mp4` again.",
    );
  }

  if (!metadata.sourceFingerprint) {
    throw new Error(
      "Reference metadata is missing sourceFingerprint. Run `npm run research:prepare -- source.mp4` again.",
    );
  }

  if (!metadata.researchInputPath) {
    throw new Error(
      "Reference metadata is missing researchInputPath. Run `npm run research:prepare -- source.mp4` again.",
    );
  }

  if (!metadata.researchInputFingerprint) {
    throw new Error(
      "Reference metadata is missing researchInputFingerprint. Run `npm run research:prepare -- source.mp4` again.",
    );
  }

  if (!existsSync(metadata.sourcePath)) {
    throw new Error(
      `Reference source is missing: ${metadata.sourcePath}. Restore the canonical source and rerun ` +
      "`npm run research:prepare -- source.mp4`.",
    );
  }

  const currentFingerprint = computeFileFingerprint(metadata.sourcePath);
  if (metadata.sourceFingerprint !== currentFingerprint) {
    throw new Error(
      "Reference asset changed since the last prepare step. " +
      "Run `npm run research:prepare -- source.mp4` and `npm run research:calibrate` before continuing.",
    );
  }

  if (!existsSync(metadata.researchInputPath)) {
    throw new Error(
      `Reference research input is missing: ${metadata.researchInputPath}. ` +
      "Run `npm run research:prepare -- source.mp4` again.",
    );
  }

  const currentInputFingerprint = computeFileFingerprint(metadata.researchInputPath);
  if (metadata.researchInputFingerprint !== currentInputFingerprint) {
    throw new Error(
      "Reference research input changed since the last prepare step. " +
      "Run `npm run research:prepare -- source.mp4` and `npm run research:calibrate` before continuing.",
    );
  }

  return metadata;
}

export function getContractMismatches(
  stored: Partial<EvaluationContractFields>,
  current: EvaluationContractFields,
): string[] {
  const mismatches: string[] = [];

  if (stored.evalSchemaVersion !== current.evalSchemaVersion) {
    mismatches.push(
      `evalSchemaVersion=${stored.evalSchemaVersion ?? "missing"} != ${current.evalSchemaVersion}`,
    );
  }

  if (stored.gateThreshold !== current.gateThreshold) {
    mismatches.push(
      `gateThreshold=${stored.gateThreshold ?? "missing"} != ${current.gateThreshold}`,
    );
  }

  if (stored.referenceFingerprint !== current.referenceFingerprint) {
    mismatches.push(
      `referenceFingerprint=${stored.referenceFingerprint ?? "missing"} != ${current.referenceFingerprint}`,
    );
  }

  if (stored.referenceInputFingerprint !== current.referenceInputFingerprint) {
    mismatches.push(
      `referenceInputFingerprint=${stored.referenceInputFingerprint ?? "missing"} != ${current.referenceInputFingerprint}`,
    );
  }

  if (stored.vmafMode !== current.vmafMode) {
    mismatches.push(
      `vmafMode=${stored.vmafMode ?? "missing"} != ${current.vmafMode}`,
    );
  }

  return mismatches;
}

export function assertEvaluationContractCompatible(
  label: string,
  stored: Partial<EvaluationContractFields>,
  current: EvaluationContractFields,
): void {
  const mismatches = getContractMismatches(stored, current);
  if (mismatches.length === 0) {
    return;
  }

  throw new Error(
    `${label} is incompatible with the current evaluation contract: ${mismatches.join("; ")}. ` +
    "Run `npm run research:calibrate` before continuing.",
  );
}

export function formatReferenceFingerprint(fingerprint: string): string {
  return fingerprint.slice(0, 12);
}
