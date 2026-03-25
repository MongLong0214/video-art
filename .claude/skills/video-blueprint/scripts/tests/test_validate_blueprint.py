"""T1: v3 Schema validation tests (Red Phase).
All tests should FAIL before implementation."""

import json
import copy
import sys
from pathlib import Path

import pytest

import importlib.util

_script_path = Path(__file__).resolve().parent.parent / "validate-blueprint.py"
_spec = importlib.util.spec_from_file_location("validate_blueprint", _script_path)
_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_mod)
validate = _mod.validate


# ── Fixtures ─────────────────────────────────────────────

@pytest.fixture
def v2_bp():
    """Minimal valid v2 blueprint."""
    return {
        "meta": {"source_file": "test.mov", "duration_sec": 10.0, "fps": 60,
                 "loop_type": "seamless", "loop_point_sec": 10.0,
                 "loop_mechanism": "test loop"},
        "canvas": {"width": 800, "height": 600, "background_color": "#000000"},
        "palette": {"colors": [{"id": "c1", "hex": "#FF0000", "role": "stroke"}],
                    "gradient_maps": []},
        "layers": [{"id": "l1", "type": "shape_group", "blend_mode": "normal",
                    "opacity": 1.0,
                    "elements": [{"id": "e1", "shape": "rect", "count": 1,
                                  "center": [0.5, 0.5], "size": [1.0, 1.0],
                                  "corner_radius": 0, "rotation_deg": 0,
                                  "fill": "c1", "stroke": None,
                                  "parent_id": None, "offset_from_parent": [0, 0],
                                  "z_index": 0}]}],
        "motion": {"global_time_sec": 10.0, "easing_default": "linear",
                   "animations": [{"target_id": "e1", "property": "rotation_deg",
                                   "keyframes": [{"t": 0, "value": 0}, {"t": 1, "value": 360}],
                                   "easing": "linear", "loop": "repeat"}]},
        "constraints": {"spatial": {"dimension": "2d_flat"}, "style": {},
                        "composition": {}, "prohibitions": ["no 3D"]},
    }


@pytest.fixture
def v3_bp(v2_bp):
    """v3 blueprint with all new fields."""
    bp = copy.deepcopy(v2_bp)
    bp["layers"][0]["blend_mode"] = "additive"
    bp["layers"][0]["depth_attenuation"] = {"near": 0.7, "far": 0.15, "curve": "linear"}
    bp["layers"][0]["elements"][0]["rendering_method"] = "sdf_stroke"
    bp["layers"][0]["elements"][0]["repetition"] = {
        "type": "concentric", "count": 10, "scale_step": 0.82,
        "rotation_step_deg": 0, "offset_step": [0, 0],
        "color_cycle": ["c1"],
        "color_gradient": {"near": "c1", "far": "c1"},
        "stroke_depth": {"near_width_ratio": 0.013, "far_width_ratio": 0.003},
        "depth_fade": {"start_opacity": 0.7, "end_opacity": 0.15,
                       "fade_in_instances": 1.5, "fade_out_scale": 0.02},
        "per_instance_animation": {
            "property": "rotation_deg", "motion_type": "per_instance",
            "speed_formula": "linear",
            "base_speed_half_turns_per_loop": 1, "speed_step_per_instance": 1,
            "speed_ratio_per_instance": None, "speed_exponent": None,
        },
        "paired_shapes": [
            {"color_id": "c1", "height_factor": 0.78,
             "aspect_ratio": 0.58, "corner_radius_ratio": 0.40}
        ],
    }
    bp["layers"][0]["elements"][0]["glow"] = {
        "amplitude": 0.30, "decay_range": [60, 140], "depth_scaling": True
    }
    bp["effects"] = {
        "glow": {"enabled": True, "per_layer": True},
        "breathing": {"enabled": True, "amplitude": 0.012, "period_ratio": 0.5},
    }
    bp["layers"][0]["elements"][0]["unknown_effects"] = []
    return bp


# ── Tests 1-8 (original) ────────────────────────────────

def test_v2_blueprint_passes_v3_validation(v2_bp):
    """T1 #1: v2 blueprint must pass v3 validator."""
    result = validate(v2_bp)
    assert result.is_valid, f"v2 blueprint failed: {result.errors}"


def test_v3_full_blueprint_passes_validation(v3_bp):
    """T1 #2: Full v3 blueprint must pass."""
    result = validate(v3_bp)
    assert result.is_valid, f"v3 blueprint failed: {result.errors}"


