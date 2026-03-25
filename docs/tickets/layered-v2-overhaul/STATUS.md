# Pipeline Status: Layered v2 — Psychedelic Color Engine Overhaul

**PRD**: docs/prd/PRD-layered-v2-psychedelic-overhaul.md
**Size**: XL
**Current Phase**: 4 (Ticket Review — APPROVED)

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | scene-schema 업데이트 | M | Todo | - | None | VALID_PERIODS 동적화 + 새 필드 |
| T2 | layer.frag 셰이더 전면 교체 | L | Todo | - | T1 | HSV, linear sweep, sat boost, lum key |
| T3 | uniform 전달 + 프리셋 교체 | M | Todo | - | T1, T2 | layered-psychedelic.ts + scene-generator.ts |
| T4 | duration 동적화 | M | Todo | - | T1 | main.ts, export-layered.ts, validate-loop.ts |
| T5 | E2E 검증 + README | M | Todo | - | T1-T4 | pipeline 실행 + RMSE + 시각 검증 |

## Dependency Graph

```
T1 (schema) ──┬──→ T2 (shader) ──→ T3 (wiring) ──→ T5 (e2e)
              └──→ T4 (duration) ────────────────→ T5 (e2e)
```

T1은 독립 착수 가능. T2, T4는 T1 완료 후 병렬 가능. T3는 T1+T2 완료 필요. T5는 전체 완료 후.

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2     | 1     | HAS ISSUE | 2 | 2 | 5 | strategist + guardian |
| 2     | 2     | APPROVED | 0 | 0 | 0 | boomer BOOMER-6, v0.3 승인 |
| 4     | 1     | HAS ISSUE | 0 | 4+4 | 5+5 | strategist + boomer, P0 2건 수정 완료 → APPROVED |
| 6     | -     | - | - | - | - | 대기 |
