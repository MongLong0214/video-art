# T3: 통합 파이프라인 디스패치 + buildCandidate 확장

**PRD Ref**: PRD-grounded-sam2-pipeline > US-3
**Priority**: P1 (High)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T1, T2
**Wave**: 2

---

## 1. Objective

`decomposeImageGroundedSam2()` 오케스트레이터를 구현하고, `pipeline-layers.ts`에 모델 디스패치 분기를 추가한다. `buildSam3Candidate()`에 source/filePrefix 파라미터를 추가한다.

## 2. Acceptance Criteria

- [ ] AC-1: `pipeline-layers.ts`에서 `cliArgs.model === "grounded-sam2"` → `decomposeImageGroundedSam2()` 호출
- [ ] AC-2: `--prompts` CLI로 전달된 프롬프트를 DINO query로 직접 사용. 미제공 시 DEFAULT_PROMPTS fallback
- [ ] AC-3: per-prompt: DINO → bbox[] → per-bbox SAM2 (Promise.all, max 4 concurrent) → buildCandidate
- [ ] AC-4: `buildSam3Candidate()` 시그니처에 `source?: string`, `filePrefix?: string` 추가 (기본값 유지, backward-compatible)
- [ ] AC-5: grounded-sam2 경로에서 `source: "grounded-sam2-segment"`, `filePrefix: "gsam2"` 전달
- [ ] AC-6: 모든 후처리(hole-filling, alpha matte) 기존과 동일 적용
- [ ] AC-7: 총 SAM2 호출 수가 `maxTotalSam2Calls`(기본 12) 초과 시 잔여 bbox 건너뜀 + 경고 로그
- [ ] AC-8: decompose 시작 시 비용 예상 로그
- [ ] AC-9: 모든 SAM2 실패 시 에러 로그 + 빈 candidates + `--model sam3` 안내
- [ ] AC-10: manifest `pipelineVariant`에 `"grounded-sam2"`, `passes.type`에 `"grounded-sam2-segment"` 추가
- [ ] AC-11: `DecomposeResult` 인터페이스 호환

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `decomposeImageGroundedSam2 produces LayerCandidates` | Integration | mock DINO+SAM2 → candidates | candidates.length > 0 |
| 2 | `respects maxTotalSam2Calls cap` | Integration | mock 20 bboxes, cap=5 → 5 SAM2 calls | 5 candidates max |
| 3 | `per-prompt SAM2 calls run in parallel` | Integration | timing check: parallel < sequential | elapsed reasonable |
| 4 | `all SAM2 failures → error message with sam3 suggestion` | Integration | all SAM2 mock fail | console.error + --model sam3 |
| 5 | `buildSam3Candidate source/filePrefix override` | Unit | source="x", prefix="y" → file=y-0.png | correct file name |
| 6 | `buildSam3Candidate backward-compatible defaults` | Unit | no source/prefix → sam3-semantic, sam3- | unchanged |
| 7 | `pipeline dispatch routes to correct function` | Integration | --model grounded-sam2 → decomposeImageGroundedSam2 called | correct dispatch |
| 8 | `manifest pipelineVariant includes grounded-sam2` | Unit | type check | union includes value |
| 9 | `cost estimate logged at start` | Integration | mock → console.log check | "Estimated cost" |
| 10 | `--prompts used as DINO query` | Integration | --prompts "cat,dog" → DINO receives "cat", "dog" | correct queries |

### 3.2 Test File Location
- `scripts/lib/grounded-sam2.test.ts` (T1/T2와 공유)

### 3.3 Mock/Setup Required
- `vi.mock('replicate')`, synthetic image buffer, mock DINO+SAM2 responses

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/image-decompose.ts` | Modify | `buildSam3Candidate` source/prefix 파라미터, `decomposeImageGroundedSam2()` 신규, `DecomposeOptions` 확장 |
| `scripts/pipeline-layers.ts` | Modify | 모델 디스패치 분기 |
| `scripts/lib/decomposition-manifest.ts` | Modify | `pipelineVariant` + `passes.type` union 확장 |
| `scripts/lib/grounded-sam2.test.ts` | Modify | 통합 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `buildSam3Candidate` 시그니처 확장 (backward-compatible)
2. `DecomposeOptions`에 `boxThreshold`, `maxBboxPerPrompt`, `maxTotalSam2Calls`, `maxConcurrentSam2` 추가
3. `decomposeImageGroundedSam2()` 구현: prompts → per-prompt DINO → per-bbox SAM2 (bounded Promise.all) → buildCandidate
4. `pipeline-layers.ts` 디스패치 분기
5. `decomposition-manifest.ts` 타입 확장
6. 비용 예상 로그 + SAM2 호출 카운터 + 상한 가드

## 5. Edge Cases
- EC-1: DINO가 모든 프롬프트에 빈 bbox → 빈 candidates
- EC-2: maxTotalSam2Calls 도달 후 남은 프롬프트 건너뜀
- EC-3: 동시 SAM2 호출 중 일부 실패 → 성공한 것만 수집

## 6. Review Checklist
- [ ] Red → Green → Refactor
- [ ] AC 전부 충족
- [ ] 기존 SAM3 테스트 regression 없음
- [ ] buildSam3Candidate 기존 호출처 영향 없음
