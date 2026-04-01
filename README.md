# video-art

Three.js + GLSL + SuperCollider 기반 생성형 비디오 아트 시스템.
이미지 1장을 AI(bria + Real-ESRGAN + flux-fill-pro)로 2레이어 분해하고, HSV hue rotation + hueKey 셰이더로 사이키델릭 무한 루프 영상을 생성한다.

---

## Quick Start — 원커맨드 Instagram Reels 퍼블리시

```bash
npm install
cp .env.example .env  # → REPLICATE_API_TOKEN=r8_... 입력

# 이미지 1장 → Instagram Reels 완성본 (1080x1920, 30fps, H.264)
npm run publish input.png -- --title my-art

# 오디오 포함
npm run publish input.png -- --title my-art --audio music.wav --audio-start 55
```

### 파이프라인 자동 처리 내용

```
input.png (원본 해상도 유지)
  → bria/remove-background     전경 알파 매팅
  → Real-ESRGAN 2x             전경 초해상화 (업스케일 아티팩트 제거)
  → flux-fill-pro              배경 인페인팅
  → depth-anything-v2          깊이맵
  → 원본 해상도 레이어 조합     lanczos3 업스케일
  → Puppeteer 60fps 렌더링     고해상도 supersampling
  → 1080x1920 30fps 다운스케일  Instagram Reels 최적
  → 오디오 합본 (선택)          AAC 256kbps
```

### 출력 스펙

| 항목 | 값 |
|------|-----|
| 해상도 | 1080x1920 (9:16) |
| 코덱 | H.264 High Profile, Level 4.2 |
| 픽셀포맷 | yuv420p |
| 프레임레이트 | 30fps |
| CRF | 15 |
| 오디오 | AAC 256kbps |
| 호환 | Instagram Reels, QuickTime, 모든 플레이어 |

---

## 3가지 제작 방식

### 1. Layered 모드 — 이미지를 넣는다

이미지 1장을 AI로 전경/배경 분리 + 초해상화 + 인페인팅한 뒤, hueKey 셰이더로 색상 영역별 독립 애니메이션을 적용하여 무한 루프 영상으로 변환한다.

```bash
# 원커맨드 (권장)
npm run publish input.png -- --title sunset --audio music.wav --audio-start 55

# 단계별 실행
npm run pipeline input.png -- --title sunset --no-preview
npm run export:layered -- --title sunset
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
    │  → 전경 초해상화 (~1146x2048, 업스케일 아티팩트 제거)
    │
    ├─ Step 2: 인페인팅 마스크 생성
    │  전경 알파 > 10 → white
    │
    ├─ Step 3: flux-fill-pro (Replicate API)
    │  → 배경 인페인팅 (~807x1440)
    │
    ├─ Step 4: depth-anything-v2 (Replicate API)
    │  → 그레이스케일 깊이맵
    │
    ├─ Step 5: 원본 해상도로 레이어 조합 (lanczos3)
    │  layer-0: 배경 → 원본 해상도 업스케일
    │  layer-1: 전경 (ESRGAN) → 원본 해상도 업스케일
    │  → public/layers/ + public/scene.json
    │
    ├─ Export: Puppeteer 60fps 렌더링 (고해상도 supersampling)
    │  → ffmpeg H.264 yuv420p 인코딩
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
| 오디오 | AAC 256kbps | publish.ts |
| 전경 초해상화 | Real-ESRGAN 2x | pipeline-pro.ts |
| 레이어 리사이즈 | lanczos3 | pipeline-pro.ts |
| 다운스케일 | lanczos (supersampling) | publish.ts |

---

## CLI Flags

### publish.ts (원커맨드)

| Flag | Description |
|------|-------------|
| `<input.png>` | 입력 이미지 (필수) |
| `--title <name>` | 작품 타이틀 |
| `--audio <path>` | 오디오 파일 경로 |
| `--audio-start <sec>` | 오디오 시작 시점 (초, 기본 0) |
| `--duration <N>` | scene duration 초 (기본 20) |

### pipeline-pro.ts

| Flag | Description |
|------|-------------|
| `<input.png>` | 입력 이미지 (필수) |
| `--duration <N>` | scene duration 초 (1-300, 기본 20) |
| `--fps <N>` | 프레임 레이트 (1-120, 기본 60) |
| `--production` | model version pin 강제 |

### export:layered

| Flag | Description |
|------|-------------|
| `--title <name>` | 작품 타이틀 (아카이브 폴더명) |
| `--keep-frames` | 인코딩 후 PNG 프레임 보존 |
| `--fps <N>` | 프레임 레이트 override |
| `--prores` | ProRes 출력 |

---

## npm scripts

### 핵심

| Command | Description |
|---------|-------------|
| `npm run publish <img>` | **원커맨드** Instagram Reels 퍼블리시 |
| `npm run pipeline <img>` | pro-pipeline (분해 + 프리뷰 + 익스포트) |
| `npm run export:layered` | layered mp4 익스포트 |

### 개발

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite 개발서버 |
| `npm run build` | TypeScript + Vite 프로덕션 빌드 |
| `npm run test` | Vitest |
| `npm run test:watch` | Vitest watch 모드 |

### Audio

| Command | Description |
|---------|-------------|
| `npm run audio:setup` | 의존성 설치 + SC 검증 |
| `npm run live:start` | SC + SuperDirt + Tidal 부팅 |
| `npm run live:stop` | 전체 스택 종료 |
| `npm run render:audio` | scene.json → master.wav (NRT) |
| `npm run render:av` | 비디오 + 오디오 → final.mp4 |

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
    "bloom": { "strength": 0.7, "radius": 0.5, "threshold": 0.35 },
    "chromaticAberration": { "offset": 3.0, "modulationOffset": 0.5 }
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
  → ffmpeg: libx264, yuv420p, CRF 15
  → (publish) lanczos downscale → 1080x1920 30fps Instagram
  → 아카이브: out/layered/{date}_{title}/
```

