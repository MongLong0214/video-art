# T6: Alpha Matting (Soft Edges)

**PRD Ref**: PRD-layer-pipeline-overhaul > US-3
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: T5 (hole-filling이 먼저 적용)
**Wave**: 2

---

## 1. Objective

레이어 에지에 Gaussian blur로 alpha gradient를 생성하여 경계가 자연스럽게 페이드되도록 한다.

## 2. Acceptance Criteria

- [ ] AC-1: 마스크 에지에 Gaussian blur → alpha gradient (0-255 transition)
- [ ] AC-2: blur radius는 이미지 장변의 0.3% (최소 1px, 최대 8px)
- [ ] AC-3: hole-filling(T5) 이후 적용
- [ ] AC-4: background plate는 alpha matting 미적용 (항상 alpha=255)
- [ ] AC-5: 100x100 사각형 마스크에서 에지 근처 alpha gradient 존재 확인
- [ ] AC-6: config `alphaMatteEnabled: false` → 건너뜀

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `applyAlphaMatte creates edge gradient` | Unit | 100x100 사각형 마스크 → 에지 3px 내 alpha 검사 | 0 < alpha < 255 (gradient) |
| 2 | `applyAlphaMatte keeps interior fully opaque` | Unit | 100x100 마스크 중앙(50,50) alpha 검사 | alpha === 255 |
| 3 | `applyAlphaMatte skips bg-plate` | Unit | role="background-plate" → 입출력 동일 | 변경 없음 |
| 4 | `applyAlphaMatte respects config disabled` | Unit | alphaMatteEnabled=false → 입출력 동일 | Buffer.equals |
| 5 | `applyAlphaMatte clamps radius` | Unit | 10x10 이미지 → radius >= 1px | clamped |

### 3.2 Test File Location
- `scripts/lib/mask-postprocess.test.ts` (T5에서 생성한 파일에 추가)

### 3.3 Mock/Setup Required
- Vitest: sharp Buffer 직접 생성

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/mask-postprocess.ts` | Modify | `applyAlphaMatte()` 함수 추가 |
| `scripts/lib/mask-postprocess.test.ts` | Modify | alpha matting 테스트 추가 |
| `scripts/lib/image-decompose.ts` | Modify | hole-filling 후 alpha matting 호출 |

### 4.2 Implementation Steps (Green Phase)
1. `mask-postprocess.ts`에 `applyAlphaMatte(maskBuffer, width, height, config)` 추가
2. 알고리즘: `sharp(binaryMask).blur(radius)` → 에지에 gradient 생성
3. 결과를 RGBA 레이어의 alpha 채널로 적용
4. bg-plate role 체크: skip
5. `image-decompose.ts`에서 `fillMaskHoles` 후 `applyAlphaMatte` 호출

## 5. Edge Cases
- EC-1: 마스크가 1px 너비 선 → blur로 거의 사라짐 → minCoverage 체크에서 걸러짐

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
