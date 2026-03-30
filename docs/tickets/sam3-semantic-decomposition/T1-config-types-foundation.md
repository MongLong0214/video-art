# T1: Config + Types Foundation

**PRD Ref**: PRD-sam3-semantic-decomposition > US-7, US-8 (AC-7.1~7.6, AC-8.4~8.7)
**Priority**: P0 (Blocker)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective

research-config에 6개 SAM3/VLM axis 추가 + LayerCandidate.source/ManifestInput 타입 확장 + pipeline-layers.ts rawPassCounts 호환. 이후 모든 티켓의 기반.

## 2. Acceptance Criteria

- [ ] AC-1: research-config.ts에 6개 axis 추가 — `sam3Threshold`(0.1-0.9, d=0.25), `vlmMaxPrompts`(3-10, d=6), `secondPassEnabled`(boolean, d=true), `secondPassThreshold`(0.5-0.95, d=0.8), `useSam3`(boolean, d=true)
- [ ] AC-2: getDefaultConfig()에 5개 기본값 추가
- [ ] AC-3: scene-schema.ts `LayerCandidate.source` 타입을 `"sam2-segment" | "sam3-semantic"` 유니온으로 확장
- [ ] AC-4: decomposition-manifest.ts `ManifestInput.pipelineVariant` 타입을 `"sam2" | "sam3"` 유니온으로 확장
- [ ] AC-5: pipeline-layers.ts `rawPassCounts` 로직이 `"sam3-semantic"` source 카운트 지원
- [ ] AC-6: layer-resolve.ts fallback bg-plate source를 파라미터로 받도록 변경 (hard-coded "sam2-segment" 제거)
- [ ] AC-7: 기존 테스트 전부 통과

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `ResearchConfigSchema accepts sam3Threshold valid` | Unit | `{ sam3Threshold: 0.5 }` parse | PASS, value 0.5 |
| 2 | `ResearchConfigSchema rejects sam3Threshold > 0.9` | Unit | `{ sam3Threshold: 1.0 }` | FAIL |
| 3 | `ResearchConfigSchema defaults useSam3 to true` | Unit | empty parse | useSam3 === true |
| 4 | `ResearchConfigSchema defaults vlmMaxPrompts to 6` | Unit | empty parse | vlmMaxPrompts === 6 |
| 5 | `ResearchConfigSchema defaults secondPassEnabled to true` | Unit | empty parse | secondPassEnabled === true |
| 6 | `ResearchConfigSchema defaults secondPassThreshold to 0.8` | Unit | empty parse | secondPassThreshold === 0.8 |
| 7 | `getDefaultConfig includes SAM3 axes` | Unit | getDefaultConfig() | all 5 present |
| 8 | `ResearchConfigSchema rejects vlmMaxPrompts > 10` | Unit | `{ vlmMaxPrompts: 11 }` | FAIL |
| 9 | `ResearchConfigSchema rejects secondPassThreshold > 0.95` | Unit | `{ secondPassThreshold: 1.0 }` | FAIL |
| 10 | `ResearchConfigSchema accepts useSam3=false` | Unit | `{ useSam3: false }` parse | PASS, value false |
| 11 | `LayerCandidate accepts source sam3-semantic` | Unit | type check | compiles |
| 12 | `existing tests unchanged` | Regression | full suite | PASS |

### 3.2 Test File Location

- `scripts/research/research-config.test.ts` (append)
- `src/lib/scene-schema.test.ts` (append — type test)

### 3.3 Mock/Setup Required

- Vitest: direct Zod schema imports. No mocking needed.

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/research-config.ts` | Modify | 5 new axes in schema + getDefaultConfig |
| `src/lib/scene-schema.ts` | Modify | LayerCandidate.source union |
| `scripts/lib/decomposition-manifest.ts` | Modify | ManifestInput.pipelineVariant union |
| `scripts/pipeline-layers.ts` | Modify | rawPassCounts sam3-semantic support |
| `scripts/lib/layer-resolve.ts` | Modify | bg-plate source parameterization |
| `scripts/research/research-config.test.ts` | Modify | append tests |

### 4.2 Implementation Steps (Green Phase)

1. research-config.ts — 5 axes 추가 (blendMode 뒤)
2. getDefaultConfig() — 5 defaults 추가
3. scene-schema.ts — `source: "sam2-segment"` → `source: "sam2-segment" | "sam3-semantic"`
4. decomposition-manifest.ts — pipelineVariant type 확장
5. pipeline-layers.ts — rawPassCounts에 "sam3-semantic" 키 추가
6. layer-resolve.ts — applyRetentionRules의 fallback bg-plate source를 함수 파라미터로 받기

## 5. Edge Cases

- EC-1: 기존 scene.json에 source: "sam2-segment"만 있는 경우 → 유니온 타입이므로 하위 호환
- EC-2: useSam3=false에서 sam3 관련 config가 무시되는지 확인 (T7에서 검증)

## 6. Review Checklist

- [ ] Red → Green → Refactor
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
