# PRD: Acid Reinterpreter — Reference Track to 303/909 Recreation Pipeline

**Version**: 0.3
**Author**: Isaac (AI-assisted)
**Date**: 2026-04-03
**Status**: Draft
**Size**: XL
**Scope**: 레퍼런스 음원 분석 → 303/909 샘플셋 재창조 → 20초 상업적 수준 오디오 출력
**Genre**: 싸이키델릭 전자음악 전용 (acid techno, psytrance, dark techno)

---

## 1. Problem Statement

### 1.1 Background
레퍼런스 전자음악 트랙을 303/909 사운드만으로 재해석(reinterpretation)하는 파이프라인이 필요하다. 이전 시도에서:
- Python scipy로 생성한 303 샘플 → "303스럽지 않다" (거부)
- SuperCollider MoogFF SynthDef → "실제 303에 비해 한참 떨어짐"
- 분석이 librosa pYIN 단독 → pitch coverage 11%, 사실상 실패
- render-303.ts 파이프라인 → 이벤트 밀도 부족, 볼륨 안 들림

### 1.2 Problem Definition
1. **분석 품질**: 풀 믹스에서 직접 피치 추출 시 80% 미달. stem 분리 없이는 정확한 악기별 분석 불가
2. **사운드 품질**: 합성 303은 실제 하드웨어 녹음에 비해 확연히 떨어짐
3. **매핑 지능**: 규칙 기반 매핑은 기계적이고 음악적 맥락을 놓침
4. **파이프라인 복잡도**: SC + Python + TS 혼재, 디버깅 어려움

### 1.3 Impact of Not Solving
- 비디오 아트 작품에 동반할 상업적 수준의 오디오 트랙 제작 불가
- 레퍼런스 기반 작업 시 매번 수작업 필요

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: 레퍼런스 트랙의 groove/에너지/구조를 보존하는 수준으로 분석 (BPM ±1, 드럼 패턴 유사, 베이스 contour 유사. 최종 판정: 청취 평가)
- [ ] G2: 분석 결과를 **JC-303 (Open303 엔진) + 909 샘플**로 재창조
- [ ] G3: **20초 오디오** 출력 — 자동 구간 선택 또는 수동 지정
- [ ] G4: **상업적 수준** 품질 (-14 LUFS, 클리핑 0, 스테레오)
- [ ] G5: **단일 CLI 명령**으로 end-to-end 실행

### 2.2 Non-Goals
- NG1: 싸이키델릭 전자음악 외 장르 지원
- NG2: 보컬 분석/재현
- NG3: 실시간 처리 (오프라인 전용)
- NG4: DAW 플러그인 형태
- NG5: 원곡 1:1 복제 (재해석이 목표)

## 3. User Stories & Acceptance Criteria

### US-1: End-to-End CLI 실행
**As a** 크리에이터, **I want** 레퍼런스 wav 파일 하나를 주면 20초 303/909 재해석 트랙이 나오기를.

**Acceptance Criteria:**
- [ ] AC-1.1: `npx tsx scripts/acid-reinterpreter.ts <input.wav>` 단일 명령 실행
- [ ] AC-1.2: `--start <seconds>` / `--duration <seconds>` 옵션으로 구간 지정. 기본: 에너지 피크 자동 선택 — librosa energy curve에서 rolling window(20s) 최대 합산 구간의 시작점 사용
- [ ] AC-1.3: `--out-dir <path>` 출력 디렉토리 지정 (기본: `out/acid/{timestamp}/`)
- [ ] AC-1.4: 중간 산출물 전부 파일로 저장 (디버깅 가능): stems/, analysis.json, interpretation.json, render/
- [ ] AC-1.5: 최종 출력: `master.wav` (44.1kHz, 16bit, stereo, -14 LUFS ±1)
- [ ] AC-1.6: `--dry-run` 모드: 렌더링 제외, 분석+해석까지만 실행
- [ ] AC-1.7: 입력 검증 — WAV/FLAC/MP3만 허용. 10초 미만/무음(RMS < -60dBFS)/비오디오 파일 → 명확한 에러 메시지 + exit
- [ ] AC-1.8: 실패 시 부분 산출물은 보존 (cleanup 안 함). 재실행 시 `--resume` 플래그로 기존 산출물 재활용

