"""T2: extract-frames.py hi-res pairs tests (Red Phase)."""

import json
import importlib.util
import sys
from pathlib import Path

import pytest

_script_path = Path(__file__).resolve().parent.parent / "extract-frames.py"
_spec = importlib.util.spec_from_file_location("extract_frames", _script_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
extract_frames = _mod.extract_frames
get_video_info = _mod.get_video_info


# We need a short test video. Generate one with ffmpeg if not present.
TEST_VIDEO = Path(__file__).resolve().parent / "fixtures" / "test_1s.mp4"
TEST_OUT = Path(__file__).resolve().parent / "fixtures" / "hires_test_out"


@pytest.fixture(autouse=True)
def setup_test_video():
    """Create a 1-second test video with ffmpeg."""
    import subprocess
    fixtures = TEST_VIDEO.parent
    fixtures.mkdir(parents=True, exist_ok=True)
    if not TEST_VIDEO.exists():
        subprocess.run([
            "ffmpeg", "-y", "-v", "quiet",
            "-f", "lavfi", "-i", "color=c=red:size=100x100:rate=30:d=1",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            str(TEST_VIDEO)
        ], check=True)
    yield
    # Cleanup output dir
    import shutil
    if TEST_OUT.exists():
        shutil.rmtree(TEST_OUT)


def test_hires_pairs_default_3():
    """T2 #1: --hi-res-pairs 3 produces 6 hi-res frame files."""
    meta = extract_frames(str(TEST_VIDEO), 4, str(TEST_OUT), detect_loop=False, hi_res_pairs=3)
    hires_files = list(TEST_OUT.glob("hires_pair_*.png"))
    assert len(hires_files) == 6, f"Expected 6 hi-res files, got {len(hires_files)}"


def test_hires_pairs_in_meta():
    """T2 #2: meta.json contains hi_res_pairs array with 3 items."""
    meta = extract_frames(str(TEST_VIDEO), 4, str(TEST_OUT), detect_loop=False, hi_res_pairs=3)
    assert "hi_res_pairs" in meta
    assert len(meta["hi_res_pairs"]) == 3
    for pair in meta["hi_res_pairs"]:
        assert "timestamp" in pair
        assert "paths" in pair
        assert len(pair["paths"]) == 2
        assert "interval_sec" in pair


def test_hires_interval_matches_fps():
    """T2 #3: hi-res pair interval = 1/fps."""
    meta = extract_frames(str(TEST_VIDEO), 4, str(TEST_OUT), detect_loop=False, hi_res_pairs=3)
    fps = meta["fps"]
    expected_interval = round(1.0 / fps, 6)
    for pair in meta["hi_res_pairs"]:
        assert abs(pair["interval_sec"] - expected_interval) < 0.001, \
            f"interval {pair['interval_sec']} != expected {expected_interval}"


def test_no_hires_when_disabled():
    """T2 #4: --hi-res-pairs 0 produces no hi-res files."""
    meta = extract_frames(str(TEST_VIDEO), 4, str(TEST_OUT), detect_loop=False, hi_res_pairs=0)
    hires_files = list(TEST_OUT.glob("hires_pair_*.png"))
    assert len(hires_files) == 0
    assert meta.get("hi_res_pairs", []) == []