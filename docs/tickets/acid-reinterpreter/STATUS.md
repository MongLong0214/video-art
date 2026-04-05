# Acid Reinterpreter — Pipeline Status

**PRD**: docs/prd/PRD-acid-reinterpreter.md (v0.3, Approved)
**Phase**: 4 (Ticket Review Round 2)

| Ticket | Title | Size | Depends | Milestone | Status | Review |
|--------|-------|------|---------|-----------|--------|--------|
| T0 | PoC Validation (4 checks) | S | - | M0 | Done | PASS |
| T1 | Project Setup | S | T0 | M1 | Done | PASS |
| T2 | Stem Separation | M | T1 | M1 | Pending | - |
| T3 | Python Analyzer (3-stage drums, 5-stage bass) | L | T2 | M1 | Pending | - |
| T4 | Zod Schemas | S | T1 | M2 | Pending | - |
| T5 | LLM Interpreter | M | T4 | M2 | Pending | - |
| T5b | Normalizer + Analysis QC Gate | M | T4, T5 | M2 | Pending | - |
| T6 | 303/909 Renderer | L | T5b | M3 | Pending | - |
| T7 | Mastering | M | T6 | M3 | Pending | - |
| T8 | CLI Orchestrator | M | T2-T7 | M4 | Pending | - |
| T9 | E2E Benchmark | M | T8 | M4/M5 | Pending | - |

## Dependency Graph
```
T0 → T1 → T2 → T3 ──→ T5 → T5b → T6 → T7 → T8 → T9
           └→ T4 ──┘
```
T4 (schemas)는 T2/T3과 병렬 가능.

## Review History
- Round 1 (Phase 2): PRD v0.1 → FAIL (P0 2건) → v0.2
- Round 1 (Phase 4): 티켓 v1 → FAIL (AC-4.7/4.8 미매핑) → T5b 추가, T0/T3/T4 동기화
