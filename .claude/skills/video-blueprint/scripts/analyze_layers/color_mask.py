"""Color-mask based layer separation + shape detection.

Core module for T4: creates binary masks per palette color,
detects shapes via contours, measures geometric properties,
and identifies concentric patterns.
"""

import math
import sys
from pathlib import Path

import cv2
import numpy as np

# Import CIELAB functions from analyze-colors.py sibling
_parent = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_parent))
try:
    import importlib.util
    _spec = importlib.util.spec_from_file_location("analyze_colors", _parent / "analyze-colors.py")
    _colors_mod = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_colors_mod)
    rgb_to_lab = _colors_mod.rgb_to_lab
    compute_delta_e2000 = _colors_mod.compute_delta_e2000
except Exception:
    def rgb_to_lab(r, g, b):
        return [0, 0, 0]
    def compute_delta_e2000(lab1, lab2):
        return math.sqrt(sum((a - b) ** 2 for a, b in zip(lab1, lab2)))


def hex_to_bgr(hex_color: str) -> tuple:
    h = hex_color.lstrip("#")
    r, g, b = int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)
    return (b, g, r)


def create_color_mask(img_bgr: np.ndarray, target_bgr: tuple, tolerance: int = 40) -> np.ndarray:
    """Create binary mask for pixels close to target color in RGB space."""
    target = np.array(target_bgr, dtype=np.float32)
    img_f = img_bgr.astype(np.float32)
    dist = np.sqrt(np.sum((img_f - target) ** 2, axis=2))
    mask = (dist < tolerance).astype(np.uint8) * 255

    # Morphological cleanup: close gaps, remove noise, erode AA borders
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel, iterations=1)
    # Erode to remove anti-aliased border pixels
    mask = cv2.erode(mask, kernel, iterations=1)
    return mask


def measure_shapes_in_mask(mask: np.ndarray, img_bgr: np.ndarray,
                            min_area_ratio: float = 0.0003) -> list:
    """Find and measure all shapes in a binary mask."""
    h, w = mask.shape
    min_area = w * h * min_area_ratio

    contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    shapes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if area < min_area:
            continue

        perimeter = cv2.arcLength(contour, True)
        if perimeter < 10:
            continue

        rect = cv2.minAreaRect(contour)
        center = rect[0]
        size = rect[1]
        angle = rect[2]

        rect_w = max(size[0], size[1])
        rect_h = min(size[0], size[1])
        if size[0] < size[1]:
            angle += 90

        # Stroke vs fill detection
        contour_mask = np.zeros_like(mask)
        cv2.drawContours(contour_mask, [contour], -1, 255, -1)
        filled_area = cv2.countNonZero(contour_mask)
        bbox_area = rect_w * rect_h if rect_w * rect_h > 0 else 1
        fill_ratio = filled_area / bbox_area
        is_stroke_only = fill_ratio < 0.4

        # Stroke width from distance transform
        dist_in = cv2.distanceTransform(mask & contour_mask, cv2.DIST_L2, 5)
        stroke_width_px = 0.0
        if dist_in.max() > 0:
            ridge = dist_in[dist_in > dist_in.max() * 0.5]
            if len(ridge) > 0:
                stroke_width_px = float(np.median(ridge) * 2)

        shapes.append({
            "centroid_px": (float(center[0]), float(center[1])),
            "centroid_normalized": (round(center[0] / w, 4), round(center[1] / h, 4)),
            "width_px": round(float(rect_w), 1),
            "height_px": round(float(rect_h), 1),
            "width_normalized": round(rect_w / w, 4),
            "height_normalized": round(rect_h / h, 4),
            "angle_deg": round(float(angle) % 360, 2),
            "area_px": round(float(area), 1),
            "area_normalized": round(area / (w * h), 6),
            "perimeter_px": round(float(perimeter), 1),
            "is_stroke_only": bool(is_stroke_only),
            "fill_ratio": round(float(fill_ratio), 3),
            "stroke_width_px": round(stroke_width_px, 1),
        })

    shapes.sort(key=lambda s: s["area_px"], reverse=True)
    return shapes


