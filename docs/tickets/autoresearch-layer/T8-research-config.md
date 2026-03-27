# T8: Research Config Schema

**PRD Ref**: PRD-autoresearch-layer > US-2, §4.2.1
**Priority**: P1
**Size**: S
**Status**: Todo
**Depends On**: None

---

## 1. Objective

모든 튜닝 파라미터를 단일 Zod-validated TypeScript 파일로 정의. multiplier 패턴 포함. 파라미터 간 제약 조건(refinements) 추가.

## 2. Acceptance Criteria

- [ ] AC-1: 28+ 파라미터 전부 Zod schema에 min/max/default 포함
- [ ] AC-2: 6개 multiplier 파라미터 (colorCycle, parallax, wave, glow, saturation, luminance)
- [ ] AC-3: `z.refine(c => c.simpleEdgeMax < c.complexEdgeMin)` 등 inter-param constraints
- [ ] AC-4: `loadConfig()` 함수가 파일 읽기 + parse + validate
- [ ] AC-5: `getDefaultConfig()` 함수가 모든 default 반환
- [ ] AC-6: parse 실패 시 ZodError with path + message

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `defaultConfig valid` | Unit | getDefaultConfig() → parse | 성공 |
| 2 | `all fields have defaults` | Unit | empty object → parse | 모든 필드 채워짐 |
| 3 | `out of range rejected` | Unit | numLayers: 99 | ZodError |
| 4 | `constraint violation` | Unit | simpleEdgeMax > complexEdgeMin | ZodError |
| 5 | `partial override` | Unit | { numLayers: 6 } → parse | numLayers=6, 나머지 default |
| 6 | `multiplier defaults 1.0` | Unit | default config → all muls | 모두 1.0 |
| 7 | `loadConfig file` | Unit | valid TS file → config | 올바른 파싱 |

### 3.2 Test File Location
- `scripts/research/research-config.test.ts`

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/research-config.ts` | Create | Zod schema + types + load/get |
| `scripts/research/research-config.test.ts` | Create | 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. ResearchConfigSchema 정의 (PRD §4.2.1 그대로)
2. `.refine()` inter-param constraints 추가
3. `getDefaultConfig()`: parse({})
4. `loadConfig(path?)`: dynamic import or JSON.parse → validate
5. `ResearchConfig` type export