### US-2: Stem 분리
**As a** 파이프라인, **I want** 레퍼런스를 drums/bass/other 3-stem으로 분리하여 각각 특화 분석하기를.

**Acceptance Criteria:**
- [ ] AC-2.1: Demucs v4 (htdemucs) via Replicate API 호출
- [ ] AC-2.2: 출력: `stems/drums.wav`, `stems/bass.wav`, `stems/other.wav` (vocals.wav는 버림)
- [ ] AC-2.3: API 실패 시 재시도 1회 → 실패 시 에러 + exit
- [ ] AC-2.4: `REPLICATE_API_TOKEN` 환경변수 필수. 없으면 명확한 에러 메시지
- [ ] AC-2.5: API 타임아웃 300초 (Demucs 풀트랙 기준). 타임아웃 시 재시도 1회 → abort

### US-3: 악기별 분석
**As a** 파이프라인, **I want** 각 stem에서 정확한 음악적 정보를 추출하기를.

**Acceptance Criteria:**
- [ ] AC-3.1: **drums.wav** 3단계 분석:
  1. madmom RNNOnsetProcessor → beat grid + onset 후보 추출
  2. spectral heuristics로 onset 분류: kick(<200Hz 에너지 우세), snare(200-5kHz 넓은 대역), hat(>5kHz 에너지 우세)
  3. BPM grid에 quantize → kick_positions[], snare_positions[], hat_positions[]
- [ ] AC-3.2: **bass.wav** 다단계 분석:
  1. CREPE pitch tracking (model='full', step_size=10) → frame-level (time, freq, confidence)
  2. confidence 0.8+ 프레임만 채택 (voiced mask)
  3. hysteresis smoothing → 연속 동일 피치 프레임 병합 (note segmentation)
  4. MIDI snapping (nearest semitone) → {time, freq, midi, duration, velocity, confidence}
  5. 인접 노트 피치 차이 > 2 semitone + 짧은 gap → slide 추론
- [ ] AC-3.3: **full mix** → essentia KeyExtractor → root + mode. confidence < 0.6이면 bass note histogram에서 최빈 피치 클래스를 root로 대체 (soft hint)
- [ ] AC-3.4: **full mix** → librosa energy curve + spectral centroid curve (구간별 에너지/밝기)
- [ ] AC-3.5: **full mix** → BPM 감지 (librosa + essentia 앙상블, confidence 0.8+)
- [ ] AC-3.6: **full mix** → 구조 분석 (build/drop/break 섹션 경계)
- [ ] AC-3.7: 출력: `analysis.json` — 위 모든 데이터 통합. Zod 스키마로 검증
- [ ] AC-3.8: essentia 미설치 시 graceful degradation (key=None + warning)

### US-4: LLM 해석 (Interpretation)
**As a** 파이프라인, **I want** 분석 데이터를 LLM이 303/909 문법으로 음악적 재해석하기를.

**Acceptance Criteria:**
- [ ] AC-4.1: Replicate API 호출 (LLM). 모델: `meta/llama-4-maverick` 또는 동급. REPLICATE_API_TOKEN 재활용
- [ ] AC-4.2: 입력: analysis.json (stem 분석 데이터 전체). riff_303 소스: other stem (bass stem과 분리된 mid-high 303 라인)
- [ ] AC-4.3: 출력: `interpretation.json` — 아래 구조:
  ```
  {
    bpm: number,
    key: { root: string, mode: string, midi: number },
    duration: number,
    tracks: {
      bass_303: { events: [{ time, note_midi, duration, velocity, accent, slide, cutoff, resonance, envMod, decay, waveform }] },
      riff_303: { events: [...] },
      kick_909: { pattern: [0|1][], velocity: number[] },
      hat_909: { pattern: [0|1][], velocity: number[], open_pattern: [0|1][] },
      snare_909: { pattern: [0|1][], velocity: number[] },
    },
    fx: { reverb_send, delay_send, delay_time, master_cutoff_curve: number[] },
    energy_curve: number[],
  }
  ```
