# Golden recipes

Versioned starting `scene.json` templates. **New agents start only from these + create OS.**

| File | Type / texture | Notes |
|------|----------------|--------|
| `eye-mirror-phase-advect-r221.json` | figure-vivid · **fine river** | phase-edge + mix · default new figure |
| `woodblock-phase-advect-r139.json` | busy-line · **dense edge** | phase-edge + luma-hybrid · scale `phaseFlowPx` |
| `cosmos-vivid-oklch-r24b.json` | allover-vivid · **colorCycle wash** | Integer colorCycle OKLCH |
| `oil-slick-macro-bands.json` | figure/cosmos · **coarse oil bands** | vertical + luma-hybrid · low surface · multipass smear · when r221 feels samey |
| `paint-smear-multipass.json` | figure · **paint smear** | edge + detail · high multipass · directional prism |

### Texture families (pick deliberately)

| Family | Look | Prefer when |
|--------|------|-------------|
| fine river (r221) | fine psych grain + phase river | eyes, faces, classic figure-vivid |
| dense edge (r139) | edge-locked woodblock advection | line art, busy pattern figures |
| oil-slick macro | large directional oil/paint sheets | water, whale, cosmos plates, “not another r221” |
| paint smear | heavy feedback trails | abstract motion, wet-paint look |
| colorCycle cosmos | global hue wash | allover-vivid fields |

**Do not** elevate every run with the same surface~32 / edge+mix / flowField-glow stack — Isaac rejects texture monotony.

**Hold layer default (2026-09-02):** `prepare-new-source` writes the figure hold with the r346 v11 *textured* knobs (surface 27 · chroma 3 · glow 0.58/12 · `colorMotionMask.floor 1`). The hold is a second language (L5), not a frozen sticker. First defect knob if it bleaches: `sourceColorClamp.maxDrift` 0.42 → 0.26.

## Agent docs

→ **`docs/video-os/00-INDEX.md`** then `01-CREATE-OS.md` (type tree).

## Use

```bash
npx tsx scripts/prepare-new-source.ts \
  --source /path/to.png \
  --slug rNNN-name \
  --recipe recipes/golden/eye-mirror-phase-advect-r221.json \
  --work-dir out/manual-runs/rNNN-name
```

Do not edit golden files for one-offs. Prepare writes plates under `out/manual-runs/`. Scaffold-only on halo/pour/beam is a session-grade FAIL.

**Closed finals:** `sources/approved/` + `recipes/locks/` + **`docs/video-os/02-REPRO-LOCKS.md`**.
