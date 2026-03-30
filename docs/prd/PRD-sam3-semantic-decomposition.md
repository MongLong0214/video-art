# PRD: SAM3 Semantic Decomposition Pipeline

**Version**: 0.3
**Author**: Isaac + Claude
**Date**: 2026-03-30
**Status**: Approved
**Size**: XL
**Prerequisite**: Depth Cinematic Effects (Phase 2) — Implemented

---

## 1. Problem Statement

### 1.1 Background

현재 파이프라인은 SAM2 AMG(Automatic Mask Generation)를 사용하여 이미지를 레이어로 분해한다. SAM2 AMG는 이미지 위에 포인트 그리드를 배치하고 각 포인트에서 마스크 후보를 생성한 후 NMS로 필터링하는 방식이다.

이 접근법은 자연 사진(명확한 물체 경계)에서는 잘 동작하지만, 파이프라인의 주 입력인 **AI 생성 아트** (사이키델릭 아트, 초현실적 합성, 그라디언트/텍스처 기반 이미지)에서는 근본적으로 실패한다.

실험 데이터 (불상+연꽃+우주 배경 이미지):
- SAM2 AMG: 57 masks → 19 kept → **13 retained** → 최대 마스크 7% coverage → 대부분 파편
- SAM3 텍스트 프롬프트: 6 prompts → **6 layers** → 99.6% union coverage → 시맨틱 분리 성공

### 1.2 Problem Definition

SAM2 AMG는 "물체 경계 탐지" 도구로, "이미지를 의미적 영역으로 분리"하는 파이프라인 목표와 근본적으로 불일치한다. AI 아트의 그라디언트 경계, 반복 패턴, 추상 텍스처에서 파편화된 소형 마스크만 생산하여 레이어 품질이 저하된다.

### 1.3 Impact of Not Solving

- 대부분의 AI 아트 이미지에서 레이어 커버리지 15-35%에 불과 → 65-85%가 단일 배경판
- 레이어 수 부족 (4개 파편) → depth cinematic 효과 (parallax, haze) 적용 대상 제한
- autoresearch 루프가 decomposition 품질 한계에 의해 상한 제약
- 시각적 깊이감/풍부함 부족 → 상업화 품질 미달

## 2. Goals & Non-Goals

### 2.1 Goals

- [ ] G1: SAM2 AMG → VLM(Qwen3-VL) + SAM3 텍스트 프롬프트로 세그멘테이션 교체
- [ ] G2: Union coverage 90%+ 달성 (현재 15-35% → 목표 90%+)
- [ ] G3: 시맨틱 의미 있는 레이어 분리 (불상/연꽃/후광/배경 등 개별 인식)
- [ ] G4: 원본 해상도 마스크 생성 (SAM3는 입력 해상도 마스크 반환)
- [ ] G5: DA V2 depth map 유지 + per-layer meanDepth 정확도 향상
- [ ] G6: 미커버 잔여 영역 자동 background plate 합성
- [ ] G7: 기존 downstream 파이프라인 호환 (candidate-extraction → layer-resolve → scene-generator)
- [ ] G8: API 비용 최적화 — VLM 1회 + SAM3 N회 + DA V2 1회, 총 ~$0.02 이내
- [ ] G9: 기존 테스트 전부 통과 + 새 기능 테스트 추가
- [ ] G10: 겹침 해소(overlap resolution) — SAM3 마스크 간 중복 픽셀 처리

### 2.2 Non-Goals

- NG1: SAM2 코드 완전 제거 — fallback으로 유지 (VLM/SAM3 실패 시)
- NG2: candidate-extraction.ts BFS 알고리즘 자체 변경 — SAM3 경로에서는 BFS를 우회하되, `computeMaskStats()`로 bbox/centroid/edgeDensity를 계산하여 LayerCandidate 필드를 채움
- NG3: layer-resolve.ts role/ownership 핵심 로직 변경 — 기존 `resolveExclusiveOwnership()` + `assignRoles()` 재사용. SAM3 경로에서는 depth 순 정렬 후 기존 함수 호출
- NG4: scene-generator.ts 변경 — depth cinematic PRD에서 이미 완료
- NG5: 실시간 프리뷰 — 배치 파이프라인 유지
- NG6: 로컬 모델 실행 — Replicate API 유지

## 3. User Stories & Acceptance Criteria

### US-1: VLM 자동 프롬프트 생성

