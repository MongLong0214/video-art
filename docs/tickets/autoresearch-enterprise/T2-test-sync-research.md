# T2: Research 모듈 테스트 동기화 (research-config/run-once/config-integration)

**PRD Ref**: PRD-autoresearch-enterprise > US-1
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None (T1과 병렬 가능)

---

## 1. Objective
research-config default 변경과 run-once의 pipeline-runner 통합에 맞게 research 모듈 테스트를 동기화한다. 6개 테스트 파일, ~13개+ 실패 테스트 수정.

## 2. Acceptance Criteria
- [ ] AC-1: `scripts/research/research-config.test.ts` — 28개 파라미터 현재 default/range 기준 통과 (numLayers 8, maxLayers 16, IoU 0.92 등)
- [ ] AC-2: `scripts/research/run-once.comprehensive.test.ts` — pipeline-runner import 반영, multiplier assertion 통과
- [ ] AC-3: `scripts/research/config-integration.comprehensive.test.ts` — 현재 config default 반영 통과
- [ ] AC-4: 수정 후 `npm run test` 실행 시 이 6개 파일 모두 PASS

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test File | Fail Count | Change Required |
|---|-----------|-----------|-----------------|
| 1 | research-config.test.ts | 10 | numLayers 4→8, maxLayers 8→16, minRetained 3→6, depthZones 4→6, IoU 0.70→0.92, uniqueCov 0.02→0.005, method enum 업데이트 |
| 2 | run-once.comprehensive.test.ts | 3 | config default 기대값 + pipeline-runner import 반영 |
| 3 | config-integration.comprehensive.test.ts | ~1 | resolveParam/applyMultiplier default 기대값 |
| 4 | research-config.comprehensive.test.ts | TBD | default/range 기대값 동기화 |
| 5 | run-once.test.ts | TBD | pipeline-runner import 반영 |
| 6 | run-once.comprehensive2.test.ts | TBD | config default + pipeline-runner mock 반영 |

### 3.2 Test File Location
- `scripts/research/research-config.test.ts`
- `scripts/research/run-once.comprehensive.test.ts`
- `scripts/research/config-integration.comprehensive.test.ts`
- `scripts/research/research-config.comprehensive.test.ts`
- `scripts/research/run-once.test.ts`
- `scripts/research/run-once.comprehensive2.test.ts`

### 3.3 Mock/Setup Required
- `vi.mock("./pipeline-runner.js")` — run-once 테스트에서 pipeline-runner mock 필요
- 기존 fs/execFileSync mock 유지

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/research/research-config.test.ts | Modify | default 기대값 10개 항목 |
| scripts/research/run-once.comprehensive.test.ts | Modify | config default + import 경로 |
| scripts/research/config-integration.comprehensive.test.ts | Modify | default 기대값 |
| scripts/research/research-config.comprehensive.test.ts | Modify | default/range 기대값 동기화 |
| scripts/research/run-once.test.ts | Modify | pipeline-runner import 반영 |
| scripts/research/run-once.comprehensive2.test.ts | Modify | config default + pipeline-runner mock 반영 |

### 4.2 Implementation Steps (Green Phase)
1. research-config.test.ts: 모든 default 기대값을 현재 코드(`research-config.ts`)와 동기화
2. run-once.comprehensive.test.ts: `runPipeline` mock을 `runFullPipeline` mock으로 교체, config default 업데이트
3. config-integration.comprehensive.test.ts: resolveParam default 기대값 동기화
4. 각 파일 수정 후 개별 vitest run 확인

### 4.3 Refactor Phase
- 없음

## 5. Edge Cases
- run-once에서 pipeline-runner import가 깨지지 않는지 확인

## 6. Review Checklist
- [ ] Red: 현재 상태가 이미 FAILED
- [ ] Green: 3개 파일 PASSED
- [ ] Refactor: 전체 테스트 PASSED 유지
- [ ] AC 전부 충족
