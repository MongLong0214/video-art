"""T8: Jinja2 shader template + T9: hybrid layer body tests (Red Phase)."""

import importlib.util
import sys
from pathlib import Path

import pytest

_script_path = Path(__file__).resolve().parent.parent / "generate-shader.py"


def _import_generator():
    if not _script_path.exists():
        pytest.fail("generate-shader.py not found — T8 not implemented yet")
    spec = importlib.util.spec_from_file_location("generate_shader", _script_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture
def minimal_blueprint():
    return {
        "canvas": {"width": 800, "height": 600, "background_color": "#1E3020"},
        "palette": {
            "colors": [
                {"id": "bg", "hex": "#1E3020", "role": "background"},
                {"id": "gold", "hex": "#7B6D42", "role": "stroke"},
            ],
        },
        "layers": [],
        "effects": {},
        "meta": {"duration_sec": 10.0, "fps": 60},
    }


@pytest.fixture
def full_blueprint():
    return {
        "canvas": {"width": 814, "height": 1308, "background_color": "#1E3020"},
        "palette": {
            "colors": [
                {"id": "bg", "hex": "#1E3020", "role": "background"},
                {"id": "gold", "hex": "#7B6D42", "role": "stroke_a"},
                {"id": "burg", "hex": "#761B33", "role": "stroke_b"},
                {"id": "navy", "hex": "#1C2F5F", "role": "stroke_c"},
            ],
        },
        "layers": [
            {
                "id": "layer_back", "blend_mode": "additive",
                "depth_attenuation": {"near": 0.7, "far": 0.15, "curve": "linear"},
                "elements": [{
                    "id": "el_back", "shape": "rounded_rect",
                    "rendering_method": "sdf_stroke",
                    "repetition": {
                        "type": "concentric", "count": 10, "scale_step": 0.82,
                        "per_instance_animation": {
                            "property": "rotation_deg", "motion_type": "per_instance",
                            "speed_formula": "linear",
                            "base_speed_half_turns_per_loop": 1,
                            "speed_step_per_instance": 1,
                        },
                        "stroke_depth": {"near_width_ratio": 0.013, "far_width_ratio": 0.003},
                    },
                    "glow": {"amplitude": 0.30, "decay_range": [60, 140], "depth_scaling": True},
                }],
            },
        ],
        "effects": {
            "breathing": {"enabled": True, "amplitude": 0.012, "period_ratio": 0.5},
        },
        "meta": {"duration_sec": 10.0, "fps": 60},
        "motion": {"global_time_sec": 10.0},
    }


# ── T8 Tests ─────────────────────────────────────────────

def test_template_renders_without_error(minimal_blueprint):
    """T8 #1: Minimal blueprint → Jinja2 renders without error."""
    mod = _import_generator()
    result = mod.render_shader(minimal_blueprint)
    assert isinstance(result, str)
    assert len(result) > 100, "Generated shader too short"


def test_uniforms_from_blueprint(minimal_blueprint):
    """T8 #2: Canvas 800x600 → uResolution uniform present."""
    mod = _import_generator()
    result = mod.render_shader(minimal_blueprint)
    assert "uniform vec2 uResolution" in result
    assert "uniform float uTime" in result


def test_sdf_library_included(minimal_blueprint):
    """T8 #3: Generated .frag contains sdRoundedBox function."""
    mod = _import_generator()
    result = mod.render_shader(minimal_blueprint)
    assert "sdRoundedBox" in result


def test_palette_defines(minimal_blueprint):
    """T8 #4: 2 palette colors → vec3 constants."""
    mod = _import_generator()
    result = mod.render_shader(minimal_blueprint)
    assert "vec3" in result
    # Background color should be present
    assert "0.118" in result or "1E3020" in result.upper() or "bg" in result.lower()


def test_layer_placeholder_exists(minimal_blueprint):
    """T8 #5: Layer placeholder marker exists."""
    mod = _import_generator()
    result = mod.render_shader(minimal_blueprint)
    assert "LAYER" in result, "Layer placeholder/section should exist"


def test_vite_glsl_syntax(full_blueprint):
    """T8 #6: Generated code has valid GLSL structure (precision, main, gl_FragColor)."""
    mod = _import_generator()
    result = mod.render_shader(full_blueprint)
    assert "precision" in result
    assert "void main()" in result
    assert "gl_FragColor" in result


# ── T9 Tests: Hybrid Layer Body ──────────────────────────

def test_back_layer_rotation_pattern(full_blueprint):
    """T9 #1: per_instance linear rotation → GLSL halfTurns pattern."""
    mod = _import_generator()
    render_layer = getattr(mod, "render_layer_body", None)
    assert render_layer is not None, "render_layer_body function not found"
    layer = full_blueprint["layers"][0]
    code = render_layer(layer, full_blueprint)
    assert "halfTurns" in code or "half" in code.lower() or "PI" in code, \
        f"Missing rotation pattern in: {code[:200]}"


def test_front_layer_zoom_pattern():
    """T9 #2: index_scroll zoom → pow(base, fi + fract(...)) pattern."""
    mod = _import_generator()
    render_layer = getattr(mod, "render_layer_body", None)
    assert render_layer is not None, "render_layer_body function not found"
    layer = {
        "id": "layer_front", "blend_mode": "additive",
        "elements": [{
            "id": "el_front", "shape": "rounded_rect",
            "rendering_method": "sdf_stroke",
            "repetition": {
                "type": "concentric", "count": 22, "scale_step": 0.82,
                "per_instance_animation": {
                    "property": "zoom_inward", "motion_type": "shared_phase",
                    "method": "index_scroll", "cycles_per_loop": 4,
                    "base_exponent": 0.82,
                },
            },
        }],
    }
    bp = {"meta": {"duration_sec": 10}, "motion": {"global_time_sec": 10}}
    code = render_layer(layer, bp)
    assert "pow" in code or "fract" in code, f"Missing zoom pattern in: {code[:200]}"


def test_additive_blend_output(full_blueprint):
    """T9 #3: blend_mode additive → col += in output."""
    mod = _import_generator()
    render_layer = getattr(mod, "render_layer_body", None)
    assert render_layer is not None
    layer = full_blueprint["layers"][0]
    code = render_layer(layer, full_blueprint)
    assert "col +=" in code, f"Missing additive blend (col +=) in: {code[:200]}"


def test_depth_attenuation_output(full_blueprint):
    """T9 #4: depth_attenuation → mix(near, far, ratio) pattern."""
    mod = _import_generator()
    render_layer = getattr(mod, "render_layer_body", None)
    assert render_layer is not None
    layer = full_blueprint["layers"][0]
    code = render_layer(layer, full_blueprint)
    assert "mix(" in code and ("0.7" in code or "0.15" in code), \
        f"Missing depth attenuation mix in: {code[:300]}"


def test_glow_output(full_blueprint):
    """T9 #5: glow config → exp decay pattern."""
    mod = _import_generator()
    render_layer = getattr(mod, "render_layer_body", None)
    assert render_layer is not None
    layer = full_blueprint["layers"][0]
    code = render_layer(layer, full_blueprint)
    assert "exp(" in code or "Glow" in code or "glow" in code, \
        f"Missing glow pattern in: {code[:300]}"


def test_shader_patterns_md_exists():
    """T9 #6: shader-patterns.md reference file exists."""
    patterns_path = Path(__file__).resolve().parents[2] / "references" / "shader-patterns.md"
    assert patterns_path.exists(), f"shader-patterns.md not found at {patterns_path}"