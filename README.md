# video-art

Three.js + GLSL 기반 생성형 비디오 아트 시스템.
이미지 1장을 AI(bria + Real-ESRGAN + flux-fill-pro)로 2레이어 분해하고, HSV hue rotation + hueKey 셰이더로 사이키델릭 무한 루프 영상을 생성한다.

---

## Quick Start

```bash
npm install
cp .env.example .env  # → REPLICATE_API_TOKEN=r8_... 입력

# 이미지 1장 → Instagram Reels 완성본 (1080x1920, 30fps, H.264)
npm run publish input.png -- --title my-art

# 오디오 포함
npm run publish input.png -- --title my-art --audio music.wav --audio-start 55

# 커스텀 duration (기본 20초)
npm run publish input.png -- --title my-art --duration 30
```

### 파이프라인 자동 처리 내용

```
input.png (원본 해상도 유지)
  → bria/remove-background     전경 알파 매팅
  → Real-ESRGAN 2x             전경 초해상화
  → flux-fill-pro              배경 인페인팅
  → Real-ESRGAN 2x             배경 초해상화 (보간 아티팩트 제거)
  → depth-anything-v2          깊이맵
  → 원본 해상도 레이어 조합     lanczos3 미세 리사이즈
  → Puppeteer 60fps 렌더링     고해상도 supersampling
  → 1080x1920 30fps 다운스케일  Instagram Reels 최적
```

### 출력 스펙

| 항목 | 값 |
|------|-----|
| 해상도 | 1080x1920 (9:16) |
| 코덱 | H.264 High Profile, Level 4.2 |
| 픽셀포맷 | yuv420p |
| 프레임레이트 | 30fps |
| CRF | 15 |
| 호환 | Instagram Reels, QuickTime, 모든 플레이어 |

---

## 2가지 제작 방식

### 1. Layered 모드 — 이미지를 넣는다

이미지 1장을 AI로 전경/배경 분리 + 초해상화 + 인페인팅한 뒤, hueKey 셰이더로 색상 영역별 독립 애니메이션을 적용하여 무한 루프 영상으로 변환한다.

```bash
# 원커맨드 (권장)
npm run publish input.png -- --title sunset

# 단계별 실행 (프리뷰 포함)
npm run pipeline input.png -- --title sunset

# 단계별 실행 (프리뷰 건너뛰기)
npm run pipeline input.png -- --title sunset --no-preview

# 익스포트만 (이미 pipeline-pro 실행 완료 시)
npm run export:layered -- --title sunset
```

### 2. Sketch 모드 — 코드로 만든다

`.frag` 셰이더 파일 하나가 작품 하나. 수학 함수로 모든 픽셀을 직접 계산한다.

```bash
npm run dev
# → http://localhost:5173/?sketch=psychedelic

npm run export:sketch -- --sketch ocean-wave --title ocean-wave
```

### 3. DMT tunnel 모드 — 레퍼런스 릴스 스타일

`docs/research/references/ig-DV_6YBZk293-reel.mp4`처럼 중앙 고정점으로 빨려 들어가는 네온 톱니 링 영상을 만든다.

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-ig.json

npm run export:dmt -- --title ig-DV_6YBZk293-study --variant ig --fps 60
```

더 강한 LSD trip 변형:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip.json

npm run export:dmt -- --title lsd-trip-tunnel --variant trip --fps 60
```

v66 masterpiece pass:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v66.json

npm run export:dmt -- --title lsd-trip-v66 --variant trip-v66 --fps 60
```

v67 jewel-eye refinement:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v67.json

npm run export:dmt -- --title lsd-trip-v67 --variant trip-v67 --fps 60
```

v68 psychedelic color refinement:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v68.json

npm run export:dmt -- --title lsd-trip-v68 --variant trip-v68 --fps 60
```

v69 suction / dizziness refinement:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v69.json

npm run export:dmt -- --title lsd-trip-v69 --variant trip-v69 --fps 60
```

v70 hard trip:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v70.json

npm run export:dmt -- --title lsd-trip-v70-hard --variant trip-v70 --fps 60
```

v71 inward color cascade:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v71.json

npm run export:dmt -- --title lsd-trip-v71-cascade --variant trip-v71 --fps 60
```

v72 smooth no-cross color cascade:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v72.json

npm run export:dmt -- --title lsd-trip-v72-smooth --variant trip-v72 --fps 60
```

v73 dramatic no-cross depth color:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v73.json

npm run export:dmt -- --title lsd-trip-v73-dramatic --variant trip-v73 --fps 60
```

