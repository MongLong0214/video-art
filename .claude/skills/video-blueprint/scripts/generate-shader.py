#!/usr/bin/env python3
"""
Generate GLSL fragment shader from blueprint.json via Jinja2 template.

Phase E Step 1: Renders the deterministic skeleton (uniforms, SDF lib, main structure).
Layer body blocks are placeholders for Claude to fill in Phase E Step 2.

Usage:
  python3 generate-shader.py <blueprint.json> [--output <name>.frag]

Dependencies: jinja2
"""

import argparse
import json
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader


TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"


def hex_to_glsl(hex_color: str) -> str:
    """Convert #RRGGBB to GLSL vec3(r, g, b) values string."""
    h = hex_color.lstrip("#")
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    return f"{r:.3f}, {g:.3f}, {b:.3f}"


def prepare_template_context(blueprint: dict) -> dict:
    """Convert blueprint.json into Jinja2 template context."""
    canvas = blueprint.get("canvas", {})
    palette_raw = blueprint.get("palette", {}).get("colors", [])
    layers_raw = blueprint.get("layers", [])
    effects = blueprint.get("effects", {})
    meta = blueprint.get("meta", {})
    motion = blueprint.get("motion", {})

    # Palette → template vars
    palette = []
    bg_hex = canvas.get("background_color", "#000000")
    for c in palette_raw:
        h = c["hex"].lstrip("#")
        palette.append({
            "id": c["id"],
            "r": round(int(h[0:2], 16) / 255.0, 3),
            "g": round(int(h[2:4], 16) / 255.0, 3),
            "b": round(int(h[4:6], 16) / 255.0, 3),
        })

    # Layers → simplified for template
    layers = []
    for layer in layers_raw:
        for el in layer.get("elements", []):
            rep = el.get("repetition") or {}
            pia = rep.get("per_instance_animation", {})
            layers.append({
                "id": layer["id"],
                "blend_mode": layer.get("blend_mode", "normal"),
                "shape_count": rep.get("count", 1),
                "motion_type": pia.get("motion_type", "static"),
            })

    # Effects
    breathing = effects.get("breathing", {})
    grain = effects.get("grain", {})

    return {
        "loop_dur": round(motion.get("global_time_sec", meta.get("duration_sec", 10.0)), 4),
        "palette": palette,
        "bg_color": f"vec3({hex_to_glsl(bg_hex)})",
        "layers": layers,
        "breathing_enabled": breathing.get("enabled", False),
        "breathing_amplitude": breathing.get("amplitude", 0.012),
        "breathing_period_ratio": breathing.get("period_ratio", 0.5),
        "grain_enabled": grain.get("enabled", False),
        "grain_intensity": grain.get("intensity", 0.02),
    }


