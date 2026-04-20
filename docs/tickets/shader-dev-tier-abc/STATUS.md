# Pipeline Status: shader-dev Tier A+B+C

**PRD**: `docs/prd/PRD-shader-dev-tier-abc.md` (v0.3)
**Branch**: `experiment/shader-dev-maximal`
**Size**: XL
**Current Phase**: 7 (Complete — Phase 5 all 13 tickets Done)

## Session Plan (Independent Sessions)

Sessions 2 onwards have NO inter-dependencies (Tier B/C sketches are independent of Tier A via `IS_LAYERED` branch in main.ts).

| Session | Scope | Tickets | Dependencies |
|---------|-------|---------|--------------|
| 0 (PRD) | PRD + ticket prep | — | — |
| 1 | Infra + Tier A | T0-a, T0-b, T-A1, T-A2, T-A3 | PRD approved |
| 2 | Tier B sketches | T-B1, T-B2, T-B3 | T0-b (FBO spike) only |
| 3 | Tier C bundle | T-C1, T-C2, T-C3 | None (independent) |
| 4 | Gallery + Docs + Final Review | T-F1, T-F2, T-F3 | Sessions 1-3 done |

## Ticket Status Definitions
- **Todo**: 미착수
- **In Progress**: 구현 중
- **In Review**: 리뷰 중
- **Done**: AC 충족 + 테스트 PASS + 커밋 완료
- **Invalidated**: 역행으로 무효화

## Tickets

| Ticket | Title | Status | Size | Depends | Session | Review |
|--------|-------|--------|------|---------|---------|--------|
| T0-a | Shader compile check script + **pixel-regression stub** | Done | S | None | 1 | PASS |
| T0-b | FBO float texture spike | Done | S | None | 1 | PASS (floatErr=3.2e-8) |
| T-A1 | Multipass feedback (warp + decay) + **scene-schema: multipassFeedbackSchema** | Done | M | T0-a | 1 | PASS |
| T-A2 | Camera effects (lens/barrel/fisheye/DoF) + **scene-schema: lensDistortionSchema** | Done | M | T0-a | 1 | PASS |
| T-A3 | Post-processing chain (bloom/tone-map improvements) + **pixel-regression impl** (Tier A before/after) | Done | S | T-A1, T-A2 | 1 | PASS SSIM=1.0 |
| T-B1 | Cellular automata sketch (Gray-Scott RD) | Done | L | T0-b | 2 | PASS (visual tuning complete) |
| T-B2 | Volumetric sketch (raymarch fog) | Done | L | T0-a | 2 | PASS |
| T-B3 | Particles sketch (GPU particles flow field) | Done | L | T0-b | 2 | PASS |
| T-C1 | Fractal cave base (primitives + raymarch + normal) | Done | M | T0-a | 3 | PASS |
| T-C2 | Fractal cave lighting (Phong + shadow + AO) | Done | M | T-C1 | 3 | PASS |
| T-C3 | Fractal cave polish (sdf-tricks + CSG + morph) | Done | M | T-C2 | 3 | PASS |
| T-F1 | Gallery render update (Tier A, existing 13) | Done | S | T-A1..A3 | 4 | PASS |
| T-F2 | Gallery render sketches (Tier B/C, new 4) + **`?sketch=` URL routing** | Done | S | T-B1..B3, T-C3 | 4 | PASS |
| T-F3 | Shader-dev manual docs + final review prep | Done | S | All above | 4 | PASS |

**Total: 13 tickets** (2 infra + 3 A + 3 B + 3 C + 3 finalization)

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|----|----|
| 2 | 1 | HAS ISSUE | 2 | 4 | 1 | Boomer: composer integration, mandatory compile test, STATUS.md absent, perf, float FBO, gallery scope, fractal structure |
| 2 | 2 | PROCEED_WITH_CAUTION | 0 | 4 | 0 | PRD v0.3 spec ALL PASS. 4 new implementation-scope notes (N1-N4) absorbed into tickets: schema edits → T-A1/A2 (not separate), pixel-regression → T0-a + T-A3, gallery ?sketch= routing → T-F2. No P0s. P1s addressed by ticket scoping. **CONVERGED** |
| 4 | 1 | HAS ISSUE | 0 | 4 | 3 | Boomer: helper ownership, iteration caps, feedbackTarget lifetime, file size cap absent, Gray-Scott source, T-F2 artifact count, T-F1 time est, T-F3 AC layout |
| 4 | 2 | ALL PASS | 0 | 0 | 1 | Fixes: T0-a claims helper ownership; T0-b consumes. T-B1 adds AC-5a stability. T-A1 adds AC-5a cleanup regex + 800 LOC cap. T-A2 adds schema cap. T-F1/F2 clarifications. T-F3 P3 minor accepted. **CONVERGED** |

## Artifacts

- PRD: `docs/prd/PRD-shader-dev-tier-abc.md` (v0.3)
- Branch log: `git log --oneline experiment/shader-dev-maximal ^main`
- Tier 1 baseline: 17 commits already on branch (T1-T13 shader-dev + presets + gallery-render)

## Session Resume Protocol

1. `git log --oneline experiment/shader-dev-maximal ^main | head -5` — last 5 commits
2. Read this STATUS.md — find last "Done" ticket
3. Read PRD v0.3 sections 4 (Technical Design) + relevant US
4. Read next ticket file `docs/tickets/shader-dev-tier-abc/T{X}-*.md`
5. Resume from that ticket's Red phase
