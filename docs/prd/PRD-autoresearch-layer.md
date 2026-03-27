# PRD: Autoresearch Layer — Self-Improving Decomposition Loop

**Version**: 0.4
**Author**: Isaac + Claude
**Date**: 2026-03-27
**Status**: Draft (Round 1 review incorporated)
**Review History**: v0.2 → 4-agent review (color-science, video-quality, statistics, architecture) + BOOMER-6. 5 P0, 17 P1 반영.
**Size**: XL
**Depends On**: PRD-layer-decomposition-overhaul (Done)

---

## 1. Problem Statement

### 1.1 Background

Layer Decomposition Overhaul(완료)로 28개의 튜닝 파라미터(thresholds, heuristics, presets)가 도입되었다.
현재 이 파라미터들은 모듈별 상수로 하드코딩되어 있으며, 최적값을 찾으려면 수동으로 바꾸고 파이프라인을 돌리고 결과를 눈으로 비교해야 한다.

Karpathy의 [autoresearch](https://github.com/karpathy/autoresearch) 패턴은 이 문제를 해결하는 구조를 제공한다:
- **고정된 평가 harness** (`prepare.py`) — 결과를 객관적으로 측정
- **에이전트가 수정하는 단일 파일** (`train.py`) — 파라미터/로직 변경
- **무한 실험 루프** — 수정 → 실행 → 평가 → keep/discard → 반복
- **실험 로그** (`results.tsv`) — 모든 시도를 기록

레퍼런스 영상 `/Users/isaac/Downloads/source.mp4` (1080×1080, VP9, 30fps, 10초)가 존재한다.
파이프라인 생성 영상은 **60fps, 20초 기본, 비율 자유**로 레퍼런스와 포맷이 다를 수 있다.
따라서 평가는 **해상도, 프레임레이트, 길이, 비율** 등 포맷을 일체 비교하지 않으며,
오직 **색감 충실도(color fidelity)**와 **시각 품질(visual quality)**만 측정한다.

### 1.2 Problem Definition

레이어 분해 파라미터를 최적화하려면 수십~수백 번의 실험이 필요하지만, 현재는 1) 파라미터를 수동 변경 2) 파이프라인 실행 3) 결과 육안 비교의 사이클을 반복해야 한다. 이 과정을 자동화하면 **사용할수록 퀄리티가 자동으로 올라가는 시스템**을 만들 수 있다.

### 1.3 Impact of Not Solving

- 파라미터 튜닝이 개발자 시간에 완전히 의존
- 최적 조합을 찾기 어려워 suboptimal 결과에 머무름
- 새 이미지 유형에 대한 적응이 불가능
- layer decomposition 품질 개선이 정체됨
- 실험 이력이 없어 어떤 조합이 좋았는지 재현 불가

---

## 2. Goals & Non-Goals

### 2.1 Goals

- [ ] G1: 레퍼런스 영상 대비 생성 영상의 **색감 충실도와 시각 품질**을 자동으로 측정하는 평가 harness 구축
- [ ] G2: 28개 튜닝 파라미터를 단일 config 파일로 **외부화**
- [ ] G3: `수정 → 실행 → 평가 → keep/discard` **자율 실험 루프** 구현
- [ ] G4: 모든 실험의 메트릭과 config snapshot을 **results.tsv**에 기록
- [ ] G5: AI 에이전트가 참조할 **program.md** (연구 지시서) 작성
- [ ] G6: 최적 config를 baseline으로 승격하는 **promote 메커니즘** 구현
- [ ] G7: 실험 루프를 기존 `pipeline:layers` 명령과 **호환**되게 통합

### 2.2 Non-Goals

- NG1: 레이어 분해 알고리즘 자체 변경 (코드 수정은 config 외부화만)
- NG2: 오디오 파이프라인 변경
- NG3: 로컬 GPU/CUDA 사용 — 모든 메트릭은 CPU-only. 외부 모델 추론은 Replicate API(원격 GPU)를 통해서만 허용
- NG4: 실시간 미리보기 중 자동 튜닝
- NG5: 멀티 레퍼런스 비교 (Phase 1은 단일 source.mp4)
- NG6: shader/renderer 파라미터 튜닝 (decomposition 파라미터만)
- NG7: 영상 포맷(해상도, fps, 길이, 비율) 비교 — 포맷은 평가 대상이 아님

---

## 3. User Stories & Acceptance Criteria

### US-1: 자동 색감/시각 품질 측정

