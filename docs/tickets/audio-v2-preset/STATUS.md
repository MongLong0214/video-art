# Pipeline Status: Audio System v2 — B-PRESET

**PRD**: docs/prd/PRD-audio-v2-preset.md (v0.4)
**Size**: XL
**Current Phase**: 4 (XL Enterprise Review — Round 2)

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | 프리셋 스키마 + JSON 5종 | M | Todo | - | None | 18 tests, Zod + SynthDef 키 검증 |
| T2 | SC + Tidal 통합 + normalizeParams | M | Todo | - | T1 | 12 tests + pF 11개 + whitelist |
| T3a | 커스텀 프리셋 CLI | S | Todo | - | T1 | 8 tests, save/list |
| T3b | NRT 프리셋 통합 | M | Todo | - | T1, T2 | 10 tests, FX merge + stems |

## Dependency Graph

```
T1 (Schema + JSON) ─┬─ T2 (SC + Tidal + normalizeParams)
                     │       │
                     ├── T3a (CLI)
                     │
                     └── T3b (NRT) ← T2
```

> T3a는 T1만 의존 — T2와 병렬 가능

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2     | 1     | HAS ISSUE | 1 | 6 | 5 | genre enum, ~dirt.set, SC security |
| 2     | 2     | ALL PASS | 0 | 0 | 0 | v0.3 반영 |
| 4     | 1 (L) | HAS ISSUE | 0 | 8 | 12 | OSC path, tests, CI skip |
| 4     | 2 (L) | ALL PASS | 0 | 0 | 0 | +10 tests |
| 4     | 3 (XL) | HAS ISSUE | 3 | 9 | 14 | normalizeParams, naming, T3 split, pF collision |
| 4     | 4 (XL) | - | - | - | - | v0.4 수정 완료 |
