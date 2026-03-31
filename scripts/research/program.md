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

## Prerequisites

Autoresearch 루프를 가동하기 전에 아래 환경이 모두 갖춰져야 한다.

### System Dependencies

| Dependency | Version | Install | 용도 |
|-----------|---------|---------|------|
| Node.js | >= 22 | `brew install node` | 런타임 |
| ffmpeg **with libvmaf** | >= 8.0 | `brew install homebrew-ffmpeg/ffmpeg/ffmpeg --with-libvmaf` | 영상 인코딩 + VMAF 평가 |
| libvmaf | >= 3.0 | `brew install libvmaf` | VMAF 모델 파일 |
| Chrome | latest | `/Applications/Google Chrome.app` 또는 Puppeteer 내장 | Headless 프레임 캡처 |

**ffmpeg libvmaf 확인**: `ffmpeg -filters 2>/dev/null | grep libvmaf` → `libvmaf VV->V` 출력 필수.  
기존 core ffmpeg에는 libvmaf 미포함. `brew uninstall ffmpeg && brew install homebrew-ffmpeg/ffmpeg/ffmpeg --with-libvmaf`로 교체.

### npm Dependencies

프로젝트 루트에서 `npm install` — sharp, replicate, puppeteer, vite 등 자동 설치.

### Environment Variables

| Variable | 필수 | 용도 |
|----------|------|------|
| `REPLICATE_API_TOKEN` | Yes | SAM2/SAM3/DA V2/VLM API 호출 |

`.env` 파일 또는 shell export로 설정.

### Reference Asset

- `source.mp4`를 프로젝트 루트에 배치
- 권장: 1080x1080, 30fps, 10s, ~16MB
- 이 파일이 모든 실험의 유일한 기준. 변경 금지.

### Quick Start

```bash
# 1. Prerequisites 확인
ffmpeg -filters 2>/dev/null | grep libvmaf   # libvmaf 필터 존재 확인
echo $REPLICATE_API_TOKEN                     # 토큰 설정 확인

# 2. Reference 준비
npm run research:prepare -- source.mp4

# 3. Calibration (노이즈 측정, 3-10회)
npm run research:calibrate -- --runs 3

# 4. 자가개선 루프 실행
npm run research:run                          # 1회 실험
npm run research:run                          # 연속 실행 가능

# 5. 결과 리포트
npm run research:report
```

