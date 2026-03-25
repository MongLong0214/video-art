"""Shared color utility functions for the video-blueprint pipeline.

Provides rgb_to_lab and compute_delta_e2000 without sys.path hacks.
"""

import numpy as np

try:
    from colorspacious import deltaE as _deltaE_colorspacious
    HAS_COLORSPACIOUS = True
except ImportError:
    HAS_COLORSPACIOUS = False

try:
    from skimage.color import rgb2lab as _skimage_rgb2lab
    HAS_SKIMAGE = True
except ImportError:
    HAS_SKIMAGE = False


def rgb_to_lab(r: int, g: int, b: int) -> list:
    """Convert RGB (0-255) to CIELAB [L, a, b]."""
    if HAS_SKIMAGE:
        pixel = np.array([[[r, g, b]]], dtype=np.uint8)
        lab = _skimage_rgb2lab(pixel)[0, 0]
        return [round(float(lab[0]), 2), round(float(lab[1]), 2), round(float(lab[2]), 2)]
    # Manual fallback via XYZ
    rgb_n = np.array([r, g, b], dtype=np.float64) / 255.0
    rgb_n = np.where(rgb_n > 0.04045, ((rgb_n + 0.055) / 1.055) ** 2.4, rgb_n / 12.92)
    mat = np.array([[0.4124564, 0.3575761, 0.1804375],
                    [0.2126729, 0.7151522, 0.0721750],
                    [0.0193339, 0.1191920, 0.9503041]])
    xyz = mat @ rgb_n
    ref = np.array([0.95047, 1.00000, 1.08883])
    xyz_n = xyz / ref
    xyz_n = np.where(xyz_n > 0.008856, xyz_n ** (1/3), 7.787 * xyz_n + 16/116)
    L = 116 * xyz_n[1] - 16
    a = 500 * (xyz_n[0] - xyz_n[1])
    b_val = 200 * (xyz_n[1] - xyz_n[2])
    return [round(float(L), 2), round(float(a), 2), round(float(b_val), 2)]


def compute_delta_e2000(lab1, lab2) -> float:
    """Compute deltaE2000 between two CIELAB colors."""
    if HAS_COLORSPACIOUS:
        return float(_deltaE_colorspacious(np.array(lab1), np.array(lab2), input_space="CIELab"))
    # Simplified deltaE76 fallback
    return float(np.sqrt(sum((a - b) ** 2 for a, b in zip(lab1, lab2))))
