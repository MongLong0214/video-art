# video-art

Three.js + GLSL 기반 생성형 비디오 아트 시스템.
무한 루프 영상을 만들고, 날짜+타이틀 기반으로 작품을 아카이빙한다.

---

## 2가지 제작 방식

### 1. Sketch 모드 — 코드로 만든다

`.frag` 셰이더 파일 하나가 작품 하나. 수학 함수(sin, cos, smoothstep 등)로 모든 픽셀을 직접 계산해서 영상을 생성한다. 이미지 입력 없음.

```bash
# 미리보기
npm run dev
# → http://localhost:5173/?sketch=psychedelic

# 새 작품 만들기: .frag 파일 생성 → 프롬프트로 코드 수정 → 실시간 확인
# → src/shaders/sketches/ocean-wave.frag
# → http://localhost:5173/?sketch=ocean-wave

# 익스포트
npm run export:sketch -- --sketch ocean-wave --title ocean-wave
```

작품 목록은 `src/shaders/sketches/` 디렉토리의 `.frag` 파일들이 곧 목록이다. URL `?sketch=` 파라미터에 파일명(확장자 제외)을 넣으면 해당 작품이 로드된다.

**레퍼런스 영상 기반 제작**: `/video-blueprint` 스킬로 기존 영상을 분석하면 blueprint.json + .frag가 자동 생성된다. 분석 → 셰이더 생성 → 미리보기 → mp4 익스포트까지 스킬이 처리.

### 2. Layered 모드 — 이미지를 넣는다

이미지 1장을 AI가 4개 레이어(배경/주체/디테일/전경)로 분해하고, 각 레이어에 색순환+웨이브+글로우+패럴랙스 효과를 자동 적용하여 무한 루프 영상으로 변환한다. 코드를 건드리지 않음.

```bash
npm run pipeline sunset.png -- --title sunset

# 1. Replicate API로 레이어 분해 (~10초, ~$0.03)
# 2. 후처리 (알파 정리, 노이즈 제거, 커버리지 정렬)
# 3. 브라우저 미리보기 (http://localhost:5173/?mode=layered)
# 4. Enter → 프레임 캡처 → mp4 인코딩 → 아카이브 저장
```

수동 레이어 가능: 프로젝트 루트 `layers/` 디렉토리에 `layer-0.png ~ layer-3.png`를 넣고 `pipeline:layers`를 실행하면 API 호출 없이 진행. 원본은 보존되고, work dir에 복사되어 처리됨.

---

## Quick Start

```bash
# 설치
npm install

# .env 설정 (layered 모드에 필요)
cp .env.example .env
# → REPLICATE_API_TOKEN=r8_... 입력

# 실시간 미리보기
npm run dev
# → http://localhost:5173                     sketch 모드 (기본: psychedelic)
# → http://localhost:5173/?sketch=blueprint   다른 sketch
# → http://localhost:5173/?mode=layered       layered 모드

# Sketch 익스포트
npm run export:sketch -- --sketch psychedelic --title my-first-art

# Layered 풀 파이프라인
npm run pipeline input.png -- --title sunset
```

## Prerequisites

- **Node.js** 18+
- **ffmpeg / ffprobe** (`brew install ffmpeg`)
- **REPLICATE_API_TOKEN** (`.env`) — layered 모드 전용

---

## npm scripts

### 개발

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite 개발서버 (실시간 미리보기, hot reload) |
| `npm run build` | TypeScript 체크 + Vite 프로덕션 빌드 |
| `npm run test` | Vitest 유닛 테스트 |

### Sketch 모드

| Command | Description |
|---------|-------------|
| `npm run export:sketch -- --sketch <name>` | sketch .frag → mp4 (해상도/fps/duration은 `sketch-configs.ts` 레지스트리 참조) |

### Layered 모드

