"""Per-instance motion tracking, speed pattern classification, zoom detection.

T5 module: tracks individual shapes across consecutive frames,
measures per-shape rotation/translation/scale, classifies speed patterns
(uniform/linear/geometric), and detects index-scroll zoom.
"""

import math
from typing import List, Tuple

import numpy as np

try:
    from scipy.optimize import curve_fit
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False


def match_shapes(shapes_a: list, shapes_b: list,
                 max_dist_ratio: float = 0.15) -> List[Tuple[int, int, float]]:
    """Match shapes between two frames by centroid proximity + area similarity.
    Returns list of (index_a, index_b, score)."""
    if not shapes_a or not shapes_b:
        return []

    matches = []
    used_b = set()

    for i, sa in enumerate(shapes_a):
        best_j = -1
        best_score = float("inf")

        for j, sb in enumerate(shapes_b):
            if j in used_b:
                continue

            dx = sa["centroid_normalized"][0] - sb["centroid_normalized"][0]
            dy = sa["centroid_normalized"][1] - sb["centroid_normalized"][1]
            dist = math.sqrt(dx ** 2 + dy ** 2)

            area_a = max(sa["area_px"], 1)
            area_b = max(sb["area_px"], 1)
            area_ratio = min(area_a, area_b) / max(area_a, area_b)
            area_penalty = (1 - area_ratio) * 0.5

            score = dist + area_penalty

            if score < best_score and dist < max_dist_ratio:
                best_score = score
                best_j = j

        if best_j >= 0:
            matches.append((i, best_j, round(best_score, 4)))
            used_b.add(best_j)

    return matches


def compute_shape_motion(shape_a: dict, shape_b: dict) -> dict:
    """Compute motion between matched shapes with 90° ambiguity resolution."""
    angle_a = shape_a["angle_deg"]
    angle_b = shape_b["angle_deg"]

    # Raw delta
    rotation_delta = angle_b - angle_a

    # Normalize to [-180, 180]
    while rotation_delta > 180:
        rotation_delta -= 360
    while rotation_delta < -180:
        rotation_delta += 360

    # 90° ambiguity resolution for minAreaRect:
    # If delta is close to ±90 or ±180, it's likely a rect orientation flip
    # Prefer the smallest absolute delta among {delta, delta±90, delta±180}
    candidates = [rotation_delta, rotation_delta - 90, rotation_delta + 90,
                  rotation_delta - 180, rotation_delta + 180]
    # Normalize all to [-180, 180]
    normalized = []
    for c in candidates:
        while c > 180:
            c -= 360
        while c < -180:
            c += 360
        normalized.append(c)
    # Pick smallest absolute value
    rotation_delta = min(normalized, key=abs)

    # Scale change
    w_a = max(shape_a["width_px"], 1)
    w_b = max(shape_b["width_px"], 1)
    scale_change = w_b / w_a

    # Translation
    dx = shape_b["centroid_normalized"][0] - shape_a["centroid_normalized"][0]
    dy = shape_b["centroid_normalized"][1] - shape_a["centroid_normalized"][1]

    # Radial change (toward/away from center 0.5, 0.5)
    radial_a = math.sqrt((shape_a["centroid_normalized"][0] - 0.5) ** 2 +
                          (shape_a["centroid_normalized"][1] - 0.5) ** 2)
    radial_b = math.sqrt((shape_b["centroid_normalized"][0] - 0.5) ** 2 +
                          (shape_b["centroid_normalized"][1] - 0.5) ** 2)
    radial_change = radial_b - radial_a

    return {
        "rotation_delta_deg": round(rotation_delta, 2),
        "scale_change": round(scale_change, 4),
        "translation_normalized": round(math.sqrt(dx**2 + dy**2), 5),
        "radial_change": round(radial_change, 5),
    }