v74 dramatic color-grade only, existing lines preserved:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v74.json

npm run export:dmt -- --title lsd-trip-v74-grade --variant trip-v74 --fps 60
```

v75 smooth seam-safe suction cut:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v75.json

npm run export:dmt -- --title lsd-trip-v75-smooth --variant trip-v75 --fps 60
```

v76 smooth hypercolor polish, same lines as v75:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v76.json

npm run export:dmt -- --title lsd-trip-v76-hypercolor --variant trip-v76 --fps 60
```

v77 bright-prism polish, no black/navy shadow field:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v77.json

npm run export:dmt -- --title lsd-trip-v77-bright-prism --variant trip-v77 --fps 60
```

v78 cohesive continuous-gradient suction cut:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v78.json

npm run export:dmt -- --title lsd-trip-v78-continuous-suction --variant trip-v78 --fps 60
```

v79 Instagram-derived smooth prism suction cut:

```bash
npm run dev
# → http://localhost:5173/?mode=dmt&dmt=/dmt-config-trip-v79.json

npm run export:dmt -- --title lsd-trip-v79-reference-prism --variant trip-v79 --fps 60
```

---

## Prerequisites

- **Node.js** 18+
- **ffmpeg** (`brew install ffmpeg`)
- **REPLICATE_API_TOKEN** (`.env`) — layered 모드 전용

---

## Pipeline 흐름 (Layered 모드 — Pro Pipeline)

```
input.png (원본 해상도 유지, e.g. 1632x2912)
    │
    ├─ Step 1: bria/remove-background (Replicate API)
    │  → 전경 PNG (~573x1024, 알파 매팅)
    │
    ├─ Step 1b: Real-ESRGAN 2x (Replicate API)
    │  → 전경 초해상화 (~1146x2048)
    │
    ├─ Step 2: 인페인팅 마스크 생성
    │  전경 알파 > 10 → white
    │
    ├─ Step 3: flux-fill-pro (Replicate API)
    │  → 배경 인페인팅 (~807x1440)
    │
    ├─ Step 3b: Real-ESRGAN 2x (Replicate API)
    │  → 배경 초해상화 (~1614x2880, 보간 노이즈 근본 제거)
    │
    ├─ Step 4: depth-anything-v2 (Replicate API)
    │  → 그레이스케일 깊이맵
    │
    ├─ Step 5: 원본 해상도로 레이어 조합 (lanczos3)
    │  layer-0: 배경 (ESRGAN) → 원본 해상도 미세 리사이즈 + light blur
    │  layer-1: 전경 (ESRGAN) → 원본 해상도 미세 리사이즈
    │  → _work/layers/ + _work/scene.json
    │
    ├─ Export: Puppeteer 60fps 렌더링 (고해상도 supersampling)
    │  → ffmpeg HEVC VideoToolbox → H.264 인코딩
    │
    └─ Publish: ffmpeg lanczos 다운스케일
       → 1080x1920, 30fps, H.264 High 4.2 (Instagram 최적)