- [ ] AC-4.4: LLM 프롬프트에 장르 특화 지침 포함 (303 아티큘레이션 규칙, 909 패턴 규칙, 에너지 빌드업)
- [ ] AC-4.5: Zod 스키마로 LLM 출력 검증. 실패 시 1회 재시도 (에러 피드백 포함). 2회 연속 실패 → abort
- [ ] AC-4.6: LLM 파라미터: temperature=0.3, max_tokens=4096, seed 고정 (재현성)
- [ ] AC-4.7: **Deterministic normalizer** — LLM 출력 후 자동 교정:
  1. 모든 event.time을 BPM 그리드 (nearest 32nd note)에 quantize
  2. note_midi를 감지된 key의 스케일 노트로 clamp (±1 semitone)
  3. cutoff 범위 [100, 5000], resonance [0, 1], velocity [0, 1] clamp
  4. 이벤트 밀도가 energy_curve와 일치하는지 검증 (drop 구간에서 density < 4 events/bar → warning)
  5. 909 패턴 길이가 duration과 일치하는지 검증
- [ ] AC-4.8: **Analysis QC gate** — Step 3 진입 전 검증:
  - stem SNR: drums/bass RMS > -50dBFS
  - BPM confidence > 0.7
  - bass voiced frame coverage > 20%
  - drum onset density > 1/bar
  - 기준 미달 → degraded mode (warning + 해당 데이터 빈 값 처리) 또는 abort (drums 전체 실패 시)

### US-5: 303 렌더링 (JC-303 VST3 via Pedalboard)
**As a** 파이프라인, **I want** 해석된 303 시퀀스를 실제 303 사운드로 렌더링하기를.

**Acceptance Criteria:**
- [ ] AC-5.1: Python pedalboard 라이브러리로 JC-303 VST3 로드
- [ ] AC-5.2: interpretation.json의 bass_303/riff_303 이벤트 → MIDI 메시지 변환
- [ ] AC-5.3: JC-303 파라미터 매핑: cutoff, resonance, envMod, decay, accent, waveform → VST 파라미터
- [ ] AC-5.4: 트랙별 개별 렌더: `render/bass_303.wav`, `render/riff_303.wav`
- [ ] AC-5.5: JC-303 미설치 시 명확한 에러 + 설치 가이드 출력

### US-6: 909 렌더링
**As a** 파이프라인, **I want** 해석된 909 패턴을 드럼 트랙으로 렌더링하기를.

**Acceptance Criteria:**
- [ ] AC-6.1: 무료 909 샘플팩 사용 (kick, snare, hat-closed, hat-open, clap, ride)
- [ ] AC-6.2: interpretation.json의 kick/hat/snare 패턴 → 타임라인 배치
- [ ] AC-6.3: velocity 적용, 패턴 정확도 유지
- [ ] AC-6.4: 출력: `render/drums_909.wav`
- [ ] AC-6.5: pedalboard 내장 이펙트로 기본 처리 (EQ, compression)

### US-7: 믹싱 & 마스터링
**As a** 파이프라인, **I want** 개별 stem들을 상업적 수준으로 믹스+마스터하기를.

**Acceptance Criteria:**
- [ ] AC-7.1: stem 합산: bass_303 + riff_303 + drums_909 → mix
- [ ] AC-7.2: pedalboard 이펙트 체인: EQ → Compressor → Limiter
- [ ] AC-7.3: FX 적용: reverb/delay (interpretation.json의 fx 파라미터)
- [ ] AC-7.4: pyloudnorm으로 -14 LUFS 노멀라이제이션
- [ ] AC-7.5: QC 검증: LUFS 범위(-16~-12), peak < -0.3dBFS, 클리핑 0, 스테레오
- [ ] AC-7.6: 출력: `master.wav` (44.1kHz, 16bit, stereo)

