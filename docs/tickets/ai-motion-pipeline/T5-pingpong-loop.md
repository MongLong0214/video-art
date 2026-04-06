# T5: Ping-pong 루프 생성 유틸리티

**PRD Ref**: PRD-ai-motion-pipeline > US-1 (AC-1.3 seamless loop), §4.1 Step M5
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None (코드 독립. 런타임에서 T4 출력을 입력으로 받지만, 임의 PNG 시퀀스로 독립 테스트 가능)

---

## 1. Objective

프레임 시퀀스 디렉토리를 입력받아 ping-pong (정방향 + 역방향) 루프를 생성하는 TypeScript 유틸리티. 접합점 ±3프레임 코사인 블렌딩 포함.

## 2. Acceptance Criteria

- [ ] AC-1: N프레임 입력 → 2N 프레임 출력 (마지막 프레임 = 첫 프레임으로 루프 완성). 예: 192프레임 → 384프레임
- [ ] AC-2: 출력의 첫 프레임과 마지막+1 프레임이 동일 (루프 포인트 SSIM ≥ 0.98)
- [ ] AC-3: 접합점 ±3프레임에 코사인 블렌딩 적용
- [ ] AC-4: 양 레이어 프레임 수 동기화 검증

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `creates 2N frames from N` | Unit | 5프레임 → 10프레임 | 출력 프레임 수 = 10 |
| 2 | `first frame matches loop point` | Unit | 비교 | SSIM ≥ 0.98 |
| 3 | `applies cosine blending at seam` | Unit | 접합점 프레임 검사 | 블렌딩된 픽셀값 |
| 4 | `handles minimum 4 frames` | Unit | 4프레임 입력 | 정상 동작 (8프레임 출력) |
| 5 | `errors on less than 4 frames` | Unit | 3프레임 | 에러 |

### 3.2 Test File Location

- `scripts/lib/__tests__/pingpong.test.ts`

### 3.3 Mock/Setup Required

- sharp로 테스트용 소형 이미지 생성

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/pingpong.ts` | Create | ping-pong + 코사인 블렌딩 유틸 |

### 4.2 Implementation Steps (Green Phase)

1. 프레임 디렉토리에서 PNG 목록 정렬 로드
2. 역순 프레임 목록 생성 (첫/끝 중복 제거)
3. 접합점 ±3프레임: sharp로 코사인 가중치 블렌딩 (alpha composite)
4. 결과 프레임을 출력 디렉토리에 연번 저장
5. 최종 프레임 수 반환

## 5. Edge Cases

- EC-1: 접합점 블렌딩과 hueKey 상호작용 (E14) — deltaE < 1이면 무시
- EC-2: 프레임 수 < 4 → 에러

## 6. Review Checklist

- [ ] Red/Green/Refactor 완료
- [ ] AC 전부 충족
