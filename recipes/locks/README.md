# recipes/locks — short index

**Full procedure (agents must follow):**  
→ **[`docs/REPRO_LOCKS_PLAYBOOK.md`](../../docs/REPRO_LOCKS_PLAYBOOK.md)**

## What is here

| File | Meaning |
|------|---------|
| `<slug>.json` | Locked final `scene.json` (knobs) |
| `<slug>.gate.json` | Gate report (PASS or REJECT+Isaac override); scene sha must match lock |
| `manifest.json` | Index + sha256 + exact rebuild commands |

## Companion (git)

- `sources/approved/*.png` — original pixels for closed products  
- `recipes/golden/*` — **new source** templates only (not closed finals)

## Never put here / never commit

MP4 · WAV · `layers/` · anything under `out/`

## 30-second rebuild (detail in playbook §3)

```bash
SLUG=r242-handface-phase-river-gatepass
npx tsx scripts/scaffold-layered-run.ts \
  --source sources/approved/r242-hand-face.png \
  --slug "$SLUG" \
  --recipe "recipes/locks/${SLUG}.json" \
  --work-dir "out/manual-runs/${SLUG}"
cp "recipes/locks/${SLUG}.json" "out/manual-runs/${SLUG}/scene.json"
npx tsx scripts/export-layered.ts \
  --title "${SLUG}-final" \
  --work-dir "out/manual-runs/${SLUG}" \
  --full-res \
  --gate-report "recipes/locks/${SLUG}.gate.json"
```

After scaffold, **always** `cp` lock → `scene.json` (gate checks file sha).
