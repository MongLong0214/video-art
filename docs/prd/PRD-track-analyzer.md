# PRD: Reference Track Analyzer — 레퍼런스 트랙 분석 → 사운드 리크리에이션

**Version**: 0.3
**Author**: Isaac (AI-assisted)
**Date**: 2026-03-27
**Status**: Draft
**Size**: XL
**Scope**: Phase 1 — 하이브리드 분석 엔진 (librosa+essentia+~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트)) + 기존 SynthDef 파라미터 최적화 (70% 재현). Phase 2 (crepe + SynthDef 확장 90%+)는 별도 PRD.

---

## 1. Problem Statement

### 1.1 Background
현재 오디오 시스템의 프리셋은 수동 설계. 레퍼런스 트랙(Astrix, Ace Ventura 등)의 실제 사운드 특성을 분석하여 자동으로 프리셋/패턴을 생성하는 기능이 없어 프로덕션 품질이 낮음.

실제 분석 결과 (Void - Acid Carousel):
- BPM 137 (librosa 감지) — psytrance 기준 범위 내
- Key G# — chroma 분석 기반
- Low-freq 에너지 90.9% — 극도로 heavy bass
- Stereo width 0.08 — 거의 모노 (베이스 중심)
- 에너지 곡선: 30-50% 구간 drop (브레이크다운), 나머지 풀 에너지

### 1.2 Problem Definition
1. 레퍼런스 트랙의 실제 사운드 특성을 객관적으로 분석할 도구 없음
2. 분석 결과를 프리셋/패턴으로 자동 변환하는 파이프라인 없음
3. 기존 프리셋은 "상상"으로 설계 — 실제 프로 트랙과 괴리

### 1.3 Impact of Not Solving
- 프리셋이 장르 특성을 정확히 반영하지 못함
- 프로덕션 품질이 아마추어 수준에 머무름
- 레퍼런스 기반 작업 흐름 불가

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: **하이브리드 분석 엔진** — WAV/FLAC 입력 → 18종 분석 지표 추출. **librosa**(HPSS, spectral, MFCC) + **essentia**(Key, BPM, Loudness, Danceability) + **~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트)**(BPM 교차검증) 2중 엔진 (librosa+essentia)
- [ ] G2: **소스 분리** — demucs로 drums/bass/vocals/other 4트랙 분리 → 개별 분석
- [ ] G3: **프리셋 자동 생성** — 분석 결과 → 프리셋 JSON (기존 9종 SynthDef 파라미터 + FX 기본값 + BPM)
- [ ] G4: **패턴 초안 생성** — 킥/하이햇 onset 패턴 → Tidal 코드 초안
- [ ] G5: **scene.json 생성** — 에너지 곡선 → 섹션 구조 → scene.json audio 설정
- [ ] G6: **CLI** — `npm run analyze:track <file.wav>` 원커맨드

### 2.2 Non-Goals
- NG1: 새로운 SynthDef 추가 — acid bass, FM lead, granular pad, layered kick (Phase 2 범위)
- NG2: Wavetable/FM 합성, 필터 모델링 Moog/TB-303 (Phase 2 범위)
- NG2.5: crepe 피치 추적 — acid bass 피치 contour (Phase 2, SynthDef 확장 후)
- NG3: 실시간 분석 (오프라인 배치만)
- NG4: 멀티트랙 동시 분석
- NG5: GUI/웹 인터페이스

## 3. User Stories & Acceptance Criteria

### US-1: 트랙 전수 분석
**As a** 프로듀서, **I want** 레퍼런스 WAV 파일을 넣으면 18종 지표가 자동 분석되기를.

**Acceptance Criteria:**
- [ ] AC-1.1: `npm run analyze:track <file.wav>` → JSON 분석 리포트 출력
- [ ] AC-1.2: 분석 지표 18종 (하이브리드 2중 엔진 (librosa+essentia)):