| Command | Description |
|---------|-------------|
| `npm run pipeline <img> -- --title <name>` | 풀 파이프라인: 레이어 분해 → 미리보기 → mp4 |
| `npm run pipeline:layers <img>` | 레이어 분해 + 후처리 + scene.json 생성만 |
| `npm run pipeline:validate` | 루프 이음새 검증 (pixel RMSE < 2.0) |
| `npm run export:layered -- --title <name>` | layered mp4 익스포트만 (1080x1080, 60fps, scene.json duration) |

### 공통 플래그

| Flag | Description |
|------|-------------|
| `--title <name>` | 작품 타이틀 (아카이브 폴더명). 생략 시 입력 파일명 또는 `untitled` |
| `--sketch <name>` | sketch .frag 파일명 (기본: `psychedelic`) |
| `--url <url>` | dev server URL (기본: `http://localhost:5173`) |
| `--keep-frames` | 인코딩 후 PNG 프레임 보존 (`_work/` 유지) |
| `--no-preview` | pipeline에서 미리보기 단계 건너뛰기 |

---

## Output & Archiving

모든 결과물은 `out/{pipeline}/` 아래에 **날짜\_타이틀** 폴더로 아카이빙된다. `out/` 전체가 `.gitignore`.

```
out/
├── blueprint/                           ← sketch 모드 파이프라인
│   ├── 2026-03-26_psychedelic/
│   │   ├── psychedelic.frag                셰이더 소스 스냅샷
│   │   └── psychedelic.mp4                 최종 영상
│   └── 2026-03-26_ocean-wave/
│       ├── ocean-wave.frag
│       └── ocean-wave.mp4
│
├── layered/                             ← layered 모드 파이프라인
│   ├── 2026-03-26_sunset/
│   │   ├── layers/
│   │   │   ├── layer-0.png                 배경
│   │   │   ├── layer-1.png                 주체
│   │   │   ├── layer-2.png                 디테일
│   │   │   └── layer-3.png                 전경
│   │   ├── scene.json                      씬 설정 스냅샷
│   │   └── sunset.mp4                      최종 영상
│   └── 2026-03-26_sunset-2/             ← 같은 날 재실행 시 자동 넘버링
│       └── ...
│
├── _work/                               ← pipeline-layers 임시 (createWorkDir)
│   └── {runId}/                            프로세스 종료 시 자동 삭제
│       └── layers/
│
└── captured-frames/                     ← capture-rendered.ts (standalone 유틸)
    └── frame_00000.png ...
```

### 아카이빙 시스템 (archive.ts)

두 가지 컨텍스트 생성 함수:

| 함수 | 용도 | 아카이브 경로 | _work/ 위치 |
|------|------|-------------|------------|
| `createRunContext(root, title, pipeline)` | 최종 산출물 있는 익스포트 | `out/{pipeline}/{date}_{title}/` | 아카이브 내부 (`archiveDir/_work/`) |
| `createWorkDir(root)` | 중간 단계만 (pipeline-layers) | 없음 | `out/_work/{runId}/` |

각 스크립트의 사용:

| 스크립트 | 함수 | pipeline |
|---------|------|---------|
| `export-sketch.ts` | `createRunContext` | `"blueprint"` |
| `export-layered.ts` | `createRunContext` | `"layered"` |
| `pipeline-layers.ts` | `createWorkDir` | — |
| `capture-rendered.ts` | 없음 (독립 유틸) | — |

### 아카이브 규칙

| 규칙 | 설명 |
|------|------|
| 폴더명 | `out/{pipeline}/{YYYY-MM-DD}_{slugified-title}/` |
| 자기완결 | Blueprint: `.frag` + `.mp4` / Layered: `layers/` + `scene.json` + `.mp4` |
| 충돌 방지 | 같은 날짜+타이틀 시 `-2`, `-3` 자동 suffix |
| 슬러그 | 영문+숫자+하이픈만 (`Hello World!` → `hello-world`) |
| 자동 정리 | `_work/` 완료 시 삭제. 실패 시 빈 아카이브 디렉토리도 자동 삭제 |
| `--keep-frames` | `skipCleanup()` — `_work/` 유지하여 프레임 보존 |

