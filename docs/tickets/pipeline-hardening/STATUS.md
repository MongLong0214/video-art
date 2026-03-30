# Pipeline Status: Pipeline Hardening

**PRD**: docs/prd/PRD-pipeline-hardening.md (v0.3 Approved)
**Size**: L
**Current Phase**: 5 (전 티켓 구현 완료, Phase 6 전수 리뷰 대기)

## Cross-cutting
- AC-7.4 (deterministic verification): Phase 6에서 manual layers 입력으로 full pipeline 검증
- Regression gate: 각 티켓 완료 시 vitest run → .cache/test-baseline.json 대비 net new failure = 0

## Tickets

| Ticket | Title | Size | Status | Review | Depends | Notes |
|--------|-------|------|--------|--------|---------|-------|
| T1 | Prerequisites (baseline capture) | S | Done | PASS | None | 2526 baseline tests |
| T2 | Shared Constants | S | Done | PASS | T1 | 8 constants, 6 files |
| T3 | Path Traversal Validation | M | Done | PASS | T1 | real fs tests |
| T4 | computeMaskStats Utility | S | Done | PASS | T2 | SAM path only |
| T5 | Per-candidate Mask Caching | M | Done | PASS | T2, T4 | predecodedMasks + mask-cache.ts |
| T6 | Mask Parallelization | M | Done | PASS | T5 | batch-process.ts, concurrency=4 |
| T7 | FFmpeg Dynamic Bitrate | M | Done | PASS | T1 | bitrate.ts, floor interpolation |

## Test Summary
- Baseline: 2526 tests (2511 passed, 15 skipped)
- Final: 2558 tests (2543 passed, 15 skipped)
- New tests: 32
- Net new failures: 0

## New Files Created
- `scripts/lib/pipeline-constants.ts` — 8 shared constants
- `scripts/lib/pipeline-constants.test.ts`
- `scripts/lib/mask-stats.ts` — computeMaskStats (SAM path)
- `scripts/lib/mask-stats.test.ts`
- `scripts/lib/mask-cache.ts` — buildMaskCache
- `scripts/lib/bitrate.ts` — getBitrate (resolution-based)
- `scripts/lib/bitrate.test.ts`
- `scripts/lib/batch-process.ts` — batchProcess (concurrency limiter)
- `scripts/lib/batch-process.test.ts`
- `scripts/lib/validate-file-path.test.ts`

## Modified Files
- `scripts/lib/candidate-extraction.ts` — shared constants import
- `scripts/lib/layer-resolve.ts` — shared constants + predecodedMasks
- `scripts/lib/validate-file-path.ts` — IMAGE_EXTENSIONS + TOCTOU comment
- `scripts/pipeline-layers.ts` — path validation + mask stats + caching + parallelization
- `scripts/export-layered.ts` — dynamic bitrate
- `scripts/research/research-config.ts` — Zod defaults → shared constants
- `.gitignore` — test baseline

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2 | 1 | HAS ISSUE | 0 | 3 | 6 | v0.2 수정 |
| 2 | 2 | MIXED | 0 | 0 | 0 | strategist+guardian PASS, boomer 3건 → v0.3 |
| 2 | 3 | CONVERGED | 0 | 0 | 0 | boomer 2건 → v0.3 최종 수정 |
| 4 | 1 | HAS ISSUE | 0 | 4 | 3 | boomer RECONSIDER → 티켓 수정 |
