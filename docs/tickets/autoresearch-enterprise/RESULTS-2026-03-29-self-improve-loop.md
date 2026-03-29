# Autoresearch Loop Results: 2026-03-29

## Scope

- Worktree: `/tmp/video-art-autoresearch-20260329`
- Branch: `autoresearch/20260329-hybrid1`
- Final promoted commit: `084af7e`
- Canonical reference: `/Users/isaac/projects/video-art/source.mp4`
- Evaluation contract: `evalSchemaVersion=2026-03-29-v2`, `gateThreshold=0.15`, `vmafMode=libvmaf`

This report summarizes the productionized self-improvement loop after the enterprise hardening work. It covers the manual sweeps, the automated infinite-loop search, the winning promotions, and the final recommended baseline.

## Executive Summary

- The loop is operationally valid: `prepare -> calibrate -> promote -> run` worked in a clean worktree, `KEEP` promoted the baseline automatically, and `DISCARD` restored the config cleanly.
- A total of `291` scored experiments were completed.
- `2` experiments were promoted to `KEEP`.
- The promoted baseline improved from `0.5970` to `0.6078`.
- The automated loop was stopped manually during `exp #292` evaluation; that run did not write a result row and did not affect the baseline.

## Baseline Progression

| Stage | Source | Quality | Delta | Notes |
| --- | --- | ---: | ---: | --- |
| Legacy corrected baseline | prior promoted config | `0.5668` | n/a | First stable v2 contract baseline |
| `exp #13` | commit `6e6254d` | `0.5970` | `+0.0302` | Residual-aware hybrid search space unlocked first major gain |
| `exp #197` | commit `084af7e` | `0.6078` | `+0.0108` | Automated local search found the next winning post-processing setting |

## Winning Experiments

### `exp #13` -> `KEEP` (`6e6254d`)

- Score: `0.5970`
- Improvement over baseline: `+0.0302`
- Core change:
  - Moved from the older baseline into the residual-aware hybrid layout
  - Established the now-stable `3 SAM + residual fallback` topology
- Practical outcome:
  - This removed the earlier plateau around `0.5668`
  - It became the baseline that later infinite-loop search refined

### `exp #197` -> `KEEP` (`084af7e`)

- Score: `0.6078`
- Improvement over previous baseline: `+0.0108`
- Final promoted config deltas:
  - `saturationBoostMul: 0.622`
  - `luminanceKeyMul: 1.056`
  - `bloomStrengthMul: 0.799`
  - `chromaticAberrationOffsetMul: 0.907`
- Structural config retained:
  - `samMaskLimit: 6`
  - `samPointsPerSide: 80`
  - `samPredIouThresh: 0.6`
  - `samStabilityScoreThresh: 0.9`
  - `luminanceFallbackEnabled: true`
  - `luminanceFallbackMinSamLayers: 4`
  - `luminanceFallbackZoneCount: 3`
  - `luminanceFallbackResidualOnly: true`
  - `luminanceFallbackResidualCoverageMin: 0.03`
- Metric snapshot:
  - `M1_palette=0.6270`
  - `M2_dominant=0.7371`
  - `M4_msssim=0.2646`
  - `M5_edge=0.5953`
  - `M6_texture=0.8802`
  - `M7_vmaf=0.1722`
  - `M9_layer_indep=0.3216`

## Final Promoted Config

This is the config currently encoded in the baseline artifact and in `scripts/research/research-config.ts`.

