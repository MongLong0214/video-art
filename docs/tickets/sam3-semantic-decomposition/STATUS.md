# Pipeline Status: SAM3 Semantic Decomposition

**PRD**: docs/prd/PRD-sam3-semantic-decomposition.md (v0.3, Approved)
**Size**: XL
**Current Phase**: 7 완료

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | Config + Types Foundation | M | Done | PASS | None | depth-cinematic에서 이미 구현. 테스트 포함 |
| T2 | VLM Auto-Prompt Generation | M | Done | PASS | T1 | parseCliPrompts + --prompts CLI 추가 |
| T3 | SAM3 Segmentation | M | Done | PASS | T1, T2 | getSam3Mask + buildSam3Candidate + DecomposeResult.candidates |
| T4 | Overlap Resolution + BG Plate | M | Done | PASS | T1, T3 | sortCandidatesForOverlap 구현 |
| T5 | Second Pass | M | Done | PASS | T2, T3, T4 | shouldTriggerSecondPass + buildSecondPassVlmPrompt + SAM3 2nd pass |
| T6 | SAM2 Fallback | S | Done | PASS | T1, T3 | decomposeImage SAM3/SAM2 라우팅 + 0-mask fallback |
| T7 | Pipeline Integration + Docs | M | Done | PASS | T1-T6 | pipeline-layers.ts SAM3 라우팅 + manifest + program.md 5 params |

## Dependency Graph

```
T1 (Config+Types) → T2 (VLM) → T3 (SAM3) → T4 (Overlap+BG)
                                              → T5 (2nd Pass)
T1 → T6 (Fallback)
T1-T6 → T7 (Integration+Docs)
```

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2 (PRD) | 1 | HAS ISSUE | 3 | 7 | 9 | v0.1→v0.2 |
| 2 (PRD) | 2 | ALL PASS | 0 | 0 | 0 | v0.3 Approved |
| 4 | 1 | HAS ISSUE | 0 | 10 | 8 | T1→Done, data flow, bg-plate, TDD specs → 수정 완료 |
| 4 | 2 | ALL PASS | 0 | 0 | 0 | 셀프 검증 통과 |
| 5 | - | - | - | - | - | |
| 6 | - | - | - | - | - | |