def test_blend_mode_additive_accepted(v2_bp):
    """T1 #3: blend_mode 'additive' must be accepted."""
    v2_bp["layers"][0]["blend_mode"] = "additive"
    result = validate(v2_bp)
    assert result.is_valid


def test_per_instance_animation_linear(v3_bp):
    """T1 #4: speed_formula 'linear' + step must pass."""
    rep = v3_bp["layers"][0]["elements"][0]["repetition"]
    assert rep["per_instance_animation"]["speed_formula"] == "linear"
    result = validate(v3_bp)
    assert result.is_valid


def test_per_instance_animation_geometric(v3_bp):
    """T1 #5: speed_formula 'geometric' + ratio must pass."""
    rep = v3_bp["layers"][0]["elements"][0]["repetition"]
    rep["per_instance_animation"]["speed_formula"] = "geometric"
    rep["per_instance_animation"]["speed_ratio_per_instance"] = 2.0
    result = validate(v3_bp)
    assert result.is_valid


def test_zoom_inward_index_scroll(v3_bp):
    """T1 #6: zoom_inward + method index_scroll must pass."""
    rep = v3_bp["layers"][0]["elements"][0]["repetition"]
    rep["per_instance_animation"] = {
        "property": "zoom_inward", "motion_type": "shared_phase",
        "method": "index_scroll", "cycles_per_loop": 4,
        "base_exponent": 0.82, "disappear_at_scale": 0.003,
    }
    result = validate(v3_bp)
    assert result.is_valid


def test_invalid_speed_formula_rejected(v3_bp):
    """T1 #7: Unknown speed_formula must fail."""
    rep = v3_bp["layers"][0]["elements"][0]["repetition"]
    rep["per_instance_animation"]["speed_formula"] = "unknown_formula"
    result = validate(v3_bp)
    assert not result.is_valid or any("speed_formula" in w for w in result.warnings)


def test_effects_section_optional(v2_bp):
    """T1 #8: Blueprint without effects section must pass."""
    assert "effects" not in v2_bp
    result = validate(v2_bp)
    assert result.is_valid


# ── Tests 9-15 (new — T7 merged) ────────────────────────

def test_depth_attenuation_valid(v3_bp):
    """T1 #9: depth_attenuation with near >= far must pass."""
    da = v3_bp["layers"][0]["depth_attenuation"]
    assert da["near"] >= da["far"]
    result = validate(v3_bp)
    assert result.is_valid


def test_depth_attenuation_near_less_than_far_rejected(v3_bp):
    """T1 #10: depth_attenuation with near < far must fail/warn."""
    v3_bp["layers"][0]["depth_attenuation"] = {"near": 0.1, "far": 0.9, "curve": "linear"}
    result = validate(v3_bp)
    has_issue = (not result.is_valid) or any("depth_attenuation" in w for w in result.warnings)
    assert has_issue, "near < far should be flagged"


def test_paired_shapes_schema(v3_bp):
    """T1 #11: paired_shapes must have required keys."""
    ps = v3_bp["layers"][0]["elements"][0]["repetition"]["paired_shapes"]
    assert len(ps) > 0
    for p in ps:
        assert "color_id" in p
        assert "height_factor" in p
        assert "aspect_ratio" in p
        assert "corner_radius_ratio" in p
    result = validate(v3_bp)
    assert result.is_valid


def test_stroke_depth_schema(v3_bp):
    """T1 #12: stroke_depth must have near/far ratios."""
    sd = v3_bp["layers"][0]["elements"][0]["repetition"]["stroke_depth"]
    assert "near_width_ratio" in sd
    assert "far_width_ratio" in sd
    assert sd["near_width_ratio"] >= sd["far_width_ratio"]
    result = validate(v3_bp)
    assert result.is_valid


def test_color_gradient_schema(v3_bp):
    """T1 #13: color_gradient must have near/far color refs."""
    cg = v3_bp["layers"][0]["elements"][0]["repetition"]["color_gradient"]
    assert "near" in cg
    assert "far" in cg
    result = validate(v3_bp)
    assert result.is_valid


def test_depth_fade_schema(v3_bp):
    """T1 #14: depth_fade must have extended fields."""
    df = v3_bp["layers"][0]["elements"][0]["repetition"]["depth_fade"]
    assert "fade_in_instances" in df
    assert "fade_out_scale" in df
    result = validate(v3_bp)
    assert result.is_valid


def test_unknown_effects_array(v3_bp):
    """T1 #15: unknown_effects must be an array."""
    ue = v3_bp["layers"][0]["elements"][0].get("unknown_effects", [])
    assert isinstance(ue, list)
    result = validate(v3_bp)
    assert result.is_valid