def render_layer_body(layer: dict, blueprint: dict) -> str:
    """Generate GLSL code for a single layer's for-loop body.

    This produces deterministic GLSL patterns based on the blueprint layer config.
    For the hybrid approach, this provides the base patterns that Claude can refine.
    """
    elements = layer.get("elements", [])
    if not elements:
        return "  // empty layer\n"

    el = elements[0]
    rep = el.get("repetition") or {}
    pia = rep.get("per_instance_animation", {})
    blend_mode = layer.get("blend_mode", "normal")
    depth_att = layer.get("depth_attenuation", {})
    glow_cfg = el.get("glow", {})
    stroke_depth = rep.get("stroke_depth", {})
    count = rep.get("count", 1)
    scale_step = rep.get("scale_step", 0.82)
    motion = blueprint.get("motion", {})
    loop_dur = motion.get("global_time_sec", blueprint.get("meta", {}).get("duration_sec", 10.0))

    lines = []
    lines.append(f"  for (int i = 0; i < {count}; i++) {{")
    lines.append(f"    float fi = float(i);")
    lines.append(f"    float ratio = fi / {count - 1}.0;")

    # Motion pattern
    motion_type = pia.get("motion_type", "static")
    prop = pia.get("property", "")

    if motion_type == "per_instance" and prop == "rotation_deg":
        formula = pia.get("speed_formula", "linear")
        base = pia.get("base_speed_half_turns_per_loop", 1)
        step = pia.get("speed_step_per_instance", 1)
        if formula == "linear":
            lines.append(f"    float halfTurns = fi * {step}.0 + {base}.0;")
        elif formula == "geometric":
            ratio_val = pia.get("speed_ratio_per_instance", 2.0)
            lines.append(f"    float halfTurns = {base}.0 * pow({ratio_val}, fi);")
        else:
            lines.append(f"    float halfTurns = fi + 1.0;")
        lines.append(f"    float angle = -lt * PI * halfTurns / LOOP_DUR;")
        lines.append(f"    float bScale = {scale_step:.4f};")
        lines.append(f"    float scale = pow(bScale, fi) * breathe;")
    elif motion_type == "shared_phase" and prop == "zoom_inward":
        method = pia.get("method", "index_scroll")
        cycles = pia.get("cycles_per_loop", 4)
        base_exp = pia.get("base_exponent", scale_step)
        lines.append(f"    float zoomPhase = fract(lt * {cycles}.0 / LOOP_DUR);")
        lines.append(f"    float idx = fi + zoomPhase;")
        lines.append(f"    float scale = pow({base_exp}, idx) * breathe;")
        lines.append(f"    if (scale < 0.003) continue;")
    else:
        lines.append(f"    float scale = pow({scale_step}, fi) * breathe;")

    # Shape SDF
    lines.append(f"    float h = scale * 0.78;")
    lines.append(f"    float d = sdRoundedBox(uv, vec2(h * 0.58, h), h * 0.40);")

    # Stroke rendering with depth-varying width
    near_w = stroke_depth.get("near_width_ratio", 0.009)
    far_w = stroke_depth.get("far_width_ratio", 0.002)
    lines.append(f"    float thick = mix({near_w}, {far_w}, ratio);")
    lines.append(f"    float line = smoothstep(thick + 0.001, thick - 0.0005, abs(d));")

    # Glow
    if glow_cfg.get("amplitude"):
        amp = glow_cfg["amplitude"]
        decay = glow_cfg.get("decay_range", [80, 180])
        lines.append(f"    float glow = exp(-abs(d) * mix({decay[0]}.0, {decay[1]}.0, ratio)) * {amp};")
    else:
        lines.append(f"    float glow = 0.0;")

    # Depth attenuation
    near_att = depth_att.get("near", 1.0)
    far_att = depth_att.get("far", 0.1)
    lines.append(f"    float depthFade = mix({near_att}, {far_att}, ratio);")

    # Color + blend
    blend_op = "col +=" if blend_mode == "additive" else "col = mix(col,"
    lines.append(f"    vec3 shapeCol = vec3(0.5);  // placeholder — Claude fills actual palette color")
    if blend_mode == "additive":
        lines.append(f"    col += shapeCol * (line * 1.1 + glow) * depthFade;")
    else:
        lines.append(f"    col = mix(col, shapeCol, line * depthFade);")

    lines.append(f"  }}")
    return "\n".join(lines) + "\n"


def render_shader(blueprint: dict) -> str:
    """Render GLSL shader from blueprint using Jinja2 template."""
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        keep_trailing_newline=True,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    template = env.get_template("shader.frag.j2")
    ctx = prepare_template_context(blueprint)
    return template.render(**ctx)


def main():
    parser = argparse.ArgumentParser(description="Generate GLSL shader from blueprint")
    parser.add_argument("blueprint", help="Path to blueprint.json")
    parser.add_argument("--output", "-o", help="Output .frag file path")
    args = parser.parse_args()

    with open(args.blueprint) as f:
        bp = json.load(f)

    shader_code = render_shader(bp)

    if args.output:
        out_path = Path(args.output)
    else:
        name = Path(args.blueprint).stem.replace("-blueprint", "").replace("blueprint", "generated")
        out_path = Path(f"src/shaders/{name}.frag")

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        f.write(shader_code)

    print(f"Generated: {out_path} ({len(shader_code)} chars)")


if __name__ == "__main__":
    main()