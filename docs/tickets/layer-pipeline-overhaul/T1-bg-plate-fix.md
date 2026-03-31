# T1: Background Plate 구멍 제거

**PRD Ref**: PRD-layer-pipeline-overhaul > US-1
**Priority**: P0 (Blocker)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None
**Wave**: 1

---

## 1. Objective

`fillBackgroundPlate`에서 다른 레이어가 차지한(claimed) 픽셀을 투명으로 남기는 대신, 원본 이미지의 모든 픽셀로 채워서 구멍이 없는 완전한 background plate를 생성한다.

## 2. Acceptance Criteria

- [ ] AC-1: bg-plate-filled.png의 모든 픽셀 alpha === 255 (완전 불투명)
- [ ] AC-2: claimed 영역도 원본 이미지에서 채움 (기존: 투명 → 수정: 원본)
- [ ] AC-3: uniqueCoverage 계산은 기존 exclusive ownership 그대로 유지
- [ ] AC-4: 렌더러에서 bg-plate 위 레이어 z-stack 시 double-pixel 아티팩트 없음

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `fillBackgroundPlate produces fully opaque output` | Unit | 5x5 synthetic: bg candidate + 2x2 claimed region → 출력 alpha 검사 | 모든 25 픽셀 alpha === 255 |
| 2 | `fillBackgroundPlate fills claimed pixels from original` | Unit | claimed 영역의 RGB가 원본 이미지 RGB와 일치 | pixel-exact match |
| 3 | `fillBackgroundPlate preserves bg candidate pixels` | Unit | bg candidate 투명 영역에 원본 채워짐, 기존 bg 픽셀은 유지 | bg opaque 영역 RGB 불변 |
| 4 | `uniqueCoverage unchanged after bg-plate fix` | Unit | resolveExclusiveOwnership 결과가 bg-plate 수정과 무관 | 동일 uniqueCoverage 값 |

### 3.2 Test File Location
- `scripts/lib/layer-resolve.test.ts` (기존 파일에 추가)

### 3.3 Mock/Setup Required
- Vitest: `vi.mock('sharp')` 불필요 — synthetic Buffer 직접 생성
- sharp로 5x5 RGBA Buffer 생성하여 테스트

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/layer-resolve.ts` | Modify | `fillBackgroundPlate` 함수 lines 559-579 |
| `scripts/lib/layer-resolve.test.ts` | Modify | 새 테스트 케이스 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `fillBackgroundPlate` 함수에서 line 579의 `// else: claimed by another layer, leave transparent` 분기를 **원본 이미지 픽셀로 채우도록** 변경
2. 최종 loop: 모든 픽셀에서 `outputRgba[px+3] = 255` 보장 (bg + unclaimed + claimed 모두)

### 4.3 Refactor Phase
- `claimedMask` 파라미터가 더 이상 bg-plate 합성에 불필요 → 하지만 uniqueCoverage 계산에 사용하므로 시그니처 유지

## 5. Edge Cases
- EC-1: bg candidate가 이미 100% opaque → 원본 채움 불필요, 하지만 코드 경로 동일하게 처리
- EC-2: 원본 이미지와 bg candidate 해상도 불일치 → sharp.resize로 맞춤 (기존 코드)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
