#!/usr/bin/env python3
"""
Validate a blueprint.json against the output schema.

Checks: referential integrity, value ranges, required fields,
subjective language, keyframe completeness.

Usage:
  python validate-blueprint.py <blueprint.json>

Dependencies: none (stdlib only)
"""

import json
import re
import sys
from pathlib import Path


SUBJECTIVE_WORDS = [
    "dreamy", "psychedelic", "vibrant", "organic", "flowing", "ethereal",
    "mystical", "cosmic", "futuristic", "retro", "vintage",
    "cyberpunk", "vaporwave", "glitch", "trippy", "beautiful", "stunning",
    "gorgeous", "mesmerizing", "hypnotic", "surreal", "dynamic",
    "gentle", "harsh", "bold", "delicate", "vivid", "moody",
]

REQUIRED_SECTIONS = ["meta", "canvas", "palette", "layers", "motion", "constraints"]

VALID_SHAPES = ["circle", "ellipse", "rect", "rounded_rect", "line", "arc", "polygon", "path", "ring"]
VALID_BLEND_MODES = ["normal", "multiply", "screen", "overlay", "add", "soft_light", "additive", "alpha"]
VALID_RENDERING_METHODS = ["sdf_stroke", "sdf_fill", "sdf_stroke_fill"]
VALID_SPEED_FORMULAS = ["linear", "geometric", "exponential"]
VALID_ZOOM_METHODS = ["index_scroll", "scale_animate"]
VALID_MOTION_TYPES = ["per_instance", "shared_phase"]
VALID_LOOP_TYPES = ["seamless", "cut", "crossfade", "near_seamless"]
VALID_MOTION_CHARS = ["static", "subtle_drift", "pulse", "continuous_rotate", "wave", "spiral", "drift"]
VALID_REPETITION_TYPES = ["concentric", "grid", "radial", "linear"]
VALID_EASING = ["linear", "ease_in", "ease_out", "ease_in_out"]
VALID_LOOP_MODES = ["repeat", "pingpong", "once"]


class ValidationResult:
    def __init__(self):
        self.errors = []
        self.warnings = []
        self.info = []

    def error(self, msg: str):
        self.errors.append(f"ERROR: {msg}")

    def warn(self, msg: str):
        self.warnings.append(f"WARN: {msg}")

    def note(self, msg: str):
        self.info.append(f"INFO: {msg}")

    @property
    def is_valid(self):
        return len(self.errors) == 0

    def summary(self) -> str:
        lines = []
        for e in self.errors:
            lines.append(f"  ✗ {e}")
        for w in self.warnings:
            lines.append(f"  ⚠ {w}")
        for i in self.info:
            lines.append(f"  ℹ {i}")
        status = "PASS" if self.is_valid else "FAIL"
        lines.insert(0, f"\n{'='*50}")
        lines.insert(1, f"Validation: {status} ({len(self.errors)} errors, {len(self.warnings)} warnings)")
        lines.insert(2, f"{'='*50}")
        return "\n".join(lines)