```

### 셰이더 — Luminance-preserving HSV Hue Rotation + HueKey

`layer.frag`는 wave/parallax 없이 **구조를 픽셀 단위로 유지**하면서 색상만 변조한다:

1. RGB → HSV 변환
2. luminance 기반 phase offset (`pow(1-lum, lumExponent + luminanceKey)`)
3. **hueKey**: 원본 hue 값으로 per-pixel phase offset 생성 → 색상 영역별 독립 애니메이션
4. hue shift (시간 x speed / period + lumPhase + huePhase + phaseOffset)
5. saturation boost (원본 채도 기반 blend)
6. luminance 보존 (`hsv.z = originalVal`)
7. subtle glow pulse (sin 기반)
8. atmospheric haze (깊이 기반 채도 감쇄)

---

## Production Defaults

| 설정 | 기본값 | 위치 |
|------|--------|------|
| FPS (렌더링) | 60 | scene-schema.ts, pipeline-pro.ts |
| FPS (출력) | 30 | publish.ts (Instagram 최적) |
| 해상도 (렌더링) | 원본 유지 | pipeline-pro.ts |
| 해상도 (출력) | 1080x1920 | publish.ts (Instagram 9:16) |
| 픽셀포맷 | yuv420p | export-layered.ts |
| CRF | 15 | export-layered.ts |
| H.264 Profile | High, Level 4.2 | publish.ts |
| 전경 초해상화 | Real-ESRGAN 2x | pipeline-pro.ts |
| 배경 초해상화 | Real-ESRGAN 2x | pipeline-pro.ts |
| 레이어 리사이즈 | lanczos3 | pipeline-pro.ts |
| 다운스케일 | lanczos (supersampling) | publish.ts |

---

## CLI Reference

### `npm run publish` — 원커맨드 Instagram Reels 퍼블리시

```bash
npm run publish <input.png> -- [options]
```

| Flag | Description | Default |
|------|-------------|---------|
| `<input.png>` | 입력 이미지 (필수) | — |
| `--title <name>` | 작품 타이틀 (아카이브 폴더명에 사용) | 파일명에서 추출 |
| `--audio <path>` | 오디오 파일 경로 (.wav, .mp3 등) | 없음 |
| `--audio-start <sec>` | 오디오 시작 시점 (초) | 0 |
| `--duration <N>` | 영상 길이 (초) | 20 |

### `npm run pipeline` — 단계별 실행 (프리뷰 포함)

```bash
npm run pipeline <input.png> -- [options]
```

| Flag | Description | Default |
|------|-------------|---------|
| `<input.png>` | 입력 이미지 (필수) | — |
| `--title <name>` | 작품 타이틀 | 파일명에서 추출 |
| `--no-preview` | 브라우저 프리뷰 건너뛰기 | false |
| `--duration <N>` | 영상 길이 (초) | 20 |
| `--fps <N>` | 프레임 레이트 | 30 |
| `--keep-frames` | 인코딩 후 PNG 프레임 보존 | false |
| `--prores` | ProRes 4444 출력 | false |

### `npm run export:layered` — mp4 익스포트만

```bash
npm run export:layered -- [options]
```

| Flag | Description | Default |
|------|-------------|---------|
| `--title <name>` | 작품 타이틀 (필수) | — |
| `--fps <N>` | 프레임 레이트 override | scene.json 값 |
| `--keep-frames` | 인코딩 후 PNG 프레임 보존 | false |
| `--prores` | ProRes 4444 출력 | false |
| `--work-dir <path>` | _work/ 디렉토리 경로 | public/ |
| `--archive-dir <path>` | 출력 아카이브 경로 | out/layered/ |

### `npm run pipeline:pro` — AI 분해만

```bash
npx tsx scripts/pipeline-pro.ts <input.png> [options]
```

| Flag | Description | Default |
|------|-------------|---------|
| `<input.png>` | 입력 이미지 (필수) | — |
| `--duration <N>` | scene duration (1-300초) | 20 |
| `--fps <N>` | 프레임 레이트 (1-120) | 60 |
| `--production` | model version pin 강제 | false |
| `--work-dir <path>` | 출력 디렉토리 | out/pro-pipeline/ |

---

## npm scripts

| Command | Description |
|---------|-------------|
| `npm run publish <img>` | **원커맨드** Instagram Reels 퍼블리시 |
| `npm run pipeline <img>` | pro-pipeline → 프리뷰 → 익스포트 |
| `npm run pipeline:pro <img>` | AI 레이어 분해만 |
| `npm run pipeline:validate` | scene.json 루프 검증 |
| `npm run export:layered` | layered mp4 익스포트 |
| `npm run export:sketch` | sketch mp4 익스포트 |
| `npm run preset:save` | 프리셋 저장 |
| `npm run preset:list` | 프리셋 목록 |
| `npm run analyze:track <wav>` | 트랙 분석 → preset + Tidal + 샘플 추출 |
| `npm run acid <wav>` | Acid Reinterpreter (LLM 303/909 리크리에이션) |
| `npm run dev` | Vite 개발서버 |
| `npm run build` | TypeScript + Vite 프로덕션 빌드 |
| `npm run test` | Vitest (12 suites, 143 tests) |
| `npm run test:watch` | Vitest watch 모드 |

---

## scene.json

```jsonc
{
  "version": 1,
  "source": "input.png",
  "resolution": [1632, 2912],  // 원본 해상도 유지
  "duration": 20,
  "fps": 60,                    // 렌더링 60fps → 출력 30fps (supersampling)
  "layers": [
    {
      "id": "layer-0",
      "file": "layers/layer-0.png",
      "zIndex": 0,
      "opacity": 1.0,
      "blending": "normal",
      "role": "background-plate",
      "meanDepth": 50,
      "animation": {
        "colorCycle": { "speed": 5, "period": 20, "phaseOffset": 0 },
        "glow": { "intensity": 0.12, "pulse": 0.6, "period": 10 },
        "saturationBoost": 6.0,
        "luminanceKey": 1.0,
        "satBlendLow": 0.05,
        "satBlendHigh": 0.3,
        "satInjectionMul": 0.5,
        "glowPulseFloor": 0.3,
        "lumExponent": 1.8,
        "hueKey": 1.5,
        "hueSpeed": 3.0
      }
    }
  ],
  "effects": {
    "bloom": { "strength": 0.5, "radius": 0.4, "threshold": 0.45 },
    "chromaticAberration": { "offset": 2.0, "modulationOffset": 0.4 },
    "parallax": { "scale": 0 },
    "haze": { "intensity": 0 }
  }
}
```

---

## Architecture

### Layered 모드 렌더링

```
URL: /?mode=layered
  → loadScene("/scene.json")
  → Three.js Scene (role-ordered layers)
    ├── PlaneGeometry z=0.0  background-plate
    └── PlaneGeometry z=0.1  subject
    각 레이어: ShaderMaterial(layer.vert + layer.frag)
  → EffectComposer (Bloom + ChromaticAberration)
  → Canvas
