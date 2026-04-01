/**
 * Shared pipeline constants — single source of truth for thresholds.
 *
 * SAM path (pipeline-layers.ts Step 4): SAM_OPACITY_THRESHOLD + SAM_MIN_COVERAGE
 * BFS path (candidate-extraction.ts): ALPHA_THRESHOLD + MIN_COVERAGE
 * Ownership/retention (layer-resolve.ts): ALPHA_THRESHOLD + UNIQUE_COVERAGE_THRESHOLD + IOU_DEDUPE_THRESHOLD
 */

// Ownership alpha threshold: pixel is "present" if alpha > 10
// Lowered from 128 to accommodate soft-edge alpha matte (blur creates gradient 0-255)
export const ALPHA_THRESHOLD = 10;

// SAM raw mask filter (opaque if alpha > 10 — more permissive for SAM masks)
export const SAM_OPACITY_THRESHOLD = 10;

// BFS candidate minimum coverage (0.5%)
export const MIN_COVERAGE = 0.005;

// SAM mask minimum coverage (0.1% — lower bar for SAM segments)
export const SAM_MIN_COVERAGE = 0.001;

// Unique coverage threshold for retention
export const UNIQUE_COVERAGE_THRESHOLD = 0.005;

// IoU deduplication threshold
export const IOU_DEDUPE_THRESHOLD = 0.92;

// Maximum retained layers
export const MAX_LAYERS = 16;

// Minimum retained layers (progressive threshold relaxation target)
export const MIN_RETAINED_LAYERS = 6;