def validate(bp: dict) -> ValidationResult:
    r = ValidationResult()

    # 1. Required sections
    for section in REQUIRED_SECTIONS:
        if section not in bp:
            r.error(f"Missing required section: {section}")

    if not r.is_valid:
        return r

    # 2. Meta validation
    meta = bp["meta"]
    for field in ["source_file", "duration_sec", "fps", "loop_type", "loop_mechanism"]:
        if field not in meta:
            r.error(f"meta.{field} is required")
    if meta.get("loop_type") and meta["loop_type"] not in VALID_LOOP_TYPES:
        r.warn(f"meta.loop_type '{meta['loop_type']}' not in standard values: {VALID_LOOP_TYPES}")
    if meta.get("duration_sec", 0) <= 0:
        r.error("meta.duration_sec must be positive")
    if meta.get("fps", 0) <= 0:
        r.error("meta.fps must be positive")

    # 3. Canvas validation
    canvas = bp["canvas"]
    for field in ["width", "height", "background_color"]:
        if field not in canvas:
            r.error(f"canvas.{field} is required")
    if canvas.get("width", 0) <= 0 or canvas.get("height", 0) <= 0:
        r.error("canvas dimensions must be positive")
    bg = canvas.get("background_color", "")
    if bg and not re.match(r"^#[0-9A-Fa-f]{6}$", bg):
        r.error(f"canvas.background_color '{bg}' is not a valid hex color")

    # 4. Palette validation
    palette = bp["palette"]
    color_ids = set()
    gradient_ids = set()

    for c in palette.get("colors", []):
        if "id" not in c:
            r.error("palette.colors[]: missing 'id'")
            continue
        if c["id"] in color_ids:
            r.error(f"Duplicate color_id: {c['id']}")
        color_ids.add(c["id"])
        if "hex" not in c:
            r.error(f"palette.colors[{c['id']}]: missing 'hex'")
        elif not re.match(r"^#[0-9A-Fa-f]{6}$", c.get("hex", "")):
            r.error(f"palette.colors[{c['id']}]: invalid hex '{c.get('hex')}'")

    for g in palette.get("gradient_maps", []):
        if "id" not in g:
            r.error("palette.gradient_maps[]: missing 'id'")
            continue
        gradient_ids.add(g["id"])
        for stop in g.get("stops", []):
            pos = stop.get("position", -1)
            if not (0 <= pos <= 1):
                r.error(f"gradient {g['id']}: stop position {pos} out of [0,1]")
            cid = stop.get("color_id", "")
            if cid and cid not in color_ids:
                r.error(f"gradient {g['id']}: stop references unknown color_id '{cid}'")

    all_fill_ids = color_ids | gradient_ids

    # 5. Layer validation
    element_ids = set()
    for layer in bp.get("layers", []):
        if "id" not in layer:
            r.error("layers[]: missing 'id'")
        blend = layer.get("blend_mode", "normal")
        if blend not in VALID_BLEND_MODES:
            r.warn(f"layer {layer.get('id')}: blend_mode '{blend}' not standard")
        opacity = layer.get("opacity", 1.0)
        if not (0 <= opacity <= 1):
            r.error(f"layer {layer.get('id')}: opacity {opacity} out of [0,1]")

        for el in layer.get("elements", []):
            eid = el.get("id", "?")
            if eid in element_ids:
                r.error(f"Duplicate element id: {eid}")
            element_ids.add(eid)

            shape = el.get("shape", "")
            if shape not in VALID_SHAPES:
                r.error(f"element {eid}: unknown shape '{shape}'")

            # Fill reference
            fill = el.get("fill")
            if fill and isinstance(fill, str) and fill not in all_fill_ids:
                r.error(f"element {eid}: fill references unknown id '{fill}'")

            # Stroke reference
            stroke = el.get("stroke")
            if stroke and isinstance(stroke, dict):
                scid = stroke.get("color_id", "")
                if scid and scid not in color_ids:
                    r.error(f"element {eid}: stroke.color_id references unknown '{scid}'")

            # Parent reference
            pid = el.get("parent_id")
            if pid and pid not in element_ids and pid != eid:
                r.warn(f"element {eid}: parent_id '{pid}' not yet seen (may be forward ref)")

            # Normalized values
            center = el.get("center", [])
            if center and (not all(0 <= v <= 1 for v in center)):
                r.warn(f"element {eid}: center {center} has values outside [0,1]")

            size = el.get("size", [])
            if size and (any(v < 0 for v in size)):
                r.error(f"element {eid}: size {size} has negative values")

            # Repetition
            rep = el.get("repetition")
            if rep:
                if rep.get("type") not in VALID_REPETITION_TYPES:
                    r.warn(f"element {eid}: repetition type '{rep.get('type')}' not standard")
                if rep.get("count", 0) <= 0:
                    r.error(f"element {eid}: repetition count must be positive")
                cycle = rep.get("color_cycle", [])
                for cid in cycle:
                    if cid not in color_ids:
                        r.error(f"element {eid}: color_cycle references unknown '{cid}'")

                # v3: per_instance_animation
                pia = rep.get("per_instance_animation")
                if pia:
                    sf = pia.get("speed_formula")
                    if sf and sf not in VALID_SPEED_FORMULAS:
                        r.warn(f"element {eid}: speed_formula '{sf}' not in {VALID_SPEED_FORMULAS}")
                    mt = pia.get("motion_type")
                    if mt and mt not in VALID_MOTION_TYPES:
                        r.warn(f"element {eid}: motion_type '{mt}' not in {VALID_MOTION_TYPES}")
                    zm = pia.get("method")
                    if zm and zm not in VALID_ZOOM_METHODS:
                        r.warn(f"element {eid}: zoom method '{zm}' not in {VALID_ZOOM_METHODS}")

                # v3: color_gradient refs
                cg = rep.get("color_gradient")
                if cg:
                    for key in ("near", "far"):
                        cref = cg.get(key, "")
                        if cref and cref not in color_ids:
                            r.error(f"element {eid}: color_gradient.{key} references unknown '{cref}'")

                # v3: paired_shapes refs
                ps = rep.get("paired_shapes", [])
                for p in ps:
                    pcid = p.get("color_id", "")
                    if pcid and pcid not in color_ids:
                        r.error(f"element {eid}: paired_shapes color_id references unknown '{pcid}'")

            # v3: rendering_method
            rm = el.get("rendering_method")
            if rm and rm not in VALID_RENDERING_METHODS:
                r.warn(f"element {eid}: rendering_method '{rm}' not in {VALID_RENDERING_METHODS}")

        # v3: depth_attenuation
        da = layer.get("depth_attenuation")
        if da:
            near_val = da.get("near", 1.0)
            far_val = da.get("far", 0.0)
            if near_val < far_val:
                r.warn(f"layer {layer.get('id')}: depth_attenuation near ({near_val}) < far ({far_val}) — near should be brighter")

    # 5b. Effects validation (v3)
    effects = bp.get("effects")
    if effects:
        for eff_name, eff_val in effects.items():
            if isinstance(eff_val, dict):
                if "enabled" in eff_val and not isinstance(eff_val["enabled"], bool):
                    r.error(f"effects.{eff_name}.enabled must be boolean")

    # 6. Motion validation
    motion = bp["motion"]
    if "global_time_sec" not in motion:
        r.error("motion.global_time_sec is required")
    elif motion["global_time_sec"] <= 0:
        r.error("motion.global_time_sec must be positive")

    for anim in motion.get("animations", []):
        tid = anim.get("target_id", "?")
        if tid not in element_ids:
            r.error(f"motion animation: target_id '{tid}' not found in elements")

        kfs = anim.get("keyframes", [])
        if len(kfs) < 2:
            r.error(f"motion animation [{tid}]: needs at least 2 keyframes")
        else:
            if kfs[0].get("t") != 0:
                r.error(f"motion animation [{tid}]: first keyframe t must be 0, got {kfs[0].get('t')}")
            if kfs[-1].get("t") != 1:
                r.error(f"motion animation [{tid}]: last keyframe t must be 1, got {kfs[-1].get('t')}")

            # Check t values are monotonically increasing
            ts = [kf.get("t", 0) for kf in kfs]
            for i in range(1, len(ts)):
                if ts[i] <= ts[i-1]:
                    r.error(f"motion animation [{tid}]: keyframe t values not monotonically increasing")
                    break

        easing = anim.get("easing", "linear")
        if easing not in VALID_EASING:
            r.warn(f"motion animation [{tid}]: easing '{easing}' not standard")

        loop_mode = anim.get("loop", "repeat")
        if loop_mode not in VALID_LOOP_MODES:
            r.warn(f"motion animation [{tid}]: loop '{loop_mode}' not standard")

    mc = motion.get("motion_constraints", {})
    if mc.get("motion_character") and mc["motion_character"] not in VALID_MOTION_CHARS:
        r.warn(f"motion_constraints.motion_character '{mc['motion_character']}' not standard")

    # 7. Constraints validation
    constraints = bp["constraints"]
    prohibitions = constraints.get("prohibitions", [])
    if not prohibitions:
        r.warn("constraints.prohibitions is empty — should explicitly block unwanted interpretations")
    r.note(f"{len(prohibitions)} prohibitions defined")

    # 8. Subjective language check (word-boundary aware, skips prohibitions)
    # Exclude prohibitions array from check — it legitimately contains descriptive terms
    bp_check = {k: v for k, v in bp.items() if k != "constraints"}
    bp_str = json.dumps(bp_check).lower()
    found_subjective = [w for w in SUBJECTIVE_WORDS if re.search(rf'\b{w}\b', bp_str)]
    if found_subjective:
        r.error(f"Subjective language found: {', '.join(found_subjective)}")

    # 9. Summary stats
    r.note(f"Colors: {len(color_ids)}, Gradients: {len(gradient_ids)}")
    r.note(f"Layers: {len(bp.get('layers', []))}, Elements: {len(element_ids)}")
    r.note(f"Animations: {len(motion.get('animations', []))}")

    return r


def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <blueprint.json>", file=sys.stderr)
        sys.exit(1)

    bp_path = Path(sys.argv[1])
    if not bp_path.exists():
        print(f"File not found: {bp_path}", file=sys.stderr)
        sys.exit(1)

    with open(bp_path) as f:
        bp = json.load(f)

    result = validate(bp)
    print(result.summary())

    sys.exit(0 if result.is_valid else 1)


if __name__ == "__main__":
    main()