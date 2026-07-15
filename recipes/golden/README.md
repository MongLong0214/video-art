# Golden recipes

Versioned starting `scene.json` templates. **These are the only recipes a new agent should start from.**

| File | Type | Notes |
|------|------|--------|
| `eye-mirror-phase-advect-r221.json` | figure-vivid | Isaac-approved eye-mirror path. colorCycle 0 + sourcePrism. |
| `woodblock-phase-advect-r139.json` | busy-line **+ dense-pattern-figure** | UV fixed, phase advection. Scale `phaseFlowPx` with width. Isaac-validated on hand-face r240 (2026-07-15). |
| `cosmos-vivid-oklch-r24b.json` | allover-vivid | Integer colorCycle OKLCH single layer. |

## Use

```bash
npx tsx scripts/scaffold-layered-run.ts \
  --source /path/to.png \
  --slug rNNN-name \
  --recipe recipes/golden/eye-mirror-phase-advect-r221.json \
  --work-dir out/manual-runs/rNNN-name
```

Do not edit golden files for one-off experiments. Copy via scaffold into `out/manual-runs/` and patch there.

**Closed finals** are not goldens. Use `sources/approved/` + `recipes/locks/` and follow **`docs/REPRO_LOCKS_PLAYBOOK.md`**.
