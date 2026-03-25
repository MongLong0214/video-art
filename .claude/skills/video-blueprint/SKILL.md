---
name: video-blueprint
description: v3 geometric loop analyzer + code generator. Extracts multi-layer blueprints from looping video art (per-instance motion, depth-varying properties, effects) and generates GLSL+Three.js code via hybrid pipeline.
---

# Video Blueprint Extractor v3

Convert looping video art into multi-layer geometric blueprints and runnable shader code.

**Core principle**: Scripts measure, Claude interprets, templates scaffold, Claude writes layer bodies.

## Dependencies

```bash
pip install -r .claude/skills/video-blueprint/requirements.txt
# Optional (may fail on macOS ARM)
pip install decord
```

System: `ffmpeg` >= 4.0, `ffprobe`. Node: `puppeteer`, `three` (existing deps).

## Phase A: Frame Extraction + Loop Detection

```bash
python3 .claude/skills/video-blueprint/scripts/extract-frames.py <video_path> \
  --frames 24 --detect-loop --hi-res-pairs 3 --out-dir ./out/blueprints/_work
```

Read `./out/blueprints/_work/meta.json` for resolution, fps, duration, loop_point_sec, seam_ssim, motion_magnitude. Hi-res consecutive pairs are saved at 0%, 33%, 66% of the loop for Claude's visual inspection in Phase C — they are not used by the analysis scripts.

If `meta.json` shows `loop_type: "cut"`, the video does not seamlessly loop. Consider trimming to a looping segment before proceeding, or continue with caution and note the limitation in the blueprint's `meta.loop_mechanism` field.

## Phase B: Computational Analysis

Run scripts in any order. Colors and layers are independent — analyze-layers.py runs its own internal color clustering and does NOT read colors.json. Geometry and motion can run in parallel with layers.

```bash
# 1. Color palette (CIELAB clustering + deltaE2000)
python3 .claude/skills/video-blueprint/scripts/analyze-colors.py ./out/blueprints/_work --top 12

# 2. Layer decomposition (independent — runs its own clustering, not colors.json)
python3 .claude/skills/video-blueprint/scripts/analyze-layers.py ./out/blueprints/_work

# 3+4. Parallel with step 2
python3 .claude/skills/video-blueprint/scripts/analyze-geometry.py ./out/blueprints/_work
python3 .claude/skills/video-blueprint/scripts/analyze-motion.py ./out/blueprints/_work
```

Outputs: `colors.json`, `layers.json`, `geometry.json`, `motion.json`.

`analyze-layers.py` performs: color-mask layer separation, per-instance shape tracking (contour centroid+area matching), per-instance rotation speed measurement, index-scroll zoom detection, depth-varying property detection (stroke, opacity, color gradient), effect detection (glow, breathing, chromatic aberration, grain, vignette).

## Phase C: Claude Visual Verification

Read 3 representative frames + all 4 Phase B JSON files. Cross-validate computational results against visual evidence:

1. **Layer separation**: Confirm layers.json split matches visual groupings. Check blend_mode (additive vs alpha).
2. **Per-instance motion**: Verify rotation speed progression or zoom direction against frame-to-frame changes.
3. **Depth properties**: Confirm stroke thinning, opacity fade, color gradient visible in frames.
4. **Effects**: Verify detected glow/breathing/CA/grain against visual appearance.
5. **Correct misclassifications**: Fix any wrong motion_type, missing layers, or phantom detections.

Output: validated/corrected layers.json. This manual visual review step ensures computational analysis matches reality.

## Phase D: Blueprint Assembly

Assemble `blueprint.json` (v3 schema) per [references/output-schema.md](references/output-schema.md).

Data source priority: meta.json -> canvas, colors.json -> palette, layers.json -> layers (blend_mode, depth_attenuation, per_instance_animation, paired_shapes, stroke_depth, effects), geometry.json -> element dimensions, motion.json -> global timing.

Assembly rules:
- Use canonical_palette hex exactly (no rounding)
- Use layers.json structure as the primary layer/element source
- Merge geometry.json measurements for dimensions and corner_radius
- Include `effects` section from layers.json detections
- Validate with: `python3 .claude/skills/video-blueprint/scripts/validate-blueprint.py ./blueprint.json`

## Phase E: Code Generation (Hybrid)

**Step 1** -- Jinja2 skeleton:
```bash
python3 .claude/skills/video-blueprint/scripts/generate-shader.py ./blueprint.json --output ./src/shaders/{name}.frag
python3 .claude/skills/video-blueprint/scripts/generate-sketch.py ./blueprint.json --output-dir ./src/sketches/
```

Generates: uniforms, main() structure, SDF library. If effects are enabled, generates a post-processing shader stub and main.ts wiring hints (Claude completes EffectComposer integration in Step 2).

**Step 2** -- Claude writes layer bodies: Read blueprint.json + skeleton output. Write the per-layer loop body (rotation, zoom, depth attenuation, glow), blend logic, and effect parameter tuning. Reference [references/shader-patterns.md](references/shader-patterns.md) for GLSL patterns.

**Step 3** -- Patch main.ts: Add dynamic import for the new sketch mode.

## Phase F: Verification

**Step 1** -- Capture rendered frames via Puppeteer:

> Note: `scripts/capture-rendered.ts` is not yet implemented. Until it exists, capture frames manually using the browser dev console or a screen recorder, saving PNGs to `./out/blueprints/_rendered/` at the same frame count used in Phase A.

```bash
# Placeholder — not yet available:
# npx tsx scripts/capture-rendered.ts --mode <name> --frames 24 --fps 60 \
#   --loop-dur <seconds> --out-dir ./out/blueprints/_rendered
```

**Step 2** -- Compare original vs rendered:
```bash
python3 .claude/skills/video-blueprint/scripts/verify-output.py \
  --original-dir ./out/blueprints/_work \
  --rendered-dir ./out/blueprints/_rendered \
  --threshold 0.85 \
  --output ./out/blueprints/verification-report.json
```

Compares original vs rendered frames using:
- Windowed SSIM (scikit-image structural_similarity) -- target >= 0.85
- Contour count matching -- target delta <= 10%
- Palette deltaE2000 -- target < 8 per color

Uses deterministic clock (uTime injection) + gl.finish() for frame-accurate capture.

## Output

Save to `./out/blueprints/{YYYY-MM-DD}_{source-name}/`:
- `blueprint.json` -- v3 schema
- `{name}.frag` + `{name}.ts` -- generated code
- `verification-report.json` -- SSIM + contour + palette scores
- Analysis frames and intermediate JSONs

## Anti-patterns

| DO NOT | DO |
|--------|-----|
| Merge independent motion layers into one | Separate layers by color-mask, verify blend_mode |
| Classify index-scroll zoom as rotation | Check for scale progression pattern in consecutive frames |
| Assume alpha blending | Detect additive/multiply from pixel overshoot analysis |
| Ignore depth-varying properties | Measure stroke/opacity/color at near vs far instances |
| Estimate hex values visually | Use colors.json canonical_palette exact hex |
| Guess shape count | Use geometry.json contours / 2 for stroke shapes |
| Skip Phase C visual verification | Always cross-validate scripts against frames |
| Write entire shader manually | Use hybrid: Jinja2 skeleton + Claude layer bodies |
| Trust scripts blindly on motion type | Cross-validate rotation vs zoom vs spiral classification |
| Hardcode effect parameters | Extract from layers.json detection, verify in Phase C |