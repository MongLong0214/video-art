# T9: Module Config Integration

**PRD Ref**: PRD-autoresearch-layer > US-2, AC-2.2
**Priority**: P1
**Size**: M
**Status**: Todo
**Depends On**: T8

---

## 1. Objective

기존 7개 모듈의 함수에 optional config 인자를 추가하여, research-config.ts 값을 주입할 수 있게 한다. config 미제공 시 기존 하드코딩 값 사용 (behavioral parity).

## 2. Acceptance Criteria

- [ ] AC-1: 7개 모듈 함수에 `config?: Partial<ResearchConfig>` 인자 추가
- [ ] AC-2: config 미제공 시 기존 하드코딩 값과 동일하게 동작
- [ ] AC-3: 기존 테스트 252개 전부 수정 없이 통과
- [ ] AC-4: config 제공 시 해당 값으로 동작 변경 확인
- [ ] AC-5: multiplier가 scene-generator preset에 곱셈 적용

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `scoreComplexity no config` | Unit | config 없이 호출 | 기존 동작 동일 |
| 2 | `scoreComplexity with config` | Unit | { simpleEdgeMax: 0.05 } | 변경된 threshold 적용 |
| 3 | `extractCandidates no config` | Unit | config 없이 | 기존 동작 |
| 4 | `extractCandidates with minCoverage` | Unit | { minCoverage: 0.01 } | 변경된 threshold |
| 5 | `deduplicateCandidates with iou` | Unit | { iouDedupeThreshold: 0.5 } | 더 적극적 dedupe |
| 6 | `generateSceneJson with multiplier` | Unit | { colorCycleSpeedMul: 1.5 } | preset speed × 1.5 |
| 7 | `existing tests still pass` | Integration | npx vitest run | 전체 PASS |

### 3.2 Test File Location
- 기존 테스트 파일에 추가 케이스 (co-located)

### 3.3 Mock/Setup Required
- 기존 테스트 mock 유지, 새 테스트만 config 인자 추가

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/complexity-scoring.ts` | Modify | optional config param |
| `scripts/lib/candidate-extraction.ts` | Modify | optional config param |
| `scripts/lib/layer-resolve.ts` | Modify | optional config param (dedupe, ownership, role, retention) |
| `scripts/lib/scene-generator.ts` | Modify | multiplier 적용 |
| `scripts/lib/image-decompose.ts` | Modify | numLayers, method 주입 |
| `scripts/lib/depth-utils.ts` | Modify | depthZones, depthSplitThreshold |
| `scripts/pipeline-layers.ts` | Modify | config 로드 + 각 함수에 전달 |

### 4.2 Implementation Steps (Green Phase)
1. 각 모듈 함수에 `config?: Partial<ResearchConfig>` 추가
2. 함수 내부: `const threshold = config?.simpleEdgeMax ?? SIMPLE_EDGE_MAX`
3. scene-generator: `preset.colorCycle.speed *= config?.colorCycleSpeedMul ?? 1.0`
4. pipeline-layers.ts: `--research-config <path>` 옵션 추가
5. 기존 테스트 실행 → 전체 PASS 확인

## 5. Edge Cases
- EC-1: config에 존재하지 않는 키 → Zod가 strip, 기존 값 사용
- EC-2: multiplier = 0 → preset 값 0 (의도적 비활성화 허용)
