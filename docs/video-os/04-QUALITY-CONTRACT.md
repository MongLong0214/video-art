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
| **New source** | First preview already has **hero motion traveling** + **no rectangle hold** + a **textured** hold (not a frozen sticker) | `npx tsx scripts/prepare-new-source.ts --source … --slug … --recipe … --work-dir … [--hero … --hero-reason …]` then `export-layered --preview` (`00` §2). Sketch-grid only after 다 별로 / 창의적으로. |

Closed rebuild is not “scaffold + full”. Custom plates are the look.

---

## 1. Laws (session-proven)

1. **`sourcePrism` is chroma, not travel.** If rings/pour/beam look static, advection along a **custom flow field** is required. Prism-only = FAIL (r325 v1–v5).
2. **Do not hold the hero.** Optical void/body/figure that covers the painted rings/pour/beam freezes it. Hold the form *around* the hero (r325, r342).
3. **No axis-aligned hold.** Never `nx < 0.82` / `ny < 0.88` boxes. Isaac sees the rectangle immediately (r325 knee, r342 sky box). Hold = silhouette / ellipses / color, then feather.
4. **No spin (R-060).** Never `phase-angular` as phase; never `rotate ≠ 0`; never kaleidoscope / polarTwist / rotateSpeed. Concentric art is **not** a reason to add angular phase. **Allowed:** custom `phase-halo` / `phase-fall` / `phase-beam` (radial distance or vertical). That is travel, not spin. “Keep golden phase only after scaffold” is **false** when §2 requires a custom field.
5. **2-layer source+hold is legal** on figure-vivid when a single layer would freeze the hero or melt the face. It is not a foreign overlay if both layers are source pixels (r323 / r325 / r342).
6. **QA PASS ≠ success (R-020).** Olive/seam guards are not “Isaac will like this.”
7. **2 misses → stop (R-013).** Do not invent a third family. Show 1–2 previews + ask.
8. **Isaac quote is law.** “v1 빼고 사각형만” means restore v1 knobs and fix only the box. “구려” on a speed-up means discard that axis.

---

## 2. Hero-motion tree (enforced — not a suggestion)

`scripts/prepare-new-source.ts` **measures** the hero (`scripts/lib/hero-detect.ts`) and writes plates. `export-layered` **refuses** unless `session-grade` passes (`scripts/lib/session-grade.ts`). There is no skip flag.

Closed rebuild (`source`+`scene` sha match `manifest.json`): only checks that every `layer.file` exists and matches the source pixel size. It does **not** re-judge Isaac-approved holds or a lock’s `rotate: 0.002`.

A zero-context agent that only scaffolds r221 and exports will get a hard FAIL on halo/pour/beam sources (r325 / r342 class). That is the product.

Name **one hero** that must travel. The detector names it in `hero.json`. If the living part you see is not what it named (r346 / r348: detector `form`, hero = eye-ring halo), disagree **only** through the flag — `prepare-new-source … --hero halo@0.50,0.20:130/630 --hero-reason "eye rings are the living part"`. `session-grade` then judges the overridden hero (it reads `hero.json`, sha-tagged to the source), so an override in a case note that never reached the flag does not exist.

If the chat image is not 1632×2912, prepare lanczos-upscales (`cover` + center crop) to `sources/incoming/<slug>.png`.

`prepare-new-source` also **composes** the scene (00 §3): form/sheet heroes get L1 travel along the scaffold flow-field, every scene gets L3 `chromaCycles 3` + L4 + L6 vection + L8 + L10 on top of the golden, and `session-grade` refuses a golden-as-is, a same-source replay of another slug’s scene, and any map without a macro language. `language-map.json` in the work-dir is what the case row’s `language-map:` line quotes. A golden-as-is preview exists only behind `isaac-pick.ts --ceiling-waive "<Isaac verbatim>"`.

Detector kinds (`hero.json`): `halo` · `pour` · `beam` · `sheet` · `form`. `sheet` must start from `oil-slick-macro-bands` or `paint-smear-multipass`, not r221.

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

- [ ] `session-grade.json` exists and `ok: true` (prepare-new-source / export enforced).
- [ ] Source is 1632×2912 (lanczos if the chat file was ~1121).
- [ ] Hero named in the case note (one sentence). `hero.json` kind matches — or `hero.json.override` records why not.
- [ ] Language map declared (`00` §3.2): every region has a language; ≥3 languages; micro does not dominate.
- [ ] For a **full**: `isaac-pick.json` exists with Isaac’s verbatim quote (`scripts/isaac-pick.ts`). No hand-edited `humanOverride`.
- [ ] Subsec `6.00 / 6.15 / 6.30` on the **hero crop** — travel is visible, not boil-in-place.
- [ ] Hold debug (if a hold layer exists): no **constant-nx vertical wall**. (Waterline / seated base may be horizontal.)
- [ ] Figure-vivid / prism scenes: `colorCycle.speed === 0`. `rotate === 0`. No `phase-angular`. Cosmos colorCycle is legal when there is no `sourcePrism`.
- [ ] Still vs source: identity not washed to cyan/magenta dayglo (R-001).
- [ ] Case ledger row appended in `01-CREATE-OS.md` §9 (PASS and FAIL).
- [ ] Preview path given. **No full. No audio.**

---

## 5. What this does *not* guarantee

Isaac may still reject the look. That is the job.

This contract + `prepare-new-source` + `export-layered` session-grade **guarantees the agent cannot ship** a frozen-hero r221, a rectangle hold, dummy-sized plates, spin, or a lock rebuild that skipped plates.

It does **not** guarantee Isaac will like the look.

Regression:

```bash
npx vitest run scripts/lib/hero-detect.test.ts scripts/lib/hold-walls.test.ts \
  scripts/lib/session-scene.test.ts scripts/lib/session-grade.test.ts \
  scripts/lib/figure-vivid-legal.test.ts scripts/export-layered.test.ts \
  scripts/lib/isaac-pick.test.ts scripts/lib/close-lock.test.ts
```

---

*Enforced 2026-08-18 from r325 (halo river / no box knee) and r342 (pour / no sky-box). Update this file when Isaac teaches a new hard rule — do not bury it only in §9 cases.*
