# T1: 하이브리드 Python 분석 엔진 (librosa + essentia + madmom)

**PRD Ref**: PRD-track-analyzer v0.3 > US-1
**Priority**: P0 (Blocker)
**Size**: L (8-16h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
WAV/FLAC/MP3 입력 → 18종 분석 지표 추출. librosa(HPSS, spectral) + essentia(Key, BPM, Loudness, Danceability) + madmom(BPM 교차검증) 하이브리드 엔진. (demucs 소스 분리는 T3 범위)

## 2. Acceptance Criteria
- [ ] AC-1: `python3 audio/analyzer/analyze_track.py <file> <output_dir>` → analysis.json 생성
- [ ] AC-2: **BPM — 2중 교차검증**:
  - essentia `RhythmExtractor2013` (1차)
  - librosa `beat_track` + tempogram (2차)
  - half/double 보정 + genre range clamping + confidence score
- [ ] AC-3: **Key — essentia `KeyExtractor`** (장/단조 자동 구분). 수동 Krumhansl 제거
- [ ] AC-4: Kick pattern — librosa HPSS percussive → 40-120Hz BP → onset detect
- [ ] AC-5: Hi-hat pattern — librosa HPSS percussive → 8kHz+ HP → onset detect
- [ ] AC-6: Bass type — 분류 threshold:
  - `sub`: centroid < 200Hz AND variance < 50Hz² AND flux < 0.3
  - `rolling`: centroid 200-800Hz AND variance 50-200Hz²
  - `acid`: flux > 0.5 AND centroid > 500Hz
- [ ] AC-7: Structure — librosa multi-feature agglomerative segmentation
- [ ] AC-8: **18종 지표 전부** JSON 출력 (nullable: 실패 시 null + warnings)
- [ ] AC-9: 에너지 세그먼트 max 100개 캡
- [ ] AC-10: 10분+ 파일: 메모리 경고 로깅
- [ ] AC-11: ANALYSIS_FIELDS 상수 목록 (18개 필드명 명시적 열거):
  ```python
  ANALYSIS_FIELDS = [
      "bpm", "key", "spectral_centroid", "spectral_bandwidth", "spectral_rolloff",
      "energy_curve", "onset_density", "frequency_balance", "dynamic_range",
      "stereo_width", "kick_pattern", "hat_pattern", "bass_profile",
      "structure", "loudness", "mfcc", "spectral_contrast", "danceability",
  ]
  ```
- [ ] AC-12: Python 3.9+ 버전 체크
- [ ] AC-13: requirements.txt 버전 핀:
  ```
  librosa>=0.10.0,<1.0
  essentia>=2.1.0
  numpy>=1.24.0
  soundfile>=0.12.0
  ```
  ~~madmom 제거: numpy>=1.24 비호환 (np.float removed), 2019년 이후 미업데이트~~
  **M1 Mac 설치**: `pip install essentia` (TensorFlow 제외 CPU 버전). ARM64 wheel 미제공 시 Rosetta 2 fallback
- [ ] AC-14: **Loudness — essentia EBU R128** (pyloudnorm 제거). LUFS, true peak, LRA
- [ ] AC-15: BPM 2중 교차검증 알고리즘:
  ```
  candidates = [essentia_bpm, librosa_bpm]
  for c in candidates: also check c*2, c/2
  consensus = candidate closest to genre range median
  confidence = 1.0 if both agree within 3%, 0.7 if half/double match, 0.5 otherwise
  ```
- [ ] AC-16: **Danceability — essentia `Danceability`** → score (0~3) + DPM (danceability per minute)

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Expected |
|---|-----------|------|----------|
| 1 | `analyze_track.py exists` | Unit | file exists |
| 2 | `requirements.txt has essentia` | Unit | contains "essentia" AND NOT "madmom" |
| 3 | `analysis.json has 18 ANALYSIS_FIELDS` | Integration | 18 keys, 필드명 목록 검증 |
| 4 | `bpm has confidence score` | Integration | confidence 0-1 |
| 5 | `bpm uses 2-way cross-validation` | Unit | script contains "RhythmExtractor" AND "beat_track" |
| 6 | `key uses essentia KeyExtractor` | Unit | script contains "KeyExtractor" |
| 7 | `key field is string or null` | Integration | "G#m" format |
| 8 | `bass_profile has type field` | Integration | sub/rolling/acid |
| 9 | `structure has segments array` | Integration | length > 0 |
| 10 | `energy_curve max 100 segments` | Integration | length <= 100 |
| 11 | `kick_pattern has positions array` | Integration | array |
| 12 | `hat_pattern has positions array` | Integration | array |
| 13 | `bpm half/double correction` | Integration | 60-200 range |
| 14 | `loudness has LUFS field (EBU R128)` | Integration | LUFS < 0 |
| 15 | `loudness uses essentia not pyloudnorm` | Unit | script contains "LoudnessEBUR128", NOT "pyloudnorm" |
| 16 | `danceability has score field` | Integration | score 0-3 |
| 17 | `analysis.json size < 1MB` | Integration | file size check |
| 18 | `warnings array exists` | Integration | array (empty OK) |
| 19 | `Python 3.9+ version check` | Unit | contains "sys.version_info" |
| 20 | `no pyloudnorm dependency` | Unit | requirements.txt NOT contains "pyloudnorm" |

Test file: `scripts/lib/track-analyzer.test.ts` (**T1에서 Create**. T2/T3/T4가 추가)

### 3.3 Mock/Setup Required
- hasPython 동기 감지: `try { execSync("python3 -c 'import librosa; import essentia'"); return true } catch { return false }`
- CI fixture fallback: `hasReferenceWav ? referenceWav : FIXTURE_WAV` (reference WAV 없으면 test-sine.wav 사용)
- hasReferenceWav: `fs.existsSync("audio/references/*.wav")`
- `describe.skipIf(!hasPython || !hasReferenceWav)` 패턴
- CI 대안: `audio/analyzer/test-fixtures/test-sine.wav` (합성 사인파, git 포함)
- CI fixture 존재 확인: `beforeAll`에서 fixture 유무 검증 → 없으면 skip + 경고

## 4. Implementation Guide

### 4.1 Files
| File | Change Type |
|------|------------|
| `audio/analyzer/analyze_track.py` | Create (or Rewrite from v0.2) |
| `audio/analyzer/requirements.txt` | Create (essentia, madmom, librosa, numpy, soundfile) |
| `audio/analyzer/test-fixtures/test-sine.wav` | Create (CI fixture) |
| `.gitignore` | Modify (audio/references/) |

### 4.2 엔진별 역할 분담
```
librosa: HPSS → y_harm, y_perc
         spectral_centroid, bandwidth, rolloff, contrast
         MFCC (13 coefficients)
         RMS energy curve (max 100)
         onset_density
         frequency_balance (STFT bands)
         dynamic_range (crest, RMS)
         stereo_width (mid/side)
         kick_pattern (y_perc + 40-120Hz BP)
         hat_pattern (y_perc + 8kHz+ HP)
         bass_profile (STFT <500Hz)
         structure (multi-feature agglom)

essentia: BPM (RhythmExtractor2013)
          Key (KeyExtractor)
          Loudness (LoudnessEBUR128)
          Danceability

madmom:   BPM (RNNBeatProcessor + DBNBeatTrackingProcessor)
```