| # | 지표 | 엔진 | 알고리즘 | 출력 |
|---|------|------|----------|------|
| 1 | BPM | **essentia + ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트) + librosa** | essentia RhythmExtractor2013 + ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트) RNNBeatProcessor + librosa beat_track — **2중 교차검증** + half/double 보정 | float + confidence score |
| 2 | Key / Scale | **essentia** | **KeyExtractor** (프로필 매칭, 장/단조 자동 구분) — 수동 Krumhansl 제거 | "G#m", "Am" 등 |
| 3 | Spectral Centroid | **librosa** | beat-sync 집계 | Hz (mean/max/min) |
| 4 | Spectral Bandwidth | **librosa** | | Hz |
| 5 | Spectral Rolloff | **librosa** | | Hz |
| 6 | Energy Curve | **librosa** | RMS (max 100 segments) | float[] |
| 7 | Onset Density | **librosa** | onset_detect | onsets/sec |
| 8 | Frequency Balance | **librosa** | STFT 밴드별 에너지 | low/mid/hi % |
| 9 | Dynamic Range | **librosa** | RMS stats | crest factor, RMS mean/max |
| 10 | Stereo Width | **librosa** | mid/side RMS ratio | 0~1 |
| 11 | Kick Pattern | **librosa** | HPSS percussive → 40-120Hz BP → onset | beat positions |
| 12 | Hi-hat Pattern | **librosa** | HPSS percussive → 8kHz+ HP → onset | beat positions |
| 13 | Bass Spectral Profile | **librosa** | STFT <500Hz: centroid + variance + flux → sub/rolling/acid | centroid, variance, type |
| 14 | Structure Segments | **librosa** | multi-feature agglomerative segmentation | intro/build/drop/break/outro |
| 15 | Loudness Profile | **essentia** | **EBU R128** (pyloudnorm 제거) | LUFS, true peak, LRA |
| 16 | MFCC | **librosa** | 13 coefficients | timbral fingerprint |
| 17 | Spectral Contrast | **librosa** | | clean vs distorted 구분 |
| 18 | **Danceability** | **essentia** | **Danceability 알고리즘** (DZC 기반) | 0~3 score + DFA array |

- [ ] AC-1.3: 분석 결과 JSON 저장: `out/analysis/{filename}/analysis.json`
- [ ] AC-1.4: 분석 소요 시간 < 60초 (demucs 제외). demucs 포함 시 < 4분 (5분 트랙, M1 Mac)
- [ ] AC-1.5: WAV, FLAC, MP3, AIFF 포맷 지원. **`validateFilePath` ALLOWED_EXTENSIONS에 `.flac`, `.mp3`, `.aiff` 추가**
- [ ] AC-1.6: 분석 결과 JSON 크기 < 1MB 강제. 에너지 세그먼트 max 100개 캡
- [ ] AC-1.7: 부분 분석 실패 시 해당 필드 `null` + `warnings[]` (전체 중단 안 함)

### US-2: AI 소스 분리
**As a** 프로듀서, **I want** 레퍼런스 트랙을 drums/bass/vocals/other로 분리하기를.

**Acceptance Criteria:**
- [ ] AC-2.1: demucs 소스 분리 → 4트랙 WAV (drums.wav, bass.wav, vocals.wav, other.wav)
- [ ] AC-2.2: **per-stem 분석 서브셋** (전수 아님): drums→onset/kick/hat pattern, bass→spectral/centroid/bass type, vocals→dynamics, other→spectral/stereo
- [ ] AC-2.3: 출력: `out/analysis/{filename}/stems/` 하위
- [ ] AC-2.4: demucs 미설치 시 skip + 경고 (분석은 원본으로 계속)

### US-3: 프리셋 자동 생성
**As a** 프로듀서, **I want** 분석 결과에서 프리셋 JSON이 자동 생성되기를.

**Acceptance Criteria:**
- [ ] AC-3.1: 분석 지표 → 프리셋 JSON 매핑:

