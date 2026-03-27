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
| `npm run test` | Vitest 유닛 테스트 (1586 tests, 60 files) |
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

## Autoresearch System — 자가 개선 루프

[Karpathy autoresearch](https://github.com/karpathy/autoresearch) 패턴을 레이어 분해에 적용.
**사용할수록 퀄리티가 자동으로 올라가는 시스템.** AI 에이전트가 파라미터를 수정 → 파이프라인 실행 → 10개 메트릭으로 평가 → 개선되면 keep, 아니면 discard를 무한 반복한다.

### 핵심 원칙: 3-File Boundary

| 파일 | 누가 수정 | 역할 |
|------|-----------|------|
| `scripts/research/research-config.ts` | AI 에이전트 | 28개 튜닝 파라미터 (**유일한 수정 대상**) |
| `scripts/research/evaluate.ts` + `metrics/*` | **아무도 안 건드림** | 고정된 평가 harness (ground truth) |
| `scripts/research/program.md` | 사람 (Isaac) | 에이전트 연구 지시서 (방향 설정) |

evaluate.ts를 고정하면 에이전트가 "점수를 해킹"하는 게 불가능. 실제 품질만 올려야 keep된다.

### 사용법: 처음부터 끝까지

#### Step 1. 레퍼런스 준비 (최초 1회)

source.mp4를 프로젝트 루트 또는 원하는 경로에 준비한다.

```bash
npm run research:prepare -- /path/to/source.mp4
```

source.mp4에서 **1fps 비례 샘플링**으로 keyframe을 추출한다 (10초 영상 → 10장, 20초 → 20장).
추가로 25%/50%/75% 위치에서 **temporal pair 3쌍**을 추출한다.

```
.cache/research/reference/
├── frame_p000.png .. frame_p100.png   # 1fps keyframe
├── temporal_pair_25_a.png / _b.png    # 25% 위치 연속 2프레임
├── temporal_pair_50_a.png / _b.png    # 50% 위치
├── temporal_pair_75_a.png / _b.png    # 75% 위치
└── metadata.json                       # source duration, dims, fps
```

#### Step 2. Noise Floor 측정 (실험 세트 당 1회)

```bash
npm run research:calibrate            # 기본 10회 반복
npm run research:calibrate -- --runs 20  # 20회로 늘리기
```

**동일한 config로 N회 파이프라인을 반복**하여 메트릭의 자연 변동폭을 측정한다.

```
δ_min = max(2σ, 0.01)
```

- σ = composite score의 표준편차
- δ_min = 최소 개선 임계값 (이보다 작은 차이는 노이즈로 간주)
- 95% 신뢰도로 **진짜 개선만 keep**

결과는 `.cache/research/calibration.json`에 저장:
```json
{
  "baselineScore": 0.6234,
  "deltaMin": 0.0089,
  "compositeStats": { "mean": 0.6234, "std": 0.0045, "min": 0.6150, "max": 0.6320 },
  "perMetricStats": { "M1": {...}, "M2": {...}, ... },
  "modelVersion": "local-2026-03-27",
  "runCount": 10
}
```

#### Step 3. 자율 실험 루프 실행

Claude Code에서 `program.md`를 읽고 실험을 반복한다:

```bash
# Claude Code가 이 과정을 자율적으로 반복한다:

# 1. research-config.ts 파라미터 수정 (예: iouDedupeThreshold 0.70 → 0.80)
# 2. 단일 실험 실행
npm run research:run

# 3. 결과 확인 후 다음 파라미터 수정 계획 → 1번으로 반복
```

`run-once.ts`가 하나의 실험을 수행하는 흐름:

```
┌─────────────────────────────────────────────────────────────┐
│  1. 안전 체크                                                │
│     ├─ git working tree clean? (dirty → abort)              │
│     ├─ experiment budget 남아있나?                            │
│     └─ autoresearch/{tag} 브랜치로 이동                      │
│                                                              │
│  2. Config 로드                                              │
│     └─ research-config.ts → Zod 검증                        │
│                                                              │
│  3. 파이프라인 실행                                           │
│     └─ pipeline-layers.ts (이미지 → 레이어 → 영상 생성)     │
│                                                              │
│  4. 평가 (evaluate.ts)                                       │
│     ├─ 생성 영상에서 keyframe 추출 (비례 위치)               │
│     ├─ 해상도 정규화 (작은 쪽 기준 리사이즈)                 │
│     ├─ 10개 메트릭 계산 (M1-M10)                            │
│     ├─ Hard Gate: 전부 ≥ 0.15?                              │
│     └─ Composite Score (4-tier 가중합)                       │
│                                                              │
│  5. 판정                                                     │
│     ├─ KEEP  = gate 통과 + score ≥ baseline + δ_min         │
│     │   → git commit research-config.ts                     │
│     └─ DISCARD = 나머지                                      │
│         → git checkout -- research-config.ts (원복)          │
│                                                              │
│  6. results.tsv에 기록                                       │
│     commit  quality_score  gate_pass  M1..M10  status  ...  │
│                                                              │
│  7. 콘솔 출력                                                │
│     [exp #42] quality: 0.6823 (keep) | Δ+0.0134 | 45320ms  │
└─────────────────────────────────────────────────────────────┘
```

**자동 안전장치:**
- 5회 연속 crash → 자동 중단 + 진단 로그
- Ctrl+C (SIGINT) → config 복원 후 graceful exit
- `--budget N` → 최대 실험 횟수 제한
- model version mismatch → 즉시 abort (recalibrate 요구)

#### Step 4. 결과 확인

```bash
npm run research:report
```

```
=== Experiment Report ===
Total: 42 experiments (28 keep, 12 discard, 2 crash)
Best:  #37  score=0.7123  (Δ+0.0889 from baseline)
Worst: #3   score=0.5801
Mean:  0.6542
Trend (last 10): ↑ +0.012/exp

Top-5 config diffs:
  #37: iouDedupeThreshold 0.70→0.82, complexEdgeMin 0.20→0.18
  #35: parallaxDepthMul 1.0→1.15, luminanceKeyMul 1.0→0.85
  ...
```

실시간 모니터링:
```bash
tail -f .cache/research/results.tsv
watch -n 10 'tail -5 .cache/research/results.tsv'
```

#### Step 5. Best Config 승격

```bash
npm run research:promote
```

현재 best config를 **baseline으로 승격**한다. 다음 실험 세트의 출발점이 된다.
이전 baseline은 history에 보존된다.

#### Step 6. 단일 영상 평가 (선택)

파이프라인 밖에서 임의의 영상을 평가할 수 있다:

```bash
npm run research:eval -- generated.mp4 --source original.mp4 --manifest manifest.json
```

JSON 결과가 stdout으로 출력된다:
```json
{"metrics":{"M1":0.72,"M2":0.68,...},"gatePassed":true,"qualityScore":0.6823,"elapsedMs":12340}
```

### 10 메트릭 (4-Tier Hard Gate + Composite Score)

레퍼런스 영상과 생성 영상의 **색감 충실도 + 시각 품질**만 측정한다.
해상도, fps, 길이, 비율 등 포맷은 일체 비교하지 않는다.

| Tier | Weight | Metric | 구현 |
|------|--------|--------|------|
| Color (0.35) | M1 | Color Palette Sinkhorn | k-means++(k=12) CIELAB + Sinkhorn EMD |
| | M2 | Dominant Color CIEDE2000 | top-3 가중 ΔE |
| | M3 | Color Temperature CCT+Duv | Ohno 2014 CCT + Mireds + Duv |
| Visual (0.25) | M4 | MS-SSIM YCbCr | 5-scale Wang et al. (0.8Y + 0.1Cb + 0.1Cr) |
| | M5 | Canny Edge Preservation | 2px morphological dilation + F1 |
| | M6 | Bidirectional Texture Richness | 8×8 block variance → Shannon entropy |
| Temporal (0.20) | M7 | VMAF | ffmpeg libvmaf (full-frame) |
| | M8 | Temporal Coherence | 0.5×consecutive SSIM + 0.5×low-motion flicker |
| Layer (0.20) | M9 | Layer Independence | mean(uniqueCoverage) × (1 - duplicateRatio) |
| | M10 | Role Coherence | 0.6×할당률 + 0.2×bgPlate + 0.2×diversity |

**판정 로직:**
```
Hard Gate:  all(M1..M10 ≥ 0.15)  →  하나라도 미달이면 즉시 discard
Composite:  0.35×color + 0.25×visual + 0.20×temporal + 0.20×layer
Keep:       gate 통과 AND score ≥ baseline + δ_min
```

### research-config.ts 파라미터 (28개)

| Group | Parameters | 설명 |
|-------|-----------|------|
| Decomposition | `numLayers`, `method` | 레이어 수, 분해 방식 |
| Candidate Extraction | `alphaThreshold`, `minCoverage` | alpha 이진화, 최소 커버리지 |
| Complexity Scoring | `simpleEdgeMax`, `simpleEntropyMax`, `complexEdgeMin`, `complexEntropyMin`, `edgePixelThreshold` | 복잡도 tier 경계값 |
| Dedupe & Ownership | `iouDedupeThreshold`, `uniqueCoverageThreshold` | IoU 중복 제거, 최소 고유 커버리지 |
| Role Assignment | `centralityThreshold`, `bgPlateMinBboxRatio`, `edgeTolerancePx` | 역할 할당 휴리스틱 |
| Retention | `maxLayers`, `minRetainedLayers` | 레이어 수 상/하한 |
| Depth (Variant B) | `depthZones`, `depthSplitThreshold` | 깊이 분할 설정 |
| Variant Selection | `qualityThresholdPct` | A/B 선택 임계값 |
| Recursive Decomposition | `recurseCoverageThreshold`, `recurseComponentThreshold`, `recurseEdgeDensityThreshold` | 재귀 분해 트리거 |
| Scene Multipliers | `colorCycleSpeedMul`, `parallaxDepthMul`, `waveAmplitudeMul`, `glowIntensityMul`, `saturationBoostMul`, `luminanceKeyMul` | 애니메이션 프리셋 승수 (1.0=기본) |

모든 파라미터는 Zod schema로 **min/max 범위 + default 값**이 정의되어 있다. 범위 밖 값은 validation error.

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
│       ├── research-config.ts        28개 튜닝 파라미터 (Zod)
│       ├── evaluate.ts               평가 harness (수정 금지)
│       ├── prepare.ts                레퍼런스 keyframe 추출
│       ├── calibrate.ts              noise floor 측정 (δ_min = 2σ)
│       ├── run-once.ts               단일 실험 실행기
│       ├── frame-extractor.ts        비례 위치 프레임 추출 + 해상도 정규화
│       ├── config-integration.ts     모듈 config 연동 (resolveParam/applyMultiplier)
│       ├── git-automation.ts         autoresearch/{tag} 브랜치 + crash counter + budget
│       ├── report.ts                 실험 이력 분석 (best/worst/trend/top-5 diff)
│       ├── promote.ts                baseline 승격
│       ├── metrics/
│       │   ├── color-palette.ts      M1: Sinkhorn Distance
│       │   ├── dominant-color.ts     M2: CIEDE2000
│       │   ├── color-temperature.ts  M3: Ohno CCT + Duv
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
├── test/fixtures/golden/              E2E 골든 테스트 이미지 (5종)
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
| **vitest** | ^4.1.1 | 1586 tests (60 files) |

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
