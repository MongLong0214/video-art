# T-A3: Post-Processing Chain Improvements + Pixel-Regression Impl

**PRD Ref**: PRD-shader-dev-tier-abc > US-1 + §8.2 (pixel-regression)
**Priority**: P1
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: T-A1, T-A2

---

## 1. Objective
Polish existing post-processing chain (bloom threshold tuning, tone mapping review), and implement **pixel-regression.ts** to prove Tier A backward compatibility (uniform=0 → identical pixels).

## 2. Acceptance Criteria
- [ ] AC-1: `scripts/pixel-regression.ts` compares two renders (Tier A uniforms all 0 vs main branch baseline) for baseline + mandala-flow presets
- [ ] AC-2: SSIM ≥ 0.995 OR pixel-diff RMSE ≤ 0.005 for both presets
- [ ] AC-3: `scripts/pixel-regression.test.ts` unit test for SSIM calculation helper
- [ ] AC-4: `package.json` script: `"regress:pixel": "tsx scripts/pixel-regression.ts"`
- [ ] AC-5: Bloom passes reviewed — if threshold/radius tuning needed, apply (single tuning commit OK)
- [ ] AC-6: Tone mapping configured via renderer.toneMapping confirmed `ACESFilmic` in layered mode

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `pixel-regression: SSIM helper returns 1.0 for identical images` | Unit | feed same buffer → assert ~1.0 | FAIL (stub) |
| 2 | `pixel-regression: SSIM helper returns <0.9 for mismatched` | Unit | feed different buffers → assert <0.9 | FAIL |
| 3 | `pixel-regression: CLI signature accepts --before --after` | Unit | argv mock parse → assert paths accepted | FAIL |

### 3.2 Test File Location
- `scripts/pixel-regression.test.ts` — unit tests for SSIM helper
- Actual integration run = manual `npm run regress:pixel`

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type |
|------|------------|
| `scripts/pixel-regression.ts` | Replace stub with impl |
| `scripts/pixel-regression.test.ts` | Replace with SSIM unit tests |
| `scripts/lib/ssim.ts` | Create — lightweight SSIM (sharp + pixel diff) |
| `src/lib/effect-composer.ts` | (optional) tuning tweaks if AC-5 requires |
| `package.json` | Add `regress:pixel` |

### 4.2 Implementation Steps (Green Phase)
1. Red tests
2. SSIM helper using `sharp` (already in deps): load PNGs, grayscale, compute mean + stddev + covariance windows
3. pixel-regression.ts: 
   - Accepts `--before <path>` `--after <path>` `--preset <name>` 
   - Spawns Puppeteer (reuse headless-browser helper from T0-a)
   - Renders same preset at t=2.5s (mid-loop) with 2 configs (before = no Tier A, after = Tier A all 0)
   - Compares via SSIM
   - Exit 0 if SSIM ≥ 0.995
4. Run against baseline.json + mandala-flow.json
5. Bloom tuning — inspect `effect-composer.ts` BloomEffect params, adjust threshold if Tier A intensities shift

### 4.3 Refactor Phase
- N/A (single-purpose scripts)

## 5. Edge Cases
- EC-1: Puppeteer screenshot float precision vs PNG quantization → accept RMSE ≤ 0.005 buffer
- EC-2: Non-deterministic rendering (e.g., GPU dither, MediaRecorder timing) → use `__captureFrame` at fixed t for determinism

## 6. Review Checklist
- [ ] Unit tests PASS
- [ ] pixel-regression baseline+mandala PASS (SSIM ≥ 0.995)
- [ ] `check:shaders` PASS
- [ ] Commit: `feat(infra): T-A3 pixel regression + bloom tuning (if any)`
