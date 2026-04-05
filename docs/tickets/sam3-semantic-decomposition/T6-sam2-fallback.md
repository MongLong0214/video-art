# T6: SAM2 Fallback

**PRD Ref**: PRD-sam3-semantic-decomposition > US-5 (AC-5.1~5.4)
**Priority**: P1 (High)
**Size**: S (1-2h)
**Status**: Todo
**Depends On**: T1, T3

---

## 1. Objective

VLM/SAM3 전체 실패 시 기존 SAM2 AMG 로직으로 자동 폴백. useSam3=false config으로 즉시 전환.

## 2. Acceptance Criteria

- [ ] AC-1: VLM 실패 → 기본 프롬프트로 SAM3 진행 (T2 AC-6에서 이미 처리)
- [ ] AC-2: SAM3 전체 실패 (0 valid masks) → `decomposeImageSam2()` 호출 (기존 로직)
- [ ] AC-3: `useSam3: false` → SAM3 경로 완전 스킵, SAM2 직행
- [ ] AC-4: fallback 발동 시 console.warn + method="sam2" 기록
- [ ] AC-5: SAM2 코드 삭제하지 않음 — 기존 getSam2Masks + 관련 로직 유지

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `useSam3=false → method is sam2` | Integration | config override | result.method === "sam2" |
| 2 | `SAM3 all failed → fallback to sam2` | Integration | mock SAM3 failure | result.method === "sam2" |
| 3 | `fallback logs warning` | Unit | spy on console.warn | called with fallback message |

### Test File Location
- `scripts/lib/image-decompose.test.ts` (append)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/image-decompose.ts` | Modify | decomposeImage() → useSam3 분기 + SAM3 전체 실패 fallback |

### 4.2 Implementation Steps

1. `decomposeImage()` 진입점에서 `options.useSam3 ?? true` 체크
2. false → 기존 SAM2 경로 (`decomposeImageSam2()`)
3. true → SAM3 경로. 0 valid masks 시 → warn + SAM2 fallback
4. 기존 SAM2 로직을 `decomposeImageSam2()` 내부 함수로 추출 (rename만, 로직 변경 없음)

## 5. Edge Cases

- EC-1 (E3): 네트워크 전체 다운 → SAM3 + SAM2 모두 실패 → 에러 throw (현재와 동일)

## 6. Review Checklist

- [ ] SAM2 코드 100% 보존
- [ ] useSam3=false로 즉시 rollback 가능