```

### Export Pipeline

```
Puppeteer headless Chrome
  → Clock.startRecording() (deterministic: frame x 1/fps)
  → Loop N frames: __captureFrame() → PNG
  → ffmpeg: HEVC VideoToolbox → H.264 libx264 (CRF 15)
  → (publish) lanczos downscale → 1080x1920 30fps Instagram
  → 아카이브: out/layered/{date}_{title}/
```

### 병렬 실행

각 파이프라인 실행은 독립 `_work/` 디렉토리와 동적 Vite 포트(5300-5399)를 사용하여 동시 실행이 안전하다.

```
out/layered/{date}_{title}-{hash}/
├── _work/                    ← Vite 서빙용 (완료 후 자동 삭제)
│   ├── scene.json
│   └── layers/
├── {title}.mp4              ← 고해상도 원본
├── {title}-instagram.mp4    ← 1080x1920 다운스케일
└── frames/ (optional)       ← --keep-frames 시 보존
```

---

## Project Structure

```
video-art/
├── src/
│   ├── main.ts                       진입점: sketch/layered 라우팅
│   ├── core/
│   │   └── clock.ts                  결정적 프레임 타이밍 (녹화/실시간)
│   ├── lib/
│   │   ├── scene-schema.ts           Zod 스키마 (fps default: 60)
│   │   ├── scene-loader.ts           scene.json fetch + 검증
│   │   ├── effect-composer.ts        EffectComposer (Bloom + CA)
│   │   ├── shader-plane.ts           ShaderMaterial PlaneGeometry 생성
│   │   ├── sketch-configs.ts         sketch별 설정 레지스트리
│   │   ├── sketch-registry.ts        sketch 설정 re-export + tone mapping
│   │   ├── bpm-calculator.ts         BPM 계산 유틸
│   │   └── palette.ts                컬러 팔레트 유틸
│   ├── shaders/
│   │   ├── layer.frag                HSV hue rotation + hueKey 셰이더
│   │   ├── layer.vert                버텍스 셰이더
│   │   ├── base.vert                 기본 버텍스 셰이더
│   │   ├── post.frag / post.vert     포스트프로세싱 셰이더
│   │   ├── psy-v3-post.frag          psy-v3 전용 포스트 셰이더
│   │   ├── signal-post.frag          signal 전용 포스트 셰이더
│   │   └── sketches/                 sketch 작품 셰이더 (8개)
│   │       ├── psychedelic.frag      blueprint.frag      kaleidoscope.frag
│   │       ├── psy.frag              psy-v3.frag         rainbow-spiral.frag
│   │       └── psychedelic-eye.frag  signal.frag
│   └── sketches/
│       ├── layered-psychedelic.ts    layered 모드 Three.js 셋업
│       ├── psychedelic.ts            psychedelic sketch 로직
│       ├── psy-v3.ts                 psy-v3 sketch 로직
│       ├── rainbow-spiral.ts         rainbow-spiral sketch 로직
│       └── signal.ts                 signal sketch 로직
│
├── scripts/
│   ├── publish.ts                    ★ 원커맨드 Instagram Reels 퍼블리시
│   ├── pipeline.ts                   메인 파이프라인 (pipeline-pro + 프리뷰 + 익스포트)
│   ├── pipeline-pro.ts               pro-pipeline (bria + ESRGAN + flux-fill + depth)
│   ├── export-layered.ts             mp4 익스포트 (Puppeteer + ffmpeg)
│   ├── export-sketch.ts              sketch 모드 mp4 익스포트
│   ├── validate-loop.ts              루프 검증 (scene.json duration 정합성)
│   ├── preset-save.ts                프리셋 저장
│   ├── preset-list.ts                프리셋 목록
│   ├── analyze-track.ts              ★ TS 오케스트레이터 (analyze → preset → Tidal → 샘플)
│   ├── acid-reinterpreter.ts         ★ Acid E2E 파이프라인 (5-step)
│   └── lib/
│       ├── pipeline-cli.ts           CLI 인자 파싱
│       ├── replicate-utils.ts        Replicate API 유틸 (retry, version pin)
│       ├── archive.ts               아카이브 디렉토리 + RunContext
│       ├── browser-utils.ts          Puppeteer 유틸
│       ├── check-deps.ts             외부 의존성 검증 (ffmpeg 등)
│       ├── genre-preset.ts           장르 → 셰이더 프리셋 매핑
│       ├── track-analyzer.ts         트랙 분석 후처리 (preset/Tidal/scene-audio)
│       ├── validate-file-path.ts     파일 경로 검증
│       ├── work-dir.ts               _work/ 디렉토리 + 포트 관리
│       └── acid/                     Acid Reinterpreter 모듈
│           ├── separate.ts           Step 1: Demucs via Replicate
│           ├── analyze.py            Step 2: 멀티스템 분석
│           ├── interpret.ts          Step 3: Claude Sonnet LLM 해석
│           ├── prompt.ts             Step 3: 시스템/유저 프롬프트
│           ├── normalizer.ts         Step 3: 그리드 퀀타이즈 + 스케일 스냅
│           ├── schemas.ts            Zod 스키마 (analysis/interpretation)
│           ├── render.py             Step 4: 303 합성 + 909 샘플 트리거
│           └── master.py             Step 5: 프로 믹싱 + 마스터링
│
├── audio/
│   ├── analyzer/                     범용 오디오 분석기
│   │   ├── analyze_track.py          하이브리드 분석 (librosa + essentia)
│   │   ├── sample_extract.py         히트 추출 (onset → 분류 → WAV)
│   │   ├── master.py                 간단 마스터링 (3-band EQ + LUFS)
│   │   ├── mix-pro.py                5-stem 프로 믹싱 (사이드체인)
│   │   ├── calibrate.py              레퍼런스 유사도 평가 (0-100)
│   │   └── requirements.txt          Python 의존성
│   └── samples/
│       ├── 909/                      909 드럼 원샷 (6개)
│       └── 303/                      303 크로매틱 뱅크 (~550+ 샘플)
│
├── out/
│   ├── layered/                      비디오 아카이브
│   ├── acid/                         Acid Reinterpreter 출력
│   └── analysis/                     Track Analyzer 출력
└── docs/                             설계 문서 + 티켓
```

---

## Audio Pipeline

2개의 독립 오디오 파이프라인이 존재한다.

### A. Track Analyzer — 범용 오디오 분석

트랙을 분석해서 analysis.json + preset.json + Tidal 패턴 + 샘플 추출까지 수행한다.

```bash
# 기본 사용법
npm run analyze:track audio/samples/auto-machine.wav