---

## Project Structure

```
video-art/
├── src/
│   ├── main.ts                       진입점: sketch/layered 라우팅
│   ├── lib/
│   │   ├── scene-schema.ts           Zod 스키마 (fps default: 60)
│   │   ├── scene-loader.ts           scene.json fetch + 검증
│   │   └── effect-composer.ts        EffectComposer (Bloom + CA)
│   ├── shaders/
│   │   ├── layer.frag                HSV hue rotation + hueKey 셰이더
│   │   ├── layer.vert                버텍스 셰이더
│   │   └── sketches/*.frag           sketch 작품 셰이더
│   └── sketches/
│       └── layered-psychedelic.ts    layered 모드 Three.js 셋업
│
├── scripts/
│   ├── publish.ts                    ★ 원커맨드 Instagram Reels 퍼블리시
│   ├── pipeline.ts                   메인 파이프라인 (pipeline-pro + 프리뷰 + 익스포트)
│   ├── pipeline-pro.ts               pro-pipeline (bria + ESRGAN + flux-fill + depth)
│   ├── export-layered.ts             mp4 익스포트 (Puppeteer + ffmpeg)
│   └── lib/
│       ├── pipeline-cli.ts           CLI 인자 파싱
│       ├── replicate-utils.ts        Replicate API 유틸
│       └── scene-generator.ts        역할 기반 preset → scene.json
│
├── audio/                            SuperCollider + TidalCycles
├── out/layered/                      아카이브 (mp4 + layers + scene.json)
└── docs/                             설계 문서 + 티켓
```

---

## Dependencies

### Runtime

| 패키지 | 역할 |
|--------|------|
| three | 3D 렌더링 (ShaderMaterial) |
| postprocessing | Bloom, ChromaticAberration |
| puppeteer | headless Chrome 프레임 캡처 |
| sharp | 이미지 처리 (리사이즈, 마스크) |
| replicate | bria/flux-fill/ESRGAN/depth API |
| zod | 스키마 검증 |

### External

| 도구 | 역할 |
|------|------|
| ffmpeg | MP4 인코딩 + 다운스케일 |
| SuperCollider | 오디오 합성 (선택) |