def classify_speed_pattern(speeds: list) -> dict:
    """Classify per-instance speed pattern as uniform/linear/geometric/exponential."""
    if not speeds or len(speeds) < 2:
        return {"formula": "uniform", "r_squared": 1.0}

    arr = np.array(speeds, dtype=np.float64)
    std = float(np.std(arr))
    mean = float(np.mean(arr))

    # Uniform: all speeds approximately equal
    if std < max(0.5, mean * 0.1):
        return {"formula": "uniform", "r_squared": 1.0, "speed": round(mean, 3)}

    indices = np.arange(len(arr), dtype=np.float64)

    # Linear fit: speed = base + step * index
    def linear_fn(x, base, step):
        return base + step * x

    # Geometric fit: speed = base * ratio^index
    def geometric_fn(x, base, ratio):
        return base * np.power(ratio, x)

    results = {}

    if HAS_SCIPY:
        try:
            popt, _ = curve_fit(linear_fn, indices, arr, p0=[arr[0], 1.0], maxfev=5000)
            predicted = linear_fn(indices, *popt)
            ss_res = np.sum((arr - predicted) ** 2)
            ss_tot = np.sum((arr - arr.mean()) ** 2)
            r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0
            results["linear"] = {"r_squared": round(float(r2), 4), "base": round(float(popt[0]), 3),
                                  "step": round(float(popt[1]), 3)}
        except Exception:
            results["linear"] = {"r_squared": 0}

        try:
            if all(s > 0 for s in speeds):
                popt, _ = curve_fit(geometric_fn, indices, arr, p0=[arr[0], 2.0], maxfev=5000)
                predicted = geometric_fn(indices, *popt)
                ss_res = np.sum((arr - predicted) ** 2)
                ss_tot = np.sum((arr - arr.mean()) ** 2)
                r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0
                results["geometric"] = {"r_squared": round(float(r2), 4), "base": round(float(popt[0]), 3),
                                         "ratio": round(float(popt[1]), 3)}
        except Exception:
            results["geometric"] = {"r_squared": 0}
    else:
        # Fallback: simple linear regression
        slope, intercept = np.polyfit(indices, arr, 1)
        predicted = intercept + slope * indices
        ss_res = np.sum((arr - predicted) ** 2)
        ss_tot = np.sum((arr - arr.mean()) ** 2)
        r2 = 1 - ss_res / ss_tot if ss_tot > 0 else 0
        results["linear"] = {"r_squared": round(float(r2), 4), "base": round(float(intercept), 3),
                              "step": round(float(slope), 3)}

    # Pick best fit
    best_formula = "linear"
    best_r2 = results.get("linear", {}).get("r_squared", 0)

    if results.get("geometric", {}).get("r_squared", 0) > best_r2 + 0.01:
        best_formula = "geometric"
        best_r2 = results["geometric"]["r_squared"]

    return {"formula": best_formula, "r_squared": round(best_r2, 4), **results.get(best_formula, {})}


def detect_zoom(motions: list) -> dict:
    """Detect zoom pattern from per-shape motion data."""
    if not motions:
        return {"has_zoom": False, "type": "none"}

    inward_count = sum(1 for m in motions
                       if m.get("radial_change", 0) < -0.005 and m.get("scale_change", 1) < 0.98)
    inward_ratio = inward_count / len(motions)

    has_zoom = inward_ratio > 0.3

    zoom_type = "none"
    if has_zoom:
        mean_scale = float(np.mean([m.get("scale_change", 1) for m in motions]))
        zoom_type = "zoom_inward" if mean_scale < 1.0 else "zoom_outward"

    return {
        "has_zoom": has_zoom,
        "type": zoom_type,
        "inward_ratio": round(inward_ratio, 3),
        "mean_scale_change": round(float(np.mean([m.get("scale_change", 1) for m in motions])), 4),
    }


def classify_motion_type(has_rotation: bool = False, has_zoom: bool = False,
                          has_variable_speed: bool = False) -> str:
    """Classify overall motion type."""
    if has_rotation and has_zoom:
        return "spiral"
    if has_zoom:
        return "zoom_inward"
    if has_rotation and has_variable_speed:
        return "per_instance_rotation"
    if has_rotation:
        return "uniform_rotation"
    return "static"