# Python 직접 실행 (분석만)
python3 audio/analyzer/analyze_track.py <input.wav> <output_dir>
```

#### 분석 항목

| 분석 | 엔진 | 설명 |
|------|------|------|
| BPM | essentia + librosa (3소스 앙상블) | beat_track + tempogram + RhythmExtractor2013 교차 검증 |
| Key | essentia KeyExtractor | 조성 + confidence |
| Loudness | essentia EBU R128 | integrated / range / short_term_max |
| Danceability | essentia DZC | 0-2 스코어 |
| Spectral | librosa | centroid, bandwidth, rolloff, contrast, MFCC |
| Energy | librosa RMS | 100포인트 에너지 커브 |
| Structure | 에너지 기반 | intro / build / drop / break / outro 자동 분할 |
| Kick/Hat | HPSS + freq-band onset | 주파수 대역별 분리 후 onset 감지 |
| Bass Profile | STFT | centroid, flux → sub / rolling / acid 분류 |
| Pitch | torchcrepe → PESTO → pyin (3-tier) | 프레임 연속성 슬라이드 감지 |
| Stereo Width | L/R correlation | mid-side 비율 |
| Stems | demucs T3 | drums / bass / vocals / other 4-stem 분리 + 퍼-스템 분석 |

#### TS 오케스트레이터 (`npm run analyze:track`)

Python 분석 후 추가 생성:
1. **preset.json** — 장르 프리셋 (셰이더 파라미터 자동 매핑)
2. **patterns.tidal** — Tidal Cycles 패턴 (킥/햇 onset → 16스텝 변환)
3. **samples/** — demucs stems → 개별 히트 추출 (kick/snare/hat/bass/fx, 타입당 max 32개)
4. **scene-audio.json** — 비디오 셰이더 연동용 오디오 메타

```
out/analysis/{filename}/
├── analysis.json          # 전체 분석 결과
├── preset.json            # 장르 프리셋
├── patterns.tidal         # Tidal Cycles 패턴
├── scene-audio.json       # 셰이더 연동 메타
├── stems/                 # demucs 4-stem 분리
│   ├── drums.wav
│   ├── bass.wav
│   ├── vocals.wav
│   └── other.wav
└── samples/               # 개별 히트 추출
    ├── kick_001.wav
    ├── snare_001.wav
    ├── hat_001.wav
    └── manifest.json