| 분석 지표 | 프리셋 파라미터 | 매핑 로직 |
|----------|--------------|----------|
| BPM | bpm.default | 직접 사용 (2중 교차검증 후) |
| Key | (metadata) | essentia KeyExtractor 장/단조 |
| **Danceability** | **energy preset hint** | **score>2→high energy, <1→ambient** |
| Freq Balance low% | kick.drive, bass.cutoff, bass.envAmount | **룩업 테이블**: low>85%→drive=0.8+, low>70%→drive=0.5-0.7 |
| Spectral Centroid | EQ hiGain, hiFreq | **구간별**: <1500→hiGain=-1, 1500-3000→0, >3000→+2 |
| Spectral Contrast | saturate, drive (FX) | **고대비→clean**: sat=0.2. **저대비→distorted**: sat=0.6+ |
| Dynamic Range crest | compress, ratio, compAttack | **룩업**: crest<3→compress=0.8/ratio=6, crest>5→compress=0.3/ratio=2 |
| Bass type (sub/rolling/acid) | bass.cutoff, bass.resonance, bass.envAmount | **타입별 프로파일**: acid→cutoff=2000+res=0.7+env=0.8, sub→cutoff=400+res=0.2 |
| Onset Density | hat openness, hat patterns | **밀도별**: >8/s→closed(openness=0.05), <4/s→open(0.3+) |
| Kick Pattern | kick decay, click | **onset 간격 분석**: tight→decay=0.15, spaced→decay=0.35 |
| Energy Curve | scene sections | **multi-feature segmentation** → 섹션 경계 |
| MFCC distance | (검증용) | 생성 결과 vs 레퍼런스 MFCC 거리 → 재현 품질 점수 |

- [ ] AC-3.2: 생성된 프리셋이 기존 presetSchema Zod 검증 통과
- [ ] AC-3.3: 프리셋 저장: `audio/presets/generated/{filename}.json`
- [ ] AC-3.4: 기존 5종 프리셋과 동일 포맷. **`name` 필드 = 파일명 기반 자동 생성** (regex sanitize)
- [ ] AC-3.5: fxDefaults 14개 전부 매핑 (분석 파생 값 + 타입별 기본값 fallback)
- [ ] AC-3.6: 매핑 규칙은 **룩업 테이블 + 전문가 규칙** (단순 linear mapRange 금지)

### US-4: 패턴 초안 생성
**As a** 프로듀서, **I want** 킥/하이햇 패턴 분석에서 Tidal 코드 초안이 생성되기를.

**Acceptance Criteria:**
- [ ] AC-4.1: 킥 onset → Tidal 패턴 문자열: `"x [~ x] x [~ x]"` 형태
- [ ] AC-4.2: 하이햇 onset → Tidal 패턴 문자열
- [ ] AC-4.3: 출력: `out/analysis/{filename}/patterns.tidal` (참조용)
- [ ] AC-4.4: 16스텝 양자화 (1 bar = 16 subdivisions)

### US-5: scene.json 자동 생성
**As a** 프로듀서, **I want** 분석된 에너지 곡선에서 scene.json audio 설정이 자동 생성되기를.

**Acceptance Criteria:**
- [ ] AC-5.1: 에너지 곡선 → 섹션 감지 (energy drop/rise 변곡점)
- [ ] AC-5.2: 생성: `out/analysis/{filename}/scene-audio.json` (scene.json의 audio 필드)
- [ ] AC-5.3: genre 자동 감지 (BPM 범위 기반). **서브장르→부모장르 매핑**: psytrance→trance, melodic_techno→techno (audioSchema enum 호환)
- [ ] AC-5.4: preset 필드에 생성된 프리셋명 자동 설정

## 4. Technical Design

### 4.1 Architecture

