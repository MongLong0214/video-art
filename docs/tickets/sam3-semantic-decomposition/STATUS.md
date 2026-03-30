# Pipeline Status: SAM3 Semantic Decomposition

**PRD**: docs/prd/PRD-sam3-semantic-decomposition.md (v0.3, Approved)
**Size**: XL
**Current Phase**: 3 완료 (Phase 4 티켓 리뷰 대기)

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | Config + Types Foundation | M | Todo | - | None | research-config + scene-schema + manifest types |
| T2 | VLM Auto-Prompt Generation | M | Todo | - | T1 | Qwen3-VL + sanitization + CLI |
| T3 | SAM3 Segmentation | M | Todo | - | T1, T2 | per-prompt mask + RGBA + candidate building |
| T4 | Overlap Resolution + BG Plate | M | Todo | - | T1, T3 | depth sort + resolveExclusiveOwnership + remainder |
| T5 | Second Pass | M | Todo | - | T2, T3, T4 | coverage gate + VLM re-analysis |
| T6 | SAM2 Fallback | S | Todo | - | T1, T3 | useSam3=false + SAM3 전체 실패 fallback |
| T7 | Pipeline Integration + Docs | M | Todo | - | T1-T6 | pipeline-layers.ts 통합 + manifest + program.md |

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
| 4 | - | - | - | - | - | Pending |
| 5 | - | - | - | - | - | |
| 6 | - | - | - | - | - | |
