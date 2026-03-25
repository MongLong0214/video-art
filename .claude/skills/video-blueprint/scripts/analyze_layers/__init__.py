"""analyze_layers — Color-mask based layer decomposition for video blueprint extraction.

Package structure:
  __init__.py    — CLI entry + orchestration
  color_mask.py  — Color masking, shape detection, concentric patterns (T4)
  motion.py      — Per-instance motion tracking, zoom detection (T5)
  effects.py     — Depth-varying properties, effect detection (T6)
"""

import argparse
import json
import sys
from pathlib import Path


def analyze(frames_dir: str, color_tolerance: int = 40, temporal_pairs: int = 8) -> dict:
    """Main orchestration: 3-phase pipeline (color_mask → motion → effects)."""
    frames_path = Path(frames_dir)
    if not frames_path.is_dir():
        print(f"Error: frames directory not found: {frames_dir}", file=sys.stderr)
        sys.exit(1)
    if not list(frames_path.glob("frame_*.png")):
        print(f"Error: no frame_*.png files in {frames_dir}", file=sys.stderr)
        sys.exit(1)

    # Phase 1: Color mask (multi-frame)
    from .color_mask import analyze_all_layers
    color_result = analyze_all_layers(frames_dir, color_tolerance, temporal_pairs)

    # Phase 2: Per-instance motion tracking
    from .motion import (
        match_shapes, compute_shape_motion, classify_speed_pattern,
        detect_zoom, classify_motion_type,
    )

    motion_results = {}
    for color_hex, frames_data in color_result.get("shapes_by_frame", {}).items():
        sorted_indices = sorted(frames_data.keys())
        all_motions = []
        per_instance_rotations = []

        for k in range(len(sorted_indices) - 1):
            shapes_a = frames_data[sorted_indices[k]]
            shapes_b = frames_data[sorted_indices[k + 1]]
            matches = match_shapes(shapes_a, shapes_b)
            for ia, ib, score in matches:
                m = compute_shape_motion(shapes_a[ia], shapes_b[ib])
                all_motions.append(m)
                per_instance_rotations.append(abs(m["rotation_delta_deg"]))

        speed = classify_speed_pattern(per_instance_rotations) if per_instance_rotations else {"formula": "uniform"}
        zoom = detect_zoom(all_motions)
        has_rot = any(abs(m.get("rotation_delta_deg", 0)) > 1.0 for m in all_motions)
        has_var = speed.get("formula") != "uniform"
        mtype = classify_motion_type(has_rot, zoom["has_zoom"], has_var)

        motion_results[color_hex] = {
            "motion_type": mtype,
            "speed_pattern": speed,
            "zoom": zoom,
        }

    # Phase 3: Effects detection
    from .effects import detect_all_effects
    frame_images = color_result.get("frame_images", {})
    first_idx = min(frame_images.keys()) if frame_images else None
    first_img = frame_images.get(first_idx) if first_idx is not None else None

    # Collect first-frame shapes for effects (depth-varying stroke/opacity/color)
    all_shapes = []
    if first_idx is not None:
        for color_hex, frames_data in color_result.get("shapes_by_frame", {}).items():
            all_shapes.extend(frames_data.get(first_idx, []))

    # Build per-frame shape dict for breathing detection.
    # Use the LARGEST color family to avoid mixing shapes from different layers.
    shapes_by_frame_for_breathing = {}
    largest_color = max(
        color_result.get("shapes_by_frame", {}).items(),
        key=lambda kv: sum(len(v) for v in kv[1].values()),
        default=(None, {}),
    )
    if largest_color[0] is not None:
        for fidx, shapes in largest_color[1].items():
            shapes_by_frame_for_breathing[fidx] = shapes

    effects_result = {}
    if first_img is not None:
        effects_result = detect_all_effects(first_img, all_shapes, shapes_by_frame_for_breathing)

    # Free frame images to reclaim memory
    color_result.pop("frame_images", None)
    color_result.pop("shapes_by_frame", None)

    # Merge: enrich layer_analyses with motion data
    result = {
        "layer_analyses": color_result["layer_analyses"],
        "color_families": color_result["color_families"],
        "background_color": color_result["background_color"],
        "effects": effects_result,
        "analysis_params": color_result["analysis_params"],
    }

    for la in result["layer_analyses"]:
        if la["color_hex"] in motion_results:
            la["motion"] = motion_results[la["color_hex"]]

    return result


def main():
    parser = argparse.ArgumentParser(description="Layer decomposition + per-shape tracking")
    parser.add_argument("frames_dir", help="Directory with extracted frames + colors.json")
    parser.add_argument("--color-tolerance", type=int, default=40)
    parser.add_argument("--temporal-pairs", type=int, default=8)
    args = parser.parse_args()

    result = analyze(args.frames_dir, args.color_tolerance, args.temporal_pairs)

    out_path = Path(args.frames_dir) / "layers.json"

    def numpy_safe(obj):
        import numpy as np
        if isinstance(obj, (np.integer,)):
            return int(obj)
        if isinstance(obj, (np.floating,)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, (np.bool_,)):
            return bool(obj)
        raise TypeError(f"Not serializable: {type(obj).__name__}")

    with open(out_path, "w") as f:
        json.dump(result, f, indent=2, default=numpy_safe)
    print(f"Results -> {out_path}")


if __name__ == "__main__":
    main()