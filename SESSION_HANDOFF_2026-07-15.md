# Video Art Session Handoff — 2026-07-15 (CLOSED)

## Status

**Closed for eye-mirror final delivery + closed-loop fixes.**  
Do not re-open r221 tuning without new Isaac defect feedback.

### Final artifacts

| Kind | Path |
|------|------|
| Silent final | `out/layered/2026-07-15_r221-eye-mirror-phase-advect-peak-final-ab325ea9/r221-eye-mirror-phase-advect-peak-final.mp4` |
| With audio | `.../r221-eye-mirror-phase-advect-peak-final-with-getting-that-feeling.mp4` |
| Audio source | `/Users/isaac/Downloads/Jared Wilson - Getting That Feeling.wav` (from 0s, 20s, AAC 48kHz stereo) |
| Spec | 1632×2912, 30fps, 20s, 600 frames, H.264 ~37Mbps |

### Operating knowledge base

`OUTPUT_GAP_ANALYSIS.md` — enterprise refactor (2026-07-15). Start every session there (§0).

---

## Closed-loop defects — FIXED

| ID | Defect | Fix |
|----|--------|-----|
| H80 | Binary capacity ≠ shader affinity authority | `analyzeSourceRegionCapacity` uses `affinityActiveCoverage` / `affinityConnectedCoverage` for `canCarryConnectedTransport` |
| r209 reselect | Planner re-offered region-affinity after failure | `region-affinity-permission-failure` family + diagnostic `region-affinity-permission-audit` only |
| Preview without audit | Authority collapse still rendered | `export-layered --preview` requires `--authority-report` when `sourceRegionAffinity.amount>0` |

### Commands

```bash
npm run audit:region-affinity -- --source <png> --scene <scene.json> --work-dir <dir> --output <audit.json>
npx tsx scripts/export-layered.ts --work-dir <dir> --preview --authority-report <audit.json>
npm run plan:psychedelic -- --source <png> --report <gate.json>
npm run gate:psychedelic -- --candidate <mp4> --source <png> --reference <r1> --reference <r2> --work-dir <dir> --axis <a> --primitive <p>
```

### Tests

```bash
npx vitest run scripts/lib/source-region-capacity.test.ts \
  scripts/lib/psychedelic-learning.test.ts \
  scripts/lib/region-affinity-authority-audit.test.ts \
  scripts/lib/psychedelic-final-guard.test.ts \
  scripts/export-layered.test.ts
```

---

## Do not

- Retune r221 without new defect feedback  
- Re-render r209 with amount/cycles  
- Audio without fresh Isaac request  
- Full render without gate PASS or Isaac `humanOverride` + matching scene SHA  

## Next open work (from OUTPUT_GAP_ANALYSIS §7)

1. sourcePrism 이질 busy 소스 1종 검증  
2. cosmos-B 블랙홀 in-place 국소 수정  
3. lightMotion 캘리브레이션  
4. colorCycleDesync 단독 A/B  