```

---

### B. Acid Reinterpreter — LLM 기반 303/909 리크리에이션

레퍼런스 트랙을 분석하고, **Claude Sonnet**이 303/909 acid techno 배치를 생성한 뒤, 렌더링 + 마스터링까지 자동 수행하는 E2E 파이프라인.

```bash
# 기본 사용법
npx tsx scripts/acid-reinterpreter.ts <input.wav>

# 전체 옵션
npx tsx scripts/acid-reinterpreter.ts <input.wav> \
  --duration 20 \
  --start 30 \
  --out-dir out/acid/my-track \
  --dry-run \
  --resume \
  --jc303-path ~/Library/Audio/Plug-Ins/VST3/JC303.vst3
```

| Flag | Description | Default |
|------|-------------|---------|
| `<input.wav>` | 입력 오디오 (WAV/FLAC/MP3) | 필수 |
| `--start <sec>` | 분석 시작 시점 | 에너지 피크 자동 감지 |
| `--duration <sec>` | 분석/렌더 길이 | 20 |
| `--out-dir <path>` | 출력 디렉토리 | `out/acid/{timestamp}/` |
| `--dry-run` | 분석 + LLM 해석만 (렌더 생략) | false |
| `--resume` | 기존 아티팩트 재활용 | false |
| `--jc303-path <path>` | JC-303 VST3 경로 | `~/Library/Audio/Plug-Ins/VST3/JC303.vst3` |

#### 5-Step Pipeline

```
Input WAV/FLAC/MP3
    │
    ├─ [1/5] SEPARATE — Demucs (Replicate API)
    │  → stems/drums.wav, bass.wav, other.wav
    │
    ├─ [2/5] ANALYZE — Python 멀티스템 분석
    │  → analysis.json
    │  ├─ BPM (essentia + librosa)
    │  ├─ Key (essentia KeyExtractor, confidence ≥ 0.6)
    │  ├─ Drums: onset → spectral 분류 → 16th note 퀀타이즈
    │  │  (3단계: Madmom RNN onset → STFT 주파수 분류 → 그리드 스냅)
    │  ├─ Bass/Other: basic-pitch 뉴럴 피치 → MIDI 노트 이벤트
    │  ├─ Energy: 초당 RMS 커브
    │  ├─ Structure: build / drop / break 자동 감지
    │  └─ QC Gate: drums RMS, bass coverage, BPM confidence 검증
    │
    ├─ [3/5] INTERPRET — 🤖 Claude Sonnet LLM
    │  analysis.json 요약 → Claude Sonnet-4 (8192 tokens)
    │  → interpretation.json
    │  ├─ bass_303: 이벤트 (note, slide, cutoff, resonance, envMod, decay)
    │  ├─ riff_303: 이벤트 (높은 레지스터)
    │  ├─ kick/hat/snare_909: 16-step 패턴 + 벨로시티
    │  ├─ FX: reverb_send, delay_send, delay_time
    │  └─ energy_curve: build→drop 다이나믹
    │
    │  후처리:
    │  ├─ 싱글바 패턴 → 전체 duration 확장 (자동 반복)
    │  ├─ 값 클램핑 (envMod/decay/cutoff 범위 보정)
    │  └─ Normalizer: 16th 그리드 퀀타이즈 + 스케일 스냅 + 패턴 패딩
    │
    ├─ [4/5] RENDER — Python 303/909 합성
    │  → render/bass_303.wav, riff_303.wav, drums_909.wav
    │  ├─ 303: JC-303 VST3 (없으면 SoftSynth303 폴백)
    │  │  MIDI 이벤트 → 슬라이드(1ms 오버랩) + 악센트(vel>100)
    │  └─ 909: 원샷 샘플 트리거 (kick/snare/hat-closed/hat-open)
    │     + 드럼 체인 (HPF → LowShelf → Reverb → Comp → Gain)
    │
    └─ [5/5] MASTER — Python 프로 믹싱 + 마스터링
       → master.wav + qc.json
       ├─ Per-stem FX 체인 (EQ, Comp, Distortion, Reverb, Delay)
       ├─ FX 센드 (303 stems → Reverb/Delay 버스)
       ├─ Sidechain: kick envelope → bass/synth 더킹
       ├─ 3-band 멀티밴드 마스터링 (200Hz / 4kHz 크로스오버)
       │  Low: Comp + LowShelf + 모노 콜랩스
       │  Mid: EQ + Comp + Distortion
       │  High: HighShelf + Comp + 스테레오 와이드닝
       ├─ Master bus: Comp (글루) + Limiter (-0.3dB)
       ├─ LUFS 정규화: -14 LUFS 타겟 (Spotify 기준)
       └─ QC: LUFS [-16,-12], peak ≤-0.3dB, 클리핑 체크
