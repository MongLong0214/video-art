# Autoresearch: Layer Decomposition Optimization

This is an experiment to have the LLM autonomously optimize video layer decomposition parameters.

## Reference (고정)

**단일 레퍼런스**: `source.mp4` (프로젝트 루트, 16MB)
- 원본 경로: `/Users/isaac/projects/video-art/source.mp4`
- 이 파일이 모든 실험의 유일한 기준. 변경 금지.
- prepare 명령: `npm run research:prepare -- source.mp4`
- prepare는 `.cache/research/reference/metadata.json`에 source fingerprint와 canonical research input fingerprint를 기록한다.
- research loop는 arbitrary root `input.png`를 쓰지 않는다. prepare가 `source.mp4` 첫 프레임에서 만든 `.cache/research/reference/input.png`가 calibration/run의 유일한 입력이다.
- source fingerprint 또는 research input fingerprint가 바뀌면 prepare와 calibrate를 다시 해야 한다.

## Setup

To set up a new experiment, work with the user to:

1. **Agree on a run tag**: propose a tag based on today's date (e.g. `mar27`). The branch `autoresearch/<tag>` must not already exist.
2. **Use an isolated research workspace**: prefer a dedicated worktree or, at minimum, a clean `autoresearch/<tag>` branch with no unrelated dirt.
   - The only allowed dirty file during an experiment is `scripts/research/research-config.ts`.
3. **Read the in-scope files**: The research directory is small. Read these files for full context:
   - `program.md` — this file. Research instructions.
   - `research-config.ts` — the file you modify. All tuning parameters.
   - `evaluate.ts` + `metrics/*` + `contract.ts` — versioned evaluation contract. Treat as fixed during autonomous experiments.
4. **Verify reference exists**: Check that `.cache/research/reference/` contains keyframes and current metadata/fingerprint. If not, run `npm run research:prepare -- source.mp4`.
5. **Verify calibration exists**: Check `.cache/research/calibration.json`. If missing or contract-incompatible, run `npm run research:calibrate`.
6. **Initialize results.tsv**: Create with just the header row if not present.
7. **Confirm and go**: Confirm setup looks good.

## Experimentation

Each experiment runs the full pipeline once (~2 minutes). You launch it as: `npm run research:run`.

**What you CAN do:**
- Modify `research-config.ts` — this is the only file you edit. Everything is fair game: decomposition thresholds, complexity scoring, role assignment, layer retention, animation multipliers.

**What you CANNOT do:**
- Modify `evaluate.ts` or any file in `metrics/`. These are read-only. They contain the fixed evaluation harness.
- Modify `contract.ts` or bypass contract validation. If the contract changed, recalibrate instead of forcing a run.
- Modify `prepare.ts`, `calibrate.ts`, `frame-extractor.ts`. These are infrastructure.
- Install new packages or add dependencies.

**The goal is simple: get the highest quality_score for the canonical reference-derived input.** The pipeline budget is fixed (~2 min), so you don't need to optimize for speed. Everything in `research-config.ts` is fair game.

**Simplicity criterion**: All else being equal, simpler is better. A small improvement from fewer parameter changes is preferred. Removing a parameter override and getting equal results is a simplification win.

