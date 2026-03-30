# T6: program.md Documentation Update

**PRD Ref**: PRD-search-axis-expansion > US-5
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: T1, T2, T3, T4, T5

---

## 1. Objective

program.md Parameter Reference, Interdependencies, Strategy Guide, Constraints를 14개 새 파라미터에 맞게 업데이트.

## 2. Acceptance Criteria

- [ ] AC-1: Parameter Reference 테이블에 14개 새 파라미터 전부 추가 (range, default, description)
- [ ] AC-2: Interdependencies 섹션에 새 축 간 상호작용 기술
- [ ] AC-3: Constraints에 `satBlendLow < satBlendHigh`, `periodRangeLow < periodRangeHigh` 명시
- [ ] AC-4: Strategy Guide에 카테고리별 순차 탐색 전략 추가: "Effect 3개 50회 → Shader 5개 50회 → SceneGen 5개 50회 → 카테고리 간 조합 100회"
- [ ] AC-5: blendMode 탐색 시 bloomStrengthMul=0.3~0.5로 낮추는 가이드 포함
- [ ] AC-6: Live Knobs 섹션에 14개 추가 확인

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `program.md contains all 14 new params` | Unit | grep for each param name in program.md | 14 matches |
| 2 | `program.md constraints section exists` | Unit | grep for "satBlendLow < satBlendHigh" | match |
| 3 | `strategy guide references categories` | Unit | grep for "Effect" and "Shader" and "SceneGen" | matches |

### 3.2 Test File Location

- 별도 테스트 파일 불필요. 기존 문서 검증은 리뷰로 대체.

### 3.3 Mock/Setup Required

- 없음

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/program.md` | Modify | Parameter Reference + Interdependencies + Strategy Guide + Constraints |

### 4.2 Implementation Steps (Green Phase)

1. Parameter Reference 테이블에 14개 행 추가 (기존 형식 따름)
2. Constraints 섹션에 2개 refinement 규칙 추가
3. Interdependencies에 새 축 상호작용 추가:
   - satBlendLow/High는 짝으로 조정 (독립 sweep 시 constraint 위반 위험)
   - periodRangeLow/High 동일
   - tempoMul은 colorCycleSpeedMul과 곱셈으로 상호작용
   - glowPeriodMul은 약수 스냅으로 이산적 변화
   - blendMode 변경 시 bloomStrengthMul 동시 조정 권장
4. Strategy Guide에 카테고리별 순차 탐색 프로토콜 추가
5. Live Knobs 섹션 업데이트

### 4.3 Refactor Phase

- 없음

## 5. Edge Cases

- 없음 (문서 변경)

## 6. Review Checklist

- [ ] 14개 파라미터 전부 Parameter Reference에 존재
- [ ] Constraints 2건 명시
- [ ] Strategy Guide 카테고리별 전략 포함
- [ ] blendMode 탐색 가이드 포함
- [ ] 기존 파라미터 설명과 일관된 형식