**As a** 파이프라인, **I want** VLM이 입력 이미지를 분석하여 세그멘테이션 프롬프트 리스트를 자동 생성, **so that** 사용자 개입 없이 시맨틱 레이어 분리가 가능하다.

**Acceptance Criteria:**
- [ ] AC-1.1: Qwen3-VL (`lucataco/qwen3-vl-8b-instruct`) 호출 → JSON array of strings 반환
- [ ] AC-1.2: 프롬프트 4-8개 생성 (config에서 min/max 조절 가능)
- [ ] AC-1.3: 각 프롬프트는 3-10 단어의 시각적 설명 (세그멘테이션 모델 최적화)
- [ ] AC-1.4: VLM 응답 파싱 실패 시 → 기본 프롬프트 세트 fallback (`["main subject", "background", "foreground details"]`)
- [ ] AC-1.5: VLM 모델 ID + version hash를 config/상수로 관리
- [ ] AC-1.6: `--prompts "buddha,lotus,background"` CLI 옵션으로 VLM 우회 가능
- [ ] AC-1.7: 프롬프트 sanitization — 각 프롬프트 문자열에서 제어 문자 제거, 100자 이내 truncate, printable 문자만 허용. VLM 출력 + CLI `--prompts` 모두 적용
- [ ] AC-1.8: `--prompts` CLI 검증 — 콤마 분리 후 trim, 빈 문자열 필터, `vlmMaxPrompts` 이하로 cap, 각 항목 ≤ 100자

### US-2: SAM3 텍스트 프롬프트 세그멘테이션

**As a** 파이프라인, **I want** SAM3가 각 프롬프트에 대해 원본 해상도 마스크를 생성, **so that** 시맨틱 의미 있는 고해상도 레이어를 얻는다.

**Acceptance Criteria:**
- [ ] AC-2.1: SAM3 (`mattsays/sam3-image`) per-prompt 호출 → binary mask (mask_only=true)
- [ ] AC-2.2: threshold config 가능 (default 0.25, range 0.1-0.9)
- [ ] AC-2.3: 마스크를 원본 이미지에 적용하여 RGBA 레이어 생성 (기존 `applyMaskToImage` 재사용)
- [ ] AC-2.4: 각 레이어의 coverage, meanDepth 계산
- [ ] AC-2.5: SAM3 모델 ID + version hash를 상수로 관리
- [ ] AC-2.6: SAM3 호출 실패 시 → 해당 프롬프트 건너뛰기 + 경고 로그
- [ ] AC-2.7: SAM3 출력 URL은 `validateReplicateUrl()`로 검증 후 fetch (기존 SAM2/DA V2 패턴 동일)
- [ ] AC-2.8: fetch된 데이터가 sharp로 디코드 실패 시 → AC-2.6과 동일 처리 (skip + warn). try/catch 필수

### US-3: 겹침 해소 (Overlap Resolution)

**As a** 파이프라인, **I want** SAM3 마스크 간 겹치는 픽셀을 depth 기반으로 할당, **so that** exclusive ownership이 보장된다.

**Acceptance Criteria:**
- [ ] AC-3.1: 겹침 해소 전략: candidates를 `meanDepth` 내림차순 정렬 (near-first) 후 기존 `resolveExclusiveOwnership()` 호출 — 순차 claim 방식에서 near layer가 먼저 claim하여 depth 기반 해소 달성
- [ ] AC-3.2: depth map 없을 때 fallback: candidates를 coverage 오름차순 정렬 (작은=specific 우선) 후 `resolveExclusiveOwnership()` 호출
- [ ] AC-3.3: 겹침 해소 후 각 레이어의 uniqueCoverage 재계산
- [ ] AC-3.4: `resolveExclusiveOwnership()` 시그니처 변경 없음. 입력 candidates 정렬만으로 depth 기반 해소. downstream 100% 호환

### US-4: 잔여 영역 Background Plate

**As a** 파이프라인, **I want** 모든 SAM3 마스크가 커버하지 못한 영역이 background plate로 자동 합성, **so that** 100% 커버리지가 보장된다.

**Acceptance Criteria:**
- [ ] AC-4.1: union coverage 계산 → 미커버 영역 = 원본 이미지의 해당 픽셀
- [ ] AC-4.2: 미커버 영역이 5% 이상이면 background plate 레이어 생성
- [ ] AC-4.3: 미커버 영역이 5% 미만이면 background plate를 생성하되 원본 이미지 전체를 사용 (z-index 0). `fillBackgroundPlate()` 사용 안 함 — SAM3 경로에서 자체 처리
- [ ] AC-4.4: background plate의 meanDepth = 미커버 영역 depth 평균
- [ ] AC-4.5: 기존 `fillBackgroundPlate()` 호환 — 또는 SAM3 파이프에서 자체 처리