---

## Project Structure

```
video-art/
├── src/
│   ├── main.ts                       진입점: sketch/layered 라우팅, 렌더 루프, Puppeteer API
│   ├── core/
│   │   └── clock.ts                  시간 관리 (Live: realtime / Recording: deterministic)
│   ├── lib/
│   │   ├── scene-schema.ts           scene.json Zod 스키마 + 타입
│   │   ├── scene-loader.ts           scene.json fetch + 검증
│   │   ├── sketch-configs.ts         스케치 레지스트리 (해상도, fps, loopDuration, toneMapping)
│   │   ├── sketch-registry.ts        스케치 레지스트리 re-export + toneMapping getter
│   │   ├── bpm-calculator.ts         BPM → 루프/주기 계산
│   │   ├── palette.ts                24색 팔레트 (hex → vec3)
│   │   ├── shader-plane.ts           풀스크린 쿼드 팩토리
│   │   └── effect-composer.ts        포스트프로세싱 (Bloom, CA, SparkleEffect)
│   ├── shaders/
│   │   ├── sketches/                 ★ 작품 셰이더 (.frag 하나 = 작품 하나)
│   │   │   ├── psychedelic.frag         터널 + 회전 프레임
│   │   │   ├── blueprint.frag           동심 회전 rounded rect
│   │   │   ├── signal.frag              시그널 웨이브
│   │   │   ├── psy.frag / psy-v3.frag   사이키델릭 변형
│   │   │   ├── psychedelic-eye.frag     눈 모티프 (1080x1080)
│   │   │   ├── rainbow-spiral.frag      무지개 나선
│   │   │   ├── kaleidoscope.frag        만화경 (1920x1080)
│   │   │   └── {new-work}.frag          새 작품은 여기에 추가
│   │   ├── layer.frag                레이어 모드 전용 (색순환, 웨이브, 글로우, 패럴랙스)
│   │   ├── sparkle.frag              반짝임 파티클 (deterministic hash, 4초 주기)
│   │   ├── post.frag                 포스트프로세싱 (CA, 비네팅, 필름 그레인)
│   │   ├── base.vert                 sketch 모드 버텍스
│   │   ├── layer.vert                layered 모드 버텍스
│   │   ├── post.vert                 포스트프로세싱 버텍스
│   │   └── glsl.d.ts                 GLSL import 타입 선언
│   └── sketches/
│       ├── psychedelic.ts            Sketch 인터페이스 + psychedelic 셋업
│       ├── signal.ts                 signal 스케치 셋업
│       ├── psy-v3.ts                 psy-v3 스케치 셋업
│       ├── rainbow-spiral.ts         rainbow-spiral 스케치 셋업
│       └── layered-psychedelic.ts    멀티 레이어 스택 (scene.json 기반)
│
├── scripts/
│   ├── pipeline.ts                   layered 오케스트레이터 (분해 → 미리보기 → 익스포트)
│   ├── pipeline-layers.ts            레이어 분해 + 후처리 + scene.json 생성
│   ├── export-sketch.ts              sketch 모드 Puppeteer 캡처 → ffmpeg mp4 (sketch-configs 기반)
│   ├── capture-rendered.ts           독립 프레임 캡처 유틸 (out/captured-frames/)
│   ├── export-layered.ts             layered 모드 Puppeteer 캡처 → ffmpeg mp4
│   ├── validate-loop.ts              루프 이음새 RMSE 검증
│   ├── tsconfig.json                 scripts 전용 TS 설정
│   └── lib/
│       ├── archive.ts                RunContext + createWorkDir (파이프라인별 아카이브, 자동 삭제)
│       ├── check-deps.ts             ffmpeg / API 토큰 체크
│       ├── image-decompose.ts        하이브리드 레이어 분해 (Qwen + ZoeDepth)
│       ├── image-layered.ts          Replicate API (레이어 분해 + 다운로드)
│       ├── input-validator.ts        입력 이미지 검증 (포맷, 크기, CMYK 변환)
│       ├── postprocess.ts            레이어 후처리 (알파 정리, 노이즈 제거, 커버리지 정렬)
│       └── scene-generator.ts        scene.json 자동 생성 (zIndex별 프리셋)
│
├── audio/
│   ├── setup.sh                     SuperCollider 환경 설정
│   ├── sc/                          SuperCollider synthdef/패턴
│   └── render/                      오디오 렌더 출력
│
├── out/                              모든 생성물 (gitignored)
├── public/                           Vite 정적 서빙 (pipeline이 자동 복사)
├── docs/prd/                         PRD (설계 스펙)
├── docs/tickets/                     개발 티켓
├── .claude/skills/video-blueprint/   영상 분석 → 셰이더 생성 스킬
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── .env.example
└── .gitignore
```

