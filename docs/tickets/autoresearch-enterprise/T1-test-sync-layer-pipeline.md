# T1: 레이어 파이프라인 테스트 동기화 (complexity/layer-resolve/pipeline-cli/manifest)

**PRD Ref**: PRD-autoresearch-enterprise > US-1
**Priority**: P1 (High)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
리팩터링으로 변경된 default 값과 CLI 인터페이스에 맞게 레이어 파이프라인 관련 테스트를 동기화한다. 7개 테스트 파일, ~25개 실패 테스트 수정.

## 2. Acceptance Criteria
- [ ] AC-1: `scripts/lib/complexity-scoring.test.ts` — tier 값 6/7/8 기준 통과 (현재 3/4/6 기대)
- [ ] AC-2: `scripts/lib/complexity-scoring.comprehensive.test.ts` — 동일 tier 값 통과
- [ ] AC-3: `scripts/lib/layer-resolve.test.ts` — IoU 0.92, uniqueCoverage 0.005, maxLayers 16 기준 통과
- [ ] AC-4: `scripts/lib/layer-resolve.comprehensive.test.ts` — 동일 threshold 통과
- [ ] AC-5: `scripts/lib/pipeline-integration.test.ts` — `--variant` 제거, `--description` 추가 반영 통과
- [ ] AC-6: `scripts/lib/decomposition-manifest.comprehensive.test.ts` — variant 제거 반영 통과
- [ ] AC-7: `scripts/lib/scene-generator.test.ts` — glow 파라미터 + saturationBoost 2.5 + luminanceKey 0.6 통과
- [ ] AC-8: 수정 후 `npm run test` 실행 시 이 7개 파일 모두 PASS

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
이미 존재하는 테스트의 기대값 수정이므로 Red phase = 현재 상태 (이미 FAILED).

| # | Test File | Fail Count | Change Required |
|---|-----------|-----------|-----------------|
| 1 | complexity-scoring.test.ts | 3 | simple→6, medium→7 (was 4), complex→8 (was 6) |
| 2 | complexity-scoring.comprehensive.test.ts | 2 | layerCount=3→6, complex classification |
| 3 | layer-resolve.test.ts | 3 | IoU 0.70→0.92, uniqueCov 0.02→0.005 |
| 4 | layer-resolve.comprehensive.test.ts | 3 | IoU threshold, uniqueCov 2%→0.5%, maxLayers 8→16 |
| 5 | pipeline-integration.test.ts | 3 | --variant→--description, deprecation warning 제거 |
| 6 | decomposition-manifest.comprehensive.test.ts | 1 | zoeDepth version pin 테스트 조건 변경 |
| 7 | scene-generator.test.ts | 3+ | glow preset, saturationBoost 2.5, luminanceKey 0.6, parallax 범위 |

### 3.2 Test File Location
- `scripts/lib/complexity-scoring.test.ts`
- `scripts/lib/complexity-scoring.comprehensive.test.ts`
- `scripts/lib/layer-resolve.test.ts`
- `scripts/lib/layer-resolve.comprehensive.test.ts`
- `scripts/lib/pipeline-integration.test.ts`
- `scripts/lib/decomposition-manifest.comprehensive.test.ts`
- `scripts/lib/scene-generator.test.ts`

### 3.3 Mock/Setup Required
- 기존 mock 구조 유지 (sharp mock, fs mock 등)
- 새 threshold 값만 업데이트

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/lib/complexity-scoring.test.ts | Modify | tier 기대값 3/4/6→6/7/8 |
| scripts/lib/complexity-scoring.comprehensive.test.ts | Modify | layerCount 기대값 |
| scripts/lib/layer-resolve.test.ts | Modify | IoU/uniqueCov/maxLayers 기대값 |
| scripts/lib/layer-resolve.comprehensive.test.ts | Modify | 동일 threshold 기대값 |
| scripts/lib/pipeline-integration.test.ts | Modify | --variant→--description 관련 |
| scripts/lib/decomposition-manifest.comprehensive.test.ts | Modify | variant 관련 |
| scripts/lib/scene-generator.test.ts | Modify | preset 값 (glow, sat, lum) |

### 4.2 Implementation Steps (Green Phase)
1. complexity-scoring 2개 파일: 모든 `toBe(3)` → `toBe(6)`, `toBe(4)` → `toBe(7)`, `toBe(6)` → `toBe(8)` (tier 컨텍스트에서만)
2. layer-resolve 2개 파일: IoU `0.70` → `0.92`, uniqueCoverage `0.02` → `0.005`, maxLayers `8` → `16`
3. pipeline-integration: `--variant` 관련 테스트를 `--description`으로 변환, deprecation 테스트 제거
4. decomposition-manifest: zoeDepth production version pin 조건 업데이트
5. scene-generator: saturationBoost `2.0` → `2.5`, luminanceKey `0.5` → `0.6`, glow 관련 assertion 추가/수정, parallax 범위 조정
6. 각 파일 수정 후 해당 파일만 `npx vitest run {file}` 실행하여 PASS 확인

### 4.3 Refactor Phase
- 불필요한 중복 테스트 정리 (있을 경우)

## 5. Edge Cases
- 없음 (기대값 수정만)

## 6. Review Checklist
- [ ] Red: 현재 상태가 이미 FAILED (확인)
- [ ] Green: 수정 후 7개 파일 전부 PASSED
- [ ] Refactor: 전체 테스트 PASSED 유지
- [ ] AC 전부 충족
- [ ] 기존 통과 테스트 깨지지 않음
