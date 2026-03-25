"""T10: generate-sketch.py + EffectComposer tests (Red Phase)."""

import importlib.util
import sys
from pathlib import Path

import pytest

_script_path = Path(__file__).resolve().parent.parent / "generate-sketch.py"


def _import_sketch_gen():
    if not _script_path.exists():
        pytest.fail("generate-sketch.py not found — T10 not implemented yet")
    spec = importlib.util.spec_from_file_location("generate_sketch", _script_path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


@pytest.fixture
def bp():
    return {
        "meta": {"source_file": "psy.mov", "duration_sec": 10.0, "fps": 60},
        "canvas": {"width": 814, "height": 1308, "background_color": "#1E3020"},
        "palette": {"colors": [{"id": "bg", "hex": "#1E3020", "role": "bg"}]},
        "layers": [],
        "motion": {"global_time_sec": 10.0},
        "effects": {},
    }


@pytest.fixture
def bp_with_effects(bp):
    bp["effects"] = {
        "chromatic_aberration": {"enabled": True, "max_shift_ratio": 0.006, "radial": True},
        "vignette": {"enabled": True, "start_radius": 0.7, "edge_color": "#111111", "opacity": 0.85},
        "grain": {"enabled": True, "intensity": 0.02, "frame_rate": 24, "looped": True},
    }
    return bp


# ── Sketch generation tests ─────────────────────────────

def test_sketch_file_created(bp, tmp_path):
    """T10 #1: blueprint → .ts file generated."""
    mod = _import_sketch_gen()
    out = tmp_path / "test-sketch.ts"
    mod.generate_sketch(bp, str(out), "test")
    assert out.exists(), "Sketch file not created"


def test_sketch_exports_interface(bp, tmp_path):
    """T10 #2: Generated code has scene, camera, update, resize, dispose."""
    mod = _import_sketch_gen()
    out = tmp_path / "test-sketch.ts"
    mod.generate_sketch(bp, str(out), "test")
    content = out.read_text()
    for prop in ["scene", "camera", "update", "resize", "dispose"]:
        assert prop in content, f"Missing '{prop}' in sketch"


def test_main_ts_patch(bp, tmp_path):
    """T10 #3: main.ts patch contains IS_{NAME} + dynamic import."""
    mod = _import_sketch_gen()
    patch = mod.generate_main_patch(bp, "psy")
    assert "IS_PSY" in patch or "is_psy" in patch.lower() or "psy" in patch.lower()
    assert "import" in patch


def test_uniforms_bound(bp, tmp_path):
    """T10 #4: uTime, uResolution uniforms present."""
    mod = _import_sketch_gen()
    out = tmp_path / "test-sketch.ts"
    mod.generate_sketch(bp, str(out), "test")
    content = out.read_text()
    assert "uTime" in content
    assert "uResolution" in content


def test_tone_mapping_no(bp, tmp_path):
    """T10 #6: NoToneMapping referenced."""
    mod = _import_sketch_gen()
    patch = mod.generate_main_patch(bp, "test")
    assert "NoToneMapping" in patch or "toneMapping" in patch.lower()


def test_canvas_config_patch(bp, tmp_path):
    """T10 #7: canvas width/height/fps in main.ts patch."""
    mod = _import_sketch_gen()
    patch = mod.generate_main_patch(bp, "test")
    assert "814" in patch
    assert "1308" in patch


# ── EffectComposer tests (T11 merged) ───────────────────

def test_ca_pass_generated(bp_with_effects, tmp_path):
    """T10 #8: CA enabled → chromatic aberration code."""
    mod = _import_sketch_gen()
    post = mod.generate_post_shader(bp_with_effects)
    assert "aberration" in post.lower() or "shift" in post.lower() or "chromatic" in post.lower()


def test_vignette_pass_generated(bp_with_effects, tmp_path):
    """T10 #9: Vignette enabled → darkening code."""
    mod = _import_sketch_gen()
    post = mod.generate_post_shader(bp_with_effects)
    assert "vignette" in post.lower() or "vig" in post.lower()


def test_no_effects_no_composer(bp, tmp_path):
    """T10 #10: No effects → no EffectComposer."""
    mod = _import_sketch_gen()
    out = tmp_path / "test-sketch.ts"
    mod.generate_sketch(bp, str(out), "test")
    content = out.read_text()
    assert "EffectComposer" not in content or "direct render" in content.lower() or "renderer.render" in content


def test_utime_external_control(bp, tmp_path):
    """T10 #12: update(time) signature for external time control."""
    mod = _import_sketch_gen()
    out = tmp_path / "test-sketch.ts"
    mod.generate_sketch(bp, str(out), "test")
    content = out.read_text()
    assert "update" in content and "time" in content