---

## Architecture

### Sketch 모드 렌더링

```
URL: /?sketch=psychedelic
         │
         ▼
import.meta.glob("src/shaders/sketches/*.frag")
         │  모든 .frag 파일을 빌드 시 수집
         ▼
createShaderSketch(name)
├── Scene + OrthographicCamera
├── PlaneGeometry(2,2) 풀스크린 쿼드
└── ShaderMaterial(base.vert + {name}.frag)
    uniforms: uTime, uResolution, uMouse
         │
         ▼
EffectComposer
├── UnrealBloomPass
└── ShaderPass(post.frag): CA + 비네팅 + 필름 그레인
         │
         ▼
Canvas
```

### Layered 모드 렌더링

```
URL: /?mode=layered
         │
         ▼
loadScene("/scene.json")
         │
         ▼
Three.js Scene (OrthographicCamera, z=10)
├── PlaneGeometry z=0.0  ← layer-0.png (background)
│   └── ShaderMaterial: layer.vert + layer.frag
│       uniforms: uTexture, uTime(0→1), uLoopDuration(10s),
│                 ColorCycle, Wave, Glow, Parallax,
│                 uPhaseOffset, uSaturationBoost, uLuminanceKey
├── PlaneGeometry z=0.1  ← layer-1.png (subject)
├── PlaneGeometry z=0.2  ← layer-2.png (detail)
└── PlaneGeometry z=0.3  ← layer-3.png (foreground)
         │
         ▼
EffectComposer (postprocessing npm)
├── BloomEffect
├── ChromaticAberrationEffect
└── SparkleEffect (120 hash 파티클, 24색 팔레트)
         │
         ▼
Canvas
```

### GLSL Effects (layer.frag)

| Effect | 동작 | 제어 |
|--------|------|------|
| Parallax | `sin/cos(time × 2pi)` 원형 오프셋 | `uParallaxDepth` |
| Wave | UV 좌표에 sin/cos 왜곡 | `uWaveAmplitude, Frequency, Period` |
| Color Cycle | RGB→HSV, `fract()` linear hue sweep, HSV→RGB | `uColorCycleSpeed, Period, uPhaseOffset` |
| Saturation Boost | HSV S 채널 배율 증폭 (네온/형광) | `uSaturationBoost` (기본 2.5) |
| Luminance Key | 밝기 기반 차등 hue shift (`pow(1-lum, 1+key)`) | `uLuminanceKey` (기본 0.6) |
| Glow | `1 + intensity × sin(time)` 밝기 배율 | `uGlowIntensity, Pulse, Period` |

### Seamless Loop

```
모든 period = duration의 약수 (duration=10 → 1, 2, 5, 10초)
time = (elapsed % loopDuration) / loopDuration    → 0→1, 매 루프 리셋

Sketch:  LOOP_DUR = sketch-configs.ts 레지스트리 (기본 8초, 스케치별 상이)
         각 회전 속도 = 정수 × 반회전/루프 → seamless
Layered: LOOP_DUR = scene.json duration (기본 10초), 모든 period가 duration의 약수 → seamless
Sparkle: PERIOD = 4초, mod(time, period) 독립 주기 → duration 무관 seamless

검증: npm run pipeline:validate → frame[0] vs frame[last] pixel RMSE < 2.0
```

