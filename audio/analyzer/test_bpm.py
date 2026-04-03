"""Tests for BPM ensemble selection and confidence hardening."""

import pytest

from analyze_track import cross_validate_bpm


class TestCrossValidateBpm:
    def test_preserves_direct_house_tempo(self):
        result = cross_validate_bpm(124, 0.95, None, None)
        assert result["value"] == pytest.approx(124.0)
        assert result["confidence"] >= 0.7
        assert result["warnings"] == []

    def test_preserves_half_time_tempo_instead_of_doubling(self):
        result = cross_validate_bpm(70, 0.9, None, None)
        assert result["value"] == pytest.approx(70.0)
        assert result["value"] != pytest.approx(140.0)

    def test_prefers_dnb_direct_tempo_over_half_time_alias(self):
        result = cross_validate_bpm(174, 0.9, 87, None)
        assert result["value"] == pytest.approx(174.0)
        assert any(source["relation"] in ("direct", "double") for source in result["sources"])

    def test_keeps_ambient_tempo_without_genre_bias(self):
        result = cross_validate_bpm(90, 0.85, None, None)
        assert result["value"] == pytest.approx(90.0)
        assert result["value"] != pytest.approx(180.0)

    def test_returns_default_with_explicit_warning_when_no_sources(self):
        result = cross_validate_bpm(None, 0.0, None, None)
        assert result["value"] == pytest.approx(120.0)
        assert result["confidence"] == pytest.approx(0.2)
        assert result["sources"] == []
        assert result["warnings"]

    def test_lowers_confidence_when_detectors_disagree(self):
        result = cross_validate_bpm(None, 0.0, 140, 110)
        assert result["value"] == pytest.approx(140.0)
        assert result["confidence"] < 0.7
        assert result["warnings"]
        assert {source["name"] for source in result["sources"]} == {
            "librosa_beat",
            "librosa_tempogram",
        }
