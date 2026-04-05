# PRD: GroundingDINO + SAM2 세그멘테이션 경로

**Version**: 0.3
**Author**: AI
**Date**: 2026-04-01
**Status**: Approved
**Size**: L

---

## 1. Problem Statement

### 1.1 Background
현재 파이프라인은 SAM3(mattsays/sam3-image)을 유일한 세그멘테이션 모델로 사용한다. `--model grounded-sam2` CLI 플래그와 `segmentationModel: "grounded-sam2"` config 필드는 선언되어 있으나 실제 구현이 없다(스캐폴딩만 존재).

### 1.2 Problem Definition
SAM3가 텍스트 프롬프트 기반이라 "그 물체"처럼 모호한 지시에 약하고, 복잡한 장면에서 작은 객체를 놓칠 수 있다. GroundingDINO의 open-vocabulary detection으로 정밀한 bbox를 먼저 잡고, SAM2로 bbox 기반 마스크를 생성하면 더 정확한 세그멘테이션이 가능하다.

### 1.3 Impact of Not Solving
- 사용자가 `--model grounded-sam2`를 사용하면 아무 일도 안 일어남 (dead code)
- 복잡한 장면에서 SAM3 단독으로는 세그멘테이션 품질 한계

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: `--model grounded-sam2` 선택 시 GroundingDINO → SAM2 파이프라인 실행
- [ ] G2: 기존 SAM3 경로와 동일한 output format (LayerCandidate[]) 유지
- [ ] G3: provider fallback 없음 — GroundingDINO+SAM2는 Replicate 전용
- [ ] G4: mock API 테스트로 전체 코드 경로 검증
- [ ] G5: GROUNDING_DINO_VERSION 핀 (production 모드 지원)
- [ ] G6: 총 SAM2 호출 비용 제어 (maxTotalSam2Calls 상한)

### 2.2 Non-Goals
- NG1: GroundingDINO+SAM2의 fal.ai 경로 (Replicate 전용)
- NG2: EVF-SAM 모델 통합 (별도)
- NG3: 실시간/비디오 세그멘테이션
- NG4: VLM 자동 프롬프트 생성 — **폐기 결정**. 사용자가 `--prompts`로 직접 제공. VLM(Qwen3-VL) 의존성 제거

## 3. User Stories & Acceptance Criteria

### US-1: GroundingDINO bbox 검출
**As a** 파이프라인 사용자, **I want** 텍스트 프롬프트로 이미지 내 객체 bbox를 검출, **so that** SAM2에 정확한 위치 정보를 전달한다.

**Acceptance Criteria:**
- [ ] AC-1.1: `getGroundingDinoBboxes(replicate, dataUri, query)` → `[{label, confidence, bbox: [x1,y1,x2,y2]}]` 반환. bbox는 **pixel 정수 xyxy** 좌표 (cog 소스 확인: `box_convert(out_fmt="xyxy")` + `boxes * Tensor([w,h,w,h])`)
- [ ] AC-1.2: `box_threshold` 0.25 기본값, `text_threshold` 0.25 고정. config로 `box_threshold`만 조정 가능
- [ ] AC-1.3: 빈 결과(bbox 없음) → 빈 배열 반환 (throw 안 함)
- [ ] AC-1.4: `GROUNDING_DINO_VERSION` 핀: `efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa` (64-char hex, `enforceVersionPin` 통과 검증됨)
- [ ] AC-1.5: DINO 결과가 `maxBboxPerPrompt`(기본 6) 초과 시 confidence 상위 N개만 반환 (내림차순)
- [ ] AC-1.6: `show_visualisation: false` 필수 (비용/지연 방지)

### US-2: SAM2 bbox → mask 생성
**As a** 파이프라인, **I want** bbox 좌표로 SAM2 mask를 생성, **so that** 정밀한 세그멘테이션 마스크를 얻는다.

**Acceptance Criteria:**
- [ ] AC-2.1: `getSam2MaskFromBbox(replicate, dataUri, bbox)` → mask Buffer 반환. mask URL은 fetch 전 `validateReplicateUrl` 통과 필수 (SSRF 방지)
- [ ] AC-2.2: `meta/sam-2` 모델 사용, version `fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83`
- [ ] AC-2.3: mask download 후 `sharp.metadata()` 검증 + 채널 수 확인 (1ch 아니면 grayscale 변환)
- [ ] AC-2.4: 실패 시 null 반환 (throw 안 함)
- [ ] AC-2.5: SAM2 호출 60초 타임아웃 (AbortController). 초과 시 null 반환
- [ ] AC-2.6: per-prompt bbox들의 SAM2 호출은 `Promise.all` 병렬 (최대 동시 4개, `maxConcurrentSam2` config)

### US-3: 통합 파이프라인 디스패치
**As a** 사용자, **I want** `--model grounded-sam2` 플래그로 파이프라인을 전환, **so that** GroundingDINO+SAM2 경로로 decomposition이 실행된다.

