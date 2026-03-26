# Pipeline Status: Audio System v2 — B-LIVE

**PRD**: docs/prd/PRD-audio-v2-live.md
**Size**: XL
**Current Phase**: 5 (TDD Development — COMPLETE, awaiting Phase 6)

## Ticket Status 정의
- **Todo**: 미착수
- **In Progress**: 구현 중
- **In Review**: 리뷰 진행 중
- **Done**: 완료 (AC 충족 + 테스트 PASS)
- **Invalidated**: 역행으로 무효화됨

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | Phase A 호환성 + setup.sh v2 | M | Done | PASS | None | +12 tests, duration 300, 3 genres |
| T2 | SuperDirt boot + SynthDef 등록 | M | Done | PASS | T1 | +8 tests, boot.scd + 9종 등록 |
| T3 | 커스텀 FX 모듈 | M | Done | PASS | T2 | +11 tests, comp/sidechain/sat/eq |
| T4 | TidalCycles 연결 | M | Done | PASS | T1, T2 | +14 tests, BootTidal.hs + OSC |
| T5 | 라이브 오케스트레이터 | L (8-16h) | Done | PASS | T2, T3, T4 | +16 tests, live:start/stop |
| T6 | 라이브 녹음 | S | Done | PASS | T5 | +11 tests, SC s.record |

## Dependency Graph

```
T1 ─── T2 ─┬─ T3 ──┐
            │       ├── T5 ── T6
            └─ T4 ──┘
```

> T3, T4는 T2 완료 후 병렬 진행 가능. T4는 T1+T2 의존 (SuperDirt 필요)

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2     | 1     | HAS ISSUE | 2 | 5 | 1 | PRD v0.1 -> v0.2 |
| 2     | 2     | ALL PASS | 0 | 0 | 0 | PRD v0.2 approved |
| 4     | 1     | HAS ISSUE | 0 | 7 | 14 | TDD gaps, test count, SHA256 AC |
| 4     | 2     | ALL PASS | 0 | 0 | 0 | +17 tests, boomer 4/5 수용 |
| 6     | -     | - | - | - | - | Pending |
