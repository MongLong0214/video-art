# video-art

Three.js + GLSL + SuperCollider 기반 생성형 비디오 아트 시스템.
무한 루프 영상을 만들고, 날짜+타이틀 기반으로 작품을 아카이빙하며, AI 기반 레이어 분해 + 자율 파라미터 최적화까지 통합한다.

---

## 3가지 제작 방식

### 1. Sketch 모드 — 코드로 만든다

`.frag` 셰이더 파일 하나가 작품 하나. 수학 함수(sin, cos, smoothstep 등)로 모든 픽셀을 직접 계산해서 영상을 생성한다. 이미지 입력 없음.

```bash
npm run dev
# → http://localhost:5173/?sketch=psychedelic

npm run export:sketch -- --sketch ocean-wave --title ocean-wave
```

작품 목록은 `src/shaders/sketches/` 디렉토리의 `.frag` 파일들이 곧 목록이다. URL `?sketch=` 파라미터에 파일명(확장자 제외)을 넣으면 해당 작품이 로드된다.

**레퍼런스 영상 기반 제작**: `/video-blueprint` 스킬로 기존 영상을 분석하면 blueprint.json + .frag가 자동 생성된다.

### 2. Layered 모드 — 이미지를 넣는다

이미지 1장을 AI가 레이어로 분해하고, 각 레이어에 역할 기반 모션(색순환+웨이브+글로우+패럴랙스)을 자동 적용하여 무한 루프 영상으로 변환한다.

```bash
npm run pipeline sunset.png -- --title sunset

# 1. 이미지 복잡도 분석 → 적정 레이어 수 결정 (3/4/6)
# 2. Replicate API로 레이어 분해 (Qwen-Only 또는 Qwen+ZoeDepth)
# 3. BFS 연결 성분 분석 + IoU 중복 제거 + 배타적 소유권
# 4. 역할 할당 (background-plate/subject/detail/foreground-occluder)
# 5. 역할 기반 scene.json 생성 → 미리보기 → mp4 익스포트
```

**Variant A/B 비교:**
```bash
npm run pipeline:compare input.png   # Qwen-Only vs Qwen+ZoeDepth 비교 리포트
```

### 3. Audio 모드 — 소리를 입힌다

SuperCollider + TidalCycles 기반 전자음악 시스템.

```bash
npm run live:start              # SC + SuperDirt + Tidal 스택 부팅
npm run live:record             # 라이브 녹음
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

npm run export:sketch -- --sketch psychedelic --title my-first-art
npm run pipeline input.png -- --title sunset
```

## Prerequisites

- **Node.js** 18+
- **ffmpeg / ffprobe** (`brew install ffmpeg`) — VMAF 평가 시 `--enable-libvmaf` 빌드 필요
- **REPLICATE_API_TOKEN** (`.env`) — layered 모드 전용

### Audio 모드 추가 의존성

| Tool | 설치 | 용도 | 필수 |
|------|------|------|------|
| SuperCollider 3.13+ | `brew install --cask supercollider` | 신스 엔진 + NRT 렌더 | 필수 |
| sox | `brew install sox` | seamless loop 크로스페이드 | NRT만 |
| GHCup + GHC 9.6 | `brew install ghcup` | Haskell 툴체인 (TidalCycles) | 라이브만 |
| TidalCycles | `cabal install tidal` | 라이브 코딩 엔진 | 라이브만 |
| SuperDirt | SC `Quarks.install("SuperDirt")` | 샘플러 + 이펙트 | 라이브만 |

---

## npm scripts

### 개발

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite 개발서버 (실시간 미리보기, hot reload) |
| `npm run build` | TypeScript 체크 + Vite 프로덕션 빌드 |
| `npm run test` | Vitest 유닛 테스트 (1072 tests, 48 files) |
| `npm run test:watch` | Vitest watch 모드 |

### Sketch 모드

| Command | Description |
|---------|-------------|
| `npm run export:sketch -- --sketch <name>` | sketch .frag → mp4 |

### Layered 모드