**Acceptance Criteria:**
- [ ] AC-3.1: `pipeline-layers.ts`에서 `cliArgs.model === "grounded-sam2"` → `decomposeImageGroundedSam2()` 호출 (`decomposeResult` 변수 스코프 호이스트)
- [ ] AC-3.2: `--prompts` CLI로 전달된 사용자 프롬프트를 GroundingDINO query로 직접 사용. VLM 자동 생성 없음. 프롬프트 미제공 시 DEFAULT_PROMPTS fallback
- [ ] AC-3.3: `buildSam3Candidate()` 호출 시 `source: "grounded-sam2-segment"`, `filePrefix: "gsam2"` 전달 (기존 `"sam3-semantic"` / `"sam3"` 오버라이드)
- [ ] AC-3.4: 모든 후처리(hole-filling, alpha matte, depth map) 기존과 동일 적용
- [ ] AC-3.5: manifest `pipelineVariant`에 `"grounded-sam2"`, `passes.type`에 `"grounded-sam2-segment"` 추가
- [ ] AC-3.6: 모든 bbox SAM2 실패 시 → 에러 로그 + 빈 candidates 반환 + 사용자에게 `--model sam3` 안내 메시지 (SAM3 자동 fallback 없음 — provenance 유지)
- [ ] AC-3.7: 총 SAM2 호출 수가 `maxTotalSam2Calls`(기본 12) 초과 시 잔여 bbox 건너뜀 + 경고 로그
- [ ] AC-3.8: decompose 시작 시 비용 예상 로그: `"Estimated cost: ~$X.XX (N DINO + M SAM2 calls)"`

## 4. Technical Design

### 4.1 Architecture Overview

```
사용자 프롬프트 (--prompts "부처상, 연꽃받침, 후광, 배경")
       ↓
GroundingDINO (텍스트 → bbox[])    ← adirik/grounding-dino (per-prompt)
       ↓
per-bbox: SAM2 (bbox → mask)       ← meta/sam-2 (Promise.all 병렬)
       ↓
buildSam3Candidate (mask → LayerCandidate)  ← 기존 함수 재사용 (source/filePrefix 오버라이드)
       ↓
[기존 파이프라인 합류: layer-resolve → scene-generator]
```

**VLM 폐기**: `getVlmPrompts()` (Qwen3-VL)는 사용하지 않음. 실험 결과 VLM 자동 프롬프트(2/6 성공, 8.6% 커버리지)가 수동 프롬프트(3/6, 90.9%)보다 현저히 열등.

### 4.2 Data Model Changes

| 변경 | 파일 | 내용 |
|------|------|------|
| 모델 상수 | `image-decompose.ts` | `SAM2_MODEL`, `SAM2_VERSION` 추가 |
| manifest | `decomposition-manifest.ts` | `pipelineVariant` union에 `"grounded-sam2"`, `passes.type`에 `"grounded-sam2-segment"` 추가 |
| GROUNDING_DINO_VERSION | `image-decompose.ts` | 빈 문자열 → 실제 SHA 핀 |
| buildSam3Candidate | `image-decompose.ts` | `source` + `filePrefix` 파라미터 추가 (기본값 유지, backward-compatible) |
| DecomposeOptions | `image-decompose.ts` | `boxThreshold`, `maxBboxPerPrompt`, `maxTotalSam2Calls`, `maxConcurrentSam2` 필드 추가 |
| VLM 의존성 | `image-decompose.ts` | SAM3 경로도 `--prompts` 필수화. VLM fallback은 유지하되 deprecated 표시 |

### 4.3 API Design

