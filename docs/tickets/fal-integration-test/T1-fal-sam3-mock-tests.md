# T1: fal.ai SAM3 Mock 통합 테스트

**PRD Ref**: PRD-fal-integration-test > US-1, US-2
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective

`getFalSam3Mask()` 의 7개 코드 경로와 provider dispatch fallback을 `globalThis.fetch` mock으로 완전 검증한다.

## 2. Acceptance Criteria

- [ ] AC-1: `mask_url` 응답 → valid Buffer 반환
- [ ] AC-2: `output.url` envelope 응답 → valid Buffer 반환
- [ ] AC-3: 두 필드 모두 없음 → null 반환
- [ ] AC-4: 비신뢰 도메인 mask URL → null 반환
- [ ] AC-5: HTTP 에러 → null 반환
- [ ] AC-6: withRetry 래핑 (1회 실패 → 재시도 성공)
- [ ] AC-7: provider=fal 시 fal 실패 → replicate fallback
- [ ] AC-8: provider=replicate 시 replicate 실패 → fal fallback

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `returns mask buffer from mask_url response` | Unit | fal POST → {mask_url} → fetch mask → Buffer | Buffer instance |
| 2 | `returns mask buffer from output.url envelope` | Unit | fal POST → {output:{url}} → fetch mask → Buffer | Buffer instance |
| 3 | `returns null when no mask URL in response` | Unit | fal POST → {other_field} | null |
| 4 | `returns null for untrusted mask domain` | Unit | fal POST → {mask_url:"https://evil.com/..."} | null |
| 5 | `returns null on HTTP error` | Unit | fal POST → HTTP 401 | null |
| 6 | `retries on transient failure then succeeds` | Unit | 1st fetch throws → 2nd succeeds → Buffer | Buffer instance |
| 7 | `FAL_KEY missing → returns null` | Unit | FAL_KEY unset → getProviderToken throws | null |
| 8 | `corrupt image → returns null` | Unit | mask download ok but sharp.metadata fails | null |
| 9 | `provider=fal: fal fails → replicate fallback` | Integration | getFalSam3Mask null → getSam3Mask called | mask from replicate |
| 10 | `provider=replicate: replicate fails → fal fallback` | Integration | getSam3Mask null → getFalSam3Mask called | mask from fal |

### 3.2 Test File Location
- `scripts/lib/fal-sam3-mask.test.ts` (신규)

### 3.3 Mock/Setup Required
- `globalThis.fetch = vi.fn()` — per-test fetch mock
- `vi.stubEnv('FAL_KEY', 'fal_test_key')` — env mock
- `sharp` synthetic 1x1 white PNG for valid mask responses
- `vi.mock('./image-decompose.js')` (부분) — fallback 테스트에서 getSam3Mask/getFalSam3Mask 개별 mock

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/fal-sam3-mask.test.ts` | Create | 10개 테스트 케이스 |

### 4.2 Implementation Steps (Green Phase)
1. 테스트 파일 생성, helper 함수 작성 (makeWhitePng, mockFetch)
2. AC-1~AC-5: `getFalSam3Mask` 직접 호출 테스트 (fetch mock)
3. AC-6~AC-8: withRetry + fallback 테스트
4. 전체 테스트 실행 확인

## 5. Edge Cases
- EC-1: fetch가 network error throw → withRetry가 재시도
- EC-2: mask_url이 빈 문자열 "" → null 반환 (maskUrl falsy check)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
