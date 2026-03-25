# Pipeline Status: Layered v2 — Psychedelic Color Engine Overhaul

**PRD**: docs/prd/PRD-layered-v2-psychedelic-overhaul.md
**Size**: XL
**Current Phase**: 7 (Complete)

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | scene-schema 업데이트 | M | Done | PASS | None | getValidPeriods, 새 필드 3개, duration 10 |
| T2 | layer.frag 셰이더 전면 교체 | L | Done | PASS | T1 | HSV, fract linear sweep, sat boost, lum key |
| T3 | uniform 전달 + 프리셋 교체 | M | Done | PASS | T1, T2 | 새 uniform 3개, phaseOffset [0,90,180,270] |
| T4 | duration 동적화 | M | Done | PASS | T1 | scene.json 기반 동적 duration |
| T5 | E2E 검증 + README | M | Done | PASS | T1-T4 | README 업데이트, 빌드 검증 통과 |

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
| 4     | 2     | APPROVED | 0 | 0 | 0 | 전수 리뷰 P1 5건 반영 |
| 6     | 1     | APPROVED | 0 | 0 | 12 | 5명 리뷰(code-reviewer+strategist+guardian+tester+boomer). P0 2건+P1 6건 수정 완료. 테스트 57→64 |