```
npm run analyze:track <file.wav>
    │
    ├── [1] Python analyze-track.py (하이브리드 2중 엔진 (librosa+essentia))
    │   ├── librosa: HPSS, Spectral(5종), MFCC, Energy, Onsets, Dynamics, Stereo, Kicks, Hats, Bass, Structure
    │   ├── essentia: BPM(RhythmExtractor2013), Key(KeyExtractor), Loudness(EBU R128), Danceability
    │   ├── ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트): BPM(RNNBeatProcessor) — 교차검증
    │   ├── demucs: Source separation → 4 stems (T3)
    │   ├── Per-stem analysis (drums→kicks, bass→spectral)
    │   └── Output: analysis.json (18종 + warnings)
    │
    ├── [2] TS generate-preset.ts
    │   ├── analysis.json 읽기
    │   ├── 지표 → 파라미터 매핑 (mapping rules)
    │   ├── Zod 검증
    │   └── Output: generated preset JSON
    │
    ├── [3] TS generate-patterns.ts
    │   ├── kick/hat onset positions
    │   ├── 16-step 양자화
    │   └── Output: patterns.tidal
    │
    └── [4] TS generate-scene.ts
        ├── energy curve → section detection
        ├── BPM → genre mapping
        └── Output: scene-audio.json
```

### 4.2 Python 하이브리드 분석 엔진 (analyze-track.py)

```python
import librosa
import essentia.standard as es
import ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트)

def analyze(path: str, output_dir: str) -> dict:
    # --- Phase 1: Audio Loading ---
    y, sr = librosa.load(path, sr=None, mono=False)
    y_mono = librosa.to_mono(y) if y.ndim > 1 else y
    y_harm, y_perc = librosa.effects.hpss(y_mono)  # HPSS for kick/hat/key

    # --- Phase 2: essentia (Key, BPM, Loudness, Danceability) ---
    # 단일 로드: librosa numpy array → essentia 직접 전달 (이중 로딩 방지)
    audio_es = y_mono.astype(np.float32)  # essentia는 float32 numpy array 직접 수용
    bpm_es = es.RhythmExtractor2013()(audio_es)      # BPM + beats + confidence
    key_es = es.KeyExtractor()(audio_es)               # Key + scale + strength
    # EBU R128: 스테레오 입력 필요. 모노 시 dual-mono 변환
    if y.ndim > 1 and y.shape[0] >= 2:
        audio_stereo = y.T.astype(np.float32)          # (samples, 2) for stereo
    else:
        audio_stereo = np.column_stack([audio_es, audio_es])  # mono → dual-mono
    loudness_es = es.LoudnessEBUR128(sampleRate=sr)(audio_stereo)  # (momentary, shortTerm, integrated, range)
    dance_es = es.Danceability()(audio_es)              # (danceability_score, dfa_array)

    # --- Phase 3: ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트) (BPM cross-validation) ---
    proc = ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트).features.beats.RNNBeatProcessor()(path)
    beats_mm = ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트).features.beats.DBNBeatTrackingProcessor(fps=100)(proc)
    bpm_mm = 60 / np.median(np.diff(beats_mm)) if len(beats_mm) > 1 else 0

    # --- Phase 4: librosa (HPSS-dependent + spectral) ---
    bpm_lr = librosa.beat.beat_track(y=y_perc, sr=sr)[0]
    bpm_final = cross_validate_bpm(bpm_es[0], bpm_mm, bpm_lr)  # 3중 검증

    return {
        "bpm": bpm_final,
        "key": {"key": key_es[0], "scale": key_es[1], "strength": key_es[2]},
        "spectral_centroid": ...,   # librosa
        "spectral_bandwidth": ...,  # librosa
        "spectral_rolloff": ...,    # librosa
        "energy_curve": ...,        # librosa RMS (max 100 segments)
        "onset_density": ...,       # librosa
        "frequency_balance": ...,   # librosa STFT
        "dynamic_range": ...,       # librosa RMS
        "stereo_width": ...,        # librosa mid/side
        "kick_pattern": ...,        # librosa HPSS + 40-120Hz BP
        "hat_pattern": ...,         # librosa HPSS + 8kHz+ HP
        "bass_profile": ...,        # librosa STFT <500Hz
        "structure": ...,           # librosa multi-feature agglom
        "loudness": loudness_es,    # essentia EBU R128
        "mfcc": ...,                # librosa 13 coefficients
        "spectral_contrast": ...,   # librosa
        "danceability": dance_es,   # essentia Danceability
        "warnings": warnings,
    }
```