| Command | Description |
|---------|-------------|
| `npm run pipeline <img> -- --title <name>` | 풀 파이프라인: 분해 → 미리보기 → mp4 |
| `npm run pipeline:layers <img>` | 레이어 분해 + 역할 할당 + scene.json 생성 |
| `npm run pipeline:validate` | 루프 이음새 검증 (pixel RMSE < 2.0) |
| `npm run pipeline:compare <img>` | Variant A/B (Qwen-Only vs Qwen+ZoeDepth) 비교 리포트 |
| `npm run export:layered -- --title <name>` | layered mp4 익스포트만 |

### Audio

| Command | Description |
|---------|-------------|
| `npm run audio:setup` | 의존성 설치 + SC 검증 |
| `npm run audio:test` | SC SynthDef NRT 테스트 |
| `npm run live:start` | SC + SuperDirt + Tidal 스택 부팅 |
| `npm run live:stop` | 전체 스택 종료 |
| `npm run live:record` | 라이브 녹음 |
| `npm run render:audio` | scene.json → master.wav (NRT) |
| `npm run render:av` | 비디오 + 오디오 → final.mp4 |

### Autoresearch (자율 파라미터 최적화)

| Command | Description |
|---------|-------------|
| `npm run research:prepare` | 레퍼런스 1fps keyframe + temporal pairs 추출 (source 당 1회) |
| `npm run research:calibrate` | 동일 config 반복 → noise floor(δ_min) 측정 |
| `npm run research:run` | 단일 실험 (config → pipeline → evaluate → keep/discard) |
| `npm run research:eval` | 단일 영상 10 메트릭 평가 |
| `npm run research:report` | 실험 이력 요약 (best/worst/trend) |
| `npm run research:promote` | 현재 best config → baseline 승격 |

### Layered 모드 플래그

| Flag | Description |
|------|-------------|
| `--title <name>` | 작품 타이틀 (아카이브 폴더명) |
| `--variant <qwen-only\|qwen-zoedepth>` | 분해 variant (기본: qwen-only) |
| `--layers <N>` | 레이어 수 override (기본: 복잡도 자동 결정) |
| `--production` | model version pin 강제 |
| `--keep-frames` | 인코딩 후 PNG 프레임 보존 |
| `--no-preview` | 미리보기 단계 건너뛰기 |

---

## Layer Decomposition Overhaul

### 핵심 개선

기존: Qwen 출력을 그대로 사용 → 레이어 중복, coverage 기반 정렬, index 기반 preset
개선: Qwen 출력을 **candidate set**으로 취급 → 독립성 검증 → 역할 기반 정렬 + preset

### Pipeline 흐름

```
input.png
    │
    ├── input-validator.ts (포맷/크기 검증)
    │
    ├── complexity-scoring.ts
    │   Sobel edge density + color entropy → simple(3) / medium(4) / complex(6)
    │
    ├── image-decompose.ts
    │   Qwen API → RGBA candidates
    │   (Variant B: + ZoeDepth depth map)
    │
    ├── candidate-extraction.ts
    │   alpha threshold → BFS connected component split
    │   → bbox / centroid / coverage / edgeDensity 계산
    │
    ├── layer-resolve.ts
    │   1. deduplicateCandidates (IoU > 0.70 → drop)
    │   2. resolveExclusiveOwnership (pixel → 단일 레이어)
    │   3. assignRoles (background-plate/subject/detail/foreground-occluder)
    │   4. orderByRole (role z-order + coverage tie-break)
    │   5. applyRetentionRules (uniqueCoverage >= 2%, cap 8)
    │
    ├── scene-generator.ts
    │   getRolePreset(role) → 역할별 animation 파라미터
    │   → scene.json + layers/
    │
    └── decomposition-manifest.ts
        → decomposition-manifest.json (provenance)
```

### LayerRole

```typescript
type LayerRole =
  | "background-plate"   // z=0, 가장 느린 cycle, 큰 parallax
  | "background"         // z=1
  | "midground"          // z=2
  | "subject"            // z=3, 중간 parallax/wave
  | "detail"             // z=4, 빠른 hue, 선택적 glow
  | "foreground-occluder"; // z=5, 큰 parallax, 보수적 saturation
```

### scene.json (v2 — role 필드 추가)

