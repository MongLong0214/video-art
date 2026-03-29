# video-art

Three.js + GLSL + SuperCollider 기반 생성형 비디오 아트 시스템.
이미지 1장을 AI(SAM 2)로 레이어 분해하고, HSV hue rotation 셰이더로 사이키델릭 무한 루프 영상을 생성한다.

---

## 3가지 제작 방식

### 1. Layered 모드 — 이미지를 넣는다

이미지 1장을 SAM 2가 레이어로 분해하고, 각 레이어에 luminance-preserving HSV hue rotation을 적용하여 무한 루프 영상으로 변환한다.

```bash
npm run pipeline:layers sunset.png -- --title sunset

# 1. Path traversal 검증 (프로젝트 루트 범위 제한)
# 2. 이미지 복잡도 분석 → 적정 레이어 수 결정
# 3. SAM 2 segmentation (Replicate API)
# 4. Candidate 변환 (batched, concurrency=4)
# 5. 배타적 소유권 해결 (per-candidate mask 캐싱)
# 6. 역할 할당 + z-order 정렬
# 7. scene.json 생성 → public/에 복사

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
npm run pipeline:layers input.png -- --title my-art
npm run export:layered -- --title my-art
```

## Prerequisites

- **Node.js** 18+
- **ffmpeg** (`brew install ffmpeg`)
- **REPLICATE_API_TOKEN** (`.env`) — layered 모드 전용

---

## Pipeline 흐름 (Layered 모드)

```
input.png
    │
    ├─ validate-file-path.ts
    │  realpathSync + startsWith(projectRoot + sep) — path traversal 차단
    │
    ├─ input-validator.ts
    │  포맷/크기 검증 + CMYK→sRGB + 4096px 리사이즈
    │
    ├─ complexity-scoring.ts
    │  Sobel edge density + color entropy → layer count 결정
    │
    ├─ image-decompose.ts
    │  SAM 2 segmentation (Replicate API) → per-object masks
    │  fallback: luminance zone split (SAM 마스크 부족 시)
    │
    ├─ mask-stats.ts (Step 4)
    │  computeMaskStats(rgba, w, h, SAM_OPACITY_THRESHOLD)
    │  → coverage, bbox, centroid, opaqueCount
    │  batched processing (concurrency=4, batch-process.ts)
    │
    ├─ mask-cache.ts (Step 5.5)
    │  buildMaskCache → Map<candidateId, Uint8Array>
    │  Steps 6/8에서 재사용, Step 10은 미사용 (retention 이후)
    │
    ├─ layer-resolve.ts
    │  1. deduplicateCandidates (IoU > 0.92 → drop)
    │  2. resolveExclusiveOwnership (pixel → 단일 레이어, predecodedMasks 캐시)
    │  3. assignRoles (background-plate / subject / detail / foreground-occluder)
    │  4. orderByRole (role z-order + coverage tie-break)
    │  5. applyRetentionRules (uniqueCoverage >= 0.5%, cap 16)
    │  6. fillBackgroundPlate (unclaimed pixel 채움)
    │
    ├─ scene-generator.ts
    │  getRolePreset(role) → 역할별 animation 파라미터
    │  → scene.json + layers/ → public/
    │
    └─ decomposition-manifest.ts
        → decomposition-manifest.json (provenance)
```

### 셰이더 — Luminance-preserving HSV Hue Rotation

`layer.frag`는 wave/parallax 없이 **구조를 픽셀 단위로 유지**하면서 색상만 변조한다:

1. RGB → HSV 변환
2. luminance 기반 phase offset (`pow(1-lum, 1+luminanceKey)`)
3. hue shift (시간 × speed / period + phase)
4. saturation boost (원본 채도 기반 blend)
5. luminance 보존 (`hsv.z = originalVal`)
6. subtle glow pulse (sin 기반)

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
| `ALPHA_THRESHOLD` | 128 | BFS/ownership alpha 판정 |
| `SAM_OPACITY_THRESHOLD` | 10 | SAM raw mask 필터 |
| `MIN_COVERAGE` | 0.005 | BFS candidate 최소 커버리지 |
| `SAM_MIN_COVERAGE` | 0.001 | SAM mask 최소 커버리지 |
| `UNIQUE_COVERAGE_THRESHOLD` | 0.005 | retention 최소 고유 커버리지 |
| `IOU_DEDUPE_THRESHOLD` | 0.92 | IoU 중복 제거 |
| `MAX_LAYERS` | 16 | 최대 retained layers |
| `MIN_RETAINED_LAYERS` | 6 | progressive relaxation 목표 |

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

## CLI Flags (pipeline-layers)

| Flag | Description |
|------|-------------|
| `--title <name>` | 작품 타이틀 (아카이브 폴더명) |
| `--layers <N>` | SAM 2 mask count override (1-12) |
| `--duration <N>` | scene duration 초 (1-300, 기본 20) |
| `--production` | model version pin 강제 |
| `--unsafe` | manifest 기록 전용 (path validation과 무관) |
| `--keep-frames` | 인코딩 후 PNG 프레임 보존 (export:layered) |