## Parameter Reference

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| samMaskLimit | 3-12 or `null` | `null` | Override SAM 2 mask count. `null` means use complexity scoring (6/7/8). |
| alphaThreshold | 1-254 | 128 | RGBA alpha binarization |
| minCoverage | 0.001-0.05 | 0.005 | Minimum component coverage |
| simpleEdgeMax | 0.01-0.3 | 0.10 | Complexity: simple ceiling |
| simpleEntropyMax | 3.0-8.0 | 5.5 | Complexity: simple entropy ceiling |
| complexEdgeMin | 0.05-0.5 | 0.20 | Complexity: complex floor |
| complexEntropyMin | 4.0-9.0 | 7.0 | Complexity: complex entropy floor |
| edgePixelThreshold | 10-100 | 30 | Sobel edge threshold |
| iouDedupeThreshold | 0.3-0.98 | 0.92 | IoU for duplicate detection |
| uniqueCoverageThreshold | 0.001-0.1 | 0.005 | Minimum exclusive pixel ratio |
| centralityThreshold | 0.1-0.4 | 0.25 | Subject centrality |
| bgPlateMinBboxRatio | 0.1-0.6 | 0.30 | Background plate bbox ratio |
| edgeTolerancePx | 1-10 | 2 | Edge tolerance in pixels |
| maxLayers | 3-16 | 12 | Maximum retained layers |
| minRetainedLayers | 1-12 | 6 | Minimum retained layers |
| colorCycleSpeedMul | 0.1-3.0 | 1.0 | Animation: color cycle speed multiplier |
| glowIntensityMul | 0.0-3.0 | 1.0 | Animation: glow intensity multiplier |
| saturationBoostMul | 0.1-3.0 | 1.0 | Animation: saturation boost multiplier |
| luminanceKeyMul | 0.1-3.0 | 1.0 | Animation: luminance key multiplier |
| bloomStrengthMul | 0.0-3.0 | 1.0 | Post: bloom strength multiplier |
| chromaticAberrationOffsetMul | 0.0-3.0 | 1.0 | Post: chromatic aberration offset multiplier |

### Constraints
- `simpleEdgeMax` must be less than `complexEdgeMin`
- `samMaskLimit = null` means the pipeline will choose 6/7/8 masks from complexity scoring
- Multipliers of `1.0` = no change from existing presets

### Live Knobs
- Every parameter listed above is live on the default SAM2 experiment path.
- There are no exploratory knobs in this table that only affect the deprecated Qwen or recursive pipeline.

### Interdependencies
- `samMaskLimit` + `maxLayers` + `minRetainedLayers` interact: more initial masks usually increase candidate overlap and make retention thresholds matter more
- `alphaThreshold` + `minCoverage` interact: aggressive masking can shrink layers below the coverage floor
- `iouDedupeThreshold` + `uniqueCoverageThreshold` together control retention aggressiveness
- `centralityThreshold` + `bgPlateMinBboxRatio` + `edgeTolerancePx` together steer role assignment
- Animation multipliers are independent from decomposition, but they still affect the final evaluated video

## Strategy Guide

1. **First run**: Always establish baseline by running with default config.
2. **Single parameter sweep**: Change one parameter at a time, observe effect.
3. **Start with high-impact parameters**: `samMaskLimit`, `iouDedupeThreshold`, `uniqueCoverageThreshold`, `maxLayers`, `centralityThreshold`
4. **Animation tuning**: After layer structure stabilizes, tune multipliers.
5. **Combination exploration**: After identifying promising single changes, combine them.
6. **Extreme testing**: Try boundary values to understand parameter sensitivity.
7. **Random restart**: If stuck in local optimum, reset to baseline and try a different direction.

## Output Format

After each run, the script prints:

```
[exp #N] quality: 0.XXXX (keep/discard) | Δ+0.XXXX | XXXXms — description
```

## Logging Results

Results are logged to `results.tsv` automatically by `run-once.ts`. Do NOT manually edit this file.

## The Experiment Loop

LOOP FOREVER:

1. Read results.tsv to understand what has been tried.
2. Decide on a parameter change based on past results.
3. Edit `research-config.ts` with the change.
4. Run `npm run research:run`
5. Read the console output for the result.
6. If quality improved (keep), the config is committed. You're now on the new baseline.
7. If quality didn't improve (discard), the config is automatically reverted.
8. Repeat from step 1.

**NEVER STOP**: Once the loop has begun, do NOT pause to ask the human. The human might be asleep. You are autonomous. If you run out of ideas, think harder — re-read the parameter reference, try combining near-misses, try more radical changes. The loop runs until the human interrupts you.

**Timeout**: Each run should take ~2 minutes. If a run exceeds 5 minutes, treat it as a failure.

**Crashes**: If a run crashes, use your judgment: fix typo → re-run, or skip and move on.