---

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
| samPointsPerSide | 16-128 | 64 | SAM 2 sampling density |
| samPredIouThresh | 0.1-0.99 | 0.70 | SAM 2 mask quality threshold |
| samStabilityScoreThresh | 0.1-0.99 | 0.92 | SAM 2 mask stability threshold |
| alphaThreshold | 1-254 | 128 | RGBA alpha binarization |
| minCoverage | 0.001-0.05 | 0.005 | Minimum component coverage |
| simpleEdgeMax | 0.01-0.3 | 0.10 | Complexity: simple ceiling |
| simpleEntropyMax | 3.0-8.0 | 5.5 | Complexity: simple entropy ceiling |
| complexEdgeMin | 0.05-0.5 | 0.20 | Complexity: complex floor |
| complexEntropyMin | 4.0-9.0 | 7.0 | Complexity: complex entropy floor |
| edgePixelThreshold | 10-100 | 30 | Sobel edge threshold |
| iouDedupeThreshold | 0.3-0.98 | 0.92 | IoU for duplicate detection |
| uniqueCoverageThreshold | 0.001-0.1 | 0.005 | Minimum exclusive pixel ratio |
| depthRoleWeight | 0.0-1.0 | 0.5 | Depth vs heuristic blend for role assignment. 0=heuristic only, 1=max depth influence. Requires DA V2 depth map (stddev >= 5 to activate) |
| depthForegroundThreshold | 0.1-0.4 | 0.3 | Depth percentile above which a candidate is considered foreground (near). 0.3 = top 30% |
| depthBackgroundThreshold | 0.5-0.9 | 0.7 | Depth percentile below which (1-N) a candidate is considered background (far). 0.7 = bottom 30% |
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
| bloomRadiusMul | 0.1-3.0 | 1.0 | Post: bloom radius multiplier (clamped at radius=1.0) |
| bloomThresholdMul | 0.1-3.0 | 1.0 | Post: bloom luminance threshold multiplier |
| caModulationOffsetMul | 0.1-3.0 | 1.0 | Post: chromatic aberration radial modulation offset multiplier |
| satBlendLow | 0.01-0.5 | 0.1 | Shader: smoothstep lower bound for saturation blending |
| satBlendHigh | 0.1-0.8 | 0.4 | Shader: smoothstep upper bound for saturation blending |
| satInjectionMul | 0.1-1.0 | 0.35 | Shader: saturation injection scalar (replaces hardcoded 0.35) |
| glowPulseFloor | 0.0-0.9 | 0.0 | Shader: glow pulse oscillation minimum. 0=full range [0,1], 0.5=half range [0.5,1] |
| lumExponent | 0.5-3.0 | 1.0 | Shader: luminance phase exponent. Higher = stronger nonlinearity in dark regions |
| tempoMul | 0.3-3.0 | 1.0 | Animation: global tempo multiplier (base tempo is 0.85) |
| phaseSpreadMul | 0.1-3.0 | 1.0 | Animation: phase offset spread. >1 = wider spread between layers |
| periodRangeLow | 1.0-10.0 | 1.0 | Animation: minimum allowed period (filters to valid divisors only) |
| periodRangeHigh | 5.0-30.0 | 20.0 | Animation: maximum allowed period (filters to valid divisors only) |
| glowPeriodMul | 0.3-3.0 | 1.0 | Animation: glow period scaling (snaps to nearest valid divisor) |
| blendMode | normal/add/multiply/screen | normal | Renderer: layer blending mode. Non-normal modes change layer compositing |
| depthSpeedInfluence | 0.0-2.0 | 0.0 | Depth-proportional color cycle speed boost (near=faster) |
| depthGlowInfluence | 0.0-2.0 | 0.0 | Depth-proportional glow intensity boost (near=brighter) |
| depthParallaxScale | 0.0-0.1 | 0.0 | 2.5D parallax UV offset magnitude (near=more movement) |
| hazeIntensity | 0.0-1.0 | 0.0 | Atmospheric desaturation for far layers |
| featherRadius | 0.0-0.2 | 0.0 | UV edge alpha fade radius |
| sam3Threshold | 0.1-0.9 | 0.25 | SAM3 confidence threshold for mask generation |
| vlmMaxPrompts | 3-10 | 6 | Maximum VLM-generated prompts for SAM3 segmentation |
| secondPassEnabled | true/false | true | Enable 2nd pass VLM+SAM3 for low-coverage results |
| secondPassThreshold | 0.5-0.95 | 0.8 | Union coverage below which 2nd pass triggers |
| useSam3 | true/false | true | false → SAM2 AMG fallback (instant rollback) |

### Constraints
- `simpleEdgeMax` must be less than `complexEdgeMin`
- `satBlendLow` must be less than `satBlendHigh` — always sweep these as a pair
- `periodRangeLow` must be less than `periodRangeHigh` — always sweep these as a pair
- `samMaskLimit = null` means the pipeline will choose 6/7/8 masks from complexity scoring
- Higher `samPointsPerSide` and lower SAM thresholds usually increase candidate count
- Multipliers of `1.0` = no change from existing presets
- `bloomRadiusMul` is clamped so radius never exceeds 1.0
- `glowPeriodMul` result is snapped to nearest valid period divisor

### Live Knobs
- Every parameter listed above is live on the default SAM2 experiment path.
- There are no exploratory knobs in this table that only affect the deprecated Qwen or recursive pipeline.
- The 14 new axes (bloomRadiusMul through blendMode) are all live and affect the rendered video output.

