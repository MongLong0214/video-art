# Pro Pipeline Cleanup Plan

**Target output**: `out/layered/2026-04-01_pro-pipeline/pro-pipeline.mp4` (69.6MB)
**Architecture**: bria/remove-background → flux-fill-pro → depth-anything-v2 → 2 layers → shader
**Settings**: No parallax, no haze, pure shader with hueKey

## Phase 1: DELETE dead files (7 files)

```
scripts/pipeline-layers.ts              # Old SAM3 orchestrator → replaced by new pro-pipeline
scripts/lib/image-decompose.ts          # SAM3/VLM/fal.ai decomposition → bria replaces
scripts/lib/layer-resolve.ts            # N-layer ownership/retention → 2 fixed layers
scripts/lib/candidate-extraction.ts     # BFS connected-component → not needed
scripts/lib/mask-postprocess.ts         # fillMaskHoles/applyAlphaMatte → bria has clean alpha
scripts/lib/mask-stats.ts              # Only caller was image-decompose
scripts/lib/mask-cache.ts             # Only caller was pipeline-layers
```

## Phase 2: DELETE experiment scripts (6 files)

```
scripts/experiment-sam3-prompts.ts
scripts/experiment-hybrid-comparison.ts
scripts/experiment-replicate-only.ts
scripts/experiment-dino-sam2-verify.ts
scripts/experiment-sam2-bbox-debug.ts
scripts/experiment-sam2-output-inspect.ts
scripts/experiment-diagnose-empty-mask.ts
scripts/experiment-final-strategy.ts
scripts/experiment-pro-pipeline.ts      # → promote to scripts/pipeline-pro.ts (new pipeline)
scripts/experiment-pro-extreme.ts
scripts/inspect-mask.ts
scripts/inspect-mask-pipeline.ts
scripts/inspect-build-candidate.ts
scripts/inspect-ownership.ts
```

## Phase 3: DELETE dead test files (3 files)

```
scripts/lib/fal-sam3-mask.test.ts       # Already deleted
scripts/lib/layer-resolve.test.ts       # Tests deleted systems
scripts/lib/mask-postprocess.test.ts    # Tests deleted systems
scripts/lib/image-decompose.test.ts     # Tests deleted systems
scripts/lib/candidate-extraction.comprehensive.test.ts  # Tests deleted systems
```

## Phase 4: SIMPLIFY research-config.ts

Remove ~25 dead axes:
- SAM axes: samMaskLimit, samPointsPerSide, samPredIouThresh, samStabilityScoreThresh, useSam3, sam3Threshold, secondPassEnabled, secondPassThreshold
- Mask axes: morphCloseEnabled, morphCloseKernelScale, alphaMatteEnabled, alphaMatteRadiusScale
- Ownership axes: iouDedupeThreshold, uniqueCoverageThreshold, minRetainedLayers, maxLayers
- Role axes: centralityThreshold, bgPlateMinBboxRatio, edgeTolerancePx, depthRoleWeight, depthForegroundThreshold, depthBackgroundThreshold
- Complexity axes: simpleEdgeMax, simpleEntropyMax, complexEdgeMin, complexEntropyMin, edgePixelThreshold

Keep: scene generator multipliers, shader axes, blend mode, depth cinematic (nullable)

## Phase 5: CREATE new pipeline script

`scripts/pipeline-pro.ts` — promoted from experiment-pro-pipeline.ts:
1. bria/remove-background → foreground PNG
2. flux-fill-pro → inpainted background PNG
3. depth-anything-v2 → depth map
4. Generate scene.json (2 layers, pro-pipeline settings)
5. Copy to public/

## Phase 6: UPDATE supporting files

- `scripts/pipeline.ts` → call pipeline-pro.ts instead of pipeline-layers.ts
- `scripts/research/pipeline-runner.ts` → call pipeline-pro.ts
- `scripts/lib/pipeline-constants.ts` → remove dead constants
- `scripts/lib/pipeline-cli.ts` → remove dead flags (--layers, --prompts, --unsafe)
- `src/lib/scene-schema.ts` → add hueKey/hueSpeed to animationSchema, remove LayerCandidate
- `src/shaders/layer.frag` → keep hueKey/hueSpeed, remove dead comments
- `src/sketches/layered-psychedelic.ts` → remove unsafe casts for hueKey/hueSpeed

## Phase 7: UPDATE tests

- Delete tests for deleted files
- Update pipeline-layers.test.ts → pipeline-pro.test.ts
- Update research-config.test.ts for pruned axes
- Update pipeline-constants.test.ts for pruned constants
- Keep: scene-generator, replicate-utils, export-layered tests

## Verification

After all changes:
1. `npx vitest run` → all pass
2. `npx tsx scripts/pipeline-pro.ts input.png` → produces same output as pro-pipeline
3. `npx tsx scripts/export-layered.ts --title verify` → video matches reference
