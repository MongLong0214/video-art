# Pipeline Status: Audio System v2 — SC/Tidal Integration

**PRD**: docs/prd/PRD-audio-v2-sc-integration.md (v0.2)
**Size**: L
**Current Phase**: 3 (Ticket Detailing)

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | genre-presets.scd + boot.scd | M | Todo | - | None | 11 tests |
| T2 | BootTidal.hs pF + helpers | S | Todo | - | None | 10 tests |
| T3 | render-stems-nrt.scd | M | Todo | - | None | 9 tests |
| T4 | render-stems.ts 풀 구현 | M | Todo | - | T3 | 10 tests |
| T5 | E2E 통합 테스트 | M | Todo | - | T1-T4 | 40 tests total |

## Dependency Graph

```
T1 (genre-presets.scd) ──┐
T2 (BootTidal.hs) ───────┤
T3 (render-stems-nrt.scd) ──→ T4 (render-stems.ts) ──→ T5 (E2E)
```

> T1, T2, T3 병렬 가능. T4는 T3 의존. T5는 전체 의존.

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2     | 1     | HAS ISSUE | 0 | 2 | 5 | fromString type, synthParams boundary |
| 2     | 2     | ALL PASS | 0 | 0 | 0 | v0.2 pS presetName, fxDefaults only |
| 4     | 1     | HAS ISSUE | 0 | 4 | 9 | getpreset TC, error exit TC, output path TC, diagram |
| 4     | 2     | ALL PASS | 0 | 0 | 0 | +4 tests, diagram fixed |
