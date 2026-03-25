# Analysis Workflow -- Detailed Procedures

## Layer Decomposition (analyze-layers.py)

The layer analysis script separates the video into independent motion layers using color-mask segmentation:

1. **Color-mask creation**: For each palette cluster from colors.json, create a binary mask using CIELAB deltaE2000 <= 15 threshold. Apply morphological erosion to remove anti-aliasing boundaries.
2. **Layer grouping**: Group color masks that share the same motion pattern into a single layer. Each layer gets an independent blend_mode (additive/alpha/multiply).
3. **Per-instance tracking**: Within each layer, track individual shapes across consecutive frames using contour centroid+area matching. Assign stable IDs to each instance.
4. **Motion classification per instance**: Measure rotation, scale change, and translation per instance per frame pair. Classify as: static, rotation (per-instance speed), zoom_inward (index-scroll), or spiral.
5. **Depth-varying property detection**: Compare near (large/outer) vs far (small/inner) instances for stroke width, opacity, color shift, and glow decay.
6. **Effect detection**: Analyze border zones and temporal variations for glow, breathing, chromatic aberration, grain, and vignette.

### Layer Verification Checklist

| Property | How to verify |
|----------|--------------|
| Layer count | Color masks should produce distinct non-overlapping regions |
| Blend mode | Check pixel values at overlap: values > 1.0 = additive |
| Per-instance speed | Plot rotation vs instance index: linear/geometric/exponential fit |
| Zoom type | If scale progression follows pow(base, index + phase): index_scroll |
| Depth attenuation | Compare brightness at near vs far instances |

## Color Analysis Deep Dive

### When Script Output Needs Visual Verification

The `analyze-colors.py` script clusters pixel colors algorithmically. Verify against frames when:

1. **Background color**: Script reports highest-percentage color. Visually confirm it fills the entire background.
2. **Stroke vs fill colors**: Cross-check `role_hint` -- "distributed_stroke" should appear along shape edges, not as fill.
3. **Similar dark colors**: Script may merge colors within RGB distance 25. If the video has multiple dark tones, verify these are distinct palette entries.
4. **Gradients**: If `spatial_distribution.mean_radial_distance` varies smoothly, it may be a gradient rather than a flat color.

### Precise Hex Extraction Procedure

When script output is ambiguous:

1. Read a frame image into context
2. Identify a clear, un-aliased region of the color
3. Cross-reference with the script's `canonical_palette` -- script hex is more accurate than visual estimation
4. If script reports a color at < 5% coverage, it may be an AA artifact

## Geometry Analysis Deep Dive

### Interpreting Contour Results

OpenCV contour detection may produce more shapes than visually apparent:
- Each stroke has inner and outer edges -> 2 contours per shape
- Anti-aliased edges create thin intermediate contours

**Correct interpretation**: Divide raw contour count by 2 for stroke-only shapes. Filter by `area_normalized > 0.001`.

### Scale Ratio and Rotation Step

- `mean_scale_ratio`: use for blueprint repetition.scale_step
- `scale_ratio_std` < 0.02: highly consistent (use mean)
- `mean_rotation_step_deg`: angular offset between consecutive shapes
- If `rotation_step_std_deg` > 2 degrees: rotation may not be uniform

## Motion Analysis Deep Dive

### Rotation Detection Methods

Two methods; prefer `affine` but cross-check with `phase_correlation`:

1. **ORB + Affine**: Feature-point matching. Check `inlier_ratio` > 0.5.
2. **Phase Correlation**: Frequency-domain. Check `confidence` > 5.0.

### Computing Total Loop Rotation

1. Sum `rotation_deg` across consecutive frame pairs
2. Scale to full loop: `total_rotation * (loop_duration / extracted_duration)`
3. For seamless loops, total rotation is typically a multiple of (360 / N) where N relates to pattern symmetry

## Cross-Validation Checklist

| Measurement | Source 1 | Source 2 | Max Deviation |
|-------------|----------|----------|---------------|
| Shape count | geometry.json contours / 2 | Visual count from frame | +/- 1 |
| Scale ratio | geometry.json `mean_scale_ratio` | Visual measurement | +/- 0.03 |
| Layer count | layers.json | Visual inspection | 0 |
| Per-instance speed | layers.json speed array | Frame-to-frame rotation measurement | +/- 5% |
| Stroke width | colors.json `stroke_summary` | geometry.json `stroke_measurement` | +/- 2px |
| Color hex | colors.json `canonical_palette` | Visual sample | +/- #101010 per channel |

## Edge Cases

### Very Dark or Low-Contrast Videos
- Increase `--sample-density 1024` for color analysis
- Lower k-means cluster count (`--top 6`)

### Overlapping Layer Colors
- Use morphological operations to separate touching regions
- Fall back to motion-based separation if color masks overlap significantly

### Non-Uniform Motion
- Check if `per_frame_deg` values vary significantly
- Map acceleration curve via keyframes rather than linear interpolation