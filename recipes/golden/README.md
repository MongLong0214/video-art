# Golden recipes

Versioned starting `scene.json` templates. **New agents start only from these + create OS.**

| File | Type | Notes |
|------|------|--------|
| `eye-mirror-phase-advect-r221.json` | figure-vivid | colorCycle 0 + sourcePrism |
| `woodblock-phase-advect-r139.json` | busy-line **+ dense-pattern-figure** | Scale `phaseFlowPx` with width |
| `cosmos-vivid-oklch-r24b.json` | allover-vivid | Integer colorCycle OKLCH |

## Agent docs

→ **`docs/video-os/00-INDEX.md`** then `01-CREATE-OS.md` (type tree).

## Use

```bash
npx tsx scripts/scaffold-layered-run.ts \
  --source /path/to.png \
  --slug rNNN-name \
  --recipe recipes/golden/eye-mirror-phase-advect-r221.json \
  --work-dir out/manual-runs/rNNN-name
```

Do not edit golden files for one-offs. Scaffold → patch under `out/manual-runs/`.

**Closed finals:** `sources/approved/` + `recipes/locks/` + **`docs/video-os/02-REPRO-LOCKS.md`**.
