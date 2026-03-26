# Pipeline Status: Video Blueprint v3

**PRD**: docs/prd/PRD-video-blueprint-v3.md
**Size**: XL (3-PR 분할)
**Current Phase**: 7 (완료)
**Active Tickets**: 11 (all Done)

## Tickets

### PR1: 분석 파이프라인

| Ticket | Title | Size | Status | Tests |
|--------|-------|------|--------|-------|
| T1 | v3 스키마 확정 + 검증 | L | **Done** | 15 |
| T2 | extract-frames.py hi-res pairs | S | **Done** | 4 |
| T3 | analyze-colors.py CIELAB | M | **Done** | 6 |
| T4 | analyze_layers/ core | L | **Done** | 9 |
| T5 | analyze_layers/ motion | L | **Done** | 12 |
| T6 | analyze_layers/ effects | M | **Done** | 10 |

### PR2: 코드 생성

| Ticket | Title | Size | Status | Tests |
|--------|-------|------|--------|-------|
| T8 | Jinja2 셰이더 뼈대 | M | **Done** | 6 |
| T9 | generate-shader.py hybrid | L | **Done** | 6 |
| T10 | generate-sketch.py + EffectComposer | L | **Done** | 10 |

### PR3: 검증

| Ticket | Title | Size | Status | Tests |
|--------|-------|------|--------|-------|
| T12 | verify-output.py | M | **Done** | 6 |
| T13 | SKILL.md v3 통합 | M | **Done** | 7 |

## Build Verification (2026-03-26)

| Check | Result |
|-------|--------|
| `tsc --noEmit` | PASS |
| `vite build` | PASS |
| `vitest run` (TS) | 79 passed, 0 failed |
| `pytest` (Python) | 115 passed, 3 skipped |

**Total: 194 passed, 3 skipped, 0 failed**

## Review History

| Phase | Round | Verdict | Notes |
|-------|-------|---------|-------|
| 2 | 1-3 | ALL PASS | PRD v0.3 Approved |
| 4 | 1-2 | ALL PASS | 11 tickets, T1+T7/T10+T11 merged |
| 5 | cumulative | ALL PASS | 88 tests, 0 failures |
| 6 | 1 | ALL PASS (after fixes) | P0 layer/element index fix, P1 hex validation, P2 filename fix, I5 grain EffectComposer fix, SKILL.md doc sync |

## Phase 6 Fixes Applied

| Severity | File | Fix |
|----------|------|-----|
| P0 | generate-shader.py | Layer/element index mismatch — `_layer_index` tracking |
| P1 | generate-shader.py | Hex validation in `prepare_template_context` |
| P2 | generate-sketch.py | `Path.stem` for multi-dot filenames |
| I5 | generate-sketch.py | Grain-only effects no longer trigger EffectComposer |
| C1 | SKILL.md | Phase E hybrid doc updated to match actual behavior |
| Fix | scene-generator.ts | luminanceKey range + colorCycle speed |
| Fix | SKILL.md | capture-rendered.ts "not yet implemented" note removed |