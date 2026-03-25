# Video Blueprint Output Schema v3

Single JSON document. Every field filled. No subjective adjectives.

## Top-Level Structure

```jsonc
{
  "meta": { /* source info */ },
  "canvas": { /* render target */ },
  "palette": { /* exact colors */ },
  "layers": [ /* ordered back-to-front */ ],
  "motion": { /* animation rules */ },
  "constraints": { /* hard rules / prohibitions */ },
  "effects": { /* post-processing effects */ }
}
```

## Section: `meta`

| Field | Type | Description |
|-------|------|-------------|
| `source_file` | string | **Required.** Original video filename |
| `duration_sec` | number | **Required.** Loop duration in seconds |
| `fps` | number | **Required.** Frames per second |
| `loop_type` | enum | **Required.** `"seamless"` / `"cut"` / `"crossfade"` / `"near_seamless"` |
| `loop_point_sec` | number | Optional. Exact loop reset timestamp |
| `loop_mechanism` | string | **Required.** Why the loop is seamless |

## Section: `canvas`

| Field | Type | Description |
|-------|------|-------------|
| `width` | int | **Required.** Pixel width |
| `height` | int | **Required.** Pixel height |
| `aspect_ratio` | string | Optional. e.g. `"1:1"` |
| `coordinate_system` | enum | Optional. `"center_origin"` / `"top_left"` |
| `background_color` | string | **Required.** Hex `"#000000"` |

## Section: `palette`

```jsonc
{
  "colors": [
    { "id": "burg", "hex": "#8B1A1A", "role": "primary_stroke" }
  ],
  "gradient_maps": [
    { "id": "g1", "type": "linear", "stops": [...], "angle_deg": 90 }
  ]
}
```

## Section: `layers`

Array ordered back-to-front. Each layer:

```jsonc
{
  "id": "layer_back",
  "type": "shape_group",
  "blend_mode": "additive",                // normal | additive | alpha | multiply | screen | overlay | add | soft_light
  "opacity": 1.0,
  "depth_attenuation": {                    // depth-varying brightness
    "near": 0.7, "far": 0.15, "curve": "linear"
  },
  "elements": [ /* Element objects */ ]
}
```

### Element Object

```jsonc
{
  "id": "el_back_rects",
  "shape": "rounded_rect",
  "rendering_method": "sdf_stroke",         // sdf_stroke | sdf_fill | sdf_stroke_fill
  "center": [0.5, 0.5],
  "size": [0.8, 0.8],
  "corner_radius": 0.05,
  "rotation_deg": 0,
  "fill": null,
  "stroke": { "color_id": "burg", "width_ratio": 0.013 },
  "glow": {
    "amplitude": 0.30,
    "decay_range": [60, 140],
    "depth_scaling": true
  },
  "repetition": {
    "type": "concentric",
    "count": 10,
    "scale_step": 0.82,
    "rotation_step_deg": 0,
    "color_cycle": ["burg"],
    "color_gradient": {                      // depth color interpolation
      "near": "burg", "far": "burg2"
    },
    "depth_fade": { "start_opacity": 0.7, "end_opacity": 0.15 },
    "stroke_depth": {                        // depth-varying stroke width
      "near_width_ratio": 0.013,
      "far_width_ratio": 0.003
    },
    "paired_shapes": [                       // alternating shape pairs
      { "color_id": "gold", "height_factor": 0.78, "aspect_ratio": 0.58, "corner_radius_ratio": 0.40 },
      { "color_id": "navy", "height_factor": 0.65, "aspect_ratio": 0.58, "corner_radius_ratio": 0.40 }
    ],
    "per_instance_animation": {              // per-instance variable speed
      "property": "rotation_deg",            // or "zoom_inward"
      "motion_type": "per_instance",         // per_instance | shared_phase
      "method": "index_scroll",              // for zoom: index_scroll | scale_animate
      "speed_formula": "linear",             // linear | geometric | exponential
      "base_speed_half_turns_per_loop": 1,
      "speed_step_per_instance": 1,
      "speed_ratio_per_instance": null,
      "speed_exponent": null,
      "cycles_per_loop": 4,
      "base_exponent": 0.82,
      "disappear_at_scale": 0.003
    }
  }
}
```

### Shape Types

`circle` | `ellipse` | `rect` | `rounded_rect` | `line` | `arc` | `polygon` | `path` | `ring`

## Section: `motion`

```jsonc
{
  "global_time_sec": 4.0,
  "easing_default": "linear",
  "animations": [
    {
      "target_id": "el_0",
      "property": "rotation_deg",   // or "zoom_inward", "scale", "opacity"
      "keyframes": [
        { "t": 0.0, "value": 0 },
        { "t": 1.0, "value": 360 }
      ],
      "easing": "linear",
      "loop": "repeat"
    }
  ]
}
```

## Section: `effects`

Post-processing effects applied after layer compositing:

```jsonc
{
  "effects": {
    "glow": {
      "enabled": true,
      "per_layer": true,
      "note": "glow params in each layer's elements[].glow"
    },
    "breathing": {
      "enabled": true,
      "amplitude": 0.012,
      "period_ratio": 0.5
    },
    "chromatic_aberration": {
      "enabled": true,
      "max_shift_ratio": 0.006,
      "radial": true
    },
    "grain": {
      "enabled": true,
      "intensity": 0.02,
      "frame_rate": 24,
      "looped": true
    },
    "vignette": {
      "enabled": true,
      "start_radius": 0.7,
      "edge_color": "#111111",
      "opacity": 0.85,
      "method": "multiply"
    }
  }
}
```

## Section: `constraints`

```jsonc
{
  "spatial": { "dimension": "2d_flat", "perspective": false, "camera_movement": false },
  "style": { "texture": "none", "glow": false, "blur": false },
  "composition": { "symmetry": "bilateral_xy", "alignment": "center" },
  "prohibitions": ["no particle systems", "no text or UI elements"]
}
```

## Validation Checklist

1. Every `color_id` exists in `palette.colors`
2. Every `target_id` in `motion.animations` exists in `layers[].elements[]`
3. All normalized values in [0, 1]
4. `keyframes` have >= 2 entries, first t=0, last t=1
5. No subjective adjectives
6. `effects` section present when effects detected
7. `blend_mode` specified per layer
8. `depth_attenuation` present when depth-varying brightness detected
9. `per_instance_animation` present when per-instance motion detected