#!/usr/bin/env python3
"""
Extract key frames from a looping video with automatic loop detection.

Usage:
  python extract-frames.py <video_path> [--frames N] [--out-dir DIR] [--detect-loop]

Features:
  - Extracts evenly-spaced frames as lossless PNG
  - Auto-detects loop point via SSIM frame similarity
  - Outputs high-res frames + metadata JSON
  - Extracts first/last frames at full quality for loop seam analysis

Dependencies: ffmpeg, ffprobe, Pillow, numpy
"""

import argparse
import json
import os
import subprocess
import sys


def get_video_info(video_path: str) -> dict:
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"ffprobe error: {result.stderr}", file=sys.stderr)
        sys.exit(1)
    return json.loads(result.stdout)


def compute_ssim_simple(img1_path: str, img2_path: str) -> float:
    """Compute structural similarity between two images using numpy only."""
    try:
        from PIL import Image
        import numpy as np
    except ImportError:
        return -1.0

    img1 = np.array(Image.open(img1_path).convert("L").resize((256, 256)), dtype=np.float64)
    img2 = np.array(Image.open(img2_path).convert("L").resize((256, 256)), dtype=np.float64)

    mu1, mu2 = img1.mean(), img2.mean()
    sig1_sq = ((img1 - mu1) ** 2).mean()
    sig2_sq = ((img2 - mu2) ** 2).mean()
    sig12 = ((img1 - mu1) * (img2 - mu2)).mean()

    C1 = (0.01 * 255) ** 2
    C2 = (0.03 * 255) ** 2

    num = (2 * mu1 * mu2 + C1) * (2 * sig12 + C2)
    den = (mu1 ** 2 + mu2 ** 2 + C1) * (sig1_sq + sig2_sq + C2)
    return float(num / den)


def extract_frame_at(video_path: str, timestamp: float, out_path: str):
    """Extract a single frame at exact timestamp as lossless PNG."""
    subprocess.run([
        "ffmpeg", "-y", "-v", "quiet",
        "-ss", str(timestamp),
        "-i", video_path,
        "-frames:v", "1",
        "-pix_fmt", "rgb24",
        out_path
    ], check=True)


def detect_loop_point(video_path: str, out_dir: str, duration: float, fps: float) -> dict:
    """
    Detect loop point by comparing the first frame to frames near the end.
    Tests last 20% of the video at fine granularity.
    """
    first_frame = os.path.join(out_dir, "_loop_first.png")
    extract_frame_at(video_path, 0.0, first_frame)

    # Test frames in the last 20% of the video
    start_t = duration * 0.8
    step = 1.0 / fps  # single-frame precision
    # But limit to ~60 tests for speed
    test_count = min(60, int((duration - start_t) * fps))
    test_step = (duration - start_t - step) / max(test_count, 1)

    best_ssim = -1.0
    best_t = duration
    results = []

    for i in range(test_count):
        t = start_t + i * test_step
        if t >= duration:
            break
        test_path = os.path.join(out_dir, f"_loop_test_{i:03d}.png")
        extract_frame_at(video_path, t, test_path)
        ssim = compute_ssim_simple(first_frame, test_path)
        results.append({"t": round(t, 4), "ssim": round(ssim, 6)})
        if ssim > best_ssim:
            best_ssim = ssim
            best_t = t
        os.remove(test_path)

    os.remove(first_frame)

    is_seamless = best_ssim > 0.92
    return {
        "loop_point_sec": round(best_t, 4),
        "loop_ssim": round(best_ssim, 6),
        "loop_type": "seamless" if is_seamless else ("near_seamless" if best_ssim > 0.8 else "cut"),
        "scan_results": results
    }


