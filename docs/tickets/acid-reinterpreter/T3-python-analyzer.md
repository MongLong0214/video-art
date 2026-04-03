# T3: Step 2 — Python Audio Analyzer

**Size**: L
**Depends**: T2
**Milestone**: M1
**AC**: AC-3.1 ~ AC-3.8

## Goal
각 stem에 특화된 분석 수행. 단일 Python 스크립트, CLI 실행.

## Implementation: `scripts/lib/acid/analyze.py`

### CLI
```
uv run --with madmom,crepe,librosa,essentia,soundfile,numpy python scripts/lib/acid/analyze.py \
  --drums stems/drums.wav \
  --bass stems/bass.wav \
  --other stems/other.wav \
  --mix input.wav \
  --out analysis.json \
  --range-start 0 --range-end 20
```

### 분석 모듈

#### drums.wav → kick/snare/hat 분리 (3단계, PRD AC-3.1)
1. **onset 추출**: madmom RNNOnsetProcessor → onset activation → peak picking → 포지션 후보
2. **spectral 분류**: 각 onset 위치의 주파수 스펙트럼 분석
   - kick: <200Hz 에너지 우세
   - snare: 200-5000Hz 넓은 대역
   - hat: >5000Hz 에너지 우세
   - 분류 confidence 부여
3. **BPM grid quantize**: 감지된 BPM 기준 nearest 16th note에 스냅

#### bass.wav → 노트 추출 (5단계, PRD AC-3.2)
1. **CREPE frames**: pitch tracking (model='full', step_size=10) → frame-level (time, freq, confidence)
2. **voiced mask**: confidence 0.8+ 프레임만 채택
3. **hysteresis smoothing**: 연속 동일 피치 프레임 → 단일 노트로 병합 (note segmentation)
4. **MIDI snapping**: nearest semitone으로 quantize → {time, freq, midi, duration, velocity, confidence}
5. **slide 추론**: 인접 노트 피치 차이 > 2 semitone + gap < 50ms → slide=true

#### other.wav → riff 노트 추출
- CREPE pitch tracking (동일 방법)
- mid-high 레인지 (>220Hz) 노트

#### full mix → key, bpm, energy, structure
- essentia KeyExtractor → root + mode + confidence (없으면 key=None + warning)
- librosa beat_track + essentia RhythmExtractor → BPM 앙상블
- librosa RMS → energy curve (hop_length=512, 초당 1포인트로 다운샘플)
- librosa spectral_centroid → spectral centroid curve
- librosa onset_strength + novelty → 구조 segmentation (build/drop/break)

#### 구간 자동 선택 (--range-start/end 미지정 시)
- energy curve에서 rolling window (20초) 최대 합산 구간
- 해당 구간의 start/end를 selected_range로 출력

### 출력
- `analysis.json` — PRD §4.5 스키마 준수

### 에러 처리
- essentia 미설치 → key=None, warnings에 추가
- CREPE 실패 → bass notes = [], warnings에 추가
- madmom 실패 → drums = empty, abort (필수)

## TDD Spec
- `scripts/lib/acid/analyze.test.ts` (TS에서 Python subprocess 호출 테스트)
  - test: "produces valid analysis.json" — 실제 테스트 WAV로 실행 → Zod 검증 통과
  - test: "detects BPM within ±1" — 126 BPM 테스트 파일 → bpm.value ∈ [125, 127]
  - test: "extracts drum onsets" — drums 포지션 배열 길이 > 0
  - test: "extracts bass notes with CREPE" — bass notes 배열 길이 > 0, confidence > 0.8
  - test: "handles missing essentia gracefully" — key=None + warning 포함
  - test: "selects energy peak range when no range specified" — selected_range 존재
  - test: "exits with code 1 on invalid input" — 빈 WAV 입력 시 exit 1
  - test: "infers slide from adjacent notes" — 피치 차 > 2 semitone + gap < 50ms → slide=true
  - test: "quantizes drum onsets to BPM grid" — 126 BPM → onsets snap to 16th grid
  - test: "falls back to bass histogram when key confidence low" — essentia confidence < 0.6 → root = bass mode