### Export Pipeline

```
Puppeteer headless Chrome
    │
    ├── Clock.startRecording()           deterministic 모드
    │   time = frame × (1/fps)           매 프레임 정확히 1/fps초 진행
    │
    ├── Loop N frames:
    │   __captureFrame()
    │   → clock.tick() → sketch.update() → composer.render()
    │   → canvas.toDataURL("image/png") → archiveDir/_work/frames/*.png
    │
    ├── ffmpeg 인코딩
    │   libx264, yuv420p, preset slow, CRF 18 / 15Mbps
    │
    └── 아카이브 저장 + ctx.cleanup() (_work/ 삭제)

출력 스펙:
  Sketch:  sketch-configs.ts 레지스트리 기반 (스케치별 해상도/fps/duration)
           기본 1080x1920, 60fps, 8초, H.264, CRF 18
  Layered: 1080x1080, 60fps, scene.json duration(기본 10초), H.264, 15Mbps
```

---

## Layered 모드 상세

### Pipeline 흐름

```
input.png (PNG/JPG/WEBP, max 4096x4096, 20MB)
    │
    ├── input-validator.ts
    │   포맷/크기/해상도 체크, CMYK→sRGB 변환, 4096 초과 리사이즈
    │
    ├── image-layered.ts
    │   Replicate API (qwen/qwen-image-layered) → 4장 RGBA PNG
    │   (또는 프로젝트 루트 layers/에 수동 PNG 배치 → API 생략)
    │
    ├── postprocess.ts
    │   cleanAlphaEdges → removeNoiseIslands → alphaDilate
    │   → calculateAlphaCoverage → 커버리지 내림차순 정렬
    │
    └── scene-generator.ts
        4개 프리셋 (background/subject/detail/foreground)
        zIndex별 애니메이션 파라미터 자동 할당 + effects 설정
        → public/scene.json + public/layers/
```

### scene.json Reference

`npm run pipeline:layers`가 자동 생성. 수동 편집으로 파라미터 튜닝 가능.

```jsonc
{
  "version": 1,
  "source": "sunset.png",
  "resolution": [1080, 1080],
  "duration": 10,                   // 루프 길이 (초, 기본 10, max 60)
  "fps": 30,
  "layers": [
    {
      "id": "background",
      "file": "layers/layer-0.png",
      "zIndex": 0,
      "opacity": 1.0,
      "animation": {
        "colorCycle": { "speed": 1.0, "hueRange": 360, "period": 10, "phaseOffset": 0 },
        "wave":       { "amplitude": 2, "frequency": 0.3, "period": 10 },
        "parallax":   { "depth": 0.0 },
        "saturationBoost": 2.5,
        "luminanceKey": 0.6
      }
    }
    // ... subject (phaseOffset:90), detail (phaseOffset:180), foreground (phaseOffset:270)
  ],
  "effects": {
    "bloom":                { "strength": 0.6, "radius": 0.4, "threshold": 0.7 },
    "chromaticAberration":  { "offset": 1.5 },
    "sparkle":              { "count": 80, "sizeMin": 2, "sizeMax": 6, "speed": 1.0 }
  }
}
```

**period 규칙**: 반드시 duration의 약수 (duration=10 → 1, 2, 5, 10). `npm run pipeline:validate`가 검증.

---

## /video-blueprint Skill

레퍼런스 영상을 분석하여 기하학적 청사진을 추출하고, 셰이더 코드를 생성하여 최종 mp4까지 출력하는 Claude Code 스킬.

```bash
/video-blueprint /path/to/video.mov
```

### 흐름