### US-5: SAM2 Fallback

**As a** 파이프라인, **I want** VLM 또는 SAM3 전체 실패 시 SAM2 AMG로 자동 폴백, **so that** 파이프라인이 중단되지 않는다.

**Acceptance Criteria:**
- [ ] AC-5.1: VLM 실패 → 기본 프롬프트 세트로 SAM3 진행
- [ ] AC-5.2: SAM3 전체 실패 (모든 프롬프트 실패) → SAM2 AMG fallback
- [ ] AC-5.3: fallback 발동 시 console.warn + manifest에 기록
- [ ] AC-5.4: SAM2 fallback 코드는 기존 로직 그대로 유지 (삭제하지 않음)

### US-6: 고도화 — 2차 패스 (미커버 영역 추가 세그멘테이션)

**As a** 파이프라인, **I want** 1차 SAM3 후 미커버 영역이 20%+ 남으면 VLM에 잔여 영역 재분석 요청 → 추가 SAM3 호출, **so that** 커버리지가 극대화된다.

**Acceptance Criteria:**
- [ ] AC-6.1: 1차 union coverage < 80% → 2차 패스 트리거
- [ ] AC-6.2: 2차 VLM 입력 = 원본 이미지 전체 (크롭 아님). VLM 프롬프트에 "1차에서 이미 분리된 영역: [list]를 제외하고, 남은 영역의 시각적 요소를 설명하라" 지시. 이렇게 하면 공간적 맥락이 보존됨
- [ ] AC-6.3: 2차 SAM3 결과를 기존 레이어에 추가. 기존 마스크와 IoU > iouDedupeThreshold(config default 0.92)이면 중복으로 판정하여 제거
- [ ] AC-6.4: 최대 2회 패스 (무한 루프 방지)
- [ ] AC-6.5: config에서 2차 패스 활성화/비활성화 (default: true)

### US-7: Research Config 확장

**As a** autoresearch 루프, **I want** VLM/SAM3 관련 파라미터가 research-config에 등록, **so that** 자율 최적화가 가능하다.

**Acceptance Criteria:**
- [ ] AC-7.1: `sam3Threshold` (0.1-0.9, default 0.25) — SAM3 confidence threshold
- [ ] AC-7.2: `vlmMaxPrompts` (3-10, default 6) — VLM 최대 프롬프트 수
- [ ] AC-7.3: `secondPassEnabled` (boolean, default true) — 2차 패스 활성화
- [ ] AC-7.4: `secondPassThreshold` (0.5-0.95, default 0.8) — 2차 패스 트리거 coverage
- [ ] AC-7.5: 기존 SAM2 파라미터는 유지 (fallback용)
- [ ] AC-7.6: `useSam3` (boolean, default true) — false 시 SAM2 AMG 경로 사용 (즉시 rollback)

### US-8: Manifest + 문서 업데이트

**As a** 기록 시스템, **I want** manifest에 VLM/SAM3 모델 정보 + 프롬프트 기록, **so that** 재현 가능하다.

**Acceptance Criteria:**
- [ ] AC-8.1: manifest.models에 qwen3vl + sam3 모델 정보 추가
- [ ] AC-8.2: manifest.passes에 vlm prompts 기록
- [ ] AC-8.3: `scripts/research/program.md`에 SAM3 파라미터 (sam3Threshold, vlmMaxPrompts, secondPassEnabled, secondPassThreshold, useSam3) 문서화
- [ ] AC-8.4: `LayerCandidate.source` 타입을 `"sam2-segment" | "sam3-semantic"` 유니온으로 확장 (scene-schema.ts)
- [ ] AC-8.5: `ManifestInput.pipelineVariant` 타입을 `"sam2" | "sam3"` 유니온으로 확장 (decomposition-manifest.ts)
- [ ] AC-8.6: `pipeline-layers.ts`의 `rawPassCounts` 로직이 `"sam3-semantic"` source를 올바르게 카운트
- [ ] AC-8.7: `layer-resolve.ts`의 fallback bg-plate 생성 시 active pipeline method에 맞는 source 사용

## 4. Technical Design

### 4.1 Architecture Overview

