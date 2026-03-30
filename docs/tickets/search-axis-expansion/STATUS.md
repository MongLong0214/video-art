# Pipeline Status: Search Axis Expansion

**PRD**: docs/prd/PRD-search-axis-expansion.md
**Size**: XL
**Current Phase**: 5

## Ticket Status 정의

- **Todo**: 미착수
- **In Progress**: 구현 중
- **In Review**: 리뷰 진행 중
- **Done**: 완료 (AC 충족 + 테스트 PASS)
- **Invalidated**: 역행으로 무효화됨

## Tickets

| Ticket | Title | Size | Status | Review | Phase | Depends | Notes |
|--------|-------|------|--------|--------|-------|---------|-------|
| T1 | Effect Composer Axes | M | Done | PASS | A | None | bloom radius/threshold, CA modulation |
| T2 | Shader Axes — Schema + Config | M | Done | PASS | B | T1 | 5개 셰이더 파라미터 스키마 |
| T3 | Shader Axes — Uniform Wiring | M | Done | PASS | B | T2 | layer.frag + renderer 바인딩 |
| T4 | Scene Generator Axes | M | Done | PASS | C | T1 | tempo, phase, period, glow period |
| T5 | Blend Mode Axis | M | Done | PASS | C | T1, T3 | normal/add/multiply/screen |
| T6 | program.md Update | S | Done | PASS | - | T1-T5 | 문서 업데이트 |

## Implementation Phases

| Phase | Tickets | Focus | Checkpoint |
|-------|---------|-------|------------|
| A | T1 | Effect 3개 | `npm run research:run` 1회 성공 |
| B | T2, T3 | Shader 5개 | `npm run research:run` 1회 성공 |
| C | T4, T5 | SceneGen 5개 + blendMode | `npm run research:run` 1회 성공 |
| - | T6 | Documentation | program.md 검증 |

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2 (PRD) | 1 | HAS ISSUE | 2 | 5 | 3 | v0.1→v0.2 |
| 2 (PRD) | 2 | HAS ISSUE | 1 | 2 | 1 | v0.2→v0.3 |
| 4 | - | - | - | - | - | |
| 6 | - | - | - | - | - | |