**GroundingDINO** ([adirik/grounding-dino](https://replicate.com/adirik/grounding-dino)):
- Input: `{ image: dataUri, query: "object1, object2", box_threshold: 0.25, text_threshold: 0.25, show_visualisation: false }`
- Output: `{ detections: [{label, confidence, bbox: [x1,y1,x2,y2]}], result_image: null }`
- Cost: ~$0.0015/run, ~2초

**SAM2** ([meta/sam-2](https://replicate.com/meta/sam-2)):
- Input: `{ image: dataUri, input_box: "x1,y1,x2,y2" }`
- Output: mask image URL → download → Buffer
- Cost: ~$0.026/run, ~27초
- Version: `fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83`

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| SAM2 모델 | lucataco/segment-anything-2 vs meta/sam-2 | meta/sam-2 | lucataco는 자동 마스크만 지원, meta/sam-2는 bbox 입력 지원 |
| bbox 전달 | center point prompt vs bbox prompt | bbox prompt | GroundingDINO 출력이 bbox이므로 직접 전달이 정확도 유리 |
| 프롬프트 소스 | VLM 자동 vs 사용자 수동 | 사용자 수동 (`--prompts`) | VLM 실험 결과 열등 (8.6% vs 90.9%). 사용자가 이미지별 최적 명사구 직접 지정 |
| 좌표계 | pixel xyxy vs normalized [0,1] | pixel xyxy (int) | GroundingDINO cog: `box_convert(out_fmt="xyxy") * [w,h,w,h]` → pixel 정수. SAM2 input_box도 pixel 좌표 |
| 병렬화 | 전체 순차 vs per-prompt 병렬 | per-prompt Promise.all (max 4 concurrent) | Replicate 기본 동시 5 예측 제한. 순차 시 최악 21분 → 병렬 시 ~3분 |
| fallback | fal.ai fallback vs Replicate 전용 | Replicate 전용 | GroundingDINO는 Replicate에만 있음 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | GroundingDINO가 빈 bbox 반환 | 해당 프롬프트 건너뜀, 다음 프롬프트 진행 | P2 |
| E2 | SAM2 mask 생성 실패 | null 반환 → 해당 bbox 건너뜀 | P2 |
| E3 | 모든 bbox의 SAM2 실패 | 에러 로그 + 빈 candidates + "--model sam3 사용 안내" (SAM3 자동 fallback 없음 — provenance 유지) | P1 |
| E4 | GroundingDINO 자체 실패 | throw → outer catch → error 보고 | P1 |
| E5 | `--model grounded-sam2 --production` + version pin | enforceVersionPin 통과 (SHA 핀됨) | P2 |
| E6 | 동일 객체에 중복 bbox | IoU dedup (기존 layer-resolve 로직) | P3 |

## 6. Security & Permissions

### 6.1 Authentication
기존 `REPLICATE_API_TOKEN` 사용 (새 키 불필요)

### 6.2 Authorization
N/A — 로컬 CLI 도구

### 6.3 Data Protection
- validateReplicateUrl으로 mask download URL 도메인 검증 (기존)
- 이미지 데이터는 Replicate API로만 전송

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| GroundingDINO per-call | < 3초 | Replicate 로그 |
| SAM2 per-bbox | < 30초 | Replicate 로그 |
| 총 decompose (6 prompts, per-prompt 병렬) | < 3분 | pipeline 로그 |
| 총 SAM2 호출 비용 상한 | ≤ $0.31 (12 calls × $0.026) | 로그 |

## 8. Testing Strategy

### 8.1 Unit Tests
- `getGroundingDinoBboxes`: mock replicate.run → detections 파싱
- `getSam2MaskFromBbox`: mock replicate.run → mask Buffer
- `validateProviderUrl` 기존 테스트로 커버

### 8.2 Integration Tests
- `decomposeImageGroundedSam2`: mock replicate → 전체 흐름 (VLM → DINO → SAM2 → candidates)
- pipeline dispatch: `--model grounded-sam2` → 올바른 함수 호출

### 8.3 Edge Case Tests
- E1-E6 각각 테스트 케이스

## 9. Rollout Plan

### 9.1 Migration Strategy
기존 코드 변경 최소화. 새 함수 추가 + 디스패치 분기만. 기본값은 SAM3 유지.

### 9.2 Feature Flag
`--model grounded-sam2` CLI 플래그 = 명시적 opt-in

### 9.3 Rollback Plan
`--model sam3` (기본값) 사용으로 즉시 롤백

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Owner | Status | Risk if Delayed |
|-----------|-------|--------|-----------------|
| adirik/grounding-dino | Replicate community | Stable (2y+) | 낮음 |
| meta/sam-2 | Meta/Replicate | Stable (1.5y+) | 낮음 |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| SAM2 bbox 입력 포맷 변경 | 낮음 | 중간 | version pin으로 고정 |
| GroundingDINO 모델 deprecation | 낮음 | 높음 | version pin + 대안 모델 탐색 |
| 비용 증가 (SAM2 $0.026/bbox) | 중간 | 중간 | `maxBboxPerPrompt=6` + `maxTotalSam2Calls=12` 이중 상한. 최대 $0.31/이미지 |
| GroundingDINO 커뮤니티 모델 SLA 없음 | 중간 | 높음 | version pin + 실패 시 명확한 에러 메시지로 `--model sam3` 안내 |

## 11. Success Metrics

| Metric | Baseline | Target | Measurement Method |
|--------|----------|--------|--------------------|
| `--model grounded-sam2` 실행 가능 | 불가 | 가능 | CLI 테스트 |
| mock 테스트 커버리지 | 0% | 100% (모든 함수) | vitest coverage |
| 기존 SAM3 테스트 regression | 0 | 0 | vitest run |

## 12. Open Questions

- [x] OQ-1: meta/sam-2의 input_box 포맷 → "x1,y1,x2,y2" 문자열 (확인 필요, 실 API 호출로 검증)
- [x] OQ-2: GroundingDINO bbox 좌표 → **pixel 정수 xyxy** (cog 소스 확인: `box_convert(out_fmt="xyxy")` + `boxes * Tensor([w,h,w,h])` → `.numpy().astype(int)`)
- [x] OQ-3: SAM2 비용 최적화 → `maxBboxPerPrompt=6` + `maxTotalSam2Calls=12` 이중 상한. 최대 $0.31/이미지

---