### 4.3 분석 → 프리셋 매핑 규칙 (룩업 테이블 + 전문가 규칙)

> **AC-3.6 준수**: 단순 linear mapRange 금지. 구간별 룩업 테이블 + 타입별 프로파일 사용.

```typescript
// 룩업 테이블 기반 매핑 (NOT linear mapRange)
const KICK_DRIVE_LOOKUP: Record<string, number> = {
  heavy:  0.85,  // freq_balance.low > 85%
  medium: 0.6,   // freq_balance.low 70-85%
  light:  0.35,  // freq_balance.low < 70%
};

const BASS_TYPE_PROFILES: Record<string, {cutoff: number, resonance: number, envAmount: number}> = {
  acid:    { cutoff: 2200, resonance: 0.75, envAmount: 0.85 },
  rolling: { cutoff: 1200, resonance: 0.45, envAmount: 0.55 },
  sub:     { cutoff: 400,  resonance: 0.20, envAmount: 0.30 },
};

const COMPRESS_LOOKUP = [
  { range: [0, 3],   compress: 0.8, ratio: 6, attack: 0.005 },  // low crest → heavy compress
  { range: [3, 5],   compress: 0.5, ratio: 4, attack: 0.010 },  // mid crest
  { range: [5, Infinity], compress: 0.25, ratio: 2, attack: 0.020 }, // high crest → light
];

// 충돌 해소: 우선순위 체인
// 1. bass_type (sub/rolling/acid) → SynthDef 파라미터 결정 (최우선)
// 2. frequency_balance → kick/bass 에너지 배분
// 3. dynamic_range → FX compress/threshold
// 4. danceability → scene energy hint (최하위, 다른 규칙과 충돌 시 양보)
```

### 4.4 Key Technical Decisions

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| 분석 언어 | Python (librosa + essentia + ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트)) | 하이브리드: 각 엔진의 최강 영역 활용 |
| BPM | 2중 교차검증 (essentia + ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트) + librosa) | essentia RhythmExtractor 1차, ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트) RNN 교차, librosa tempogram 보조 |
| Key 감지 | **essentia KeyExtractor** | 수동 Krumhansl 제거. 프로필 매칭 기반, 장/단조 자동 |
| Loudness | **essentia EBU R128** | pyloudnorm 제거. 산업 표준 EBU R128 내장 |
| Danceability | **essentia** | DZC 기반 고유 지표. librosa/~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트)에 없음 |
| HPSS/Spectral | **librosa** | HPSS(harmonic/percussive 분리) 대체 불가. spectral features 성숙도 |
| 소스 분리 | demucs (Meta) | SOTA 품질, MIT 라이선스 |
| TS 통합 | execFile → Python 스크립트 | 기존 파이프라인 패턴 동일 |
| 패턴 양자화 | 16-step grid | 전자음악 표준 |
| 출력 형식 | JSON + .tidal | 기존 시스템 호환 |

### 4.5 디렉토리 구조

```
audio/
├── references/              # 레퍼런스 트랙 (gitignore)
│   └── *.wav
├── analyzer/                # (신규) Python 분석 엔진
│   ├── analyze_track.py     # 메인 분석 스크립트
│   ├── requirements.txt     # librosa, essentia, ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트), numpy, soundfile
│   └── mapping_rules.py     # 분석→파라미터 매핑 규칙

scripts/
├── analyze-track.ts         # (신규) CLI 엔트리 (Python 호출 + preset/pattern 생성)
├── lib/
│   ├── track-analyzer.ts    # (신규) Python 결과 파싱 + 프리셋/패턴 생성
│   └── track-analyzer.test.ts # (신규) 테스트

out/
└── analysis/                # 분석 결과 출력
    └── {filename}/
        ├── analysis.json    # 전수 분석 결과
        ├── stems/           # demucs 분리 (drums/bass/vocals/other.wav)
        ├── preset.json      # 자동 생성된 프리셋
        ├── patterns.tidal   # Tidal 패턴 초안
        └── scene-audio.json # scene.json audio 설정
```

