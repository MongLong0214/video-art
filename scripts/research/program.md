# Autoresearch: Layer Decomposition Optimization

This is an experiment to have the LLM autonomously optimize video layer decomposition parameters.

## Setup

To set up a new experiment, work with the user to:

1. **Agree on a run tag**: propose a tag based on today's date (e.g. `mar27`). The branch `autoresearch/<tag>` must not already exist.
2. **Create the branch**: `git checkout -b autoresearch/<tag>` from current layer-upgrade.
3. **Read the in-scope files**: The research directory is small. Read these files for full context:
   - `program.md` — this file. Research instructions.
   - `research-config.ts` — the file you modify. All tuning parameters.
   - `evaluate.ts` + `metrics/*` — fixed evaluation. Do not modify.
4. **Verify reference exists**: Check that `.cache/research/reference/` contains keyframes. If not, tell the human to run `npm run research:prepare`.
5. **Verify calibration exists**: Check `.cache/research/calibration.json`. If not, run `npm run research:calibrate`.
6. **Initialize results.tsv**: Create with just the header row if not present.
7. **Confirm and go**: Confirm setup looks good.

## Experimentation

Each experiment runs the full pipeline once (~2 minutes). You launch it as: `npm run research:run`.

**What you CAN do:**
- Modify `research-config.ts` — this is the only file you edit. Everything is fair game: decomposition thresholds, complexity scoring, role assignment, layer retention, animation multipliers.

**What you CANNOT do:**
- Modify `evaluate.ts` or any file in `metrics/`. These are read-only. They contain the fixed evaluation harness.
- Modify `prepare.ts`, `calibrate.ts`, `frame-extractor.ts`. These are infrastructure.
- Install new packages or add dependencies.

**The goal is simple: get the highest quality_score.** The pipeline budget is fixed (~2 min), so you don't need to optimize for speed. Everything in `research-config.ts` is fair game.

**Simplicity criterion**: All else being equal, simpler is better. A small improvement from fewer parameter changes is preferred. Removing a parameter override and getting equal results is a simplification win.

## Parameter Reference

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| numLayers | 2-12 | 4 | Qwen decomposition layer count |
| method | qwen-only / qwen-zoedepth | qwen-only | Decomposition variant |
| alphaThreshold | 1-254 | 128 | RGBA alpha binarization |
| minCoverage | 0.001-0.05 | 0.005 | Minimum component coverage |
| simpleEdgeMax | 0.01-0.3 | 0.10 | Complexity: simple ceiling |
| simpleEntropyMax | 3.0-8.0 | 5.5 | Complexity: simple entropy ceiling |
| complexEdgeMin | 0.05-0.5 | 0.20 | Complexity: complex floor |
| complexEntropyMin | 4.0-9.0 | 7.0 | Complexity: complex entropy floor |
| edgePixelThreshold | 10-100 | 30 | Sobel edge threshold |
| iouDedupeThreshold | 0.3-0.95 | 0.70 | IoU for duplicate detection |
| uniqueCoverageThreshold | 0.005-0.1 | 0.02 | Minimum exclusive pixel ratio |
| centralityThreshold | 0.1-0.4 | 0.25 | Subject centrality |
| bgPlateMinBboxRatio | 0.1-0.6 | 0.30 | Background plate bbox ratio |
| edgeTolerancePx | 1-10 | 2 | Edge tolerance in pixels |
| maxLayers | 3-16 | 8 | Maximum retained layers |
| minRetainedLayers | 1-6 | 3 | Minimum retained layers |
| depthZones | 2-8 | 4 | ZoeDepth zones (variant B) |
| depthSplitThreshold | 0.05-0.4 | 0.15 | Depth split threshold |
| qualityThresholdPct | 1-30 | 10 | Variant selection threshold |
| colorCycleSpeedMul | 0.1-3.0 | 1.0 | Animation: color cycle speed multiplier |
| parallaxDepthMul | 0.1-3.0 | 1.0 | Animation: parallax depth multiplier |
| waveAmplitudeMul | 0.0-3.0 | 1.0 | Animation: wave amplitude multiplier |
| glowIntensityMul | 0.0-3.0 | 1.0 | Animation: glow intensity multiplier |
| saturationBoostMul | 0.1-3.0 | 1.0 | Animation: saturation boost multiplier |
| luminanceKeyMul | 0.1-3.0 | 1.0 | Animation: luminance key multiplier |

### Constraints
- `simpleEdgeMax` must be less than `complexEdgeMin`
- Multipliers of 1.0 = no change from existing presets

### Interdependencies
- `numLayers` + `maxLayers` + `minRetainedLayers` interact: more initial layers → more candidates → dedupe matters more
- `iouDedupeThreshold` + `uniqueCoverageThreshold` together control retention aggressiveness
- `depthZones` + `depthSplitThreshold` only active when `method = "qwen-zoedepth"`
- Animation multipliers are independent from decomposition — can be tuned separately

## Strategy Guide

1. **First run**: Always establish baseline by running with default config.
2. **Single parameter sweep**: Change one parameter at a time, observe effect.
3. **Start with high-impact parameters**: `numLayers`, `iouDedupeThreshold`, `uniqueCoverageThreshold`, `maxLayers`
4. **Animation tuning**: After decomposition is optimized, tune multipliers.
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
