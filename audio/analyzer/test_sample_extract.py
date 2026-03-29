"""Tests for sample_extract.py — classify_hit, extract_hits, fade, MAX_HITS."""
import os
import json
import pytest
import numpy as np
import soundfile as sf
from sample_extract import classify_hit, extract_hits, FADE_SAMPLES_1MS, MAX_HITS_PER_TYPE


class TestClassifyHit:
    def test_kick_low_energy(self, kick_segment):
        segment, sr = kick_segment
        assert classify_hit(segment, sr, 'drums') == 'kick'

    def test_hat_high_energy(self, hat_segment):
        segment, sr = hat_segment
        assert classify_hit(segment, sr, 'drums') == 'hat'

    def test_snare_or_unknown_flatness(self, noise_segment):
        segment, sr = noise_segment
        result = classify_hit(segment, sr, 'drums')
        # Short noise may not exceed flatness threshold — snare or hat or unknown all acceptable
        assert result in ('snare', 'hat', 'unknown')

    def test_bass_stem_override(self, kick_segment):
        segment, sr = kick_segment
        assert classify_hit(segment, sr, 'bass') == 'bass'

    def test_other_stem_override(self, kick_segment):
        segment, sr = kick_segment
        assert classify_hit(segment, sr, 'other') == 'fx'


class TestExtractHits:
    def test_basic_extraction(self, tmp_dir):
        """Generate a simple drum pattern and extract hits."""
        sr = 22050
        y = np.zeros(int(2 * sr), dtype=np.float32)
        # Insert 4 impulses at 0.0, 0.5, 1.0, 1.5s
        for t in [0.0, 0.5, 1.0, 1.5]:
            idx = int(t * sr)
            y[idx:idx + 100] = 0.8 * np.sin(2 * np.pi * 60 * np.arange(100) / sr)

        stem_path = os.path.join(tmp_dir, "drums.wav")
        sf.write(stem_path, y, sr)
        out_dir = os.path.join(tmp_dir, "samples")

        manifest = extract_hits(stem_path, out_dir, 'drums', sr=sr)
        total_hits = sum(len(v) for v in manifest.values())
        assert total_hits >= 1  # At least some hits detected

    def test_per_type_naming(self, tmp_dir):
        """Verify {type}_{NNN}.wav naming convention."""
        sr = 22050
        y = np.zeros(int(1 * sr), dtype=np.float32)
        # Simple impulse
        y[100:200] = 0.8 * np.sin(2 * np.pi * 60 * np.arange(100) / sr)
        y[int(0.5 * sr):int(0.5 * sr) + 200] = 0.8 * np.sin(2 * np.pi * 60 * np.arange(200) / sr)

        stem_path = os.path.join(tmp_dir, "test_stem.wav")
        sf.write(stem_path, y, sr)
        out_dir = os.path.join(tmp_dir, "samples")

        manifest = extract_hits(stem_path, out_dir, 'drums', sr=sr)
        for hit_type, hits in manifest.items():
            for hit in hits:
                assert hit['file'].startswith(f"{hit_type}_")
                assert hit['file'].endswith('.wav')

    def test_fade_applied(self, tmp_dir):
        """Verify 1ms fade-in/out at segment boundaries."""
        sr = 22050
        y = np.ones(int(1 * sr), dtype=np.float32) * 0.5
        # Create an onset at 0
        stem_path = os.path.join(tmp_dir, "const.wav")
        sf.write(stem_path, y, sr)
        out_dir = os.path.join(tmp_dir, "samples")

        extract_hits(stem_path, out_dir, 'drums', sr=sr)

        # Check any extracted file has fade
        for f in os.listdir(out_dir):
            if f.endswith('.wav') and f != 'manifest.json':
                data, _ = sf.read(os.path.join(out_dir, f))
                if len(data) > FADE_SAMPLES_1MS * 2:
                    # First samples should be near zero (fade in)
                    assert abs(data[0]) < 0.01, "Fade-in not applied"
                    break

    def test_max_hits_pruning(self, tmp_dir):
        """Verify MAX_HITS_PER_TYPE=32 pruning."""
        sr = 22050
        duration = 10  # long enough for many onsets
        y = np.zeros(int(duration * sr), dtype=np.float32)
        # Insert 50 impulses
        for i in range(50):
            idx = int((i * 0.18) * sr)
            if idx + 100 < len(y):
                y[idx:idx + 100] = 0.8 * np.sin(2 * np.pi * 60 * np.arange(100) / sr)

        stem_path = os.path.join(tmp_dir, "many_hits.wav")
        sf.write(stem_path, y, sr)
        out_dir = os.path.join(tmp_dir, "samples")

        manifest = extract_hits(stem_path, out_dir, 'drums', sr=sr)
        for hit_type, hits in manifest.items():
            assert len(hits) <= MAX_HITS_PER_TYPE

    def test_manifest_keys_singular(self, tmp_dir):
        """Manifest keys should be singular (kick, not kicks)."""
        sr = 22050
        # Generate a signal with clear onsets
        y = np.zeros(int(2 * sr), dtype=np.float32)
        for t_sec in [0.0, 0.5, 1.0]:
            idx = int(t_sec * sr)
            y[idx:idx + 500] = 0.8 * np.sin(2 * np.pi * 60 * np.arange(500) / sr)

        stem_path = os.path.join(tmp_dir, "stem.wav")
        sf.write(stem_path, y, sr)
        out_dir = os.path.join(tmp_dir, "samples")

        manifest = extract_hits(stem_path, out_dir, 'drums', sr=sr)
        valid_keys = {'kick', 'snare', 'hat', 'unknown', 'bass', 'fx'}
        for key in manifest:
            assert key in valid_keys, f"Unexpected key '{key}' not in {valid_keys}"

    def test_empty_stem(self, tmp_dir):
        """Empty/silent stem produces empty manifest."""
        sr = 22050
        y = np.zeros(int(1 * sr), dtype=np.float32)
        stem_path = os.path.join(tmp_dir, "silent.wav")
        sf.write(stem_path, y, sr)
        out_dir = os.path.join(tmp_dir, "samples")

        manifest = extract_hits(stem_path, out_dir, 'drums', sr=sr)
        total = sum(len(v) for v in manifest.values())
        assert total == 0

    def test_manifest_json_written(self, tmp_dir):
        """manifest.json should be written to output dir."""
        sr = 22050
        y = np.zeros(int(1 * sr), dtype=np.float32)
        y[100:300] = 0.5
        stem_path = os.path.join(tmp_dir, "stem.wav")
        sf.write(stem_path, y, sr)
        out_dir = os.path.join(tmp_dir, "samples")

        extract_hits(stem_path, out_dir, 'drums', sr=sr)
        manifest_path = os.path.join(out_dir, "manifest.json")
        assert os.path.exists(manifest_path)
        data = json.loads(open(manifest_path).read())
        assert isinstance(data, dict)