```

#### 출력 구조

```
out/acid/{name}/
├── input.wav                  # 입력 사본
├── stems/                     # Demucs 분리 스템
│   ├── drums.wav
│   ├── bass.wav
│   └── other.wav
├── analysis.json              # Step 2: 분석 결과
├── raw_interpretation.json    # Step 3: LLM 원본 출력
├── interpretation.json        # Step 3: 정규화된 303/909 배치
├── render/                    # Step 4: 렌더 스템
│   ├── drums_909.wav
│   ├── bass_303.wav
│   └── riff_303.wav
├── master.wav                 # Step 5: 최종 마스터
└── qc.json                    # Step 5: QC 리포트
```

#### LLM이 생성하는 것

Claude Sonnet은 analysis.json 요약을 받아서 다음 JSON을 생성한다:

| 트랙 | 내용 | 예시 |
|------|------|------|
| bass_303 | 원바 노트 이벤트 (자동 반복) | `{time, note_midi, duration, velocity, accent, slide, cutoff, resonance, envMod, decay, waveform}` |
| riff_303 | 높은 레지스터 노트 이벤트 | 위와 동일 구조 |
| kick_909 | 16-step 패턴 + 벨로시티 | `{pattern: [1,0,0,0,...], velocity: [1.0,0,...]}` |
| hat_909 | 16-step 패턴 + open_pattern | closed/open 하이햇 분리 |
| snare_909 | 16-step 패턴 | backbeat 또는 고스트 노트 |
| fx | 리버브/딜레이 센드량 | `{reverb_send: 0.3, delay_send: 0.2, delay_time: 0.375}` |

---

### C. 보조 스크립트

#### `audio/analyzer/master.py` — 간단 마스터링

analysis.json의 frequency_balance를 읽어 3-band EQ + multiband comp + LUFS 정규화.

```bash
python3 audio/analyzer/master.py <input.wav> <analysis.json> \
  [--output out.wav] [--reference ref.wav]
```

| 처리 | 상세 |
|------|------|
| 3-band EQ | Butterworth 크로스오버 (250Hz / 4kHz), freq_balance 기반 자동 게인 |
| Multiband Comp | 대역별 RMS 엔벨로프 압축 (attack/release smoothing) |
| LUFS | -14 LUFS 타겟 (pyloudnorm EBU R128) |
| Peak Limiter | -0.3 dBFS 하드 시링 |
| Non-regression | 레퍼런스 대비 점수 3pt+ 하락 → reject + 원본 복원 |

#### `audio/analyzer/mix-pro.py` — 5-stem 프로 믹싱

pedalboard 기반 per-stem 이펙트 체인 + 사이드체인 더킹.

```bash
python3 audio/analyzer/mix-pro.py \
  --stems-dir <dir> --analysis <json> --output <wav> \
  [--style hard-techno] [--no-sidechain] [--reference ref.wav]
```

| Flag | Description | Default |
|------|-------------|---------|
| `--stems-dir` | stem WAV 디렉토리 (kick/bass/hat/synth/fx) | 필수 |
| `--analysis` | analysis.json 경로 | 없음 |
| `--output` | 출력 WAV | 필수 |
| `--style` | 사이드체인 프리셋 | hard-techno |
| `--no-sidechain` | 사이드체인 비활성화 | false |
| `--reference` | 레퍼런스 WAV (envelope matching + 스코어링) | 없음 |

**사이드체인 프리셋:**

| 스타일 | Attack | Release | Depth |
|--------|--------|---------|-------|
| dark-techno | 0.5ms | 80ms | 0.85 |
| hard-techno | 1.0ms | 100ms | 0.80 |
| melodic | 2.0ms | 150ms | 0.60 |
| industrial | 0.5ms | 60ms | 0.90 |
| psytrance | 1.0ms | 120ms | 0.70 |

#### `audio/analyzer/calibrate.py` — 레퍼런스 유사도 평가

5-metric composite score (0-100):

```bash
python3 audio/analyzer/calibrate.py <reference.wav> <synthesized.wav> \
  [--hybrid hybrid.wav] [--ref-stems dir] [--synth-stems dir] [-o out.json]