## 5. Edge Cases & Error Handling

| # | Scenario | Expected | Severity |
|---|----------|----------|----------|
| E1 | Python/librosa/essentia/~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트) 미설치 | 명확한 에러 + 설치 가이드 | P1 |
| E2 | demucs 미설치 | 소스 분리 skip + 원본만 분석 | P2 |
| E3 | 오디오 파일 손상 | librosa 로드 실패 → 에러 | P1 |
| E4 | 극단 BPM (60 or 200+) | BPM 범위 클램핑 + 경고 | P2 |
| E5 | 모노 파일 | stereo 분석 skip | P3 |
| E6 | 10분+ 긴 파일 | 메모리 경고. librosa `duration` 파라미터로 부분 로드 가능. essentia는 전체 로드이므로 numpy array를 공유하여 1회만 로드 | P2 |
| E7 | MP3 저비트레이트 | 경고 "분석 정확도 낮을 수 있음" | P3 |
| E8 | Key 감지 실패 (atonal) | "unknown" 반환 | P3 |
| E9 | 동시 분석 실행 | `.analyze.lock` timestamp 기반. >10min stale → 자동 제거 + 경고. SIGINT 시 atexit cleanup | P2 |
| E10 | 디스크 부족 (demucs 출력 대용량) | 2x 안전 마진 사전 체크 | P1 |
| E11 | Python 버전 비호환 | Python 3.9+ 요구. 버전 체크 + 에러 | P1 |
| E12 | 부분 분석 실패 (Key 감지 실패 등) | 해당 필드 null + warnings[]. 전체 중단 안 함 | P2 |

## 6. Security & Permissions
- 파일 경로: validateFilePath 재사용 (**ALLOWED_EXTENSIONS에 .flac/.mp3/.aiff 추가**)
- execFile array-form (Python 호출). **analyze-track.ts를 hasExecOrSpawn 검증 대상에 포함**
- 분석 결과는 로컬 out/ 에만 저장
- `audio/references/` → `.gitignore` (저작권 파일 커밋 방지)
- demucs `--out` 플래그 명시적 지정 + 출력 경로 사후 검증

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 분석 시간 (5분 트랙) | < 60초 (demucs 제외) | time 측정 |
| demucs 분리 (5분 트랙) | < 3분 (M1 Mac) | time 측정 |
| 메모리 (5분 트랙) | < 2GB | Activity Monitor |
| 분석 JSON 크기 | < 1MB | du 측정 |

## 8. Testing Strategy

### 8.1 Unit Tests (vitest)
- 매핑 규칙: mapRange, mapToPreset, mapToPattern
- 생성된 프리셋 Zod 검증
- 패턴 양자화 (onset → 16-step)
- 섹션 감지 (에너지 변곡점)
- genre 자동 감지 (BPM → genre)

### 8.2 Integration Tests
- Python 분석 스크립트 실행 (레퍼런스 트랙)
- 생성된 프리셋으로 NRT 렌더 가능 확인
- 기존 1332 테스트 regression 0

## 9. Rollout Plan

| Step | 내용 | Size |
|------|------|------|
| A-1 | Python 분석 엔진 (analyze_track.py) | L |
| A-2 | TS 통합 + 프리셋/패턴 생성 (track-analyzer.ts) | M |
| A-3 | demucs 소스 분리 + 개별 분석 | M |
| A-4 | CLI + E2E 테스트 | M |

### 9.1 Rollback
1. audio/analyzer/ 삭제
2. scripts/analyze-track.ts, lib/track-analyzer.* 삭제
3. package.json에서 analyze:track 제거

