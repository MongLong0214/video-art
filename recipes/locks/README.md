# recipes/locks — short index

**Full procedure:** → **[`docs/video-os/02-REPRO-LOCKS.md`](../../docs/video-os/02-REPRO-LOCKS.md)**  
**Entry:** [`docs/video-os/00-INDEX.md`](../../docs/video-os/00-INDEX.md)

## What is here

| File | Meaning |
|------|---------|
| `<slug>.json` | Locked final `scene.json` |
| `<slug>.gate.json` | Gate report (PASS or REJECT+Isaac override) |
| `manifest.json` | Index + sha256 + rebuild commands |

## Companion (git)

- `sources/approved/*.png`  
- `recipes/golden/*` — new source only  

## Never commit

MP4 · WAV · `layers/` · `out/`

## 30-second rebuild

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

After scaffold, **always** `cp` lock → `scene.json`.