### Interdependencies
- `samMaskLimit` + SAM quality thresholds determine the topology before retention
- `samMaskLimit` + `maxLayers` + `minRetainedLayers` interact: more initial masks usually increase candidate overlap and make retention thresholds matter more
- `alphaThreshold` + `minCoverage` interact: aggressive masking can shrink layers below the coverage floor
- `iouDedupeThreshold` + `uniqueCoverageThreshold` together control retention aggressiveness
- `centralityThreshold` + `bgPlateMinBboxRatio` + `edgeTolerancePx` together steer role assignment
- Animation multipliers are independent from decomposition, but they still affect the final evaluated video
- `tempoMul` scales the base tempo (0.85) which is multiplied into `colorCycleSpeedMul` — both affect speed, so avoid sweeping simultaneously
- `satBlendLow`/`satBlendHigh` control the saturation blending curve — interact with `saturationBoostMul`
- `lumExponent` only takes effect when `luminanceKeyMul > 0` (guard: `uLuminanceKey > 0.001`)
- `blendMode` non-normal modes can cause overexposure — when sweeping blendMode, lower `bloomStrengthMul` to 0.3-0.5
- `periodRangeLow`/`periodRangeHigh` filter to duration divisors — if no divisors in range, falls back to all divisors
- `glowPeriodMul` result snaps to nearest valid divisor — equidistant ties snap to larger divisor
- `hazeIntensity` + `saturationBoostMul` — haze desaturation is applied after saturationBoost in the shader pipeline. High saturationBoostMul amplifies the haze effect since there's more saturation to remove. When sweeping haze, keep saturationBoostMul stable
- `featherRadius` + `depthParallaxScale` — parallax UV shift moves the feather boundary, which can cause micro-flickering at edges. When using feather, keep depthParallaxScale low (≤ 0.03)
- `depthSpeedInfluence` + `depthGlowInfluence` — simultaneous activation makes near layers excessively active (fast cycling + bright glow). Sweep one at a time; combined use should keep each ≤ 0.5
- Depth cinematic axes require depth variance (stddev ≥ 5) to activate. If all layers have similar meanDepth, the scene-generator forces all 5 cinematic axes to 0 regardless of config values

## Strategy Guide

1. **First run**: Always establish baseline by running with default config.
2. **Single parameter sweep**: Change one parameter at a time, observe effect.
3. **Start with high-impact parameters**: `samMaskLimit`, `samPredIouThresh`, `samStabilityScoreThresh`, `uniqueCoverageThreshold`
4. **Animation tuning**: After layer structure stabilizes, tune multipliers.
5. **Combination exploration**: After identifying promising single changes, combine them.
6. **Extreme testing**: Try boundary values to understand parameter sensitivity.
7. **Random restart**: If stuck in local optimum, reset to baseline and try a different direction.
8. **Category-sequential sweep for new axes**: Effect axes (bloomRadiusMul, bloomThresholdMul, caModulationOffsetMul) 50 runs → Shader axes (satBlendLow/High, satInjectionMul, glowPulseFloor, lumExponent) 50 runs → SceneGen axes (tempoMul, phaseSpreadMul, periodRangeLow/High, glowPeriodMul) 50 runs → Cross-category combinations 100 runs.
9. **blendMode caution**: When changing blendMode to add/multiply/screen, simultaneously lower bloomStrengthMul to 0.3-0.5 to avoid gate failure from overexposure.
10. **Paired constraints**: Always sweep satBlendLow/High together (never independently). Same for periodRangeLow/High.
11. **Depth cinematic sweep**: After animation tuning stabilizes, sweep depth axes sequentially: (1) depthSpeedInfluence 0.2-1.0 → (2) depthGlowInfluence 0.2-1.0 → (3) depthParallaxScale 0.01-0.05 → (4) hazeIntensity 0.1-0.5 → (5) featherRadius 0.02-0.1 → (6) top-2 combinations. Note: images with low depth variance (stddev < 5) auto-disable all cinematic axes.

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
