# T1: GroundingDINO bbox 검출 함수

**PRD Ref**: PRD-grounded-sam2-pipeline > US-1
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None
**Wave**: 1

---

## 1. Objective

`getGroundingDinoBboxes()` 함수를 구현하여 텍스트 프롬프트로 이미지 내 객체 bbox를 검출한다. GROUNDING_DINO_VERSION을 실제 SHA로 핀한다.

## 2. Acceptance Criteria

- [ ] AC-1: `getGroundingDinoBboxes(replicate, dataUri, query, options?)` → `[{label, confidence, bbox: [x1,y1,x2,y2]}]` 반환 (pixel 정수 xyxy)
- [ ] AC-2: `box_threshold` 기본 0.25, `text_threshold` 0.25 고정, `show_visualisation: false`
- [ ] AC-3: 빈 결과 → 빈 배열 반환 (throw 안 함)
- [ ] AC-4: 결과를 confidence 내림차순 정렬 후 `maxBboxPerPrompt`(기본 6) 상위만 반환
- [ ] AC-5: `GROUNDING_DINO_VERSION = "efd10a8ddc57ea28773327e881ce95e20cc1d734c589f7dd01d2036921ed78aa"`
- [ ] AC-6: `enforceVersionPin` 통과 확인

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `returns detections with label, confidence, bbox` | Unit | mock replicate.run → 2 detections | [{label, confidence, bbox}] |
| 2 | `sorts by confidence descending` | Unit | mock → 3 detections unsorted | sorted desc |
| 3 | `caps at maxBboxPerPrompt` | Unit | mock → 8 detections, maxBbox=4 | 4 results |
| 4 | `returns empty array on no detections` | Unit | mock → {detections: []} | [] |
| 5 | `returns empty array on API failure` | Unit | mock → throw | [] |
| 6 | `passes show_visualisation: false` | Unit | mock → check input args | false in args |
| 7 | `GROUNDING_DINO_VERSION is 64-char hex` | Unit | constant check | regex match |

### 3.2 Test File Location
- `scripts/lib/grounded-sam2.test.ts` (신규)

### 3.3 Mock/Setup Required
- `vi.mock('replicate')` — `replicate.run` mock

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/image-decompose.ts` | Modify | `GROUNDING_DINO_VERSION` 핀, `getGroundingDinoBboxes()` 추가 |
| `scripts/lib/grounded-sam2.test.ts` | Create | 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. `GROUNDING_DINO_VERSION` 빈 문자열 → SHA 핀
2. `GroundingDinoDetection` 인터페이스 정의
3. `getGroundingDinoBboxes()` 구현: replicate.run → detections 파싱 → sort → cap
4. withRetry 래핑, 실패 시 빈 배열

## 5. Edge Cases
- EC-1: GroundingDINO가 non-JSON 반환 → catch → []
- EC-2: bbox 좌표가 이미지 범위 밖 → clamp to [0, width/height]

## 6. Review Checklist
- [ ] Red → Green → Refactor
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
