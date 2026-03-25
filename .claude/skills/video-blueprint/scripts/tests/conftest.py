"""Shared fixtures for video-blueprint tests."""

import json
import os
import sys
from pathlib import Path

import pytest


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line("markers", "integration: marks tests requiring real video frames")

# Add scripts directory to path so we can import modules
SCRIPTS_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(SCRIPTS_DIR))

FRAMES_DIR = Path(__file__).parents[4] / "video-blueprint-frames"


@pytest.fixture
def v2_blueprint():
    """Existing v2 blueprint.json (the one already in the project)."""
    bp_path = Path(__file__).parents[4] / "out" / "blueprints" / "psy-blueprint.json"
    if not bp_path.exists():
        bp_path = Path(__file__).parents[4] / "blueprint.json"
    if not bp_path.exists():
        pytest.skip("No v2 blueprint.json found")
    with open(bp_path) as f:
        return json.load(f)


@pytest.fixture
def v3_full_blueprint():
    """Full v3 blueprint with all new fields."""
    return {
        "meta": {
            "source_file": "test.mov",
            "duration_sec": 10.0,
            "fps": 60,
            "loop_type": "seamless",
            "loop_point_sec": 10.0,
            "loop_mechanism": "120-degree rotation with 3-color cycle",
        },
        "canvas": {
            "width": 814,
            "height": 1308,
            "aspect_ratio": "407:654",
            "coordinate_system": "center_origin",
            "background_color": "#1E3020",
        },
        "palette": {
            "colors": [
                {"id": "bg", "hex": "#1E3020", "role": "background"},
                {"id": "gold", "hex": "#7B6D42", "role": "stroke_a"},
                {"id": "burg", "hex": "#761B33", "role": "stroke_b"},
                {"id": "burg2", "hex": "#5C1729", "role": "stroke_b_far"},
                {"id": "navy", "hex": "#1C2F5F", "role": "stroke_c"},
            ],
            "gradient_maps": [],
        },
        "layers": [
            {
                "id": "layer_bg",
                "type": "shape_group",
                "blend_mode": "normal",
                "opacity": 1.0,
                "elements": [
                    {
                        "id": "el_bg",
                        "shape": "rect",
                        "count": 1,
                        "repetition": None,
                        "center": [0.5, 0.5],
                        "size": [1.0, 1.0],
                        "corner_radius": 0,
                        "rotation_deg": 0,
                        "fill": "bg",
                        "stroke": None,
                        "parent_id": None,
                        "offset_from_parent": [0, 0],
                        "z_index": 0,
                    }
                ],
            },
            {
                "id": "layer_back",
                "type": "shape_group",
                "blend_mode": "additive",
                "opacity": 1.0,
                "depth_attenuation": {"near": 0.7, "far": 0.15, "curve": "linear"},
                "elements": [
                    {
                        "id": "el_back_rects",
                        "shape": "rounded_rect",
                        "rendering_method": "sdf_stroke",
                        "count": 1,
                        "repetition": {
                            "type": "concentric",
                            "count": 10,
                            "scale_step": 0.82,
                            "rotation_step_deg": 0,
                            "offset_step": [0.0, 0.0],
                            "color_cycle": ["burg"],
                            "color_gradient": {"near": "burg", "far": "burg2"},
                            "depth_fade": {
                                "start_opacity": 0.7,
                                "end_opacity": 0.15,
                                "fade_in_instances": 1.5,
                                "fade_out_scale": 0.02,
                            },
                            "stroke_depth": {
                                "near_width_ratio": 0.013,
                                "far_width_ratio": 0.003,
                            },
                            "per_instance_animation": {
                                "property": "rotation_deg",
                                "motion_type": "per_instance",
                                "speed_formula": "linear",
                                "base_speed_half_turns_per_loop": 1,
                                "speed_step_per_instance": 1,
                                "speed_ratio_per_instance": None,
                                "speed_exponent": None,
                            },
                        },
                        "center": [0.5, 0.5],
                        "size": [0.75, 0.70],
                        "corner_radius": 0.35,
                        "rotation_deg": 0,
                        "fill": None,
                        "stroke": {"color_id": "burg", "width_ratio": 0.013},
                        "glow": {
                            "amplitude": 0.30,
                            "decay_range": [60, 140],
                            "depth_scaling": True,
                        },
                        "parent_id": None,
                        "offset_from_parent": [0, 0],
                        "z_index": 1,
                    }
                ],
            },
        ],
        "motion": {
            "global_time_sec": 10.0,
            "easing_default": "linear",
            "animations": [
                {
                    "target_id": "el_back_rects",
                    "property": "rotation_deg",
                    "keyframes": [{"t": 0.0, "value": 0}, {"t": 1.0, "value": 180}],
                    "easing": "linear",
                    "loop": "repeat",
                }
            ],
            "motion_constraints": {
                "max_velocity": {
                    "rotation_deg_per_sec": 18.0,
                    "scale_per_sec": 0,
                    "position_per_sec": 0,
                },
                "motion_character": "continuous_rotate",
            },
        },
        "effects": {
            "glow": {"enabled": True, "per_layer": True},
            "breathing": {"enabled": True, "amplitude": 0.012, "period_ratio": 0.5},
            "chromatic_aberration": {
                "enabled": True,
                "max_shift_ratio": 0.006,
                "radial": True,
            },
            "grain": {
                "enabled": True,
                "intensity": 0.02,
                "frame_rate": 24,
                "looped": True,
            },
            "vignette": {
                "enabled": True,
                "start_radius": 0.7,
                "edge_color": "#111111",
                "opacity": 0.85,
                "method": "multiply",
            },
        },
        "constraints": {
            "spatial": {
                "dimension": "2d_flat",
                "perspective": False,
                "camera_movement": False,
                "parallax": False,
            },
            "style": {
                "texture": "none",
                "glow": True,
                "blur": False,
                "particles": False,
                "lens_effects": False,
            },
            "composition": {
                "symmetry": "none",
                "alignment": "center",
                "overflow": "clip",
            },
            "prohibitions": ["no 3D depth or perspective", "no particle systems"],
        },
    }


def psy_frames_available():
    """Check if psy.mov frames are available for integration tests."""
    return (FRAMES_DIR / "frame_000.png").exists()


def skip_without_frames(reason="psy.mov frames not available"):
    return pytest.mark.skipif(not psy_frames_available(), reason=reason)