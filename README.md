# video-art

Three.js + GLSL + SuperCollider 기반 생성형 비디오 아트 시스템.
이미지 1장을 AI(bria + flux-fill-pro)로 2레이어 분해하고, HSV hue rotation + hueKey 셰이더로 사이키델릭 무한 루프 영상을 생성한다.

---

## 3가지 제작 방식

### 1. Layered 모드 — 이미지를 넣는다

이미지 1장을 bria/remove-background로 전경/배경 분리, flux-fill-pro로 배경 인페인팅, depth-anything-v2로 깊이맵 생성한 뒤, hueKey 셰이더로 색상 영역별 독립 애니메이션을 적용하여 무한 루프 영상으로 변환한다.

```bash
npm run pipeline input.png -- --title sunset

# 1. bria/remove-background → 전경 알파 매팅
# 2. flux-fill-pro → 배경 인페인팅
# 3. depth-anything-v2 → 깊이맵
# 4. 2 레이어 조합 + scene.json 생성 → public/에 복사

npm run export:layered -- --title sunset
# → Puppeteer 프레임 캡처 → ffmpeg 인코딩 (해상도 기반 동적 bitrate)
```

### 2. Sketch 모드 — 코드로 만든다

`.frag` 셰이더 파일 하나가 작품 하나. 수학 함수로 모든 픽셀을 직접 계산한다.

```bash
npm run dev
# → http://localhost:5173/?sketch=psychedelic

npm run export:sketch -- --sketch ocean-wave --title ocean-wave
```

### 3. Audio 모드 — 소리를 입힌다

SuperCollider + TidalCycles 기반 전자음악 시스템.

```bash
npm run live:start              # SC + SuperDirt + Tidal 부팅
npm run render:audio            # scene.json → master.wav (NRT)
npm run render:av               # 비디오 + 오디오 합성
```

---

## Quick Start

```bash
npm install

cp .env.example .env
# → REPLICATE_API_TOKEN=r8_... 입력

npm run dev
# → http://localhost:5173                     sketch 모드
# → http://localhost:5173/?mode=layered       layered 모드

# 풀 파이프라인
npm run pipeline input.png -- --title my-art
npm run export:layered -- --title my-art
```

## Prerequisites

- **Node.js** 18+
- **ffmpeg** (`brew install ffmpeg`)
- **REPLICATE_API_TOKEN** (`.env`) — layered 모드 전용

---

## Pipeline 흐름 (Layered 모드 — Pro Pipeline)