def detect_concentric_pattern(shapes: list) -> dict:
    """Detect concentric pattern: shapes sharing center with decreasing size."""
    if len(shapes) < 2:
        return {"is_concentric": False}

    centers = np.array([s["centroid_px"] for s in shapes])
    center_spread = np.std(centers, axis=0)
    avg_size = np.mean([s["width_px"] for s in shapes])

    is_centered = all(s < avg_size * 0.2 for s in center_spread) if avg_size > 0 else False
    if not is_centered:
        return {"is_concentric": False}

    sorted_shapes = sorted(shapes, key=lambda s: s["area_px"], reverse=True)

    scale_ratios = []
    rotation_steps = []
    for i in range(len(sorted_shapes) - 1):
        w1 = sorted_shapes[i]["width_px"]
        w2 = sorted_shapes[i + 1]["width_px"]
        if w1 > 0:
            scale_ratios.append(round(w2 / w1, 4))

        r1 = sorted_shapes[i]["angle_deg"]
        r2 = sorted_shapes[i + 1]["angle_deg"]
        rd = (r2 - r1) % 360
        if rd > 180:
            rd -= 360
        rotation_steps.append(round(rd, 2))

    return {
        "is_concentric": True,
        "count": len(sorted_shapes),
        "mean_scale_ratio": round(float(np.mean(scale_ratios)), 4) if scale_ratios else None,
        "scale_ratio_std": round(float(np.std(scale_ratios)), 4) if scale_ratios else None,
        "scale_ratios": scale_ratios,
        "mean_rotation_step_deg": round(float(np.mean(rotation_steps)), 2) if rotation_steps else None,
        "rotation_steps": rotation_steps,
        "center_px": [round(float(centers.mean(axis=0)[0]), 1), round(float(centers.mean(axis=0)[1]), 1)],
        "largest_width_px": sorted_shapes[0]["width_px"],
        "smallest_width_px": sorted_shapes[-1]["width_px"],
    }


def group_color_families(palette: list, delta_e_threshold: float = 15.0) -> dict:
    """Group palette colors into families by CIELAB ΔE2000 proximity."""
    families = {}  # family_name → [color_entries]

    for color in palette:
        rgb = color["rgb"]
        lab = color.get("lab") or rgb_to_lab(*rgb)
        merged = False

        for fname, members in families.items():
            rep_rgb = members[0]["rgb"]
            rep_lab = members[0].get("lab") or rgb_to_lab(*rep_rgb)
            de = compute_delta_e2000(lab, rep_lab)
            if de < delta_e_threshold:
                members.append(color)
                merged = True
                break

        if not merged:
            name = color.get("name_hint", color["hex"])
            # Ensure unique family name
            base = name
            i = 2
            while name in families:
                name = f"{base}_{i}"
                i += 1
            families[name] = [color]

    return families


def analyze_all_layers(frames_dir: str, color_tolerance: int = 40,
                        temporal_pairs: int = 8) -> dict:
    """Full color-mask analysis across frames."""
    import json
    frames_path = Path(frames_dir)
    frame_files = sorted(frames_path.glob("frame_*.png"))

    colors_path = frames_path / "colors.json"
    if not colors_path.exists():
        return {"error": "colors.json not found"}

    with open(colors_path) as f:
        colors_data = json.load(f)

    canonical = colors_data["canonical_palette"]
    bg = canonical[0] if canonical else None
    non_bg = [c for c in canonical if c["avg_percentage"] > 1.5 and c["hex"] != (bg["hex"] if bg else "")]

    families = group_color_families(non_bg, delta_e_threshold=15)

    layer_analyses = []
    first_frame = cv2.imread(str(frame_files[0])) if frame_files else None

    if first_frame is not None:
        for fname, members in families.items():
            for color in members:
                bgr = hex_to_bgr(color["hex"])
                mask = create_color_mask(first_frame, bgr, color_tolerance)
                shapes = measure_shapes_in_mask(mask, first_frame)
                concentric = detect_concentric_pattern(shapes)

                layer_analyses.append({
                    "color_hex": color["hex"],
                    "color_family": fname,
                    "shape_count": len(shapes),
                    "shapes_in_first_frame": shapes[:20],
                    "concentric_pattern": concentric,
                    "scale_ratios": concentric.get("scale_ratios", []),
                    "mean_scale_ratio": concentric.get("mean_scale_ratio"),
                    "rotation_steps_deg": concentric.get("rotation_steps", []),
                    "mean_rotation_step_deg": concentric.get("mean_rotation_step_deg"),
                })

    return {
        "layer_analyses": layer_analyses,
        "color_families": {k: [c["hex"] for c in v] for k, v in families.items()},
        "background_color": bg["hex"] if bg else None,
        "analysis_params": {
            "color_tolerance": color_tolerance,
            "frames_analyzed": len(frame_files),
        },
    }