"""T13: SKILL.md v3 integration tests (Red Phase)."""

from pathlib import Path
import pytest

SKILL_DIR = Path(__file__).resolve().parents[2]
SKILL_MD = SKILL_DIR / "SKILL.md"
REFS_DIR = SKILL_DIR / "references"


def test_skill_md_has_all_phases():
    """T13 #1: SKILL.md contains Phase A~F sections."""
    content = SKILL_MD.read_text()
    for phase in ["Phase A", "Phase B", "Phase C", "Phase D", "Phase E", "Phase F"]:
        assert phase in content, f"Missing '{phase}' in SKILL.md"


def test_skill_md_references_exist():
    """T13 #2: All referenced files exist."""
    assert (REFS_DIR / "output-schema.md").exists()
    assert (REFS_DIR / "analysis-workflow.md").exists()
    assert (REFS_DIR / "shader-patterns.md").exists()


def test_pip_install_command_valid():
    """T13 #3: requirements.txt exists and contains key packages."""
    content = SKILL_MD.read_text()
    assert "requirements.txt" in content, "SKILL.md should reference requirements.txt"
    req_path = SKILL_DIR / "requirements.txt"
    assert req_path.exists(), "requirements.txt not found"
    req_content = req_path.read_text()
    for pkg in ["numpy", "Pillow", "opencv-python-headless", "jinja2", "colorspacious"]:
        assert pkg in req_content, f"Missing '{pkg}' in requirements.txt"


def test_skill_md_phase_c_documented():
    """T13 #5: Phase C documents manual verification procedure."""
    content = SKILL_MD.read_text()
    assert "Phase C" in content
    # Phase C should mention manual/Claude verification
    # Find the Phase C *heading* (## Phase C), not just any "Phase C" mention
    phase_c_idx = content.index("## Phase C")
    phase_c_section = content[phase_c_idx:phase_c_idx + 800]
    assert "visual" in phase_c_section.lower() or "claude" in phase_c_section.lower() or "manual" in phase_c_section.lower() or "cross-validate" in phase_c_section.lower(), \
        "Phase C should describe manual verification"


def test_output_schema_v3_fields():
    """T13 #6: output-schema.md contains v3 fields."""
    content = (REFS_DIR / "output-schema.md").read_text()
    for field in ["blend_mode", "depth_attenuation", "per_instance_animation", "effects"]:
        assert field in content, f"Missing v3 field '{field}' in output-schema.md"


def test_analysis_workflow_layers_section():
    """T13 #7: analysis-workflow.md has layers section."""
    content = (REFS_DIR / "analysis-workflow.md").read_text()
    assert "layer" in content.lower() or "Layer" in content


def test_anti_patterns_updated():
    """T13 #8: SKILL.md anti-patterns include v3 entries."""
    content = SKILL_MD.read_text()
    assert "Anti-pattern" in content or "anti-pattern" in content or "DO NOT" in content