```
입력 이미지
    ↓
[Step 1] VLM (Qwen3-VL) — 이미지 분석 → 프롬프트 리스트 (4-8개)
    ↓                                        ↓ (병렬)
[Step 2a] SAM3 × N — per-prompt 마스크      [Step 2b] DA V2 — depth map
    ↓
[Step 3] 마스크 → RGBA 레이어 (applyMaskToImage)
    ↓
[Step 4] 겹침 해소 (depth-based overlap resolution)
    ↓
[Step 5] Coverage 확인 → 80% 미만이면 2차 패스 (VLM → SAM3 추가)
    ↓
[Step 6] 잔여 영역 → background plate
    ↓
[기존 파이프라인] candidate-extraction → layer-resolve → scene-generator
```

### 4.2 Data Model Changes

**image-decompose.ts — 새 모델 상수:**
```typescript
export const SAM3_MODEL = "mattsays/sam3-image";
export const SAM3_VERSION = "d73db077226443ba4fafd34e233b3626b552eac2a433f90c7c32a9ac89bd9e72";

export const VLM_MODEL = "lucataco/qwen3-vl-8b-instruct";
export const VLM_VERSION = "39e893666996acf464cff75688ad49ac95ef54e9f1c688fbc677330acc478e11";
```

**DecomposeOptions 확장:**
```typescript
interface DecomposeOptions {
  // 기존
  maxLayers?: number;
  alphaThreshold?: number;
  minCoverage?: number;
  // SAM2 fallback용 (기존)
  pointsPerSide?: number;
  predIouThresh?: number;
  stabilityScoreThresh?: number;
  // SAM3 신규
  sam3Threshold?: number;
  vlmMaxPrompts?: number;
  secondPassEnabled?: boolean;
  secondPassThreshold?: number;
  // CLI override
  manualPrompts?: string[];
}
```

**FileSourceMeta 확장:**
```typescript
interface FileSourceMeta {
  source: "sam2-segment" | "sam3-semantic";
  groupId?: string;
  prompt?: string;  // SAM3 프롬프트 기록
}
```

**DecomposeResult 확장:**
```typescript
export interface DecomposeResult {
  files: string[];
  coverages: number[];
  method: "sam2" | "sam3";
  fileMeta: FileSourceMeta[];
  depthMap?: Buffer;
  vlmPrompts?: string[];  // VLM이 생성한 프롬프트
}
```

### 4.3 API Design

N/A — 로컬 CLI 도구. Replicate API 호출만.

**Replicate API 호출 명세:**

