# Pipeline Status: Audio Pipeline Fix

**PRD**: docs/prd/PRD-audio-pipeline-fix.md
**Size**: L
**Current Phase**: 5 (TDD Development)

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | Python 구조 감지 에너지 기반 정규화 | M | Done | PASS | None | 7/7 pytest |
| T2 | TS detectSections() 정규화 동기화 | S | Done | PASS | None | 5/5 vitest |
| T3 | 12ch 버스 할당 + OUTPUT_CHANNELS | S | Done | PASS | None | 4/4 vitest |
| T4 | 전체 SynthDef 이벤트 스케줄링 | L | Done | PASS | T1 | 8/8 vitest |
| T5 | 에너지 게이트 및 앰프 정상화 | S | Done | PASS | T4 | 3/3 vitest |
| T6 | 6-stem 스플리터 + render-pro.ts 호환 | M | Done | PASS | T3 | render-pro + splitter |
| T7 | 마스터링 실측 EQ + 다운믹스 + LUFS | M | Done | PASS | T6 | measure_frequency_balance |

## Test Results
- Vitest: 2759 passed, 0 failed, 15 skipped (88 files)
- Pytest: 7 passed (test_structure.py)

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2     | 1     | HAS ISSUE | 2 | 3 | 5 | v0.1 |
| 2     | 2     | ALL PASS | 0 | 0 | 0 | v0.2 CONVERGED |
| 4     | 1     | HAS ISSUE | 1 | 4 | 4 | synth-only path, bass fallback |
| 4     | 2     | ALL PASS | 0 | 0 | 0 | CONVERGED |