```
input.png
    │
    ├─ pipeline-pro.ts
    │  오케스트레이터: 아래 4 단계를 순차 실행
    │
    ├─ Step 1: bria/remove-background (Replicate API)
    │  → 전경 PNG (알파 매팅, 4ch RGBA)
    │
    ├─ Step 2: 인페인팅 마스크 생성
    │  전경 알파 > 10 → white (인페인팅 대상)
    │
    ├─ Step 3: flux-fill-pro (Replicate API)
    │  원본 이미지 + 마스크 → 배경 인페인팅 (전경 영역을 배경으로 채움)
    │
    ├─ Step 4: depth-anything-v2 (Replicate API)
    │  → 그레이스케일 깊이맵
    │
    ├─ Step 5: 2-레이어 조합
    │  layer-0: AI 인페인팅된 배경 (role: background-plate)
    │  layer-1: AI 매팅된 전경 (role: subject)
    │  → public/layers/ + public/scene.json
    │
    └─ scene-generator.ts (Autoresearch 경유 시)
       역할별 animation preset → scene.json
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

### LayerRole

| Role | z-order | 설명 |
|------|---------|------|
| `background-plate` | 0 | 전체 캔버스, 가장 느린 hue cycle |
| `background` | 1 | 배경 요소 |
| `midground` | 2 | 중간 요소 |
| `subject` | 3 | 중심 피사체 |
| `detail` | 4 | 세부 요소, 빠른 hue cycle |
| `foreground-occluder` | 5 | 전경 가리개 |

### 공유 상수 (`pipeline-constants.ts`)

| 상수 | 값 | 용도 |
|------|-----|------|
| `ALPHA_THRESHOLD` | 10 | ownership alpha 판정 |

### 동적 Bitrate (`bitrate.ts`)

해상도(총 픽셀 수) 기반 자동 결정. 30fps scope.

| 해상도 | 픽셀 수 | Bitrate |
|--------|---------|---------|
| 720p | 921,600 | 8M |
| 1080p | 2,073,600 | 15M |
| 1440p | 3,686,400 | 25M |
| 4K | 8,294,400 | 40M |

사이 해상도는 선형 보간 (floor). 720p 미만/4K 초과는 clamp.

---

## CLI Flags

### pipeline-pro.ts

| Flag | Description |
|------|-------------|
| `<input.png>` | 입력 이미지 (필수) |
| `--duration <N>` | scene duration 초 (1-300, 기본 20) |
| `--fps <N>` | 프레임 레이트 (1-120, 기본 30) |
| `--production` | model version pin 강제 |
| `--prores` | ProRes 출력 |

### export:layered

| Flag | Description |
|------|-------------|
| `--title <name>` | 작품 타이틀 (아카이브 폴더명) |
| `--keep-frames` | 인코딩 후 PNG 프레임 보존 |
| `--fps <N>` | 프레임 레이트 override |
| `--prores` | ProRes 출력 |

---

## npm scripts

### 개발

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite 개발서버 |
| `npm run build` | TypeScript + Vite 프로덕션 빌드 |
| `npm run test` | Vitest (2410 tests, 75 files) |
| `npm run test:watch` | Vitest watch 모드 |

### Layered 모드

| Command | Description |
|---------|-------------|
| `npm run pipeline <img>` | pro-pipeline 오케스트레이터 (분해 + 프리뷰 + 익스포트) |
| `npm run pipeline:pro <img>` | pro-pipeline 단독 실행 (bria + flux-fill + depth) |
| `npm run export:layered` | layered mp4 익스포트 (동적 bitrate) |
| `npm run pipeline:validate` | 루프 이음새 검증 (RMSE) |

### Sketch 모드

| Command | Description |
|---------|-------------|
| `npm run export:sketch -- --sketch <name>` | sketch → mp4 |

### Audio

| Command | Description |
|---------|-------------|
| `npm run audio:setup` | 의존성 설치 + SC 검증 |
| `npm run live:start` | SC + SuperDirt + Tidal 부팅 |
| `npm run live:stop` | 전체 스택 종료 |
| `npm run live:record` | 라이브 녹음 |
| `npm run render:audio` | scene.json → master.wav (NRT) |
| `npm run render:av` | 비디오 + 오디오 → final.mp4 |
| `npm run render:stems` | SynthDef별 stem 렌더 |
| `npm run render:prod` | 프로덕션 마스터 렌더 |

### Autoresearch

| Command | Description |
|---------|-------------|
| `npm run research:prepare` | 레퍼런스 keyframe + temporal pairs 추출 |
| `npm run research:calibrate` | noise floor(delta_min) 측정 |
| `npm run research:run` | 단일 실험 (config → pipeline → evaluate) |
| `npm run research:eval` | 단일 영상 10 메트릭 평가 |
| `npm run research:report` | 실험 이력 요약 |
| `npm run research:promote` | best config → baseline 승격 |

---

## scene.json

```jsonc
{
  "version": 1,
  "source": "sunset.png",
  "resolution": [1080, 1920],
  "duration": 20,
  "fps": 30,
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
    "bloom": { "strength": 0.7, "radius": 0.5, "threshold": 0.35 },
    "chromaticAberration": { "offset": 3.0, "modulationOffset": 0.5 },
    "parallax": { "scale": 0 },
    "haze": { "intensity": 0 },
    "feather": { "radius": 0 }
  },
  "audio": { "bpm": 120, "key": "Am", "genre": "techno" }
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
      uniforms: uTexture, uTime, uColorCycleSpeed/Period/PhaseOffset,
                uGlowIntensity/Pulse/Period, uSaturationBoost, uLuminanceKey,
                uSatBlendLow/High, uSatInjectionMul, uGlowPulseFloor, uLumExponent,
                uHueKey, uHueSpeed, uHazeIntensity, uDepthNorm, uFeatherRadius
  → EffectComposer (Bloom + ChromaticAberration)
  → Canvas
```

### Export Pipeline

```
Puppeteer headless Chrome
  → Clock.startRecording() (deterministic: frame x 1/fps)
  → Loop N frames: __captureFrame() → PNG
  → ffmpeg: libx264, yuv420p, getBitrate(resolution) (동적)
  → 아카이브: out/layered/{date}_{title}/