```jsonc
{
  "version": 1,
  "source": "sunset.png",
  "resolution": [1080, 1080],
  "duration": 20,                   // 기본 20, max 300
  "fps": 30,
  "layers": [
    {
      "id": "background",
      "file": "layers/layer-0.png",
      "zIndex": 0,
      "opacity": 1.0,
      "role": "background-plate",   // optional — 역할 기반 preset
      "animation": {
        "colorCycle": { "speed": 0.5, "period": 20, "phaseOffset": 0 },
        "wave":       { "amplitude": 1, "frequency": 0.2, "period": 20 },
        "parallax":   { "depth": 0.02 },
        "saturationBoost": 2.0,
        "luminanceKey": 0.5
      }
    }
  ],
  "effects": { ... },
  "audio": { ... }                  // optional — NRT 렌더 시 참조
}
```

기존 `role` 필드 없는 scene.json도 정상 파싱된다 (backward compatible).

---

## Autoresearch System

[Karpathy autoresearch](https://github.com/karpathy/autoresearch) 패턴을 레이어 분해에 적용. 자율 실험 루프로 파라미터를 최적화한다.

### 구조 (3파일 원칙)

| File | 편집자 | 역할 |
|------|--------|------|
| `research-config.ts` | AI 에이전트 | 25개 튜닝 파라미터 (유일한 수정 대상) |
| `evaluate.ts` + `metrics/*` | 수정 금지 | 고정된 평가 harness |
| `program.md` | Isaac | 에이전트 연구 지시서 |

### 10 메트릭 (4-Tier Hard Gate + Composite Score)

| Tier | Weight | Metric | 구현 |
|------|--------|--------|------|
| Color (0.35) | M1 | Color Palette Sinkhorn | k-means++(k=12) CIELAB + Sinkhorn EMD |
| | M2 | Dominant Color CIEDE2000 | top-3 가중 ΔE |
| | M3 | Color Temperature CCT+Duv | Hernandez-Andres CCT + Mireds |
| Visual (0.25) | M4 | MS-SSIM YCbCr | 5-scale Wang et al. weights |
| | M5 | Canny Edge Preservation | 2px tolerance + F1 |
| | M6 | Bidirectional Texture Richness | 8×8 block entropy |
| Temporal (0.20) | M7 | VMAF | ffmpeg libvmaf |
| | M8 | Temporal Coherence | consecutive SSIM + flicker |
| Layer (0.20) | M9 | Layer Independence | uniqueCoverage × (1-duplicateRatio) |
| | M10 | Role Coherence | role 할당률 + bgPlate bonus |

**판정:** Hard Gate(all M >= 0.15) + quality_score > baseline + δ_min → keep

### 실험 루프

```
[prepare.ts]  source.mp4 → 1fps keyframe + 3 temporal pairs
[calibrate.ts]  동일 config 10-20회 → δ_min = 2σ 측정

AI Agent Loop (Claude Code가 program.md 읽고 반복):
  1. research-config.ts 수정
  2. npm run research:run
  3. keep → git commit / discard → git restore
  4. results.tsv 기록
  5. 다음 config 계획 → 반복
```

### research-config.ts 파라미터 (25개)

| Group | Parameters |
|-------|-----------|
| Decomposition | numLayers, method |
| Candidate Extraction | alphaThreshold, minCoverage |
| Complexity Scoring | simpleEdgeMax, simpleEntropyMax, complexEdgeMin, complexEntropyMin, edgePixelThreshold |
| Dedupe & Ownership | iouDedupeThreshold, uniqueCoverageThreshold |
| Role Assignment | centralityThreshold, bgPlateMinBboxRatio, edgeTolerancePx |
| Retention | maxLayers, minRetainedLayers |
| Depth (Variant B) | depthZones, depthSplitThreshold |
| Variant Selection | qualityThresholdPct |
| Scene Multipliers | colorCycleSpeedMul, parallaxDepthMul, waveAmplitudeMul, glowIntensityMul, saturationBoostMul, luminanceKeyMul |

---

## Project Structure

```
video-art/
├── src/
│   ├── main.ts                       진입점: sketch/layered 라우팅
│   ├── core/clock.ts                 시간 관리 (Live/Recording)
│   ├── lib/
│   │   ├── scene-schema.ts           Zod 스키마 (LayerRole, LayerCandidate 타입 포함)
│   │   ├── scene-loader.ts           scene.json fetch + 검증
│   │   ├── sketch-configs.ts         스케치 레지스트리
│   │   ├── bpm-calculator.ts         BPM → 루프 계산
│   │   ├── palette.ts                24색 팔레트
│   │   ├── shader-plane.ts           풀스크린 쿼드
│   │   └── effect-composer.ts        포스트프로세싱
│   ├── shaders/
│   │   ├── sketches/*.frag           작품 셰이더 (8종)
│   │   ├── layer.frag / sparkle.frag / post.frag
│   │   └── *.vert                    버텍스 셰이더
│   └── sketches/*.ts                 스케치 셋업
│
├── scripts/
│   ├── pipeline.ts                   layered 오케스트레이터
│   ├── pipeline-layers.ts            레이어 분해 + 역할 할당 + scene.json
│   ├── compare-variants.ts           Variant A/B 비교
│   ├── export-sketch.ts / export-layered.ts
│   ├── validate-loop.ts              루프 RMSE 검증
│   ├── render-audio.ts / render-av.ts
│   ├── live-start.ts / live-stop.ts / live-record.ts
│   ├── lib/
│   │   ├── candidate-extraction.ts   BFS 연결 성분 분석 + 통계
│   │   ├── layer-resolve.ts          IoU dedupe + exclusive ownership + role assignment
│   │   ├── complexity-scoring.ts     Sobel edge + color entropy
│   │   ├── decomposition-manifest.ts provenance manifest 생성
│   │   ├── depth-utils.ts            ZoeDepth 통합 (Variant B)
│   │   ├── variant-comparison.ts     A/B 비교 리포트
│   │   ├── replicate-utils.ts        version pin + retry + URL 검증
│   │   ├── pipeline-cli.ts           CLI 인자 파싱
│   │   ├── image-decompose.ts        Qwen/ZoeDepth API + recursive decompose
│   │   ├── scene-generator.ts        역할 기반 preset (getRolePreset)
│   │   ├── archive.ts / check-deps.ts / input-validator.ts / postprocess.ts
│   │   └── ...
│   └── research/                     ★ Autoresearch System
│       ├── program.md                에이전트 연구 지시서
│       ├── research-config.ts        25개 튜닝 파라미터 (Zod)
│       ├── evaluate.ts               평가 harness (수정 금지)
│       ├── prepare.ts                레퍼런스 keyframe 추출
│       ├── calibrate.ts              noise floor 측정
│       ├── run-once.ts               단일 실험 실행기
│       ├── frame-extractor.ts        비례 위치 프레임 추출
│       ├── git-automation.ts         autoresearch/{tag} 브랜치 관리
│       ├── report.ts                 실험 이력 분석
│       ├── promote.ts                baseline 승격
│       ├── metrics/
│       │   ├── color-palette.ts      M1: Sinkhorn Distance
│       │   ├── dominant-color.ts     M2: CIEDE2000
│       │   ├── color-temperature.ts  M3: CCT + Duv
│       │   ├── ms-ssim.ts            M4: MS-SSIM YCbCr
│       │   ├── edge-preservation.ts  M5: Canny F1
│       │   ├── texture-richness.ts   M6: Bidirectional Texture
│       │   ├── vmaf.ts               M7: VMAF (ffmpeg)
│       │   ├── temporal-coherence.ts M8: Temporal SSIM + Flicker
│       │   └── layer-quality.ts      M9-M10: Layer Independence + Role Coherence
│       └── results.tsv               실험 로그 (gitignored)
│
├── audio/                            SuperCollider + TidalCycles
│   ├── sc/synthdefs/                 SynthDef 9종
│   ├── sc/superdirt/                 라이브 모드 설정
│   ├── sc/lib/                       SC 라이브러리
│   ├── sc/patterns/ + scenes/        NRT 패턴/씬
│   ├── tidal/BootTidal.hs            Tidal 부트
│   ├── presets/genres/               장르 프리셋 5종
│   ├── render/                       렌더 셸 스크립트
│   └── setup.sh                      의존성 검증
│
├── docs/prd/                         PRD (설계 스펙)
├── docs/tickets/                     개발 티켓
├── .claude/skills/video-blueprint/   영상 분석 → 셰이더 생성 스킬
└── .cache/research/                  Autoresearch 캐시 (gitignored)
```

---

## Architecture

### Sketch 모드 렌더링

```
URL: /?sketch=psychedelic
  → import.meta.glob("src/shaders/sketches/*.frag")
  → createShaderSketch(name)
    ├── Scene + OrthographicCamera + PlaneGeometry(2,2)
    └── ShaderMaterial(base.vert + {name}.frag)
  → EffectComposer (Bloom + CA + 필름 그레인)
  → Canvas
```

### Layered 모드 렌더링

```
URL: /?mode=layered
  → loadScene("/scene.json")
  → Three.js Scene (role-ordered layers)
    ├── PlaneGeometry z=0.0  background-plate
    ├── PlaneGeometry z=0.1  subject
    ├── PlaneGeometry z=0.2  detail
    └── PlaneGeometry z=0.3  foreground-occluder
    각 레이어: ShaderMaterial(layer.vert + layer.frag)
      uniforms: uTexture, uTime, ColorCycle, Wave, Glow, Parallax, Saturation, Luminance
  → EffectComposer (Bloom + CA + Sparkle)
  → Canvas
```

### Export Pipeline

```
Puppeteer headless Chrome
  → Clock.startRecording() (deterministic: frame × 1/fps)
  → Loop N frames: __captureFrame() → PNG
  → ffmpeg: libx264, yuv420p, CRF 18 / 15Mbps
  → 아카이브 저장 + cleanup

Sketch:  sketch-configs.ts 기반 (기본 1080x1920, 60fps, 8초)
Layered: 1080x1080, 60fps, scene.json duration (기본 20초)
```

---

## Dependencies

### Production

| 패키지 | 버전 | 역할 |
|--------|------|------|
| **three** | ^0.172.0 | 3D 렌더링 (OrthographicCamera + ShaderMaterial) |
| **postprocessing** | ^6.39.0 | Bloom, CA, SparkleEffect |
| **puppeteer** | ^24.40.0 | headless Chrome 프레임 캡처 |
| **sharp** | ^0.34.5 | 이미지 처리 (alpha cleanup, CCA, metric 계산) |
| **replicate** | ^1.4.0 | Qwen/ZoeDepth API (layer decomposition) |
| **zod** | ^4.3.6 | scene.json + research-config 스키마 검증 |
| **dotenv** | ^17.3.1 | 환경변수 로드 |

### Development

| 패키지 | 버전 | 역할 |
|--------|------|------|
| **vite** | ^6.2.0 | 번들러 + HMR |
| **vite-plugin-glsl** | ^1.3.1 | .frag/.vert import |
| **typescript** | ^5.7.0 | strict 타입 체크 |
| **@types/three** | ^0.172.0 | Three.js 타입 |
| **tsx** | ^4.21.0 | TS 스크립트 직접 실행 |
| **vitest** | ^4.1.1 | 1072 tests (48 files) |

### External

| 도구 | 역할 |
|------|------|
| **ffmpeg** | MP4 인코딩 + VMAF 평가 (libvmaf) + AV 합성 |
| **SuperCollider** | 오디오 합성 + NRT 렌더 |
| **sox** | seamless loop 크로스페이드 |
| **TidalCycles** | 라이브 코딩 (선택) |

---

## Security

| 위협 | 방어 |
|------|------|
| Shell injection | `execFile` (array-form) 전용 |
| SC code injection | Zod enum 검증 값만 보간 |
| Path traversal | `validateFilePath()` — realpathSync + startsWith |
| Preset injection | `/^[a-zA-Z0-9_-]+$/` regex |
| OSC binding | 127.0.0.1:57120 강제 |
| Replicate version drift | `enforceVersionPin()` — production 모드에서 64-char hex SHA 강제 |
| API retry | exponential backoff (1s/3s/9s), Retry-After 준수 |
