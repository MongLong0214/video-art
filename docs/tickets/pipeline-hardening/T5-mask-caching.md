# T5: Per-candidate Binary Mask Caching

**PRD Ref**: PRD-pipeline-hardening > US-2
**Priority**: P2 (Medium)
**Size**: M
**Status**: Todo
**Depends On**: T2, T4

---

## 1. Objective
per-candidate binary mask를 1회 디코딩 후 캐싱하여 resolveExclusiveOwnership 호출 시 반복 I/O를 제거한다.

## 2. Acceptance Criteria
- [ ] AC-1: `resolveExclusiveOwnership`에 optional `predecodedMasks` 파라미터 추가
- [ ] AC-2: SAM path — Step 4에서 디코딩한 mask를 `Map<id, Uint8Array>`에 보존
- [ ] AC-3: Manual-layers path — candidates 구성 후 동일하게 캐시 추가
- [ ] AC-4: Step 6, Step 8에서 캐시 전달
- [ ] AC-5: Step 10은 캐시 미사용 (retention 이후)
- [ ] AC-6: 캐시 유무 결과 동일성 fixture 테스트

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `accepts predecodedMasks param` | Unit | 파라미터 에러 없음 | no error |
| 2 | `skips decoding when cache provided` | Unit | sharp 호출 0회 | 0 calls |
| 3 | `identical results with/without cache` | Fixture | 합성 candidates | same uniqueCoverage |
| 4 | `falls back when id missing from cache` | Unit | partial cache | self-decode |
| 5 | `buildMaskCache produces correct map` | Unit | SAM mask files → Map | correct entries |
| 6 | `manual-layers path populates cache` | Integration | extractCandidates → cache | non-empty map |

### 3.2 Test File Location
- `scripts/lib/layer-resolve.test.ts` (기존 확장 — test 1-4)
- `scripts/lib/mask-cache.test.ts` (신규 — test 5-6, 캐시 빌드 로직)

### 3.3 Mock/Setup Required
- 합성 PNG fixture 파일 + 대응 `Uint8Array` mask
- `vi.mock('sharp', ...)` 모듈 레벨 mock (`vi.spyOn(sharp.prototype)` 대신 — sharp의 체이닝 API는 prototype spy로 추적 불가)
- 또는: 실제 PNG fixture 사용 후 캐시 유무에 따른 sharp 파일 I/O 횟수 비교

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/layer-resolve.ts` | Modify | `buildExclusiveMasks` + `resolveExclusiveOwnership`에 predecodedMasks 옵션 |
| `scripts/lib/mask-cache.ts` | Create | `buildMaskCache(candidates): Map<string, Uint8Array>` — 테스트 가능한 캐시 빌더 |
| `scripts/lib/mask-cache.test.ts` | Create | 캐시 빌드 테스트 |
| `scripts/pipeline-layers.ts` | Modify | SAM + manual path에서 `buildMaskCache` 호출, Step 6/8에 전달 |

### 4.2 Implementation Steps (Green Phase)
1. 테스트 작성 (layer-resolve + mask-cache) → FAIL
2. `layer-resolve.ts` — predecodedMasks 옵션 추가 → 기존 테스트 PASS
3. `mask-cache.ts` — `buildMaskCache` 구현 → mask-cache 테스트 PASS
4. `pipeline-layers.ts` — SAM/manual path에서 캐시 구축 + Step 6/8 전달
5. 전체 테스트 → PASS

### 4.3 Refactor Phase
없음

## 5. Edge Cases
- EC-1: predecodedMasks에 없는 candidateId → fallback 자체 디코딩

## 6. Review Checklist
- [ ] Red: FAILED
- [ ] Green: PASSED
- [ ] Step 10 캐시 미사용 확인
- [ ] 기존 resolveExclusiveOwnership 테스트 전수 통과