```

| 메트릭 | 가중치 | 측정 |
|--------|--------|------|
| MFCC + DTW | 30% | 음색 유사도 |
| Band-weighted Spectral | 20% | 주파수 분포 (Low/Mid/High 대역별) |
| RMS Envelope | 20% | 에너지 곡선 상관도 |
| Onset F1 | 15% | 어택 타이밍 정밀도 (50ms 허용) |
| Chroma DTW | 15% | 화성 진행 유사도 |

Quality 라벨: ≥75 Production Ready / ≥65 Good / <65 Needs Work

#### `audio/analyzer/sample_extract.py` — 히트 추출

demucs stem에서 개별 히트를 추출하여 WAV + manifest.json 생성.

```bash
python3 audio/analyzer/sample_extract.py <stem.wav> <output_dir> <stem_type>
# stem_type: drums | bass | other
```

멀티피처 분류: low energy >40% → kick, high energy >50% → hat, flatness >0.3 → snare

---

### Sample Packs

#### 909 (`audio/samples/909/`)

6개 원샷 드럼 샘플:

| 파일 | 용도 |
|------|------|
| `kick.wav` | 킥 (~150ms attack, 500ms tail) |
| `snare.wav` | 스네어 |
| `hat-closed.wav` | 클로즈드 하이햇 |
| `hat-open.wav` | 오픈 하이햇 (~180ms) |
| `clap.wav` | 핸드클랩 |
| `ride.wav` | 라이드 심벌 |

#### 303 (`audio/samples/303/`)

크로매틱 샘플 뱅크:
- **음역**: C1-C5 (MIDI 24-72, 49노트)
- **웨이브폼**: saw + square
- **아티큘레이션**: normal, accent, stab, squelch, long
- **FX 텍스처**: sweep_mild, sweep_acid, sweep_scream, zap
- **퍼커션**: click, tick, chirp, hat_short, hat_open (라운드 로빈)
- **총 ~550+ 샘플**

---

### Audio Prerequisites

```bash
# Python 의존성 (analyzer)
pip3 install -r audio/analyzer/requirements.txt
# → librosa, essentia, numpy, soundfile, pyloudnorm, scipy

# Acid Reinterpreter 추가 의존성
pip3 install pedalboard basic-pitch madmom

# 선택적 피치 트래커 (3-tier fallback)
pip3 install torchcrepe pesto-pitch

# 환경변수 (.env)
REPLICATE_API_TOKEN=r8_...    # Demucs stem 분리 (Replicate API)
ANTHROPIC_API_KEY=sk-ant-...  # LLM 해석 (Claude Sonnet)
```

---

## Dependencies

### Runtime

| 패키지 | 역할 |
|--------|------|
| three | 3D 렌더링 (ShaderMaterial) |
| postprocessing | Bloom, ChromaticAberration |
| puppeteer | headless Chrome 프레임 캡처 |
| sharp | 이미지 처리 (리사이즈, 마스크, 디노이징) |
| replicate | bria/flux-fill/ESRGAN/depth/demucs API |
| @anthropic-ai/sdk | Claude Sonnet LLM (Acid Reinterpreter) |
| zod | 스키마 검증 |
| dotenv | 환경변수 로딩 |

### Python (Audio)

| 패키지 | 역할 |
|--------|------|
| librosa | 오디오 분석 (BPM, onset, STFT, MFCC) |
| essentia | 프로 분석 (BPM, Key, Loudness, Danceability) |
| pedalboard | DSP 이펙트 체인 (Comp, Reverb, Delay, EQ) |
| pyloudnorm | EBU R128 LUFS 미터링 |
| soundfile | WAV/FLAC I/O |
| scipy | 신호처리 (Butterworth 필터) |
| basic-pitch | 뉴럴 피치 트래킹 (선택적) |
| torchcrepe | CREPE 피치 트래킹 (선택적) |

### External

| 도구 | 역할 |
|------|------|
| ffmpeg | MP4 인코딩 (HEVC + H.264) + 다운스케일 |
| python3 | 오디오 분석/렌더/마스터링 (3.9+) |