## 4. Technical Design

### 4.1 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  acid-reinterpreter.ts  (TS 오케스트레이터)                     │
│  — CLI args 파싱, 단계 조율, 에러 핸들링                         │
└──┬──────┬──────────┬─────────────────┬──────┬───────────────┘
   │      │          │                 │      │
   v      v          v                 v      v
┌──────┐┌──────┐┌─────────────────┐┌──────┐┌──────┐
│Step 1││Step 2││    Step 3       ││Step 4││Step 5│
│SPLIT ││ANALYZE││ QC gate        ││RENDER││MASTER│
│      ││  +   ││ → LLM          ││      ││      │
│Repli-││madmom││ → Normalizer   ││pedal-││pyln  │
│cate  ││CREPE ││   (quantize/   ││board ││      │
│Demucs││essen.││    clamp/      ││+JC303││      │
│      ││libros││    validate)   ││+909  ││      │
└──────┘└──────┘└─────────────────┘└──────┘└──────┘
```

### 4.2 파일 구조

```
scripts/
  acid-reinterpreter.ts        # CLI 엔트리포인트 + 오케스트레이터
  lib/
    acid/
      separate.ts              # Step 1: Replicate Demucs 호출
      analyze.py               # Step 2: Python 분석 (madmom+CREPE+essentia+librosa)
      interpret.ts             # Step 3: Replicate LLM → raw interpretation
      normalizer.ts            # Step 3b: quantize/clamp/validate LLM output
      render.py                # Step 4: pedalboard + JC-303 렌더링
      master.py                # Step 5: 믹싱 + 마스터링 + QC
      schemas.ts               # Zod 스키마 (analysis, interpretation, qc)
      prompt.ts                # LLM 프롬프트 템플릿
audio/
  samples/909/                 # 무료 909 원샷 샘플 (kick, snare, hat 등)
```

### 4.3 기술 스택

| 계층 | 기술 | 역할 |
|------|------|------|
| 오케스트레이터 | TypeScript (tsx) | CLI, 단계 조율, 스키마 검증 |
| 소스 분리 | Replicate API (Demucs v4) | drums/bass/other 분리 |
| 드럼 분석 | madmom (Python) | RNN onset → kick/hat/snare 포지션 |
| 피치 분석 | CREPE (Python) | bass stem 피치 트래킹 |
| Key/BPM | essentia (Python) | KeyExtractor, BPM |
| 에너지/구조 | librosa (Python) | energy curve, spectral, 구조 |
| LLM 해석 | Replicate API (Llama 4 등) | 분석→303/909 매핑 재해석 |
| 303 렌더 | pedalboard + JC-303 VST3 (Python) | MIDI→WAV (실제 303 사운드) |
| 909 렌더 | pedalboard (Python) | 샘플 배치 + EQ/comp |
| 마스터링 | pedalboard + pyloudnorm (Python) | EQ/comp/limiter + LUFS norm |

### 4.4 TS→Python IPC 규약

오케스트레이터(TS)가 Python 스크립트를 `child_process.execFile`로 호출:
- 인자: `uv run --with <deps> python <script.py> <args...>`
- 입출력: 파일 기반 JSON 교환 (stdin/stdout 아님)
- 타임아웃: 각 단계별 명시 (Step 2: 120s, Step 4: 60s, Step 5: 60s)
- 에러: exit code 0=성공, 1=실패. stderr → 오케스트레이터가 캡처+로깅
- 파일명 안전: 입력 파일 경로는 `path.resolve()` 후 전달. 셸 메타문자 이스케이프 불필요 (execFile은 shell=false)

### 4.5 analysis.json 스키마

```json
{
  "bpm": { "value": 126, "confidence": 0.95 },
  "key": { "root": "G", "mode": "minor", "midi": 55, "confidence": 0.87 },
  "duration": 538.2,
  "selected_range": { "start": 120.0, "end": 140.0 },
  "drums": {
    "kick_positions": [0.0, 0.476, ...],
    "snare_positions": [...],
    "hat_positions": [...]
  },
  "bass": {
    "notes": [
      { "time": 0.12, "freq": 98.0, "midi": 43, "duration": 0.3, "velocity": 0.8, "confidence": 0.92 }
    ]
  },
  "other": {
    "notes": [
      { "time": 0.05, "freq": 392.0, "midi": 67, "duration": 0.15, "velocity": 0.6, "confidence": 0.85 }
    ]
  },
  "energy_curve": [0.2, 0.4, 0.8, ...],
  "spectral_centroid_curve": [1200, 1500, ...],
  "structure": [
    { "start": 0.0, "end": 30.0, "label": "build" },
    { "start": 30.0, "end": 90.0, "label": "drop" }
  ],
  "warnings": []
}
```

### 4.6 데이터 플로우

```
input.wav
  → [Replicate Demucs] → stems/drums.wav, bass.wav, other.wav
  → [Python analyze] → analysis.json
  → [Analysis QC gate] → pass/degraded/abort
  → [Replicate LLM] → raw_interpretation.json
  → [Deterministic normalizer] → interpretation.json (quantized, clamped, validated)
  → [Python render] → render/bass_303.wav, riff_303.wav, drums_909.wav
  → [Python master] → master.wav
