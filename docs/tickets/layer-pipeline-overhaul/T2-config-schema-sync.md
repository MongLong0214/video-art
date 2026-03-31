# T2: Config 스키마 완전 동기화

**PRD Ref**: PRD-layer-pipeline-overhaul > US-5
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None
**Wave**: 1

---

## 1. Objective

ResearchConfigSchema의 Zod 스키마 정의와 getDefaultConfig()의 객체 리터럴을 완전히 일치시키고, 새 필드(morph/matte/model/provider)를 추가한다.

## 2. Acceptance Criteria

- [ ] AC-1: 스키마에 정의된 모든 필드가 getDefaultConfig에 포함
- [ ] AC-2: getDefaultConfig의 모든 값이 스키마 min/max 충족
- [ ] AC-3: 새 필드 추가: morphCloseEnabled, morphCloseKernelScale, alphaMatteEnabled, alphaMatteRadiusScale, segmentationModel, apiProvider
- [ ] AC-4: loadConfig 실패 시 에러 메시지에 누락/위반 필드 명시
- [ ] AC-5: round-trip 테스트: getDefaultConfig() → ResearchConfigSchema.parse() 성공
- [ ] AC-6: 키 완전성 테스트: 스키마 필드 목록 === getDefaultConfig 키 목록

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `getDefaultConfig round-trip through schema` | Unit | getDefaultConfig() 결과를 ResearchConfigSchema.parse()에 통과 | parse 성공, 에러 없음 |
| 2 | `schema keys match getDefaultConfig keys` | Unit | 스키마 shape 키 Set === getDefaultConfig() 키 Set | 차집합 empty |
| 3 | `new fields have correct defaults` | Unit | morphCloseEnabled=true, segmentationModel="sam3" 등 확인 | 기대값 일치 |
| 4 | `loadConfig warns on parse failure` | Unit | 의도적 invalid config → console.warn 호출 확인 | warn 1회 + fallback |

### 3.2 Test File Location
- `scripts/research/research-config.test.ts` (기존 파일에 추가)

### 3.3 Mock/Setup Required
- Vitest: `vi.spyOn(console, 'warn')` for loadConfig 에러 테스트

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/research-config.ts` | Modify | 스키마에 새 필드 추가 + getDefaultConfig 동기화 |
| `scripts/research/research-config.test.ts` | Modify | round-trip + 키 완전성 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. ResearchConfigSchema에 morphClose/alphaMatte/segmentationModel/apiProvider 필드 추가
2. getDefaultConfig()에 대응하는 기본값 추가
3. 기존 누락 필드(depthSpeedInfluence 등) 확인 및 동기화
4. loadConfig의 catch 블록에 parse error 상세 로깅 추가

## 5. Edge Cases
- EC-1: 기존 config 파일에 새 필드 없음 → Zod default로 자동 채움 (하위 호환)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