```

---

## Project Structure

```
video-art/
├── src/
│   ├── main.ts                       진입점: sketch/layered 라우팅
│   ├── lib/
│   │   ├── scene-schema.ts           Zod 스키마 (LayerRole, AnimationConfig)
│   │   └── scene-loader.ts           scene.json fetch + 검증
│   ├── shaders/
│   │   ├── layer.frag                HSV hue rotation + hueKey 셰이더
│   │   ├── layer.vert                버텍스 셰이더
│   │   └── sketches/*.frag           sketch 작품 셰이더
│   └── sketches/
│       └── layered-psychedelic.ts    layered 모드 Three.js 셋업
│
├── scripts/
│   ├── pipeline.ts                   메인 파이프라인 (pipeline-pro 호출 + 프리뷰 + 익스포트)
│   ├── pipeline-pro.ts               pro-pipeline (bria + flux-fill-pro + depth)
│   ├── export-layered.ts             mp4 익스포트 (Puppeteer + ffmpeg)
│   ├── export-sketch.ts              sketch mp4 익스포트
│   ├── lib/
│   │   ├── pipeline-constants.ts     공유 상수 (ALPHA_THRESHOLD)
│   │   ├── pipeline-cli.ts           CLI 인자 파싱
│   │   ├── replicate-utils.ts        Replicate API 유틸 (retry, token, URL 검증)
│   │   ├── scene-generator.ts        역할 기반 preset → scene.json
│   │   ├── input-validator.ts        이미지 포맷/크기 검증
│   │   ├── validate-file-path.ts     path traversal 검증
│   │   ├── bitrate.ts                getBitrate (해상도 기반 동적)
│   │   ├── batch-process.ts          batchProcess (concurrency limiter)
│   │   └── ...                       audio/live 관련 모듈
│   └── research/                     Autoresearch System
│       ├── program.md                에이전트 연구 지시서
│       ├── research-config.ts        튜닝 파라미터 (Zod, 25 axes)
│       ├── evaluate.ts               평가 harness
│       ├── pipeline-runner.ts        연구용 pipeline 실행기
│       ├── prepare.ts / calibrate.ts / run-once.ts
│       ├── report.ts / promote.ts
│       └── metrics/                  M1-M10 메트릭 구현
│
├── audio/                            SuperCollider + TidalCycles
│   ├── sc/synthdefs/                 SynthDef 9종
│   └── setup.sh                      의존성 검증
│
├── docs/plans/                       설계 계획
├── docs/tickets/                     개발 티켓
└── out/layered/                      아카이브 (mp4 + layers + scene.json)
```

---

## Dependencies

### Runtime

| 패키지 | 버전 | 역할 |
|--------|------|------|
| three | ^0.172.0 | 3D 렌더링 (ShaderMaterial) |
| postprocessing | ^6.39.0 | Bloom, ChromaticAberration |
| puppeteer | ^24.40.0 | headless Chrome 프레임 캡처 |
| sharp | ^0.34.5 | 이미지 처리 (리사이즈, 마스크 생성) |
| replicate | ^1.4.0 | bria/flux-fill-pro/depth API |
| zod | ^4.3.6 | 스키마 검증 |
| dotenv | ^17.3.1 | 환경변수 |

### Dev

| 패키지 | 버전 | 역할 |
|--------|------|------|
| vite | ^6.2.0 | 번들러 + HMR |
| vite-plugin-glsl | ^1.3.1 | .frag/.vert import |
| typescript | ^5.7.0 | strict 타입 체크 |
| tsx | ^4.21.0 | TS 스크립트 실행 |
| vitest | ^4.1.1 | 2410 tests (75 files) |

### External

| 도구 | 역할 |
|------|------|
| ffmpeg | MP4 인코딩 + VMAF 평가 |
| SuperCollider | 오디오 합성 + NRT 렌더 |

---

## Security

| 위협 | 방어 |
|------|------|
| Path traversal | `validateFilePath()` — realpathSync + startsWith(root + sep) + symlink + dir 검증 |
| Shell injection | `execFile` (array-form) 전용 |
| SC code injection | Zod enum 검증 값만 보간 |
| Replicate version drift | `enforceVersionPin()` — production 모드 64-char hex SHA 강제 |
| Preset injection | `/^[a-zA-Z0-9_-]+$/` regex |
