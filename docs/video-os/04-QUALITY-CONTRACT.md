> **Canonical path:** `docs/video-os/04-QUALITY-CONTRACT.md`. **Start page:** `00-INDEX.md`.
>
> **SSOT for:** what the agent must do so Isaac can judge (hero travel, no box, no spin, lock plates).
> **Not SSOT for:** classify/gate/cases (`01`) · rebuild/lock (`02`) · reel cuts (`03`).
> If 04 and 01 disagree on *pre-Isaac execution* → **04**. If they disagree on *look law* → **01**.

# Quality contract — zero-context agent = session-grade execution

If you skip this file, you will ship a golden-r221 preview and call it done. That is **not** this product.

**Isaac judges look. You are responsible for not shipping a dead, boxed, spinning, or frozen-hero loop.**

---

## 0. Two jobs (do not mix)

| Job | Goal | Command of record |
|-----|------|-------------------|
| **Rebuild closed** | Byte-same knobs + custom plates as the lock | `npx tsx scripts/rebuild-closed-lock.ts --slug <slug>` then `--full` only if asked |
| **New source** | First preview already has **hero motion traveling** + **no rectangle hold** | `01` classify → hero tree (§2) → preview → stills → this file §4 check → Isaac |

Closed rebuild is not “scaffold + full”. Custom plates are the look.

---

## 1. Laws (session-proven)

1. **`sourcePrism` is chroma, not travel.** If rings/pour/beam look static, advection along a **custom flow field** is required. Prism-only = FAIL (r325 v1–v5).
2. **Do not hold the hero.** Optical void/body/figure that covers the painted rings/pour/beam freezes it. Hold the form *around* the hero (r325, r342).
3. **No axis-aligned hold.** Never `nx < 0.82` / `ny < 0.88` boxes. Isaac sees the rectangle immediately (r325 knee, r342 sky box). Hold = silhouette / ellipses / color, then feather.
4. **No spin (R-060).** Never `phase-angular` as phase; never `rotate ≠ 0`; never kaleidoscope / polarTwist. Concentric art is **not** a reason to add angular phase. **Allowed:** custom `phase-halo` / `phase-fall` (radial distance or vertical). That is travel, not spin. “Keep golden phase only after scaffold” is **false** when §2 requires a custom field.
5. **2-layer source+hold is legal** on figure-vivid when a single layer would freeze the hero or melt the face. It is not a foreign overlay if both layers are source pixels (r323 / r325 / r342).
6. **QA PASS ≠ success (R-020).** Olive/seam guards are not “Isaac will like this.”
7. **2 misses → stop (R-013).** Do not invent a third family. Show 1–2 previews + ask.
8. **Isaac quote is law.** “v1 빼고 사각형만” means restore v1 knobs and fix only the box. “구려” on a speed-up means discard that axis.

---

## 2. Hero-motion tree (new source — mandatory before first preview)

Look at the PNG. Name **one hero** that must travel. Then pick the field.

Do this **after** type→golden scaffold and **before the first export you will show Isaac**. A first *internal* scaffold smoke preview is optional; **do not** send Isaac a frozen-hero r221.

If the chat image is not 1632×2912, lanczos to 1632×2912 first (`sources/incoming/rNNN-….png`).

| If the picture’s living part is… | Do | Do not |
|----------------------------------|----|--------|
| Concentric rings / halo / mandala behind a figure | Custom halo-centered `flow-*.png` + `phase-*.png` (center on the **rings**, not the belly). Real `sourceFlowAdvection` + `fieldAlign` ≈ 1. Alternate in/out bands if a single radial reads as “light only goes up” (r325 v7 reject → v8). | Hold the rings. Use stock `phase-radial` on the body. Add `phase-angular`. |
| Waterfall / pour / tear / cascade | Downward flow (`dy > 0`), `forwardBias` ≥ 0.4, `fieldAlign` 1. Water below = lateral current, not the same down vector. | Hold the pour. Shuttle (`forwardBias` 0) so it sloshes up. |
| Beam / spray from an eye or nexus | Flow radiating from the measured pupil/nexus. Hold the body, not the spray (r341). | GodRays as the only motion. |
| Oil / water / allover paint sheets | Consider `oil-slick-macro-bands` or `paint-smear-multipass` golden — not another r221 river (texture monotony). | Copy r221 surface~32 on every source. |
| Face / deity / ushnisha **form** | Source-pixel hold that follows the silhouette. Soft falloff. | `nx/ny` rectangle. Hold the sky to “complete” the box. |

Measure the hero center from the PNG (don’t reuse a previous source’s `cx,cy`).

---

## 3. Closed rebuild (other PC)

**Do not improvise. Do not skip plates.**

```bash
npx tsx scripts/rebuild-closed-lock.ts --slug <manifest slug>
# after Isaac asks 풀렌더:
npx tsx scripts/rebuild-closed-lock.ts --slug <manifest slug> --full
```

The script: verify shas → scaffold → **run `manifest.plates` if present** → `cp lock → scene.json` → verify scene sha + gate permit.

If you only `scaffold` + `cp lock` + full on r325/r342, the halo/pour plates are missing and the product is wrong even if knobs match.

---

## 4. Pre-Isaac checklist (every preview)

Refuse to present if any box is unchecked.

- [ ] Source is 1632×2912 (lanczos if the chat file was ~1121).
- [ ] Hero named in the case note (one sentence).
- [ ] Subsec `6.00 / 6.15 / 6.30` on the **hero crop** — travel is visible, not boil-in-place.
- [ ] Hold debug (if a hold layer exists): no vertical/horizontal wall at a constant `nx`/`ny`. Steepest alpha drop **moves** across rows.
- [ ] `colorCycle.speed === 0` on figure-vivid. `rotate === 0`. No `phase-angular` as phase. (`scripts/lib/figure-vivid-legal.ts` if figure-vivid.)
- [ ] Still vs source: identity not washed to cyan/magenta dayglo (R-001).
- [ ] Case ledger row appended in `01-CREATE-OS.md` §9 (PASS and FAIL).
- [ ] Preview path given. **No full. No audio.**

---

## 5. What this does *not* guarantee

Isaac may still reject the look. That is the job.

This contract guarantees the agent will not: freeze the hero, draw a rectangle, add spin, skip custom plates on a lock, or treat QA PASS as success.

---

*Extracted 2026-08-18 from r325 (halo river / no box knee) and r342 (pour / no sky-box). Update this file when Isaac teaches a new hard rule — do not bury it only in §9 cases.*
