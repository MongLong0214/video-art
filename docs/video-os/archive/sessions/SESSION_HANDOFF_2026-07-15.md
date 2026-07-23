# Session handoff — 2026-07-15 CLOSED

## Start here on any machine

1. `AGENTS.md`  
2. `OUTPUT_GAP_ANALYSIS.md` (full OS)  
3. `recipes/golden/*`  

## Closed deliverable

| Item | Path |
|------|------|
| Silent final | `out/layered/2026-07-15_r221-eye-mirror-phase-advect-peak-final-ab325ea9/r221-eye-mirror-phase-advect-peak-final.mp4` |
| Audio final | `.../r221-eye-mirror-phase-advect-peak-final-with-getting-that-feeling.mp4` |
| Golden recipe | `recipes/golden/eye-mirror-phase-advect-r221.json` |
| Spec | 1632×2912 · 30fps · 20s · H.264 · audio AAC from Getting That Feeling @0s |

**Do not retune r221** without new Isaac defect feedback.

## Closed-loop systems (shipped)

| System | Entry |
|--------|--------|
| Scaffold | `npm run scaffold:layered` / `scripts/scaffold-layered-run.ts` |
| Capacity = affinity field | `scripts/lib/source-region-capacity.ts` |
| Affinity audit blocks bad preview | `npm run audit:region-affinity` + export `--authority-report` |
| Planner blocks failed families | `npm run plan:psychedelic` |
| Candidate gate | `npm run gate:psychedelic` |
| Full render guard | `--gate-report` PASS or Isaac `humanOverride` |

## Open queue

See `OUTPUT_GAP_ANALYSIS.md` §10.

## Git note

`out/` is gitignored. After clone, re-render from golden recipes; do not expect archive MP4s in git.