## 10. Dependencies & Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| BPM 부정확 | 낮음 | 중간 | **2중 교차검증** (essentia+~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트)+librosa) + half/double 보정 |
| Key 감지 부정확 | 낮음 | 낮음 | **essentia KeyExtractor** 내장 프로필 매칭 (수동 Krumhansl 대비 2배+ 정확도) |
| essentia 설치 복잡 | 중간 | 중간 | `pip install essentia` (wheel 제공). M1 Mac: `pip install essentia-tensorflow` 회피, CPU 버전 사용 |
| ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트) 의존성 충돌 | 중간 | 낮음 | numpy 버전 호환. `~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트)>=0.17` (numpy 2.x 지원) |
| demucs 메모리 부족 | 낮음 | 높음 | 청크 분할, GPU 미사용 시 CPU 모드 |
| 매핑 규칙 주관적 | 높음 | 중간 | 레퍼런스 A/B 테스트 반복 개선 |
| Python ↔ TS 통합 복잡성 | 낮음 | 낮음 | JSON 파일 기반 통신 (기존 패턴) |

## 11. Open Questions
- [x] ~~OQ-1: BPM 배수 보정~~ → **해결: 2중 교차검증(essentia+~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트)+librosa) + half/double + genre 범위 클램핑**
- [x] ~~OQ-2: Key 감지 정확도~~ → **해결: essentia KeyExtractor로 수동 Krumhansl 대체**
- [x] ~~OQ-3: Loudness 외부 의존~~ → **해결: essentia EBU R128로 pyloudnorm/ffprobe 대체**
- [ ] OQ-4: 매핑 규칙 캘리브레이션 — 레퍼런스 5개+ A/B 테스트. **재현 품질 = MFCC 거리 기반 점수**
- [ ] OQ-5: demucs GPU 가속 — MPS (Metal) 지원 여부. CPU 3분 이내 검증 필요
- [ ] OQ-6: essentia M1 Mac 호환성 — `pip install essentia` wheel 검증 필요

## 12. 레거시 제거 계획

분석 기반 프리셋 생성이 안정화되면:
- `audio/sc/lib/scene-score.scd` → 분석 기반 SceneScore로 대체 가능
- `audio/sc/scenes/techno-default.scd`, `trance-default.scd` → 분석 기반 구조로 대체
- `src/lib/bpm-calculator.ts` → 분석 BPM 우선 사용 (폴백으로 유지)
- 기존 5종 프리셋 → 참조용 유지, 생성 프리셋이 우선

---

## Changelog
### v0.1 (2026-03-27) — 초안
- Phase 1 범위: 분석 엔진 + 프리셋 자동 생성 + 패턴 초안

### v0.2 (2026-03-27) — Phase 2 팀 리뷰 반영 (P1 8건)
- [P1 fix] BPM: tempogram 교차검증 + half/double 보정 + confidence score 추가
- [P1 fix] Key: HPSS harmonic 전처리 → chroma → Krumhansl 장/단조 구분
- [P1 fix] Kick/Section/Bass/Genre/Security/매핑 개선
- [P2 fix] 분석 17종 확장, per-stem 서브셋, Edge Cases 추가

### v0.3 (2026-03-27) — 하이브리드 2중 엔진 (librosa+essentia) 재구성
- **essentia 추가**: KeyExtractor(Key), RhythmExtractor2013(BPM), EBU R128(Loudness), Danceability
- **~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트) 추가**: RNNBeatProcessor(BPM 교차검증)
- **제거**: pyloudnorm(→essentia EBU R128), 수동 Krumhansl(→essentia KeyExtractor)
- **분석 18종** (+Danceability)
- **BPM 2중 교차검증**: essentia + ~~madmom~~ (제거: numpy>=1.24 비호환, 2019년 이후 미업데이트) + librosa
- **librosa 유지**: HPSS, spectral 5종, MFCC, onset, energy, structure, kick/hat patterns, bass profile
- Phase 2 범위 명확화: crepe(피치추적) + SynthDef 확장(acid bass, FM lead, wavetable, 필터모델링)
