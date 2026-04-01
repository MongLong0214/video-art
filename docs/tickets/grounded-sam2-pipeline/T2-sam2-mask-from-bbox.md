# T2: SAM2 bbox → mask 함수

**PRD Ref**: PRD-grounded-sam2-pipeline > US-2
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None
**Wave**: 1

---

## 1. Objective

`getSam2MaskFromBbox()` 함수를 구현하여 GroundingDINO bbox로부터 SAM2 세그멘테이션 마스크를 생성한다.

## 2. Acceptance Criteria

- [ ] AC-1: `getSam2MaskFromBbox(replicate, dataUri, bbox)` → mask Buffer 반환
- [ ] AC-2: `SAM2_MODEL = "meta/sam-2"`, `SAM2_VERSION = "fe97b453a6455861e3bac769b441ca1f1086110da7466dbb65cf1eecfd60dc83"`
- [ ] AC-3: mask URL은 `validateReplicateUrl` 통과 후 fetch (SSRF 방지)
- [ ] AC-4: `sharp.metadata()` 검증 + 채널 수 확인 (1ch 아니면 grayscale 변환)
- [ ] AC-5: 60초 타임아웃 초과 시 null 반환
- [ ] AC-6: 실패 시 null 반환 (throw 안 함)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `returns mask buffer from valid bbox` | Unit | mock replicate.run → mask URL → Buffer | Buffer |
| 2 | `validates mask URL domain` | Unit | mock → untrusted URL | null |
| 3 | `returns null on API failure` | Unit | mock → throw | null |
| 4 | `returns null on corrupt mask` | Unit | mock → non-image data | null |
| 5 | `converts RGB mask to grayscale` | Unit | mock → 3ch mask | 1ch Buffer |
| 6 | `SAM2_VERSION is 64-char hex` | Unit | constant check | regex match |

### 3.2 Test File Location
- `scripts/lib/grounded-sam2.test.ts` (T1과 공유)

### 3.3 Mock/Setup Required
- `vi.mock('replicate')`, sharp synthetic mask

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/image-decompose.ts` | Modify | `SAM2_MODEL`, `SAM2_VERSION` 상수 + `getSam2MaskFromBbox()` 추가 |
| `scripts/lib/grounded-sam2.test.ts` | Modify | SAM2 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `SAM2_MODEL`, `SAM2_VERSION` 상수 추가
2. `getSam2MaskFromBbox()` 구현: replicate.run → URL → validateReplicateUrl → fetch → sharp 검증
3. withRetry 래핑, 60초 AbortController 타임아웃

## 5. Edge Cases
- EC-1: SAM2가 multi-mask 반환 → 첫 번째 마스크만 사용
- EC-2: mask URL 만료 → fetch 실패 → null

## 6. Review Checklist
- [ ] Red → Green → Refactor
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
