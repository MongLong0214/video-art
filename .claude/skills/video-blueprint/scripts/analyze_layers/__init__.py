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
    """Main orchestration: run color_mask analysis on frames."""
    from .color_mask import analyze_all_layers
    return analyze_all_layers(frames_dir, color_tolerance, temporal_pairs)


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