| Step | Model | Input | Output | Cost |
|------|-------|-------|--------|------|
| VLM | `lucataco/qwen3-vl-8b-instruct` | `{ media: dataUri, prompt: systemPrompt, max_new_tokens: 256, temperature: 0.1 }` | JSON array of strings | ~$0.003 |
| SAM3 ×N | `mattsays/sam3-image` | `{ image: dataUri, prompt: text, threshold: 0.25, mask_only: true, return_zip: false }` | Binary mask PNG (원본 해상도) | ~$0.002/call |
| DA V2 | `chenxwh/depth-anything-v2` | `{ image: dataUri }` | `{ grey_depth: FileOutput }` | ~$0.005 |

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| 세그멘테이션 모델 | (A) SAM2 AMG (B) SAM3 text (C) Grounded-SAM2 | (B) SAM3 | 실험 데이터: 99.6% vs 15% coverage. 원본 해상도 마스크. $0.002/call |
| VLM 모델 | (A) Qwen3-VL (B) LLaVA (C) Florence-2 | (A) Qwen3-VL | 실험 검증 완료. 정확한 시각적 설명 생성. media 파라미터로 이미지 직접 전달 |
| 겹침 해소 | (A) 순차 claim (B) depth 기반 (C) coverage 기반 | (B) depth 기반 | near layer(높은 depth)가 우선 claim → 자연스러운 z-order |
| SAM2 처리 | (A) 완전 제거 (B) fallback 유지 (C) 병렬 실행 | (B) fallback | VLM/SAM3 실패 시 파이프라인 중단 방지. 코드 유지 비용 낮음 |
| 2차 패스 | (A) 미구현 (B) VLM 재분석 (C) SAM2 AMG 보조 | (B) VLM 재분석 | 미커버 영역을 VLM이 분석하여 추가 프롬프트 생성 → 시맨틱 일관성 유지 |
| Complexity scoring | (A) 유지 (B) VLM 대체 (C) 제거 | (A) 유지, SAM3 경로에서 스킵 | SAM3 경로(useSam3=true)에서 scoreComplexity() 호출 스킵. samMaskLimit은 SAM2 fallback에서만 사용. VLM이 프롬프트 수를 결정 |
| BFS candidate-extraction | (A) 그대로 사용 (B) 우회 | (B) SAM3 경로에서 우회 | SAM3 마스크가 이미 시맨틱 단위. BFS로 쪼개면 오히려 파편화. 대신 `computeMaskStats()`로 bbox/centroid/coverage 계산, edgeDensity는 sharp sobel로 별도 계산, componentCount=1 고정 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | VLM이 JSON array 대신 자유 텍스트 반환 | 정규식으로 배열 추출 시도 → 실패 시 기본 프롬프트 fallback | P1 |
| E2 | SAM3가 특정 프롬프트에서 빈 마스크 반환 | 해당 프롬프트 건너뛰기. 로그 경고 | P2 |
| E3 | 모든 SAM3 호출 실패 (API 다운) | SAM2 AMG fallback 발동 | P0 |
| E4 | VLM이 1개 프롬프트만 반환 | 최소 프롬프트 수 미달 → 기본 프롬프트 추가 | P2 |
| E5 | SAM3 마스크가 100% coverage (전체 이미지) | 해당 마스크를 background로 처리. 다른 마스크와 겹침 해소 | P2 |
| E6 | 2차 패스에서도 coverage < 80% | 3차 패스 없이 종료. 잔여 → background plate | P3 |
| E7 | 이미지 크기 > 20MB (base64 제한) | upstream `validateAndPrepare()`가 4096px/20MB cap 처리 → SAM3/VLM에 도달 전 해결. 별도 체크 불필요 | P3 |
| E8 | CLI `--prompts` 지정 시 VLM 스킵 | VLM 호출 없이 SAM3 직접 진행 | P3 |
| E9 | VLM 프롬프트 중 동일 영역 지칭 (중복) | SAM3 마스크 IoU > `iouDedupeThreshold`(config default 0.92) 이면 coverage 작은 쪽 drop. 기존 `deduplicateCandidates()` 재사용 | P2 |
| E10 | Replicate rate limit / timeout | withRetry 3회 재시도 (기존 로직) | P1 |
| E11 | SAM3 출력 URL이 이미지가 아닌 JSON/HTML 반환 | sharp 디코드 실패 → try/catch로 skip + warn (AC-2.8) | P2 |

## 6. Security & Permissions

N/A — 로컬 CLI 도구. Replicate API 토큰은 `.env` 파일로 관리 (기존 동일).

## 7. Performance & Monitoring

| Metric | Baseline (SAM2) | Target (SAM3) | Measurement |
|--------|-----------------|---------------|-------------|
| Union coverage | 15-35% | **90%+** | 마스크 union / total pixels |
| 시맨틱 레이어 수 | 4 (파편) | **5-8** (의미 있는) | retained layer count |
| 파이프라인 실행 시간 | ~60s | **~30-60s** | VLM ~3s + SAM3 sequential ~2s×6=12s + DA V2 ~5s (SAM3와 병렬). Cold start 시 더 길 수 있음 |
| API 비용 | ~$0.02 | **~$0.02** | VLM($0.003) + SAM3×6($0.012) + DAV2($0.005) |
| meanDepth 정확도 | 낮음 (파편 마스크) | **높음** (시맨틱 마스크) | per-layer depth stddev |

## 8. Testing Strategy

### 8.1 Unit Tests
- VLM 프롬프트 파싱: JSON array 추출, fallback, min/max 프롬프트 수
- SAM3 마스크 적용: applyMaskToImage 재사용 (기존 테스트 유지)
- 겹침 해소: depth 기반 pixel assignment, uniqueCoverage 재계산
- 잔여 영역: coverage 계산, background plate 합성
- Config: 4개 새 axis schema 검증

### 8.2 Integration Tests
- VLM → SAM3 → RGBA layers 전체 흐름 (mocked API)
- SAM2 fallback 경로 (SAM3 실패 시뮬레이션)
- 2차 패스 트리거 + 추가 레이어 생성
- 기존 pipeline-layers.ts와의 통합 (scene.json 생성까지)

### 8.3 Edge Case Tests
- E1: VLM 비정상 응답 → fallback
- E3: SAM3 전체 실패 → SAM2 fallback
- E5: 100% coverage 마스크 처리
- E9: 중복 마스크 병합 (iouDedupeThreshold 기준)
- E11: SAM3 비이미지 응답 → sharp 디코드 실패 → skip

