"""
Backward warp — warp original image pixels using optical flow fields.

Usage:
    python3 scripts/motion/warp_pixels.py <original_image> <flow_dir> <output_dir> \
        [--ref-frames-dir <dir>] [--has-alpha]

Input:
    - original_image: Source PNG (RGB or RGBA)
    - flow_dir: Directory of .npy flow fields from extract_flow.py
    - output_dir: Directory for warped PNG frames

Output:
    - Warped PNG frame sequence + JSON metadata on stdout
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image


def backward_warp(image: np.ndarray, flow: np.ndarray) -> np.ndarray:
    """Warp image pixels using backward flow (bilinear interpolation).

    Args:
        image: HWC uint8 array (RGB)
        flow: HW2 float32 array (dx, dy)

    Returns:
        Warped HWC uint8 array
    """
    h, w = image.shape[:2]

    # Create coordinate grid
    x = np.arange(w, dtype=np.float32)
    y = np.arange(h, dtype=np.float32)
    grid_x, grid_y = np.meshgrid(x, y)

    # Apply flow displacement: RAFT flow[i] = dest[i] - src[i],
    # so source pixel for dest (x,y) is at (x + flow_x, y + flow_y)
    map_x = grid_x + flow[:, :, 0]
    map_y = grid_y + flow[:, :, 1]

    # cv2.remap with bilinear interpolation + reflect boundary
    warped = cv2.remap(
        image,
        map_x,
        map_y,
        interpolation=cv2.INTER_LINEAR,
        borderMode=cv2.BORDER_REFLECT_101,
    )

    return warped


def compute_disocclusion_mask(flow: np.ndarray, threshold: float = 1.0) -> np.ndarray:
    """Compute disocclusion mask using forward flow consistency check.

    Simple approach: large flow magnitude changes between neighbors indicate
    potential disocclusion.

    Returns: binary mask (1 = disoccluded, 0 = valid)
    """
    h, w = flow.shape[:2]

    # Compute flow magnitude gradient
    flow_mag = np.sqrt(flow[:, :, 0] ** 2 + flow[:, :, 1] ** 2)
    grad_x = np.abs(np.diff(flow_mag, axis=1, prepend=flow_mag[:, :1]))
    grad_y = np.abs(np.diff(flow_mag, axis=0, prepend=flow_mag[:1, :]))

    # High gradient = potential disocclusion
    disocclusion = ((grad_x + grad_y) > threshold).astype(np.uint8)
    return disocclusion


def oklab_blend(warped: np.ndarray, ref: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Blend warped pixels with reference using Oklab L-ab approach.

    For disoccluded regions, take luminance from reference and chrominance from warped.
    Simple approximation: alpha blend in RGB space weighted by disocclusion mask.
    """
    # For disoccluded pixels, use reference directly
    # For valid pixels, keep warped
    mask_3c = np.stack([mask] * 3, axis=-1).astype(np.float32)
    blended = warped * (1 - mask_3c) + ref * mask_3c
    return blended.astype(np.uint8)


def warp_pixels(
    original_path: str,
    flow_dir: str,
    output_dir: str,
    ref_frames_dir: str | None = None,
    has_alpha: bool = False,
) -> dict:
    """Warp original image pixels using flow fields."""
    os.makedirs(output_dir, exist_ok=True)

    # Load original image
    orig_pil = Image.open(original_path)
    alpha_channel = None

    if has_alpha and orig_pil.mode == "RGBA":
        # Separate alpha
        orig_rgba = np.array(orig_pil)
        orig_rgb = orig_rgba[:, :, :3]
        alpha_channel = orig_rgba[:, :, 3]
    else:
        orig_rgb = np.array(orig_pil.convert("RGB"))

    # Load flow files sorted
    flow_files = sorted(Path(flow_dir).glob("*.npy"))
    if len(flow_files) == 0:
        print("Error: No .npy flow files found", file=sys.stderr)
        sys.exit(1)

    # Load reference frames if provided (for disocclusion fallback)
    ref_frames: list[np.ndarray | None] = [None] * len(flow_files)
    if ref_frames_dir:
        ref_pngs = sorted(Path(ref_frames_dir).glob("*.png"))
        for i, ref_path in enumerate(ref_pngs):
            if i < len(ref_frames):
                ref_frames[i] = np.array(Image.open(ref_path).convert("RGB"))

    # First frame is the original (no warp)
    _save_frame(orig_rgb, alpha_channel, output_dir, 1)

    disocclusion_ratios = []

    for i, flow_path in enumerate(flow_files):
        flow = np.load(flow_path)

        # Ensure flow matches image resolution
        h, w = orig_rgb.shape[:2]
        if flow.shape[0] != h or flow.shape[1] != w:
            orig_flow_h, orig_flow_w = flow.shape[0], flow.shape[1]
            flow = cv2.resize(flow, (w, h), interpolation=cv2.INTER_LINEAR)
            flow[:, :, 0] *= w / orig_flow_w
            flow[:, :, 1] *= h / orig_flow_h

        # Backward warp original pixels
        warped = backward_warp(orig_rgb, flow)

        # Disocclusion handling
        dis_mask = compute_disocclusion_mask(flow)
        dis_ratio = float(np.mean(dis_mask))
        disocclusion_ratios.append(dis_ratio)

        if dis_ratio > 0.001 and ref_frames[i] is not None:
            warped = oklab_blend(warped, ref_frames[i], dis_mask)

        _save_frame(warped, alpha_channel, output_dir, i + 2)

    avg_dis = float(np.mean(disocclusion_ratios)) if disocclusion_ratios else 0.0

    metadata = {
        "frame_count": len(flow_files) + 1,
        "disocclusion_ratio_avg": round(avg_dis, 4),
        "has_alpha": has_alpha and alpha_channel is not None,
        "resolution": [orig_rgb.shape[1], orig_rgb.shape[0]],
    }

    if avg_dis > 0.05:
        print(
            f"WARNING: High disocclusion ratio ({avg_dis:.2%}). Consider reducing motion intensity.",
            file=sys.stderr,
        )

    print(json.dumps(metadata))
    return metadata


def _save_frame(
    rgb: np.ndarray,
    alpha: np.ndarray | None,
    output_dir: str,
    frame_num: int,
) -> None:
    """Save a frame as PNG, optionally with alpha channel."""
    name = f"frame_{frame_num:05d}.png"
    if alpha is not None:
        rgba = np.dstack([rgb, alpha])
        Image.fromarray(rgba, "RGBA").save(os.path.join(output_dir, name))
    else:
        Image.fromarray(rgb, "RGB").save(os.path.join(output_dir, name))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backward warp with optical flow")
    parser.add_argument("original_image", help="Source PNG image")
    parser.add_argument("flow_dir", help="Directory of .npy flow fields")
    parser.add_argument("output_dir", help="Output directory for warped frames")
    parser.add_argument("--ref-frames-dir", help="AI reference frames for disocclusion fallback")
    parser.add_argument("--has-alpha", action="store_true", help="Preserve alpha channel from RGBA input")
    args = parser.parse_args()

    if not os.path.isfile(args.original_image):
        print(f"Error: Image not found: {args.original_image}", file=sys.stderr)
        sys.exit(1)

    if not os.path.isdir(args.flow_dir):
        print(f"Error: flow_dir not found: {args.flow_dir}", file=sys.stderr)
        sys.exit(1)

    warp_pixels(
        args.original_image,
        args.flow_dir,
        args.output_dir,
        ref_frames_dir=args.ref_frames_dir,
        has_alpha=args.has_alpha,
    )