```
레퍼런스 영상
    │
    ▼ 분석 (프레임 추출 + OpenCV + k-means + ORB)
    │
    ├── blueprint.json              기하학 스펙 (shapes, palette, motion, constraints)
    │
    ▼ 셰이더 생성
    │
    ├── {name}.frag                 스펙 기반 셰이더 자동 생성
    │                               → src/shaders/sketches/ 에 저장
    ▼ 미리보기 + 검증
    │   /?sketch={name} 에서 원본과 비교
    │
    ▼ 익스포트
    │
    └── out/blueprint/{date}_{name}/
        ├── blueprint.json          분석 스펙
        ├── {name}.frag             셰이더 소스
        └── {name}.mp4              최종 영상
```

---

## Clock System

| 모드 | time 계산 | 용도 |
|------|----------|------|
| **Live** | `performance.now() - start` | 브라우저 실시간 미리보기 |
| **Recording** | `frame × (1 / fps)` | Puppeteer 프레임 캡처 (deterministic) |

Puppeteer API: `window.__captureReady` → `__startCapture(fps)` → `__captureFrame()` 반복

---

## Dependencies

### Production

| 패키지 | 버전 | 역할 |
|--------|------|------|
| **three** | ^0.172.0 | 3D 렌더링 엔진. OrthographicCamera + PlaneGeometry + ShaderMaterial로 GLSL 셰이더를 풀스크린 쿼드에 렌더링 |
| **postprocessing** | ^6.39.0 | Three.js 후처리 이펙트. BloomEffect, ChromaticAberrationEffect + 커스텀 SparkleEffect를 EffectComposer로 체이닝 |
| **puppeteer** | ^24.40.0 | headless Chrome 제어. 프레임 캡처 (`__captureFrame` → `canvas.toDataURL`), deterministic clock으로 정확한 fps 녹화 |
| **sharp** | ^0.34.5 | Node.js 이미지 처리. 레이어 알파 정리(cleanAlphaEdges), 노이즈 제거(removeNoiseIslands), 커버리지 계산, 깊이맵 리사이즈 |
| **replicate** | ^1.4.0 | Replicate API 클라이언트. `qwen/qwen-image-layered`(레이어 분해)와 `cjwbw/zoedepth`(깊이맵) 모델 호출 (~$0.03/회) |
| **zod** | ^4.3.6 | 런타임 스키마 검증. `scene.json` 파싱(sceneSchema), CLI 입력 검증, 타입 추론(`z.infer`) |
| **dotenv** | ^17.3.1 | `.env` 파일에서 `REPLICATE_API_TOKEN` 등 환경변수 로드. layered 파이프라인 스크립트에서 사용 |

### Development

| 패키지 | 버전 | 역할 |
|--------|------|------|
| **vite** | ^6.2.0 | 번들러 + 개발서버. HMR으로 셰이더 실시간 수정 확인, 프로덕션 빌드 |
| **vite-plugin-glsl** | ^1.3.1 | `.frag`/`.vert` 파일을 ES module로 import 가능하게 함. `import fragSrc from "./psychedelic.frag"` 패턴 |
| **typescript** | ^5.7.0 | 타입 체크. `tsc --noEmit`으로 빌드 전 검증, strict 모드 |
| **@types/three** | ^0.172.0 | Three.js TypeScript 타입 정의 |
| **tsx** | ^4.21.0 | TypeScript 스크립트 직접 실행. `npx tsx scripts/pipeline.ts` — Node.js에서 TS를 트랜스파일 없이 실행 |
| **vitest** | ^4.1.1 | 유닛 테스트. scene-generator, input-validator, image-layered, bpm-calculator 등 테스트 |

### External (npm 외)

| 도구 | 역할 |
|------|------|
| **ffmpeg** | PNG 프레임 시퀀스 → H.264 MP4 인코딩. libx264, yuv420p, CRF 18 / 15Mbps |
| **SuperCollider** (sclang) | 오디오 합성. `audio/sc/` synthdef 실행, BPM 기반 사운드 렌더링 (선택) |