## 9. Rollout Plan

### 9.1 Migration Strategy

마이그레이션 불필요. `decomposeImage()` 내부 구현만 변경. 외부 인터페이스(DecomposeResult) 호환 유지. method 필드가 "sam2" → "sam3"로 변경되지만 downstream에서 사용하지 않음.

### 9.2 Rollback Plan

SAM2 코드가 fallback으로 남아있으므로, research-config의 `useSam3: false` 설정하면 SAM2 AMG 경로로 즉시 복귀 가능 (AC-7.6). 코드 변경 불필요.

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Status | Risk |
|------------|--------|------|
| SAM3 (`mattsays/sam3-image`) on Replicate | Available, 9.6K runs | Community model, Meta 공식 아님 |
| Qwen3-VL (`lucataco/qwen3-vl-8b-instruct`) on Replicate | Available | Community model |
| DA V2 (`chenxwh/depth-anything-v2`) | In use | 변경 없음 |
| SAM2 (`lucataco/segment-anything-2`) | In use (fallback) | 변경 없음 |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| SAM3 Replicate 모델 비가용/deprecated | LOW | HIGH | SAM2 fallback 유지. SAM3 version hash 고정 |
| VLM 프롬프트 품질 불균일 | MEDIUM | MEDIUM | 기본 프롬프트 fallback + temperature 0.1 고정 |
| SAM3 마스크 정밀도 부족 (경계 번짐) | LOW | LOW | threshold 조절 (0.1-0.9 range). SAM2보다 경계 품질 우수 확인됨 |
| API 비용 증가 (VLM + SAM3 N회) | LOW | LOW | 총 ~$0.02 (SAM2와 동일 수준) |
| 2차 패스에서 프롬프트 중복 | MEDIUM | LOW | IoU > iouDedupeThreshold(0.92) 마스크 병합 |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Union coverage (AI art) | 15-35% | **90%+** | 불상 이미지 테스트 |
| 시맨틱 레이어 수 | 4 파편 | **5-8 의미** | retained count |
| Depth cinematic 효과 품질 | 저 (파편 마스크) | **고 (시맨틱)** | 수동 검증 |
| 파이프라인 안정성 | N/A | **fallback 0 crash** | CI |
| 테스트 통과율 | 전체 PASS | **전체 PASS** | vitest |

## 12. Open Questions

- [x] OQ-1: SAM3 모델 안정성 → 실험 검증 완료. 원본 해상도 마스크, $0.002/call
- [x] OQ-2: VLM 프롬프트 품질 → Qwen3-VL 실험 검증. 정확한 시각적 설명 생성
- [x] OQ-3: SAM3 마스크 간 겹침 비율 → 실험 데이터에서 union 99.6% but individual coverages sum to ~209% → 약 110% 겹침. depth 순 정렬 + 기존 resolveExclusiveOwnership()으로 해소 (AC-3.1)
- [ ] OQ-4: 2차 패스 비용 대비 효과 — 1차 90%+ 달성 시 2차 불필요할 수 있음

---

### Appendix A: 실험 데이터 (불상 이미지)

**SAM2 AMG (현재):**
```
mask_limit=6, points_per_side=80
6 masks → 4 retained
max coverage: 7%
union: ~15%
```

**SAM3 텍스트 프롬프트 (제안):**
```
VLM prompts: ["Central Buddha statue", "orange celestial orb", "blue petal base", "starfield nebulae", "cosmic energy swirls", "glowing stars"]
6 SAM3 calls → 6 layers
coverages: 23.9%, 7.0%, 20.8%, 96.2%, 47.7%, 14.1%
union: 99.6%
```

### Appendix B: 고도화 로드맵

| Phase | 기능 | 우선순위 |
|-------|------|---------|
| v1 (이번 PRD) | VLM + SAM3 기본 파이프라인 + 겹침 해소 + fallback | P0 |
| v1 (이번 PRD) | 2차 패스 (미커버 영역 재분석) | P1 |
| v2 (후속) | 적응형 threshold — per-prompt confidence 조절 | P2 |
| v2 (후속) | VLM 프롬프트 캐싱 — 유사 이미지 재사용 | P3 |
| v3 (후속) | SAM3 video mode — 시퀀스 일관성 세그멘테이션 | P3 |
| v3 (후속) | 로컬 SAM3 실행 (Docker) — API 비용 0 | P3 |