---

## npm scripts

### 개발

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite 개발서버 |
| `npm run build` | TypeScript + Vite 프로덕션 빌드 |
| `npm run test` | Vitest (2565 tests, 76 files) |
| `npm run test:watch` | Vitest watch 모드 |

### Layered 모드

| Command | Description |
|---------|-------------|
| `npm run pipeline:layers <img>` | SAM 2 분해 + 역할 할당 + scene.json |
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
| `npm run research:calibrate` | noise floor(δ_min) 측정 |
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
      "id": "background",
      "file": "layers/layer-0.png",
      "zIndex": 0,
      "opacity": 1.0,
      "role": "background-plate",
      "animation": {
        "colorCycle": { "speed": 0.5, "period": 20, "phaseOffset": 0 },
        "glow": { "intensity": 0.3, "pulse": 1.0, "period": 20 },
        "saturationBoost": 2.5,
        "luminanceKey": 0.6
      }
    }
  ],
  "effects": {
    "bloom": { "strength": 0.6, "radius": 0.4, "threshold": 0.7 },
    "chromaticAberration": { "offset": 1.5 }
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
    ├── PlaneGeometry z=0.1  subject
    └── PlaneGeometry z=0.2  foreground-occluder
    각 레이어: ShaderMaterial(layer.vert + layer.frag)
      uniforms: uTexture, uTime, uColorCycleSpeed/Period/PhaseOffset,
                uGlowIntensity/Pulse/Period, uSaturationBoost, uLuminanceKey
  → EffectComposer (Bloom + ChromaticAberration)
  → Canvas
```

### Export Pipeline

```
Puppeteer headless Chrome
  → Clock.startRecording() (deterministic: frame × 1/fps)
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
│   │   ├── scene-schema.ts           Zod 스키마 (LayerRole, LayerCandidate)
│   │   └── scene-loader.ts           scene.json fetch + 검증
│   ├── shaders/
│   │   ├── layer.frag                HSV hue rotation 셰이더
│   │   ├── layer.vert                버텍스 셰이더
│   │   └── sketches/*.frag           sketch 작품 셰이더
│   └── sketches/
│       └── layered-psychedelic.ts    layered 모드 Three.js 셋업
│
├── scripts/
│   ├── pipeline-layers.ts            메인 파이프라인 오케스트레이터
│   ├── export-layered.ts             mp4 익스포트 (Puppeteer + ffmpeg)
│   ├── export-sketch.ts              sketch mp4 익스포트
│   ├── lib/
│   │   ├── pipeline-constants.ts     8개 공유 상수 (SAM/BFS threshold)
│   │   ├── mask-stats.ts             computeMaskStats (SAM path)
│   │   ├── mask-cache.ts             buildMaskCache (per-candidate 캐싱)
│   │   ├── batch-process.ts          batchProcess (concurrency limiter)
│   │   ├── bitrate.ts                getBitrate (해상도 기반 동적)
│   │   ├── validate-file-path.ts     path traversal 검증
│   │   ├── candidate-extraction.ts   BFS 연결 성분 분석
│   │   ├── layer-resolve.ts          dedupe + ownership + role + retention
│   │   ├── complexity-scoring.ts     Sobel edge + color entropy
│   │   ├── image-decompose.ts        SAM 2 API + luminance fallback
│   │   ├── scene-generator.ts        역할 기반 preset → scene.json
│   │   ├── input-validator.ts        이미지 포맷/크기 검증
│   │   ├── pipeline-cli.ts           CLI 인자 파싱
│   │   └── decomposition-manifest.ts provenance manifest
│   └── research/                     Autoresearch System
│       ├── program.md                에이전트 연구 지시서
│       ├── research-config.ts        튜닝 파라미터 (Zod)
│       ├── evaluate.ts               평가 harness (수정 금지)
│       ├── prepare.ts / calibrate.ts / run-once.ts
│       ├── report.ts / promote.ts
│       └── metrics/                  M1-M10 메트릭 구현
│
├── audio/                            SuperCollider + TidalCycles
│   ├── sc/synthdefs/                 SynthDef 9종
│   └── setup.sh                      의존성 검증
│
├── docs/prd/                         PRD (설계 스펙)
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
| sharp | ^0.34.5 | 이미지 처리 (mask, metric) |
| replicate | ^1.4.0 | SAM 2 API |
| @fal-ai/client | ^1.9.5 | fal.ai API |
| zod | ^4.3.6 | 스키마 검증 |
| dotenv | ^17.3.1 | 환경변수 |

### Dev

| 패키지 | 버전 | 역할 |
|--------|------|------|
| vite | ^6.2.0 | 번들러 + HMR |
| vite-plugin-glsl | ^1.3.1 | .frag/.vert import |
| typescript | ^5.7.0 | strict 타입 체크 |
| tsx | ^4.21.0 | TS 스크립트 실행 |
| vitest | ^4.1.1 | 2565 tests (76 files) |

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
