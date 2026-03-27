# Pipeline Status: Layer Decomposition Overhaul

**PRD**: docs/prd/PRD-layer-decomposition-overhaul.md (v1.3)
**Size**: XL
**Current Phase**: 7 (Complete)

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Rollout Phase |
|--------|-------|------|--------|--------|---------|---------------|
| T1 | Schema + Types | S | Done | PASS | None | 1 |
| T2 | Complexity Scoring | S | Done | PASS | None | 1 |
| T3 | Candidate Extraction + CCA | M | Done | PASS | T1 | 1 |
| T4 | Dedupe + Exclusive Ownership | M | Done | PASS | T3 | 1 |
| T5 | Role Assignment + Background Plate | M | Done | PASS | T4 | 1 |
| T6 | Provenance Manifest | S | Done | PASS | T1 | 1 |
| T7 | Pipeline Integration Variant A | L | Done | PASS | T2,T3,T4,T5,T6 | 1 |
| T8 | Scene Generator Role Preset | M | Done | PASS | T5 | 1 |
| T9 | Selective Recursive Qwen | M | Done | PASS | T7 | 2 |
| T10 | Variant B ZoeDepth | M | Done | PASS | T7,T9 | 2 |
| T11 | E2E Validation + A/B Comparison | M | Done | PASS | T7,T10 | 3 |

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2 | 1 | HAS ISSUE | 0 | 10 | 10 | PRD v1.1→v1.2 |
| 2 | 2 | APPROVED | 0 | 0 | 0 | PRD v1.2→v1.3 (boomer P1 2건 수정) |
| 4 | 1 | HAS ISSUE | 1 | 9 | 5 | T4/T5 role순서(P0), T7 AC추가(P1×5), T10/T9/T3/T6 수정 |
| 6 | 1 | HAS ISSUE | 1 | 3 | 1 | pipeline-layers.ts 미연결(P0), image-decompose 보안(P1), depth alpha(P3) |
| 6 | fix | PASS | 0 | 0 | 0 | T12-fix: pipeline 전면 재작성, 보안 강화, alpha 통일 |