def extract_frames(video_path: str, num_frames: int, out_dir: str, detect_loop: bool, hi_res_pairs: int = 3) -> dict:
    os.makedirs(out_dir, exist_ok=True)
    info = get_video_info(video_path)

    video_stream = next(
        (s for s in info.get("streams", []) if s.get("codec_type") == "video"),
        None
    )
    if not video_stream:
        print("No video stream found", file=sys.stderr)
        sys.exit(1)

    duration = float(info["format"].get("duration", 0))
    width = int(video_stream.get("width", 0))
    height = int(video_stream.get("height", 0))

    r_frame_rate = video_stream.get("r_frame_rate", "30/1")
    num_str, den_str = r_frame_rate.split("/")
    fps = int(num_str) / int(den_str) if int(den_str) else 30.0
    total_frames = int(duration * fps)

    codec = video_stream.get("codec_name", "unknown")
    pix_fmt = video_stream.get("pix_fmt", "unknown")
    bit_rate = int(info["format"].get("bit_rate", 0))

    # Loop detection
    loop_info = None
    if detect_loop:
        print("Detecting loop point...")
        loop_info = detect_loop_point(video_path, out_dir, duration, fps)
        print(f"  Loop point: {loop_info['loop_point_sec']}s (SSIM={loop_info['loop_ssim']:.4f}, type={loop_info['loop_type']})")

    # Extract evenly-spaced frames
    effective_duration = loop_info["loop_point_sec"] if loop_info else duration
    timestamps = [round((effective_duration * i) / num_frames, 4) for i in range(num_frames)]

    frame_paths = []
    for i, t in enumerate(timestamps):
        out_path = os.path.join(out_dir, f"frame_{i:03d}.png")
        extract_frame_at(video_path, t, out_path)
        frame_paths.append(out_path)
        print(f"  [{i+1}/{num_frames}] t={t:.3f}s -> {out_path}")

    # Also extract first and last frame for seam comparison
    seam_first = os.path.join(out_dir, "seam_first.png")
    seam_last = os.path.join(out_dir, "seam_last.png")
    extract_frame_at(video_path, 0.0, seam_first)
    extract_frame_at(video_path, effective_duration - (1.0 / fps), seam_last)
    seam_ssim = compute_ssim_simple(seam_first, seam_last)
    print(f"  Seam SSIM (first vs last): {seam_ssim:.4f}")

    # Compute adjacent frame SSIMs for motion magnitude
    adjacent_ssims = []
    for i in range(len(frame_paths) - 1):
        ssim = compute_ssim_simple(frame_paths[i], frame_paths[i + 1])
        adjacent_ssims.append(round(ssim, 6))

    # Hi-res consecutive frame pairs for per-shape motion measurement
    hi_res_pair_data = []
    if hi_res_pairs > 0:
        interval = 1.0 / fps
        for p in range(hi_res_pairs):
            t_base = round(effective_duration * p / hi_res_pairs, 4)
            if t_base + interval >= effective_duration:
                t_base = max(0, effective_duration - interval * 2)
            path_a = os.path.join(out_dir, f"hires_pair_{p:02d}_a.png")
            path_b = os.path.join(out_dir, f"hires_pair_{p:02d}_b.png")
            extract_frame_at(video_path, t_base, path_a)
            extract_frame_at(video_path, t_base + interval, path_b)
            hi_res_pair_data.append({
                "timestamp": t_base,
                "paths": [os.path.abspath(path_a), os.path.abspath(path_b)],
                "interval_sec": round(interval, 6),
            })
            print(f"  [hi-res {p}] t={t_base:.4f}s, interval={interval:.6f}s")

    meta = {
        "source": os.path.abspath(video_path),
        "source_filename": os.path.basename(video_path),
        "duration_sec": round(duration, 4),
        "effective_duration_sec": round(effective_duration, 4),
        "fps": round(fps, 2),
        "total_frames": total_frames,
        "resolution": {"width": width, "height": height},
        "aspect_ratio": f"{width}:{height}",
        "aspect_ratio_decimal": round(width / height, 6) if height else 0,
        "codec": codec,
        "pixel_format": pix_fmt,
        "bit_rate": bit_rate,
        "extracted_frames": num_frames,
        "timestamps": timestamps,
        "frame_paths": [os.path.abspath(p) for p in frame_paths],
        "seam_first": os.path.abspath(seam_first),
        "seam_last": os.path.abspath(seam_last),
        "seam_ssim": round(seam_ssim, 6),
        "adjacent_frame_ssims": adjacent_ssims,
        "motion_magnitude": "static" if all(s > 0.995 for s in adjacent_ssims)
            else "subtle" if all(s > 0.97 for s in adjacent_ssims)
            else "moderate" if all(s > 0.90 for s in adjacent_ssims)
            else "high",
    }

    meta["hi_res_pairs"] = hi_res_pair_data

    if loop_info:
        meta["loop_detection"] = loop_info

    meta_path = os.path.join(out_dir, "meta.json")
    with open(meta_path, "w") as f:
        json.dump(meta, f, indent=2)
    print(f"\n  Metadata -> {meta_path}")
    return meta


def main():
    parser = argparse.ArgumentParser(description="Extract key frames from a looping video")
    parser.add_argument("video", help="Path to the video file")
    parser.add_argument("--frames", type=int, default=24, help="Number of frames to extract (default: 24)")
    parser.add_argument("--out-dir", default="./video-blueprint-frames", help="Output directory")
    parser.add_argument("--detect-loop", action="store_true", default=True, help="Auto-detect loop point (default: True)")
    parser.add_argument("--no-detect-loop", dest="detect_loop", action="store_false")
    parser.add_argument("--hi-res-pairs", type=int, default=3, help="Number of hi-res consecutive frame pairs (default: 3)")
    args = parser.parse_args()

    if not os.path.isfile(args.video):
        print(f"File not found: {args.video}", file=sys.stderr)
        sys.exit(1)

    print(f"Extracting {args.frames} frames from: {args.video}")
    meta = extract_frames(args.video, args.frames, args.out_dir, args.detect_loop, args.hi_res_pairs)
    print(f"\nDone. {meta['resolution']['width']}x{meta['resolution']['height']}, "
          f"{meta['duration_sec']:.3f}s ({meta['effective_duration_sec']:.3f}s effective), "
          f"{meta['fps']:.1f}fps, motion={meta['motion_magnitude']}")


if __name__ == "__main__":
    main()