**As a** 비디오 아티스트, **I want** 생성 영상의 색감과 시각 품질이 레퍼런스 대비 자동으로 점수가 나오도록, **so that** 수동 비교 없이 품질을 판단할 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: `prepare.ts`가 source.mp4에서 1fps 비례 샘플링으로 keyframe을 추출한다 (10초 영상 → 10장, 20초 → 20장)
- [ ] AC-1.2: `evaluate.ts`가 생성 영상에서도 동일 비례 위치로 keyframe을 추출한다 (fps/길이/비율 무관)
- [ ] AC-1.3: 추가로 3개의 temporal pair (연속 프레임 쌍)를 추출하여 시간축 메트릭에 사용한다
- [ ] AC-1.4: 프레임 비교 시 해상도 차이가 있으면 작은 쪽 기준으로 리사이즈한 후 비교한다 (포맷 패널티 없음)
- [ ] AC-1.5: 색감 메트릭 3종(Color Palette Sinkhorn, Dominant Color CIEDE2000, Color Temperature Ohno+Duv)을 계산한다
- [ ] AC-1.6: 시각 품질 메트릭 3종(MS-SSIM YCbCr, Canny Edge Preservation, Bidirectional Texture Richness)을 계산한다
- [ ] AC-1.7: 시간축 메트릭 2종(VMAF via ffmpeg libvmaf, Temporal Coherence)을 계산한다
- [ ] AC-1.8: 레이어 분해 품질 메트릭 2종(Layer Independence, Role Coherence)을 계산한다
- [ ] AC-1.9: 모든 메트릭은 `clamp01()` (0-1 범위 보장)을 적용한다
- [ ] AC-1.10: 판정은 **Hard Gate + Secondary Ranking**: 모든 메트릭이 gate threshold 이상이어야 하고, 통과 시 composite score로 순위화한다
- [ ] AC-1.11: 평가 harness(evaluate.ts, prepare.ts, metrics/*)는 수정 불가(read-only)로 관리된다
- [ ] AC-1.12: Replicate model version을 결과에 기록하고, baseline과 version이 다르면 baseline reset을 강제한다

### US-2: 파라미터 외부화

**As a** 개발자, **I want** 모든 튜닝 파라미터가 하나의 config 파일에서 관리되도록, **so that** 파이프라인 코드를 건드리지 않고 실험할 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: `scripts/research/research-config.ts`에 모든 tunable 상수가 정의된다
- [ ] AC-2.2: 기존 모듈(candidate-extraction, layer-resolve, complexity-scoring, scene-generator 등)이 config를 import해서 사용한다
- [ ] AC-2.3: config에 없는 값은 기존 하드코딩 값을 default로 유지한다 (behavioral parity)
- [ ] AC-2.4: config 파일 형식은 TypeScript object export + Zod validated
- [ ] AC-2.5: 기존 테스트가 모두 통과한다
- [ ] AC-2.6: config 변경이 필요 없는 일반 파이프라인 실행에는 영향이 없다

### US-3: 자율 실험 루프

**As a** 개발자, **I want** 실험 루프가 자동으로 config를 변경하고 평가하도록, **so that** 밤새 실험을 돌려두고 아침에 결과를 확인할 수 있다.

**Acceptance Criteria:**
- [ ] AC-3.1: `tsx scripts/research/run-once.ts`로 단일 실험(config 적용 → 파이프라인 → 평가 → keep/discard)을 실행한다
- [ ] AC-3.2: AI 에이전트(Claude Code)가 program.md를 읽고, research-config.ts를 수정하고, run-once.ts를 반복 호출하는 것이 "루프"다 (원본 autoresearch 패턴)
- [ ] AC-3.3: 루프 시작 시 `autoresearch/{tag}` 브랜치를 생성하고 그 위에서 작업한다
- [ ] AC-3.4: 판정은 Hard Gate 통과 + quality_score가 baseline + δ_min 이상이면 keep, git commit한다
- [ ] AC-3.5: Hard Gate 미통과 또는 quality_score가 baseline + δ_min 미만이면 discard, `git checkout -- scripts/research/research-config.ts`로 복원한다
- [ ] AC-3.5a: δ_min은 calibration phase에서 측정한 2σ 이상으로 설정한다
- [ ] AC-3.6: 각 실험 결과를 `results.tsv`에 기록한다
- [ ] AC-3.7: 크래시 발생 시 crash로 기록하고 revert 후 다음 실험으로 진행한다
- [ ] AC-3.8: 5회 연속 crash 시 자동 중단 + 진단 로그 출력
- [ ] AC-3.9: 실험 루프는 수동 중단(Ctrl+C/SIGINT)까지 무한 반복한다
- [ ] AC-3.10: SIGINT 수신 시 현재 실험을 graceful하게 종료하고 상태를 정리한다

### US-4: 실험 이력 추적

**As a** 개발자, **I want** 모든 실험의 파라미터와 결과가 기록되도록, **so that** 어떤 조합이 효과적이었는지 분석할 수 있다.

**Acceptance Criteria:**
- [ ] AC-4.1: `results.tsv`에 commit, quality_score, gate_pass, 10개 개별 메트릭(M1-M10), model_version, status, elapsed_ms, description이 기록된다
- [ ] AC-4.2: 각 keep된 실험의 config snapshot이 git history에 남는다
- [ ] AC-4.3: `npm run research:report`로 실험 이력 요약(best/worst/trend/avg)을 볼 수 있다
- [ ] AC-4.4: report에 top-5 실험의 config diff가 포함된다

### US-5: AI 에이전트 연구 지시서

**As a** AI 에이전트, **I want** `program.md`에 연구 목표, 파라미터 범위, 제약조건이 정의되어 있도록, **so that** 자율적으로 유의미한 실험을 설계할 수 있다.

**Acceptance Criteria:**
- [ ] AC-5.1: `scripts/research/program.md`에 setup, experimentation, output format, logging, loop 절차가 문서화된다
- [ ] AC-5.2: 각 파라미터의 유효 범위, 의미, 상호의존성이 명시된다
- [ ] AC-5.3: 금지사항(evaluate.ts/prepare.ts 수정, 외부 패키지 설치, 평가 harness 조작)이 명시된다
- [ ] AC-5.4: 실험 전략 가이드(단일 파라미터 sweep → 조합 탐색 → 극단값 테스트)가 포함된다
- [ ] AC-5.5: simplicity criterion — 동일 품질이면 더 적은 파라미터 변경이 선호됨

### US-6: Baseline 승격

**As a** 개발자, **I want** 검증된 최적 config를 production baseline으로 승격할 수 있도록, **so that** 다음 실험 세트의 출발점이 된다.

**Acceptance Criteria:**
- [ ] AC-6.1: `npm run research:promote`로 현재 best config를 baseline으로 지정한다
- [ ] AC-6.2: baseline 변경 시 이전 baseline은 history에 보존된다
- [ ] AC-6.3: 새 실험 세트 시작 시 현재 baseline이 초기 config로 사용된다
- [ ] AC-6.4: promote 시 baseline config + 해당 quality_score가 기록된다

---

## 4. Technical Design

### 4.1 Architecture Overview

autoresearch 3파일 패턴을 layer 시스템에 적용:

```
scripts/research/
├── program.md              # 연구 지시서 (사람이 편집)
├── research-config.ts      # 튜닝 파라미터 (에이전트가 수정하는 유일한 파일)
├── evaluate.ts             # 평가 harness (수정 금지)
├── metrics/                # 메트릭 구현 모듈 (수정 금지)
│   ├── color-palette.ts    # M1: Color Palette Sinkhorn
│   ├── dominant-color.ts   # M2: Dominant Color CIEDE2000
│   ├── color-temperature.ts # M3: Ohno CCT + Duv
│   ├── ms-ssim.ts          # M4: MS-SSIM YCbCr
│   ├── edge-preservation.ts # M5: Canny Edge + 2px tolerance
│   ├── texture-richness.ts # M6: Bidirectional Texture
│   ├── vmaf.ts             # M7: VMAF via ffmpeg libvmaf
│   ├── temporal-coherence.ts # M8: Consecutive SSIM + Flicker
│   └── layer-quality.ts    # M9: Layer Independence, M10: Role Coherence
├── run-once.ts             # 단일 실험 실행기 (config → pipeline → evaluate → keep/discard)
├── calibrate.ts            # calibration phase (10-20회 반복 → noise floor 측정)
├── prepare.ts              # 1회성 준비 (레퍼런스 1fps keyframe + temporal pairs 추출)
├── report.ts               # 실험 이력 요약
├── promote.ts              # baseline 승격
├── frame-extractor.ts      # 비례 위치 기반 프레임 추출 유틸
└── results.tsv             # 실험 로그 (git untracked)
```

> **실행 모델 (v0.3 확정)**: 원본 autoresearch 패턴 — AI 에이전트(Claude Code)가 program.md를 읽고,
> research-config.ts를 수정하고, `run-once.ts`를 실행하는 것을 반복. 별도 `loop.ts` 없음.
> 에이전트 자체가 루프이며, `run-once.ts`는 단일 실험 실행기.

### 4.1.1 Three-File Boundary (autoresearch 핵심 원칙)

| File | Who edits | Role |
|------|-----------|------|
| `research-config.ts` | AI 에이전트 | 튜닝 파라미터 정의. 유일한 수정 대상 |
| `evaluate.ts` + `metrics/*` + `prepare.ts` + `frame-extractor.ts` | 아무도 수정 안 함 | 고정된 평가 harness. ground truth |
| `program.md` | 사람 (Isaac) | 에이전트 지시서. 연구 방향 설정 |

### 4.1.2 흐름도

```
[prepare.ts]  ← source.mp4 당 1회 실행
    source.mp4 → 1fps keyframe 추출 + 3 temporal pairs → .cache/research/reference/

[calibrate.ts]  ← 실험 세트 당 1회 실행
    동일 config 10-20회 반복 → 메트릭별 μ, σ 측정 → δ_min = 2σ → calibration.json

[AI Agent Loop]  ← Claude Code가 program.md를 읽고 직접 반복 (autoresearch 원본 패턴)
    ┌────────────────────────────────────────────────────────┐
    │ 에이전트: research-config.ts 수정                         │
    │ 에이전트: tsx scripts/research/run-once.ts 실행            │
    │    ├─ 1. research-config.ts 읽기 + Zod 검증               │
    │    ├─ 2. pipeline-layers.ts 실행 (config 주입)             │
    │    ├─ 3. export:layered 실행 → 영상 생성                    │
    │    ├─ 4. evaluate.ts 실행                                  │
    │    │    ├─ 1fps keyframe 추출 + 해상도 정규화               │
    │    │    ├─ Tier 1: Color (M1-M3)                          │
    │    │    ├─ Tier 2: Visual (M4-M6)                         │
    │    │    ├─ Tier 3: Temporal (M7-M8, VMAF full-frame)      │
    │    │    ├─ Tier 4: Layer (M9-M10)                         │
    │    │    ├─ Hard Gate: all M >= 0.15?                       │
    │    │    └─ Composite score + keep/discard 판정             │
    │    ├─ 5. keep → git commit, discard → git checkout restore │
    │    └─ 6. results.tsv 기록                                  │
    │ 에이전트: 결과 확인 → 다음 config 수정 계획                   │
    └────────────────────────────────────────────────────────┘
```

### 4.2 Data Model Changes

#### 4.2.1 research-config.ts (에이전트 수정 대상)

```typescript
import { z } from "zod";

export const ResearchConfigSchema = z.object({
  // ── Decomposition ────────────────────────────────────────
  numLayers: z.number().int().min(2).max(12).default(4),
  method: z.enum(["qwen-only", "qwen-zoedepth"]).default("qwen-only"),

  // ── Candidate Extraction ─────────────────────────────────
  alphaThreshold: z.number().int().min(1).max(254).default(128),
  minCoverage: z.number().min(0.001).max(0.05).default(0.005),

  // ── Complexity Scoring ───────────────────────────────────
  simpleEdgeMax: z.number().min(0.01).max(0.3).default(0.10),
  simpleEntropyMax: z.number().min(3.0).max(8.0).default(5.5),
  complexEdgeMin: z.number().min(0.05).max(0.5).default(0.20),
  complexEntropyMin: z.number().min(4.0).max(9.0).default(7.0),
  edgePixelThreshold: z.number().int().min(10).max(100).default(30),

  // ── Dedupe & Ownership ───────────────────────────────────
  iouDedupeThreshold: z.number().min(0.3).max(0.95).default(0.70),
  uniqueCoverageThreshold: z.number().min(0.005).max(0.1).default(0.02),

  // ── Role Assignment ──────────────────────────────────────
  centralityThreshold: z.number().min(0.1).max(0.4).default(0.25),
  bgPlateMinBboxRatio: z.number().min(0.1).max(0.6).default(0.30),
  edgeTolerancePx: z.number().int().min(1).max(10).default(2),

  // ── Retention ────────────────────────────────────────────
  maxLayers: z.number().int().min(3).max(16).default(8),
  minRetainedLayers: z.number().int().min(1).max(6).default(3),

  // ── Depth (Variant B only) ───────────────────────────────
  depthZones: z.number().int().min(2).max(8).default(4),
  depthSplitThreshold: z.number().min(0.05).max(0.4).default(0.15),

  // ── Variant Selection ────────────────────────────────────
  qualityThresholdPct: z.number().min(1).max(30).default(10),

  // ── Scene Generator Multipliers (역할별 preset에 곱하는 승수) ──
  // 1.0 = 현재 preset 유지, 1.2 = 20% 증가, 0.8 = 20% 감소
  colorCycleSpeedMul: z.number().min(0.1).max(3.0).default(1.0),
  parallaxDepthMul: z.number().min(0.1).max(3.0).default(1.0),
  waveAmplitudeMul: z.number().min(0.0).max(3.0).default(1.0),
  glowIntensityMul: z.number().min(0.0).max(3.0).default(1.0),
  saturationBoostMul: z.number().min(0.1).max(3.0).default(1.0),
  luminanceKeyMul: z.number().min(0.1).max(3.0).default(1.0),
});

export type ResearchConfig = z.infer<typeof ResearchConfigSchema>;
```

#### 4.2.2 results.tsv

```tsv
commit	quality_score	gate_pass	M1_palette	M2_dominant	M3_cct	M4_msssim	M5_edge	M6_texture	M7_vmaf	M8_temporal	M9_layer_indep	M10_role_cohere	model_version	elapsed_ms	status	description
```

- 10 메트릭 컬럼 + gate_pass(0/1) + quality_score + model_version + elapsed_ms + status + description
- Tab-separated (comma는 description에서 사용 가능)
- effective config snapshot은 git commit history에서 추적

#### 4.2.3 Reference Cache

```
.cache/research/
├── reference/
│   ├── frame_p000.png .. frame_p100.png  # 1fps 비례 추출 (10-20장)
│   ├── temporal_pair_25_a.png / _b.png   # 25% 위치 연속 2프레임
│   ├── temporal_pair_50_a.png / _b.png   # 50% 위치 연속 2프레임
│   ├── temporal_pair_75_a.png / _b.png   # 75% 위치 연속 2프레임
│   └── metadata.json                      # source duration, dims, fps, model_version
├── calibration.json   # 메트릭별 μ, σ, δ_min, calibration timestamp
└── baseline-config.json  # 현재 baseline config snapshot + score + model_version
```

### 4.3 API Design

CLI 명령 기반 (HTTP API 없음):

| Command | Script | Description |
|---------|--------|-------------|
| `npm run research:prepare` | `prepare.ts` | 레퍼런스 1fps keyframe + temporal pairs 추출 (source 당 1회) |
| `npm run research:calibrate` | `calibrate.ts` | 동일 config 10-20회 반복 → noise floor 측정 (실험 세트 당 1회) |
| `npm run research:run` | `run-once.ts` | 단일 실험 (config → pipeline → evaluate → keep/discard) |
| `npm run research:eval -- <video>` | `evaluate.ts` | 단일 영상 평가만 실행 (10 메트릭 + gate + score) |
| `npm run research:report` | `report.ts` | 실험 이력 요약 출력 |
| `npm run research:promote` | `promote.ts` | 현재 config → baseline 승격 |

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| 프레임 추출 | 고정 타임스탬프 vs 비례 위치 | **비례 위치 (0/25/50/75/100%)** | 생성물이 60fps/20s이고 레퍼런스가 30fps/10s — 비례가 유일한 공정 비교 |
| 해상도 차이 처리 | 한쪽 고정 vs 작은 쪽 기준 | **작은 쪽 기준 리사이즈** | 포맷 패널티 없이 콘텐츠만 비교 |
| 비율 차이 처리 | crop vs pad vs stretch | **center crop to overlap region** | 구조 왜곡 방지 |
| 색감 메트릭 | RGB histogram vs HSV vs CIELAB | **CIELAB 기반** | 인간 지각과 가장 가까운 색공간 |
| MS-SSIM 구현 | 외부 패키지 vs sharp 자체 | **sharp raw pixel + 자체 구현** | 의존성 최소화, 10개 메트릭 중 1개 |
| 메트릭 합성 | flat 가중 vs tier 가중 | **4-tier Hard Gate + 가중 합산** | 색감/시각/시간/레이어 4축 균형 + gate로 극단 방지 |
| config 형식 | JSON vs TS vs YAML | **TypeScript + Zod** | 타입 안전 + 런타임 검증 + 기존 스택 일관성 |
| git 관리 | 현재 브랜치 vs 별도 | **`autoresearch/{tag}` 브랜치** | autoresearch 원본 패턴, 실험 격리 |
| 에이전트 루프 | 자체 프로세스 vs Claude Code 직접 | **Claude Code가 program.md 읽고 직접 loop 실행** | autoresearch 원본: 에이전트가 터미널에서 직접 실행 |

### 4.5 Quality Metrics Design (Enterprise Grade — v0.3 revised)

평가는 4-tier 구성. 영상 포맷(해상도, fps, 길이, 비율)은 일체 평가하지 않는다.
**모든 메트릭은 `clamp01(x) = max(0, min(1, x))` 적용** (P0-2 해결).

#### 4.5.0 Calibration Phase (실험 루프 시작 전 필수)

실험 루프 시작 전, 동일 config로 10-20회 파이프라인을 반복 실행하여:
1. 메트릭별 평균(μ)과 표준편차(σ) 측정
2. δ_min = 2σ (최소 개선 임계값) 설정 — 95% 신뢰도로 실제 개선만 keep
3. 메트릭별 [μ-2σ, μ+2σ] 범위 기록 → 스케일 정규화 기준
4. Replicate model version 기록 → baseline과 version 일치 검증

**calibration 결과는 `.cache/research/calibration.json`에 저장.**

#### Tier 1: Color Fidelity (색감 충실도) — weight 0.35

**M1. Color Palette Sinkhorn Distance**: 0-1
- 양쪽 프레임에서 k-means++(k=12)로 dominant color palette 추출 (CIELAB 공간)
- Sinkhorn distance (differentiable EMD 근사, ε=0.1) 계산
  - ground distance: CIEDE2000(kL=kC=kH=1)
  - Sinkhorn은 행렬 반복 연산만으로 EMD 근사 (~40줄 구현)
- `clamp01(1 - sinkhorn_dist / MAX_DIST)`
- **MAX_DIST = 50** (경험적 보정, calibration phase에서 99th percentile로 재조정)
- k-means++ 초기화로 재현성 확보

**M2. Dominant Color Accuracy (CIEDE2000)**: 0-1
- 상위 3개 dominant color의 CIEDE2000 거리 계산
- 가중 평균: `0.5 × ΔE₁ + 0.3 × ΔE₂ + 0.2 × ΔE₃`
- `clamp01(1 - weighted_mean_deltaE / 50)`
- CIEDE2000은 small-to-medium difference에서 정확. ΔE > 10은 정확도 저하 문서화.

**M3. Color Temperature (Ohno CCT + Duv)**: 0-1
- RGB → XYZ → CCT+Duv (Ohno 2014 method, ±12K 정확도)
- **Mireds 단위** 사용 (MRD = 10⁶/CCT, 지각 균일)
- ΔMRD = |MRD_ref - MRD_gen|
- CCT score: `clamp01(1 - ΔMRD / MAX_ΔMRD)`, MAX_ΔMRD = 100 mireds (~1500K at 4000K)
- Duv score: `clamp01(1 - |Duv_ref - Duv_gen| / 0.02)` (green-magenta tint)
- M3 = 0.7 × CCT_score + 0.3 × Duv_score

> **D65 assumption**: sRGB/BT.709 콘텐츠의 기본 illuminant. DCI-P3/Rec.2020 소스 시 Bradford CAT 필요.
> **VP9 4:2:0 limitation**: chroma subsampling으로 인한 색 정밀도 제한은 known limitation으로 문서화.

#### Tier 2: Visual Quality (시각 품질) — weight 0.25

**M4. MS-SSIM (Multi-Scale SSIM) in YCbCr**: 0-1
- YCbCr 변환 후 채널별 계산: `0.8 × MS-SSIM_Y + 0.1 × MS-SSIM_Cb + 0.1 × MS-SSIM_Cr`
- 5-scale pooling (original, 2×, 4×, 8×, 16× down)
- Wang et al. weights: [0.0448, 0.2856, 0.3001, 0.2363, 0.1333]
- luminance는 finest scale에서만 계산

**M5. Canny Edge Preservation (with tolerance)**: 0-1
- **Canny edge detection** (Gaussian σ=1.4, 비최대 억제, 히스테리시스)
- 비교 전 양쪽 엣지 맵에 **2px morphological dilation** 적용 (spatial tolerance)
- F1 score: `2 × precision × recall / (precision + recall)`
- dilation은 sub-pixel shift에 대한 robustness 보장 (BSDS500 표준)

**M6. Bidirectional Texture Richness**: 0-1
- 8×8 블록 local variance → Shannon entropy
- **양방향 비율**: `clamp01(1 - |log(gen_richness / ref_richness)|)`
- log scale로 texture 손실과 과잉 모두 동등하게 패널티
- ref_richness = 0인 경우 (flat image) → metric = 1.0 if gen also flat, else 0.5

#### Tier 3: Temporal Quality (시간축 품질) — weight 0.20 [NEW]

**M7. VMAF (Video Multi-Method Assessment Fusion)**: 0-1
- ffmpeg libvmaf로 full-reference 비디오 품질 측정
- `ffmpeg -i ref.mp4 -i gen.mp4 -lavfi libvmaf=log_fmt=json -f null -`
- VMAF 0-100 스케일 → `clamp01(vmaf_score / 100)`
- **전체 프레임에 대해 계산** (temporal information 자동 포함)
- ffmpeg 빌드에 `--enable-libvmaf` 필요 (E2에서 검증)

**M8. Temporal Coherence**: 0-1
- 1fps로 추출한 연속 프레임 쌍의 SSIM 계산 (인접 프레임 안정성)
- 저모션 영역(optical flow magnitude < threshold)에서 pixel intensity variance 측정
- Flicker score: `clamp01(1 - flicker_variance / MAX_FLICKER_VAR)`
- M8 = 0.5 × mean_consecutive_ssim + 0.5 × flicker_score

#### Tier 4: Layer Decomposition Quality (분해 품질) — weight 0.20

**M9. Layer Independence**: 0-1
- decomposition-manifest.json에서 추출
- `clamp01(mean(uniqueCoverage[retained]) × (1 - duplicateHeavyRatio))`

**M10. Role Coherence**: 0-1
- role 할당률 + background-plate 존재 bonus + role 다양성
- `clamp01(assignedRatio × 0.6 + bgPlateBonus × 0.2 + diversityRatio × 0.2)`

#### 4.5.7 Decision System: Hard Gate + Secondary Ranking (P0-3, B-3 해결)

**단순 composite score가 아닌 2단계 판정:**

**Step 1: Hard Gate** — 모든 개별 메트릭이 gate threshold 이상이어야 통과
```
gate_threshold = 0.15  (calibration phase에서 조정 가능)

GATE_PASS = all(M1..M10 >= gate_threshold)
```
Hard Gate 미통과 시 → 즉시 discard (특정 축이 심각하게 나빠지는 것 방지)

**Step 2: Secondary Ranking** — Gate 통과 시 composite score로 순위 결정
```
quality_score = 0.35 × mean(M1, M2, M3)     # Color Fidelity
             + 0.25 × mean(M4, M5, M6)     # Visual Quality
             + 0.20 × mean(M7, M8)          # Temporal Quality
             + 0.20 × mean(M9, M10)         # Layer Quality
```

**Step 3: Noise-Aware Keep/Discard**
```
KEEP = GATE_PASS && (quality_score > baseline_score + δ_min)
DISCARD = !GATE_PASS || (quality_score <= baseline_score + δ_min)
```

가중치 근거: 색감 충실도가 이 프로젝트의 1차 예술적 관심사(Isaac 확인). 시간축 품질은 신규 도입이므로 초기 weight 낮게 시작. MOS 보정(Phase 2)으로 실증 조정 예정.

#### 4.5.8 Metric Correlation Audit (구현 후 필수)

구현 후 calibration set(20+ 이미지 쌍)으로 10×10 correlation matrix 계산.
- Tier 내 pair r > 0.6 → 하나 drop 또는 VIF 보정
- 예상 상관: M1↔M2 (color distribution), M4↔M5 (structure) → 모니터링 대상

#### 4.5.9 Frame Sampling (포맷 무관 보장)

```
Spatial metrics (M1-M6, M9-M10):
  1. 1fps 비례 위치로 keyframe 추출 (10s → 10장, 20s → 20장)
  2. 비율 차이 → center crop to shared aspect ratio
  3. 해상도 차이 → 작은 쪽 기준 Lanczos 리사이즈 (max 2048px cap)
  4. 색공간 변환: RGB → CIELAB (색감), RGB → YCbCr (구조)

Temporal metrics (M7, M8):
  M7 (VMAF): ffmpeg가 전체 프레임 자동 처리 (샘플링 불필요)
  M8 (Temporal Coherence): 3 temporal pairs (25%/50%/75% 위치에서 연속 2프레임)
```

---

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | source.mp4 경로 없음 | prepare.ts 즉시 실패 + 에러 메시지 + 경로 안내 | High |
| E2 | ffmpeg 미설치 또는 libvmaf 미포함 | prepare.ts 즉시 실패 + `brew install ffmpeg` 안내 + `ffmpeg -filters \| grep vmaf` 검증 | High |
| E3 | 파이프라인 크래시 (Replicate API 실패 등) | crash 기록, config revert, 다음 실험 진행 | Medium |
| E4 | quality_score NaN/Infinity | crash 처리 + revert + 진단 로그 | Medium |
| E5 | git working tree dirty | 루프 시작 전 abort + 사용자에게 정리 요청 | High |
| E6 | results.tsv 손상/누락 | 헤더만 있는 새 파일 생성 + 경고 | Low |
| E7 | disk space < 500MB | 실험 전 체크 → abort | High |
| E8 | SIGINT 중간 수신 | graceful: 현재 실험 discard + revert + 로그 기록 + exit 0 | Medium |
| E9 | config Zod validation 실패 | crash 처리, 이전 config restore, 에러 상세 기록 | Medium |
| E10 | 5회 연속 crash | 루프 자동 중단 + 진단 로그 + 마지막 5개 에러 요약 | High |
| E11 | 레퍼런스 keyframe 캐시 없음 | evaluate.ts 시작 시 체크 → prepare.ts 실행 안내 | High |
| E12 | 생성 영상 파일 0바이트 | crash 처리 (렌더 실패) | Medium |
| E13 | sharp 메모리 부족 (큰 이미지) | 평가 전 최대 2048px로 다운스케일 | Low |

---

## 6. Security & Permissions

### 6.1 Authentication

- Replicate API: 기존 `.env` REPLICATE_API_TOKEN 사용 (변경 없음)
- 추가 인증 없음

### 6.2 Authorization

N/A — 로컬 CLI 도구. 단일 사용자.

### 6.3 Data Protection

- source.mp4는 로컬에서만 처리. 외부 전송 없음
- 추출된 keyframe은 `.cache/research/`에 저장 (.gitignore)
- results.tsv는 git untracked (민감 정보 없음)
- REPLICATE_API_TOKEN은 로그에 출력하지 않음

---

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 단일 실험 소요 시간 | < 3분 (API 호출 포함) | run-once.ts per-experiment timer |
| 평가 harness 소요 시간 | < 15초 (8 메트릭 전체) | evaluate.ts timer |
| keyframe 추출 | < 3초 | ffmpeg 실행 시간 |
| 시간당 실험 수 | ~20-30회 | results.tsv rows / elapsed hours |
| 8시간 무인 운영 | ~160-240 실험 | 자동 집계 |
| Node.js 메모리 | < 1GB 피크 | process.memoryUsage() |
| 이미지 처리 메모리 | < 500MB | sharp 파이프라인 스트리밍 |

### 7.1 Monitoring & Alerting

- 매 실험 완료 시 stdout: `[exp #{N}] quality: {score:.4f} ({status}) | Δ{delta:+.4f} | {elapsed}ms — {description}`
- 5회 연속 crash 시 루프 자동 중단 + stderr에 진단 요약
- results.tsv는 실시간 기록 — `tail -f results.tsv` 또는 `watch -n 10 'tail -5 results.tsv'`로 모니터링
- report.ts: running best, trend (last 10), improvement rate 표시

---

## 8. Testing Strategy

### 8.1 Unit Tests

#### Metrics (evaluate.ts + metrics/*)
- SSIM: 동일 이미지 → 1.0, 완전 다른 이미지 → < 0.3
- SSIM: known image pair → known SSIM value (±0.05 tolerance)
- Color Palette EMD: 동일 이미지 → 1.0, 색 반전 → < 0.3
- Dominant Color Accuracy: 단색 이미지 쌍 → deltaE 기반 정확도
- Color Temperature: 같은 조명 이미지 → delta < 500K
- Edge Preservation: 동일 이미지 → 1.0, blur 이미지 → 감소
- Texture Richness: flat 이미지 < textured 이미지
- Layer Independence: mock manifest → 계산 정확성
- Role Coherence: 다양한 role 조합 → 0-1 범위 검증
- quality_score: 가중치 합산 정확성 (known inputs → known output)

#### Config (research-config.ts)
- Zod 검증: 유효 config → pass
- Zod 검증: 범위 밖 값 → ZodError
- default 값 적용: 빈 object → 모든 default
- partial override: 일부만 지정 → 나머지 default

#### Frame Extraction (frame-extractor.ts)
- 비례 위치 계산: 10초 영상 50% → 5.0초
- 비례 위치 계산: 20초 영상 25% → 5.0초
- 해상도 정규화: 1080×1080 vs 1920×1080 → center crop + resize

#### Report (report.ts)
- TSV 파싱: 정상 데이터 → 올바른 객체 배열
- 통계: best/worst/mean/trend 계산
- 빈 TSV → 적절한 메시지

### 8.2 Integration Tests

- prepare.ts: source.mp4 → 1fps keyframe(10-20장) + 3 temporal pairs + metadata.json
- evaluate.ts: 실제 이미지 쌍 → 10개 메트릭 모두 0-1 범위 + gate + quality_score
- config 외부화: 기존 파이프라인 테스트 전체 pass (behavioral parity)
- run-once.ts: mock pipeline + mock evaluate → 1 실험 사이클 (keep 시나리오 + discard 시나리오)
- promote.ts: baseline-config.json 생성/갱신 + 이전 값 보존

### 8.3 Edge Case Tests

- 빈(0×0) 이미지 → 모든 메트릭 0, crash 아님
- 단색 이미지 → texture richness 0, 나머지 정상
- 1×1 이미지 → graceful degradation
- config 전체 default → baseline과 동일한 결과
- results.tsv 100만 행 → report.ts 성능 (< 1초)
- SIGINT 처리 → revert 완료 확인

---

## 9. Rollout Plan

### 9.1 Phase 1: Evaluation Foundation

- [ ] frame-extractor.ts (1fps 비례 추출 + temporal pairs)
- [ ] metrics/: 10개 메트릭 모듈 (M1-M10, Sinkhorn/Ohno/MS-SSIM/Canny/VMAF)
- [ ] evaluate.ts (Hard Gate + Secondary Ranking + clamp01)
- [ ] prepare.ts (레퍼런스 준비)
- [ ] calibrate.ts (noise floor 측정 → δ_min)

### 9.2 Phase 2: Config Externalization

- [ ] research-config.ts (Zod schema + defaults + multiplier 패턴 + constraints)
- [ ] 기존 모듈 optional config 인자 전환 (7개 모듈, default fallback으로 기존 테스트 무수정)
- [ ] 기존 테스트 전체 pass 확인

### 9.3 Phase 3: Experiment Engine

- [ ] run-once.ts (단일 실험 실행기: config → pipeline → evaluate → keep/discard)
- [ ] results.tsv 기록 (10 메트릭 + gate + model_version)
- [ ] git branch/commit/checkout 자동화 (target file restore 패턴)
- [ ] graceful shutdown (SIGINT)
- [ ] crash recovery + 5회 연속 중단 + non-zero exit

### 9.4 Phase 4: Polish & Instrumentation

- [ ] program.md (에이전트 연구 지시서 — 파라미터 범위, 전략, 금지사항)
- [ ] report.ts (실험 이력 분석 + correlation audit + top-5 config diff)
- [ ] promote.ts (baseline 승격 + model version 기록)
- [ ] package.json scripts 등록
- [ ] .gitignore 갱신 (.cache/research/, results.tsv)

### 9.5 Rollback Plan

- config 외부화: default 값이 기존 하드코딩과 동일 → rollback 시 import 제거만으로 복원
- research/ 디렉토리: 완전 독립 → 삭제만으로 제거
- 기존 파이프라인 동작 변경 없음 보장

---

## 10. Dependencies & Risks

### 10.1 Dependencies

| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|-----------------|
| layer-decomposition-overhaul | Done | Complete | None |
| ffmpeg (CLI) | system | 설치 확인 필요 | keyframe 추출 불가 |
| sharp | existing | v0.34.5 | None |
| zod | existing | v4.3.6 | None |
| source.mp4 | Isaac | 존재 확인됨 | 평가 불가 |

### 10.2 Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| 색감 메트릭이 예술적 품질을 못 잡음 | Medium | High | 4-tier 중 layer quality 20% + temporal 20%로 보완 |
| CIELAB 변환 정확도 | Low | Medium | 표준 sRGB→XYZ→Lab 변환, known pair 테스트 |
| Replicate API rate limit | Medium | Medium | 실험 간 backoff, mock mode 옵션 |
| config 외부화 시 behavioral drift | Low | High | 모든 기존 테스트 + A/B 출력 동일성 검증 |
| local optimum 수렴 | High | Medium | program.md에 random restart, exploration ratio 명시 |
| 레퍼런스와 생성물의 근본적 스타일 차이 | Medium | Medium | 구조(edge, SSIM)와 색감(palette, temperature) 분리 평가 |
| git history 오염 | Low | Low | autoresearch/{tag} 브랜치 격리, squash merge 옵션 |
| 대량 실험으로 Replicate 비용 증가 | Medium | High | program.md에 API 호출 횟수 의식, mock mode |

---

## 11. Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| 실험 자동화 | 0% (전부 수동) | 100% (완전 자율) | run-once.ts + agent loop 정상 실행 |
| 시간당 실험 수 | ~2 (수동) | ~20-30 (자동) | results.tsv rows / hours |
| quality_score 개선 | initial baseline | baseline +10% 이상 | best in results.tsv |
| 실험 재현성 | 불가 | 100% (config + git) | 동일 config → 동일 score (±0.01) |
| 기존 테스트 통과율 | 100% | 100% (regression 없음) | vitest run |
| config 커버리지 | 0/28+ 외부화 | 28+/28+ | config field count |
| 메트릭 정확도 | N/A | known pair ±0.05 이내 | 단위 테스트 |
| crash recovery | N/A | 5연속 crash 외 자동 계속 | 통합 테스트 |

---

## 12. Open Questions

- [ ] OQ-1: 4-tier 가중치(0.35/0.25/0.20/0.20)의 최적 비율. 초기값 후 MOS 보정으로 재조정
- [ ] OQ-2: source.mp4의 첫 프레임을 pipeline 입력 이미지로 자동 추출할지, 사용자가 별도 지정할지
- [ ] OQ-3: Replicate API 비용 한도 — 실험 횟수 cap 또는 일일 비용 한도 필요 여부
- [ ] OQ-4: 멀티 레퍼런스 확장 시 구조 (가중 평균 vs 최악 메트릭 vs 별도 실험 세트)
- [ ] OQ-5: scene-generator animation 파라미터(7개 추가 knob)를 config에 포함할지. 현재 PRD에 포함됨
- [ ] OQ-6: mock mode (API 호출 없이 기존 decomposition 결과 재사용)의 우선순위

---

## 13. Key Decisions Summary

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| autoresearch 3파일 패턴 | 채택 | 검증된 자율 연구 패턴 |
| 1fps 비례 keyframe + temporal pairs | 채택 (v0.3) | 5장→1fps (저장소 기존 기준 준수), temporal pairs로 시간축 커버 |
| 포맷 메트릭 완전 제외 | 채택 | 해상도/fps/비율은 품질이 아님 |
| CIELAB + CIEDE2000 색감 분석 | 채택 | 인간 지각 색공간. Jzazbz는 Phase 2 검토 |
| **4-tier 10메트릭 + Hard Gate** | 채택 (v0.3) | 색감(35%) + 시각(25%) + 시간(20%) + 레이어(20%) + gate로 극단 방지 |
| **Sinkhorn distance** (EMD 대체) | 채택 (v0.3) | LP solver 불필요, ~40줄 구현, k=12에서 충분 정확 |
| **Ohno CCT + Duv + Mireds** | 채택 (v0.3) | McCamy ±284K → Ohno ±12K, mireds로 지각 균일 |
| **MS-SSIM in YCbCr** | 채택 (v0.3) | vanilla grayscale SSIM 대비 색 구조 + 다중 스케일 |
| **VMAF via ffmpeg** | 채택 (v0.3) | 산업 표준, 전체 프레임 + temporal info 포함 |
| **δ_min + calibration phase** | 채택 (v0.3) | 노이즈 누적 방지, 실제 개선만 keep |
| **run-once.ts + 에이전트 루프** | 채택 (v0.3) | loop.ts 제거, 원본 autoresearch 패턴과 일치 |
| **Multiplier 패턴** (animation) | 채택 (v0.3) | 7 knob으로 36+ preset 값 비례 제어 |
| **Optional config 인자** | 채택 (v0.3) | 기존 테스트 무수정 통과 보장 |
| TypeScript + Zod config | 채택 | 타입 안전 + 런타임 검증 |
| autoresearch/{tag} 브랜치 격리 | 채택 | 실험 commit 오염 방지 |
| results.tsv git untracked | 채택 | 실험 데이터 격리 |

---

## Appendix A: Metric Implementation Notes

### CIELAB Color Space Conversion

```
sRGB → linear RGB: inverse gamma (sRGB transfer function)
linear RGB → XYZ: ITU-R BT.709 matrix
XYZ → CIELAB: D65 illuminant reference (sRGB 기본 illuminant = D65이므로 CAT 불필요)
```
DCI-P3/Rec.2020 소스 시 Bradford CAT 적용 필요.

### CIEDE2000 Distance (ISO/CIE 11664-6:2014)

- Lightness, Chroma, Hue 보정 포함 (~100줄 구현)
- kL=kC=kH=1 (standard viewing conditions)
- ΔE > 10에서 정확도 저하 known limitation

### Sinkhorn Distance (EMD 근사)

k-means++(k=12) palette 간 최적 수송 비용의 entropic regularization 근사:
- ground distance = CIEDE2000
- 각 색의 weight = 해당 클러스터 pixel 비율
- Sinkhorn iteration (ε=0.1, max_iter=100): ~40줄 행렬 연산
- 정규화: `clamp01(1 - sinkhorn_dist / MAX_DIST)`
- LP solver 불필요 (행렬 반복만으로 수렴)

### Ohno CCT + Duv (2014)

- Robertson의 31 isotemperature line 기반 LUT + parabolic interpolation
- 정확도: ±12K (McCamy ±284K 대비 23배 향상)
- Duv: Planckian locus로부터의 거리 (green-magenta 축)
- Mireds (MRD = 10⁶/CCT): 지각 균일 단위

### MS-SSIM (Wang et al. 2003)

- 5-scale iterative 2× downsampling
- Scale weights: [0.0448, 0.2856, 0.3001, 0.2363, 0.1333]
- Luminance: finest scale only
- Channel: 0.8 × Y + 0.1 × Cb + 0.1 × Cr

### VMAF (Netflix)

- ffmpeg libvmaf (C library, per-frame computation)
- Fuses VIF, DLM, temporal information via SVM
- 0-100 scale, ≥0.9 correlation with human MOS

## Appendix B: autoresearch 원본 구조 참조

| autoresearch (Karpathy) | Layer Research (이 PRD) |
|-------------------------|------------------------|
| `prepare.py` (data, eval) | `prepare.ts` + `evaluate.ts` + `metrics/*` |
| `train.py` (model, optimizer) | `research-config.ts` (parameters) |
| `program.md` (agent instructions) | `program.md` (agent instructions) |
| `val_bpb` (single metric) | `quality_score` (10-metric 4-tier Hard Gate + composite) |
| `results.tsv` (experiment log) | `results.tsv` (experiment log) |
| 5-minute training budget | ~2-minute pipeline budget |
| GPU training | Replicate API (remote) + CPU-only local processing |
| Lower is better | Higher is better |

## Appendix C: Phase 2 Roadmap — Persistent Evolution (지속적 자가 개선)

> Phase 1은 autoresearch 원본 패턴의 충실한 이식 (single-session loop + baseline carryover).
> Phase 2는 "사용할수록 지속적으로 퀄리티가 올라가는 엔터프라이즈급 모듈"을 완성한다.

### C.1 Campaign Persistence

| Feature | Description |
|---------|-------------|
| **Campaign state** | `campaign.json` — 현재 실험 세트의 상태 (start time, experiment count, best score, config history) |
| **Session resumability** | 에이전트 재시작 시 campaign.json에서 마지막 상태 복원 → 중단 지점부터 재개 |
| **Unattended recalibration** | 50회 실험마다 자동 re-calibrate → δ_min 갱신 (품질이 올라갈수록 noise floor도 변화) |

### C.2 Baseline Version Catalog

```json
{
  "versions": [
    { "id": "v1", "score": 0.62, "config": {...}, "promoted_at": "2026-03-28", "model_version": "..." },
    { "id": "v2", "score": 0.71, "config": {...}, "promoted_at": "2026-04-02", "model_version": "..." }
  ],
  "current": "v2"
}
```

- Named versions (v1, v2, ...) with full config + score + model_version
- Rollback to any previous version
- Score trend visualization in report.ts

### C.3 Auto-Activation Mode

```
pipeline:layers --auto-research
```

일반 파이프라인 실행 후 자동으로:
1. 결과 evaluate → quality_score 계산
2. 현재 baseline 대비 비교
3. 개선 시 자동 promote 제안 (--auto-promote로 자동 승격)
4. 결과를 global results.tsv에 누적

### C.4 Multi-Source Generalization

| Feature | Description |
|---------|-------------|
| **Golden set** | 복수 source.mp4 등록 (`prepare.ts --add-source`) |
| **Cross-source regression gate** | promote 시 모든 golden set에 대해 score ≥ 이전 baseline (worst-case gate) |
| **Source-weighted score** | 각 source의 quality_score 가중 평균 → 특정 소스에 과적합 방지 |

### C.5 Progressive Threshold Tightening

- 초기: δ_min = 2σ (calibration)
- 50회 keep 후: δ_min = 2.5σ (더 확실한 개선만 수용)
- 100회 keep 후: δ_min = 3σ
- Plateau 감지: 마지막 20회 실험에서 0 keep → "converged" 경고 + 탐색 전략 변경 제안

### C.6 Compute Policy

| Policy | Description |
|--------|-------------|
| `cpu-local-only` | 모든 처리 로컬 CPU. Replicate API 미호출. 기존 decomposition 결과 캐시 재사용 |
| `remote-inference` (default) | Replicate API 사용 가능. 로컬 CUDA 사용 안 함 |
| Policy enforcement | run-once.ts 시작 시 policy 검증. 위반 시 abort |