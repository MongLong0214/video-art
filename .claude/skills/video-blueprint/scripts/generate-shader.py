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
import re
import sys
from pathlib import Path

from jinja2 import Environment, FileSystemLoader


TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
_HEX_RE = re.compile(r'^#?[0-9a-fA-F]{6}$')
_ID_RE = re.compile(r'^[a-zA-Z0-9_]+$')


def hex_to_glsl(hex_color: str) -> str:
    """Convert #RRGGBB to GLSL vec3(r, g, b) values string."""
    if not _HEX_RE.match(hex_color):
        print(f"Warning: invalid hex color '{hex_color}', using black", file=sys.stderr)
        return "0.000, 0.000, 0.000"
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
        cid = c["id"]
        if not _ID_RE.match(cid):
            print(f"Warning: invalid palette id '{cid}', sanitizing", file=sys.stderr)
            cid = re.sub(r'[^a-zA-Z0-9_]', '_', cid)
        hex_val = c["hex"]
        if not _HEX_RE.match(hex_val):
            print(f"Warning: invalid hex '{hex_val}' for palette id '{cid}', using black", file=sys.stderr)
            hex_val = "#000000"
        h = hex_val.lstrip("#")
        palette.append({
            "id": cid,
            "r": round(int(h[0:2], 16) / 255.0, 3),
            "g": round(int(h[2:4], 16) / 255.0, 3),
            "b": round(int(h[4:6], 16) / 255.0, 3),
        })

    # Layers → simplified for template (one entry per element, tracks source layer)
    layers = []
    for li, layer in enumerate(layers_raw):
        for el in layer.get("elements", []):
            rep = el.get("repetition") or {}
            pia = rep.get("per_instance_animation", {})
            layers.append({
                "id": layer["id"],
                "blend_mode": layer.get("blend_mode", "normal"),
                "shape_count": rep.get("count", 1),
                "motion_type": pia.get("motion_type", "static"),
                "_layer_index": li,
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


def _sdf_call(shape_type: str, uv_var: str, size: list, corner_radius: float) -> str:
    """Generate the appropriate SDF call based on shape type."""
    w = size[0] * 0.5 if len(size) >= 1 else 0.5
    h = size[1] * 0.5 if len(size) >= 2 else w
    if shape_type == "circle":
        return f"sdCircle({uv_var}, scale * {w:.4f})"
    if shape_type == "ellipse":
        return f"length({uv_var} / (scale * vec2({w:.4f}, {h:.4f}))) - 1.0"
    if shape_type == "rect":
        return f"sdRoundedBox({uv_var}, scale * vec2({w:.4f}, {h:.4f}), 0.0)"
    # rounded_rect (default)
    cr = corner_radius if corner_radius > 0 else 0.1
    return f"sdRoundedBox({uv_var}, scale * vec2({w:.4f}, {h:.4f}), scale * {cr:.4f})"


def render_layer_body(layer: dict, blueprint: dict) -> str:
    """Generate GLSL code for a single layer's for-loop body.

    Uses actual blueprint data: palette colors, element geometry, shape type,
    color_cycle, color_gradient, and per-instance animation config.
    Claude refines the output in Phase E Step 2.
    """
    elements = layer.get("elements", [])
    if not elements:
        return "  // empty layer\n"

    el = elements[0]
    rep = el.get("repetition") or {}
    pia = rep.get("per_instance_animation", {})
    blend_mode = layer.get("blend_mode", "normal")
    depth_att = layer.get("depth_attenuation", {})
    glow_cfg = el.get("glow") or {}
    stroke_depth = rep.get("stroke_depth", {})
    count = rep.get("count", 1)
    scale_step = rep.get("scale_step", 0.82)
    motion = blueprint.get("motion", {})

    # Extract element geometry from blueprint
    shape_type = el.get("shape", "rounded_rect")
    el_size = el.get("size", [0.58, 1.0])
    el_corner_radius = el.get("corner_radius", 0.35)

    # Extract color config
    stroke_color_id = (el.get("stroke") or {}).get("color_id")
    fill_color_id = el.get("fill") if isinstance(el.get("fill"), str) else None
    primary_color_id = stroke_color_id or fill_color_id
    color_cycle = rep.get("color_cycle", [])
    color_gradient = rep.get("color_gradient", {})

    lines = []
    lines.append(f"  for (int i = 0; i < {count}; i++) {{")
    lines.append(f"    float fi = float(i);")
    lines.append(f"    float ratio = fi / {max(count - 1, 1)}.0;")

    # ── Motion pattern ──
    motion_type = pia.get("motion_type", "static")
    prop = pia.get("property", "")
    has_rotation = motion_type == "per_instance" and prop == "rotation_deg"

    if has_rotation:
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
        lines.append(f"    vec2 rP = rot(angle) * uv;")
        lines.append(f"    float scale = pow({scale_step:.4f}, fi) * breathe;")
    elif motion_type == "shared_phase" and prop == "zoom_inward":
        cycles = pia.get("cycles_per_loop", 4)
        base_exp = pia.get("base_exponent", scale_step)
        disappear = pia.get("disappear_at_scale", 0.003)
        lines.append(f"    float zoomPhase = fract(lt * {cycles}.0 / LOOP_DUR);")
        lines.append(f"    float idx = fi + zoomPhase;")
        lines.append(f"    float scale = pow({base_exp}, idx) * breathe;")
        lines.append(f"    if (scale < {disappear}) continue;")
        lines.append(f"    vec2 rP = uv;")
    else:
        lines.append(f"    float scale = pow({scale_step:.4f}, fi) * breathe;")
        lines.append(f"    vec2 rP = uv;")

    # ── Shape SDF (uses actual blueprint geometry) ──
    sdf = _sdf_call(shape_type, "rP", el_size, el_corner_radius)
    lines.append(f"    float d = {sdf};")

    # ── Stroke rendering with depth-varying width ──
    near_w = stroke_depth.get("near_width_ratio", (el.get("stroke") or {}).get("width_ratio", 0.009))
    far_w = stroke_depth.get("far_width_ratio", near_w * 0.3)
    lines.append(f"    float thick = mix({near_w}, {far_w}, ratio);")
    lines.append(f"    float line = smoothstep(thick + 0.001, thick - 0.0005, abs(d));")

    # ── Glow ──
    if glow_cfg.get("amplitude"):
        amp = glow_cfg["amplitude"]
        decay = glow_cfg.get("decay_range", [80, 180])
        if len(decay) < 2:
            decay = [decay[0], decay[0] * 2] if decay else [80, 180]
        lines.append(f"    float glow = exp(-abs(d) * mix({decay[0]}.0, {decay[1]}.0, ratio)) * {amp};")
    else:
        lines.append(f"    float glow = 0.0;")

    # ── Depth attenuation ──
    near_att = depth_att.get("near", 1.0)
    far_att = depth_att.get("far", 0.1)
    lines.append(f"    float depthFade = mix({near_att}, {far_att}, ratio);")

    # ── Color (uses actual palette) ──
    if color_cycle and len(color_cycle) > 1:
        # Multi-color cycling: generate if-chain (no switch per project conventions)
        lines.append(f"    int colorIdx = int(fi) - int(fi / {len(color_cycle)}.0) * {len(color_cycle)};")
        lines.append(f"    vec3 shapeCol = vec3(0.0);")
        for ci, cid in enumerate(color_cycle):
            if not _ID_RE.match(str(cid)):
                cid = re.sub(r'[^a-zA-Z0-9_]', '_', str(cid))
            prefix = "    if" if ci == 0 else "    else if"
            lines.append(f"{prefix} (colorIdx == {ci}) shapeCol = {cid};")
        lines.append(f"    else shapeCol = {color_cycle[0]};")
    elif color_gradient.get("near") and color_gradient.get("far"):
        near_id = color_gradient["near"]
        far_id = color_gradient["far"]
        lines.append(f"    vec3 shapeCol = mix({near_id}, {far_id}, ratio);")
    elif primary_color_id:
        lines.append(f"    vec3 shapeCol = {primary_color_id};")
    else:
        lines.append(f"    vec3 shapeCol = vec3(0.5);  // no color specified in blueprint")

    # ── Blend ──
    if blend_mode == "additive":
        lines.append(f"    col += shapeCol * (line * 1.1 + glow) * depthFade;")
    else:
        lines.append(f"    col = mix(col, shapeCol, line * depthFade);")

    lines.append(f"  }}")

    # E12: Unknown effects warnings
    unknown = blueprint.get("effects", {}).get("unknown_effects", [])
    if unknown:
        print(f"Warning: {len(unknown)} unsupported effect(s) in blueprint. Manual shader code needed.", file=sys.stderr)
        for eff in unknown:
            name = re.sub(r'[^a-zA-Z0-9_ ]', '', str(eff.get("name", eff) if isinstance(eff, dict) else eff))
            lines.append(f"  // TODO: Unsupported effect '{name}' — manual implementation required")

    return "\n".join(lines) + "\n"


def render_shader(blueprint: dict) -> str:
    """Render GLSL shader from blueprint using Jinja2 template.

    Layer body blocks are generated deterministically and injected into
    the template context. Claude refines these in Phase E Step 2.
    """
    env = Environment(
        loader=FileSystemLoader(str(TEMPLATES_DIR)),
        keep_trailing_newline=True,
        trim_blocks=True,
        lstrip_blocks=True,
    )
    template = env.get_template("shader.frag.j2")
    ctx = prepare_template_context(blueprint)

    # Generate layer bodies — use tracked _layer_index to map elements to source layers
    layers_raw = blueprint.get("layers", [])
    for layer_ctx in ctx["layers"]:
        li = layer_ctx.get("_layer_index", 0)
        if li < len(layers_raw):
            layer_ctx["body"] = render_layer_body(layers_raw[li], blueprint)
        else:
            layer_ctx["body"] = "  // empty layer\n"

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
        out_path = Path(args.output).resolve()
    else:
        name = Path(args.blueprint).stem.replace("-blueprint", "").replace("blueprint", "generated")
        out_path = Path(f"src/shaders/{name}.frag").resolve()

    # PRD §6: path containment check
    cwd = Path.cwd().resolve()
    if not str(out_path).startswith(str(cwd)):
        print(f"Error: output path {out_path} escapes project root {cwd}", file=sys.stderr)
        sys.exit(1)

    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w") as f:
        f.write(shader_code)

    print(f"Generated: {out_path} ({len(shader_code)} chars)")


if __name__ == "__main__":
    main()