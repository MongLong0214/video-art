# T7: Pipeline Integration + Manifest + Docs

**PRD Ref**: PRD-sam3-semantic-decomposition > US-8 (AC-8.1~8.3), G7
**Priority**: P2 (Medium)
**Size**: M (2-3h)
**Status**: Todo
**Depends On**: T1-T6

---

## 1. Objective

pipeline-layers.ts에서 SAM3 경로 통합 + manifest 모델 정보 + program.md 문서화. SAM3 경로에서 BFS candidate-extraction 우회 + scoreComplexity 스킵.

## 2. Acceptance Criteria

- [ ] AC-1: pipeline-layers.ts에서 useSam3=true 시 scoreComplexity() 스킵
- [ ] AC-2: SAM3 경로: decomposeImage() → candidates (BFS 우회, buildSam3Candidate 사용)
- [ ] AC-3: SAM3 candidates → 기존 deduplicateCandidates → resolveExclusiveOwnership → assignRoles → orderByRole → applyRetentionRules 흐름 유지
- [ ] AC-4: manifest.models에 qwen3vl + sam3 정보 추가
- [ ] AC-5: manifest.passes에 vlmPrompts 기록
- [ ] AC-6: manifest.pipelineVariant = "sam3" (SAM3 경로)
- [ ] AC-7: program.md에 6개 SAM3 config 파라미터 문서화
- [ ] AC-8: 기존 SAM2 파이프라인 경로 동작 유지 (useSam3=false)

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `program.md contains sam3Threshold` | Unit | file content grep | found |
| 2 | `program.md contains vlmMaxPrompts` | Unit | grep | found |
| 3 | `program.md contains useSam3` | Unit | grep | found |
| 4 | `manifest includes sam3 model info` | Integration | mock pipeline run | models.sam3 present |
| 5 | `manifest includes vlmPrompts` | Integration | mock pipeline run | passes includes prompts |
| 6 | `useSam3=true skips scoreComplexity` | Integration | spy on scoreComplexity | not called |
| 7 | `SAM3 candidates flow through existing layer-resolve` | Integration | mock SAM3 → assignRoles → orderByRole | roles assigned correctly |
| 8 | `useSam3=false preserves SAM2 path` | Integration | config override | SAM2 extractCandidates called |

### Test File Location
- `scripts/research/program.test.ts` (append)
- `scripts/lib/decomposition-manifest.test.ts` (append)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/pipeline-layers.ts` | Modify | SAM3 분기 + scoreComplexity 스킵 + manifest 연동 |
| `scripts/lib/decomposition-manifest.ts` | Modify | ManifestInput에 sam3/vlm 모델 정보 필드 추가 |
| `scripts/research/program.md` | Modify | 6 new params 문서화 |
| `scripts/research/program.test.ts` | Modify | 문서 검증 테스트 |

### 4.2 Implementation Steps

1. pipeline-layers.ts Step 2 (line ~155): `if (useSam3)` 분기 → scoreComplexity() 스킵, selectedLayerCount 미사용
2. pipeline-layers.ts Step 3 (line ~180): `decomposeImage()` 호출 후 → SAM3 경로면 extractCandidates() 스킵, result.fileMeta에서 직접 candidates 조립
3. pipeline-layers.ts Step 13 (line ~390): manifest에 pipelineVariant + vlmPrompts 전달
3. ManifestInput 타입에 vlmPrompts?, sam3Model? 추가
4. program.md Parameter Reference에 6개 추가 + Interdependencies + Strategy Guide

## 5. Edge Cases

- EC-1: SAM3 → SAM2 fallback 발동 시 manifest에 두 모델 모두 기록

## 6. Review Checklist

- [ ] Red → Green → Refactor
- [ ] 기존 SAM2 경로 깨지지 않음
- [ ] program.md 포맷 일관성