```ts
{
  samMaskLimit: 6,
  samPointsPerSide: 80,
  samPredIouThresh: 0.6,
  samStabilityScoreThresh: 0.9,
  luminanceFallbackEnabled: true,
  luminanceFallbackMinSamLayers: 4,
  luminanceFallbackZoneCount: 3,
  luminanceFallbackResidualOnly: true,
  luminanceFallbackResidualCoverageMin: 0.03,
  maxLayers: 12,
  minRetainedLayers: 1,
  alphaThreshold: 96,
  minCoverage: 0.005,
  simpleEdgeMax: 0.1,
  simpleEntropyMax: 5.5,
  complexEdgeMin: 0.2,
  complexEntropyMin: 7,
  edgePixelThreshold: 30,
  iouDedupeThreshold: 0.92,
  uniqueCoverageThreshold: 0.02,
  centralityThreshold: 0.25,
  bgPlateMinBboxRatio: 0.3,
  edgeTolerancePx: 2,
  colorCycleSpeedMul: 0.75,
  glowIntensityMul: 0,
  saturationBoostMul: 0.622,
  luminanceKeyMul: 1.056,
  bloomStrengthMul: 0.799,
  chromaticAberrationOffsetMul: 0.907,
}
```

## Search-Space Findings

### What clearly did not work

- Aggressive structure simplification hurt quality.
  - Pure-SAM or reduced-layer variants improved `M9` in some cases but lost too much elsewhere.
  - Earlier 2-layer and 3-layer collapse experiments consistently fell below the promoted hybrid baseline.
- Hard removal of post effects hurt gate performance.
  - Zeroing bloom or chromatic aberration was too destructive.
- After the `0.6078` promotion, most random local-search candidates landed in the `0.603` to `0.607` band.

### What consistently helped

- Residual-aware hybrid decomposition was the key topology win.
- Once topology stabilized, the gains came from post-processing moderation rather than further structural change.
- The best settings reduced excessive rendering energy instead of adding more.
  - Lower bloom
  - Lower chromatic aberration
  - Lower saturation
  - Slightly increased luminance key

### Metric interpretation

- `M9_layer_indep` stabilized at `0.3216` for the winning topology and stayed flat across most later runs.
- The improvement from `0.5970` to `0.6078` came mostly from balancing:
  - `M1_palette`
  - `M2_dominant`
  - `M6_texture`
  - `M7_vmaf`
- This means the current bottleneck is not decomposition contract integrity. It is aesthetic scoring refinement within the already-valid hybrid structure.

## Best Near-Miss Discards After the Final Promotion

These runs were useful because they were close to the promoted baseline but did not clear `deltaMin`.

| Experiment | Score | Approx. Delta vs `0.6078` baseline | Notes |
| --- | ---: | ---: | --- |
| `exp #263` | `0.6083` | `+0.0005` | Best near miss in the automated loop |
| `exp #217` | `0.6082` | `+0.0004` | Strong candidate but still below promotion threshold |
| `exp #282` | `0.6079` | `+0.0001` | Functionally tied with the promoted baseline |

The practical conclusion is that the search space around the promoted winner was already tight. The loop kept finding adjacent local maxima, but not by enough to justify a new promotion.

## Aggregate Run Summary

- Total scored runs: `291`
- Total `KEEP`: `2`
- Total `DISCARD`: `289`
- Average discard score: `0.5965`
- Highest promoted score: `0.6078`
- Highest overall discard score: `0.6083`

## Operational Notes

- The infinite-loop driver tracked tried candidates in `.cache/research/auto-loop-state.json`.
- The loop was stopped manually with Ctrl-C during `exp #292` while evaluation was running.
- Because the stop happened before the evaluator wrote a result row, `exp #292` is intentionally absent from `results.tsv`.
- After stopping, `scripts/research/research-config.ts` was restored from Git and the worktree was returned to a clean state.

## Artifacts

- Full run log: `.cache/research/results.tsv`
- Final promoted baseline: `.cache/research/baseline-config.json`
- Candidate queue and near-miss state: `.cache/research/auto-loop-state.json`

## Recommendation

Use commit `084af7e` and the promoted baseline as the handoff point for the next loop session.

If search resumes later, it should start from the current promoted config and bias toward a new family of changes rather than more micro-perturbations around the same post-processing neighborhood. The current neighborhood has already been heavily sampled and is producing mostly sub-threshold near misses.
