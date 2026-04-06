"""
RAFT optical flow extraction — dense flow fields from frame sequences.

Usage:
    python3 scripts/motion/extract_flow.py <frames_dir> <output_dir>

Input: Directory of PNG frames (frame_00001.png, frame_00002.png, ...)
Output: .npy flow fields (flow_00001.npy, flow_00002.npy, ...) + JSON metadata on stdout
"""
from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

import numpy as np
import torch
import torchvision.transforms.functional as F
from PIL import Image
from torchvision.models.optical_flow import Raft_Large_Weights, raft_large


def load_frames(frames_dir: str) -> list[tuple[str, np.ndarray]]:
    """Load PNG frames sorted by name, return list of (filename, HWC uint8 array)."""
    p = Path(frames_dir)
    files = sorted(p.glob("*.png"))
    if len(files) < 2:
        print(f"Error: Need at least 2 frames, found {len(files)}", file=sys.stderr)
        sys.exit(1)
    frames = []
    for f in files:
        img = np.array(Image.open(f).convert("RGB"))
        frames.append((f.name, img))
    return frames


def frames_to_tensor(frame: np.ndarray, device: torch.device) -> torch.Tensor:
    """Convert HWC uint8 numpy to NCHW float32 tensor on device."""
    t = F.to_tensor(frame).unsqueeze(0).to(device)
    return t


def extract_flow(
    frames_dir: str, output_dir: str
) -> dict:
    """Extract RAFT dense optical flow between consecutive frame pairs."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    if device.type == "cpu":
        print("WARNING: CUDA not available, using CPU (10x slower)", file=sys.stderr)

    os.makedirs(output_dir, exist_ok=True)

    # Load RAFT model
    weights = Raft_Large_Weights.DEFAULT
    model = raft_large(weights=weights).to(device).eval()
    transforms = weights.transforms()

    frames = load_frames(frames_dir)
    start = time.time()

    for i in range(len(frames) - 1):
        name1, arr1 = frames[i]
        name2, arr2 = frames[i + 1]

        t1 = frames_to_tensor(arr1, device)
        t2 = frames_to_tensor(arr2, device)

        # Apply RAFT transforms (resize to multiple of 8, normalize)
        t1_t, t2_t = transforms(t1, t2)

        with torch.no_grad():
            flow_list = model(t1_t, t2_t)
            # Last element is the final refined flow
            flow = flow_list[-1]

        # If RAFT resized internally, resize flow back to original
        h, w = arr1.shape[:2]
        if flow.shape[2] != h or flow.shape[3] != w:
            orig_fh, orig_fw = flow.shape[2], flow.shape[3]
            flow = torch.nn.functional.interpolate(
                flow, size=(h, w), mode="bilinear", align_corners=False
            )
            # Scale flow values proportionally
            flow[:, 0] *= w / orig_fw
            flow[:, 1] *= h / orig_fh

        # Convert to numpy (H, W, 2)
        flow_np = flow[0].permute(1, 2, 0).cpu().numpy()

        out_name = f"flow_{i + 1:05d}.npy"
        np.save(os.path.join(output_dir, out_name), flow_np)

    elapsed = time.time() - start

    metadata = {
        "frame_count": len(frames),
        "flow_count": len(frames) - 1,
        "device": device.type,
        "elapsed_sec": round(elapsed, 2),
        "resolution": [frames[0][1].shape[1], frames[0][1].shape[0]],
    }

    # Output JSON metadata on stdout
    print(json.dumps(metadata))
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RAFT optical flow extraction")
    parser.add_argument("frames_dir", help="Directory containing PNG frames")
    parser.add_argument("output_dir", help="Directory for output .npy flow fields")
    args = parser.parse_args()

    if not os.path.isdir(args.frames_dir):
        print(f"Error: frames_dir not found: {args.frames_dir}", file=sys.stderr)
        sys.exit(1)

    extract_flow(args.frames_dir, args.output_dir)