```

모든 중간 산출물은 `out/acid/{timestamp}/`에 파일로 저장. 각 단계는 독립 실행 가능 (디버깅).

### 4.5 외부 의존성

| 의존성 | 설치 방법 | 필수/선택 |
|--------|----------|----------|
| Replicate API | `REPLICATE_API_TOKEN` env | 필수 (Demucs + LLM 통합) |
| JC-303 VST3 | GitHub releases → ~/Library/Audio/Plug-Ins/VST3/ | 필수 |
| pedalboard | `pip install pedalboard` | 필수 |
| madmom | `pip install madmom` | 필수 |
| CREPE | `pip install crepe` | 필수 |
| essentia | `pip install essentia` | 선택 (없으면 key=None) |
| librosa | `pip install librosa` | 필수 |
| pyloudnorm | `pip install pyloudnorm` | 필수 |

### 4.6 에러 처리

| 단계 | 실패 시 |
|------|--------|
| Step 1 (Separate) | Replicate API 1회 재시도 → 실패 시 abort |
| Step 2 (Analyze) | essentia 없으면 degraded (key=None). 나머지 필수 |
| Step 3 (Interpret) | LLM 출력 Zod 검증 실패 시 1회 재시도 (에러 포함) → abort |
| Step 4 (Render) | JC-303 미설치 → 명확한 에러 + 설치 가이드 |
| Step 5 (Master) | QC 실패 → warning + 출력은 생성 (사용자 판단) |

## 5. Scope & Constraints

### 5.1 In Scope
- 싸이키델릭 전자음악 레퍼런스 분석
- 303 (bass + riff) + 909 (kick/hat/snare/clap) 재창조
- 20초 단위 출력 (구간 선택)
- CLI 단일 명령 실행

### 5.2 Out of Scope
- 보컬 처리
- 기타/피아노 등 비전자악기
- 실시간 처리
- GUI/웹 인터페이스
- 원곡 1:1 복제

### 5.3 Constraints
- Replicate API 비용 (Demucs: ~$0.02/곡, LLM: ~$0.01/호출)
- JC-303 VST3 macOS 전용 (현재 개발 환경)
- Python 3.9+ 필수 (madmom/essentia 호환)

## 6. Success Metrics

**필수 (hard gate):**

| 메트릭 | 목표 |
|--------|------|
| 출력 LUFS | -16 ~ -12 |
| 클리핑 | 0 |
| BPM 정확도 | ±1 BPM |
| E2E 실행 시간 | < 5분 (20초 구간, API cold start 포함) |
| **최종 품질** | **Isaac 청취 평가 PASS (M5)** |

**벤치마크 참고치 (soft target, AC 보장값 아님):**

| 메트릭 | 목표 | 비고 |
|--------|------|------|
| 드럼 패턴 유사도 | kick/hat 위치 대략 일치 | 수동 spot-check |
| 베이스 contour 유사도 | 피치 윤곽 유사 | 스펙트로그램 비교 |
| Key 정확도 | root + mode 일치 | essentia confidence 기반 |
| groove preservation | 원곡 느낌 보존 | 청취 주관 평가 |

### 6.1 정확도 검증 방법

ground truth 없는 환경에서의 검증:
- **BPM**: librosa + essentia 앙상블. 두 값 차이 ±2 이내면 confidence high
- **Key**: essentia KeyExtractor confidence 값 직접 사용
- **드럼**: madmom onset의 confidence threshold (0.5+) 적용 후 수동 spot-check (M5에서 3곡)
- **피치**: CREPE confidence per-frame. 0.8+ 프레임만 채택. M5에서 bass stem 스펙트로그램 대비 시각 검증
- **최종 품질**: Isaac 청취 평가 (M5). 정량 메트릭은 보조 지표

## 7. Milestones

| # | 마일스톤 | 내용 | Gate |
|---|---------|------|------|
| M0 | PoC 검증 | 4개 검증: (1) JC-303 headless load (2) MIDI note→audible WAV (3) cutoff/reso/accent 파라미터 제어 (4) 동일 입력 재현성 + Replicate LLM JSON 출력 PoC | P0 blocker — 실패 시 SC fallback 결정 |
| M1 | 분석 파이프라인 | Step 1+2 완성. Demucs 분리 + Python 분석 → analysis.json | analysis.json Zod 검증 통과 |
| M2 | LLM 해석 | Step 3 완성. analysis.json → interpretation.json | interpretation.json Zod 검증 통과 |
| M3 | 렌더링 파이프라인 | Step 4+5 완성. JC-303 + 909 렌더 + 마스터 | master.wav QC 통과 |
| M4 | E2E 통합 | 단일 CLI 명령으로 전체 파이프라인 실행 | Acperience 1 E2E 성공 |
| M5 | 품질 검증 | 3개 레퍼런스 벤치마크 + 청취 평가 | Isaac 승인 |

## 8. Risks

| 리스크 | 영향 | 완화 |
|--------|------|------|
| JC-303 VST3가 pedalboard에서 로드 안 됨 | 303 렌더 불가 | 사전 PoC 테스트 (T1). 실패 시 SC tb303 fallback |
| Demucs stem 품질 불량 (acid 특화 아님) | 분석 정확도 하락 | htdemucs_ft (fine-tuned) 사용. 분석 단계에서 confidence 체크 |
| LLM이 음악적으로 어색한 해석 또는 수치 환각 | 출력 품질 저하 | 프롬프트 엔지니어링 + 장르 규칙 제약 + 예시 포함 + **deterministic normalizer가 수치 교정** |
| Demucs 분리 품질이 후속 분석의 ceiling | 분석 정확도 상한 제한 | htdemucs_ft 사용 + **analysis QC gate**로 품질 미달 시 degraded/abort |
| madmom Python 3.14 호환 | 설치 실패 | uv로 Python 3.12 격리 환경 |
| essentia AGPL 라이선스 | 상업적 제약 | 로컬 CLI 전용, 배포 안 함 (이전 Isaac 승인 완료) |

## 9. Dependencies

- `replicate` npm 패키지 (이미 설치됨)
- Python 가상환경 (uv 관리)
- JC-303 VST3 바이너리 (GitHub releases)
- 909 무료 샘플팩 (Drumkito/BVKER)
