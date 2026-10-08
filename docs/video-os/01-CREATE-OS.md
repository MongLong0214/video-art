> **Canonical path:** `docs/video-os/01-CREATE-OS.md`. **Start page:** `00-INDEX.md`.
>
> **SSOT for:** classify, create runbook, gate, killed axes, case ledger.
> **Not SSOT for:** start-page / job routing (`00`) · pre-Isaac execution bar (`04`) · rebuild/lock (`02`).
> If 01 and 04 disagree on what to do *before showing Isaac* → **04**.
> If 01 and 02 disagree on rebuild → **02**.
> If 01 and archive/legacy disagree on look → **01**.

# Create OS — classify, runbook, gate, cases

> **2026-09-02 (OS v2):** the operating law — loop, preview budget, ceiling contract, Isaac quote → axis — lives in **`00-INDEX.md`**. This file keeps the **type tree (§3)**, **killed axes (§5)**, command detail (§2/§4/§6/§7), and the **ledger (§9, append-only)**. Where §0–§8 prose and `00` disagree, `00` wins. Do not add R-numbers (frozen at R-064); add a `00` §4 row, a test, or a §9 case instead.

---

## 0. Non-negotiables (violate = wrong product)

1. **GLSL only.** No Kling/Runway/Seedance/img2video.
2. **In-place source motion only (R-038).** Never: fixed original + overlay, optical liquid layers, foreign textures, generated noise as motion.
3. **Animate, don't repaint (R-001).** Finished-vivid art: destroy source color identity → FAIL.
4. **Guard PASS ≠ success (R-020).** Success = source-more-beautiful (R-002) + “3s stare = hallucinate”.
5. **Preview first.** Full render only after Isaac visual OK (or explicit “풀렌더”).
6. **No audio** until Isaac explicitly requests a track (R-043).
7. **Record every render** in §9 case ledger (PASS and FAIL).
8. **2 misses → stop (R-013).** No third blind render. Budget per source: one `--preview` first, then **≤3** previews total; sketch-grid only after 다 별로 / 창의적으로 (`00` §2).
9. **No rotation / spin / angular phase (R-060).** Never `phase-angular.png` as phaseField/phaseField2; never multipass `rotate≠0`; never kaleidoscope / polarTwist / rotateSpeed. Do **not** add geometric spin to “match” a spiral/Ganesha/mandala (Isaac: 극도로 구림). **Custom `phase-halo` / `phase-fall` (distance or vertical) is required when 04 §2 says so** — that is not spin. Do not stay on golden `phase-edge`+`mix` if it freezes the hero.

**Roles:** implementation may use any coding agent · orchestration agent records cases · **Isaac = final aesthetic judge**.  
**Zero-context execution bar (mandatory):** `docs/video-os/04-QUALITY-CONTRACT.md` — hero motion, no rectangle hold, closed-lock plates.

---

## 1. Fixed products & paths

| Item | Value |
|------|--------|
| Duration | **20** seconds |
| FPS final | **30** |
| FPS preview | **15** (export `--preview`) |
| Aspect | 9:16 (typical 1632×2912) |
| Codec final | H.264 yuv420p |
| Work dir | `out/manual-runs/<slug>/` (local; scaffold here) |
| **Approved sources (git)** | `sources/approved/*.png` |
| **Approved locks (git)** | `recipes/locks/<slug>.json` + `<slug>.gate.json` — **`rebuild-closed-lock.ts` (plates + cp lock)** |
| Repro index | `recipes/locks/manifest.json` |
| **Repro playbook (agents)** | `docs/video-os/02-REPRO-LOCKS.md` · close with `scripts/close-lock.ts` (default after full) |
| Archive | `out/layered/<date>_<slug>_<hash>/` (**not** in git) |
| Golden recipes | `recipes/golden/*.json` (new-source start templates) |
| Ops KB | this file |
| Closed handoff | `SESSION_HANDOFF_2026-07-15.md` |

### Approved finals (do not re-tune without new defect)

| Source | Slug | Silent MP4 | Audio mux |
|--------|------|------------|-----------|
| eye-mirror | r221 | git: `sources/approved/r221-eye-mirror.png` + `recipes/locks/r221-eye-mirror-phase-advect-peak.{json,gate.json}` | Getting That Feeling (WAV local) |
| woodblock | r139 | lock pack TODO | Shaman Trance |
| mushroom-hand | r65 | lock pack TODO | Ancient Aum |
| hand-face | **r242** | git: `sources/approved/r242-hand-face.png` + `recipes/locks/r242-handface-phase-river-gatepass.{json,gate.json}` | Eating Glue (WAV local) |
| dual-abstract A (silhouettes + third-eye beam) | **r274** | git: `sources/approved/r274-dual-abstract-beam.png` + `recipes/locks/r274-dual-abstract-a-beam-focus.{json,gate.json}` · local final `out/layered/2026-07-16_r274-…-54cff7f8/…-final.mp4` | **Astrix — Sapana @2:58** (`…-with-sapana.mp4`) |
| Ganesha rainbow-rings | **r325 v8b** | git: `sources/approved/r325-ganesha-rainbow-rings.png` + `recipes/locks/r325-ganesha-rainbow-rings-master.{json,gate.json}` · plates `scripts/locks/r325-build-*.mjs` · local final `out/layered/2026-08-13_r325-…-v8b-knee-final-f3bfc5a4/…-final.mp4` | **Mama India @6:27** |
| cosmic Buddha eye-fall | **r342 v1c** | git: `sources/approved/r342-cosmic-buddha-eye-fall.png` + `recipes/locks/r342-cosmic-buddha-eye-fall.{json,gate.json}` · plates `scripts/locks/r342-build-*.mjs` · local final `out/layered/2026-08-18_r342-…-v1c-nobox-final-22fa7aba/…-final.mp4` | **Shaman Trance @0:00** |
| mushroom-cap Ganesha oil | **r343 r221 v1** | local MP4 · lock pack TODO (`close-lock.ts` next touch) · `out/layered/2026-08-26_r343-mushroom-ganesha-r221-final-d6d0cbf5/…-final.mp4` | **Ancient Aum @0:00** |
| engraved multi-eye swan | **r344 v3** | local MP4 · lock pack TODO · `out/layered/2026-08-27_r344-engraved-swan-eyes-final-1a283714/…-final.mp4` | **All Around Us @2:25** |
| skeleton-baby halo | **r345 v1** | local MP4 · lock pack TODO · `out/layered/2026-08-28_r345-skeleton-baby-halo-final-7c74fd4d/…-final.mp4` | **Salaam @0:00** |
| eye-mandala-sitter | **r346 v11** | local MP4 · lock pack TODO · `out/layered/2026-09-02_r346-eye-mandala-sitter-final-40c26252/…-final.mp4` | **Adhana @5:06** |
| mushroom-man-stems | **r353 v4** | git: `sources/approved/r353-mushroom-man-stems.png` + `recipes/locks/r353-mushroom-man-stems.{json,gate.json}` · plates `scripts/locks/r353-build-*.mjs` · local final `out/layered/2026-09-09_r353-mushroom-man-stems-final-b66d9d62/r353-mushroom-man-stems-final.mp4` · **+audio** `…-final-with-bebopper.mp4` | **Bebopper @1:50** |
| tree-sun-drip-face | **r357 v2** | git: `sources/approved/r357-tree-sun-drip-face.png` + `recipes/locks/r357-tree-sun-drip-face.{json,gate.json}` · plates `scripts/locks/r357-build-drip-plates.mjs` · local final `out/layered/2026-09-11_r357-tree-sun-drip-face-final-69851b8f/r357-tree-sun-drip-face-final.mp4` · **+audio** `…-final-with-lightyears.mp4` | **Lightyears @0:00** |
| buddha-rain-glitch | **r358 v5** | git: `sources/approved/r358-buddha-rain-glitch.png` + `recipes/locks/r358-buddha-rain-glitch.{json,gate.json}` · plates `scripts/locks/r358-build-rain-plates.mjs` · local final `out/layered/2026-09-16_r358-buddha-rain-glitch-final-cebf8a01/r358-buddha-rain-glitch-final.mp4` | silent (no track named) |
| dot-hand-mushrooms | **r362** | git: `sources/approved/r362-dot-hand-mushrooms.png` + `recipes/locks/r362-dot-hand-mushrooms.{json,gate.json}` · plates `scripts/locks/r362-build-beam-plates.mjs` · local final `out/layered/2026-09-16_r362-dot-hand-mushrooms-final-70ed5825/r362-dot-hand-mushrooms-final.mp4` · **+audio** `…-final-with-valley-of-stevie.mp4` | **Valley of Stevie @0:13** (mux **-ss 13.5**) |
| cap-head-city | **r367** | git: `sources/approved/r367-cap-head-city.png` + `recipes/locks/r367-cap-head-city.{json,gate.json}` · plates `scripts/locks/r367-build-beam-plates.mjs` · local final `out/layered/2026-09-23_r367-cap-head-city-final-fa865e04/r367-cap-head-city-final.mp4` · **+audio** `…-final-with-ancient-aum.mp4` | **Ancient Aum @1:48** (mux **-ss 108**) |
| monk-light-path | **r370** | git: `sources/approved/r370-monk-light-path.png` + `recipes/locks/r370-monk-light-path.{json,gate.json}` · plates `scripts/locks/r370-build-beam-plates.mjs` · local final `out/layered/2026-09-28_r370-monk-light-path-final-ddc6703d/r370-monk-light-path-final.mp4` · **+audio** `…-final-with-shiva.mp4` | **Shiva @1:05** (mux **-ss 64.75**) |
| third-eye-burst | **r372** | git: `sources/approved/r372-third-eye-burst.png` + `recipes/locks/r372-third-eye-burst.{json,gate.json}` · plates `scripts/locks/r372-build-beam-plates.mjs` · local final `out/layered/2026-09-29_r372-third-eye-burst-final-43c4fc16/r372-third-eye-burst-final.mp4` · **+audio** `…-final-with-ancient-aum.mp4` | **Ancient Aum @0:10** (mux **-ss 10.5**) |
| lips-buddha-tongue | **r366 v12-b12** | git: `sources/approved/r366-lips-buddha-tongue.png` + `recipes/locks/r366-lips-buddha-tongue.{json,gate.json}` · plates `scripts/locks/r366-build-phase-eq.mjs` · local final `out/layered/2026-10-01_r366-lips-buddha-tongue-final-1777d73e/r366-lips-buddha-tongue-final.mp4` · **+audio** `…-final-with-love-is-acid.mp4` | **Love is Acid @3:18** (mux **-ss 198.15**) |
| palm-eye-lotus | **r380 v2** | git: `sources/approved/r380-palm-eye-lotus.png` + `recipes/locks/r380-palm-eye-lotus.{json,gate.json}` · plates `scripts/locks/r380-build-plates.mjs` (→ `r380-build-beam-plates` + r379 hand-hold ×2 / field-fill / color-ring / edge-columns) · local final `out/layered/2026-10-06_r380-palm-eye-lotus-final-e8c63e19/r380-palm-eye-lotus-final.mp4` · **+audio** `…-final-with-dusk-till-dawn.mp4` | **Avalon & Stryker - Dusk Till Dawn @0:02.55** (mux **-ss 2.55**) |
| tree-woman | **r381 vivid v16** | git: `sources/approved/r381-tree-woman.png` + `recipes/locks/r381-tree-woman.{json,gate.json}` · plates = prepare scaffold only (no custom plates) · **delivery: loop rotated to start at 8.6 s (frame 258 @ 30 fps)** · local final `out/layered/2026-10-07_r381-tree-woman-vivid-final-8e878db7/r381-tree-woman-vivid-final.mp4` (raw unrotated `…-final-raw.mp4`) · **+audio** `…-final-with-ancestors.mp4` | **Ancestors @0:00.77** (mux **-ss 0.77**) |
| mushroom-hand | **r383 v10d** | git: `sources/approved/r383-mushroom-hand.png` + `recipes/locks/r383-mushroom-hand.{json,gate.json}` · plates = `node scripts/locks/r383-build-plates.mjs` (hand-hold m1 b1 → phase-elements, phase-luma-s4) · zero displacement, no rotation · local final `out/layered/2026-10-07_r383-mushroom-hand-final-7dab020f/r383-mushroom-hand-final.mp4` · **+audio** `…-final-with-great-spirit.mp4` | **Great Spirit @0:00.06** (mux **-ss 0.06**) |
| xray-mushroom | **r385 v10e** | git: `sources/approved/r385-xray-mushroom.png` + `recipes/locks/r385-xray-mushroom.{json,gate.json}` · plates = `node scripts/locks/r385-build-beam-plates.mjs && node scripts/locks/r385-build-field-plates.mjs` · **delivery: loop rotated to start at 10.0 s (frame 300 @ 30 fps)** · local final `out/layered/2026-10-08_r385-xray-mushroom-final-ddf0cb71/r385-xray-mushroom-final.mp4` (raw unrotated `…-final-raw.mp4`) · **+audio** `…-final-with-love-is-acid.mp4` | **Love is Acid @3:18** (mux **-ss 198.15**) |
| hourglass-faces | **r386 v7** | git: `sources/approved/r386-hourglass-faces.png` + `recipes/locks/r386-hourglass-faces.{json,gate.json}` · plates = `node scripts/locks/r386-build-beam-plates.mjs && node scripts/locks/r386-build-field-plates.mjs` · no rotation · local final `out/layered/2026-10-08_r386-hourglass-faces-final-988fa093/r386-hourglass-faces-final.mp4` · **+audio** `…-final-with-attack-of-the-303.mp4` | **Attack of the 303 @0:00** (mux **-ss 0**) |


### Approved previews (Isaac visual OK — full only after gate PASS §7.1; do not re-open without new defect)

| Source | Slug | Type | Preview MP4 | Recipe | Note |
|--------|------|------|-------------|--------|------|
| hand-face | r240 | `dense-pattern-figure` | `out/layered/2026-07-15_r240-handface-phase-river-78c509b8/r240-handface-phase-river-preview.mp4` | r139, clamp **0.42** | Isaac visual pick; **gate REJECT local-drift 0.394** — do not full without fix |
| hand-face | **r242** | same | `out/layered/2026-07-15_r242-handface-phase-river-gatepass-973703eb/...-preview.mp4` | r240 + clamp **0.26** | **gate PASS** local 0.297; **final + audio** |
| hand-face | r241 | same source (alt) | `out/layered/2026-07-15_r241-handface-chroma-trance-bc800728/r241-handface-chroma-trance-preview.mp4` | r139 delta: colorCycle 19 + hueKey 0.42 | alt only |
| Ganesha rainbow-rings | **r325 v8b** | `figure-vivid` | preview `…v8b-knee-4b7a3f2e/…-preview.mp4` · **full** `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v8b-knee-final-f3bfc5a4/r325-ganesha-rainbow-rings-master-v8b-knee-final.mp4` · **+audio** `…-final-with-mama-india.mp4` | v8 counterhalo + knee-only deity patch | Isaac **“이게 젤 나아”** + 풀버전 · Mama India @**6:27** · gate REJECT + humanOverride · do not re-tune without new defect |
| cosmic Buddha eye-fall | **r342 v1c** | `figure-vivid` | preview `…v1c-nobox-6399219c/…-preview.mp4` · **full** `out/layered/2026-08-18_r342-cosmic-buddha-eye-fall-v1c-nobox-final-22fa7aba/r342-cosmic-buddha-eye-fall-v1c-nobox-final.mp4` · **+audio** `…-final-with-shaman-trance.mp4` | v1 river + head-only hold (no rectangle) | Isaac **“맘에든다”** + 풀렌더 + Shaman Trance @**0:00** · gate REJECT + humanOverride · do not re-tune without new defect |
| mushroom-cap Ganesha oil | **r343 r221 v1** | `figure-vivid` | preview `…r221-33d6829b/…-preview.mp4` · **full** `out/layered/2026-08-26_r343-mushroom-ganesha-r221-final-d6d0cbf5/r343-mushroom-ganesha-r221-final.mp4` · **+audio** `…-final-with-ancient-aum.mp4` | golden r221 as-is (no silk, no hold) | Isaac **“이게 제일 낫다 다른거 다 아주 별로야”** + 풀렌더 + Ancient Aum @**0:00** · gate **PASS** · do not re-tune without new defect |
| engraved multi-eye swan | **r344 v3** | `busy-line` | preview `…v3-18395171/…-preview.mp4` · **full** `out/layered/2026-08-27_r344-engraved-swan-eyes-final-1a283714/r344-engraved-swan-eyes-final.mp4` · **+audio** `…-final-with-all-around-us.mp4` | r139 slow-strong glow | Isaac **“ㅇㅇ 풀렌더”** + All Around Us @**2:25** · gate REJECT edge + humanOverride · do not re-tune without new defect |
| skeleton-baby halo | **r345 v1** | `busy-line` | preview `…282b8e76/…-preview.mp4` · **full** `out/layered/2026-08-28_r345-skeleton-baby-halo-final-7c74fd4d/r345-skeleton-baby-halo-final.mp4` · **+audio** `…-final-with-salaam.mp4` | r139 golden as-is (v2 discarded) | Isaac **v1 path 풀렌더** + Salaam @**0:00** · gate REJECT local-drift + humanOverride · do not re-tune without new defect |
| eye-mandala-sitter | **r346 v11** | `figure-vivid` | preview `…v11-8c9e2626/…-preview.mp4` · **full** `out/layered/2026-09-02_r346-eye-mandala-sitter-final-40c26252/r346-eye-mandala-sitter-final.mp4` · **+audio** `…-final-with-adhana.mp4` | v7 rings + figure r139 | Isaac **플렌더** + Adhana @**5:06** · gate REJECT edge/local-drift + humanOverride · do not re-tune without new defect |


### Golden recipe files (copy these)

| Recipe file | Use when |
|-------------|----------|
| `recipes/golden/eye-mirror-phase-advect-r221.json` | finished vivid figure / multi-eye / painted portrait with dense color detail |
| `recipes/golden/woodblock-phase-advect-r139.json` | busy high-frequency line/print texture **and** dense-pattern-figure (hand-face r240 Isaac-validated) |
| `recipes/golden/cosmos-vivid-oklch-r24b.json` | all-over colorful swirl (not figure-skin critical) |

---

## 2. Commands (loop is `00` §2 — do not invent a second loop)

State machine: **INTAKE → PREPARE → PREVIEW → QUOTE → PICK → FULL → AUDIO → CLOSE** (`00` §2). Sketch-grid only after 다 별로 / 창의적으로.  
Isaac judges a **language map**, not a knob. `gate:psychedelic` is optional diagnostics. Full-render permit = `isaac-pick.ts`.

| Step | Exact command |
|------|----------------|
| Intake | `npx tsx scripts/analyze-source.ts <png> --out out/manual-runs/<slug>/analysis.json` |
| Prepare | `npx tsx scripts/prepare-new-source.ts --source <png> --slug <slug> --recipe recipes/golden/<file>.json --work-dir out/manual-runs/<slug>` `[--hero "kind@cx,cy[:rIn/rOut]" --hero-reason "<why>"]` |
| Preview (first Isaac look) | `npx tsx scripts/export-layered.ts --title <slug> --work-dir out/manual-runs/<slug> --preview` |
| Sketch (only after 다 별로 / 창의적으로) | `npx tsx scripts/export-layered.ts --title <slug>-<tile> --work-dir out/manual-runs/<slug> --sketch` then `npx tsx scripts/sketch-grid.ts --out out/manual-runs/<slug>/sketch-grid.mp4 "A L1+L2=…/a-sketch.mp4" …` |
| QA | `npx tsx scripts/qa-motion.ts out/layered/*<slug>*/<slug>-preview.mp4 --source out/manual-runs/<slug>/source.png --json out/manual-runs/<slug>/qa-preview.json` |
| Stills | §6.2 commands |
| Taste audit | `node scripts/taste/measure.mjs <preview.mp4> <label>` · `node scripts/taste/probe.mjs out/manual-runs/<slug>/source.png <preview.mp4> <label>` — targets in `04` §4 |
| Pick (full permit) | `npx tsx scripts/isaac-pick.ts --work-dir out/manual-runs/<slug> --quote "<verbatim>" [--audio "<Track> @m:ss"]` |
| Gate (optional diagnostics) | `npm run gate:psychedelic -- --candidate <preview.mp4> --source <source.png> --reference "$REF1" --reference "$REF2" --work-dir out/manual-runs/<slug> --axis <axis> --primitive <primitive>` |
| Full | `npx tsx scripts/export-layered.ts --title <slug>-final --work-dir <dir> --full-res --gate-report out/manual-runs/<slug>/psychedelic-gate.json` |
| Audio | §7.3 — `-ss` is the start Isaac named. Never guess. |
| Close (default after full) | `npx tsx scripts/close-lock.ts --slug <slug> [--audio "<Track> @m:ss"] [--plates "node scripts/locks/<x>.mjs"]` |

**Reference videos (motion contract only, never as footage):**

```text
REF1=/Users/isaac/Downloads/double-iris-f38f09ba-prism-amber-with-audio.MP4
REF2=/Users/isaac/Downloads/lotus-clean-1x-separated-audio.MP4
```

If refs missing: still run qa-motion + stills. Do **not** invent a gate PASS. Do not block full on a missing gate — `isaac-pick.ts` is the permit.

---

## 3. Source classification (numeric; no vibes)

Run after scaffold (writes `analysis.json`) or:

```bash
npx tsx scripts/analyze-source.ts <source.png> --out out/manual-runs/<slug>/analysis.json
```

### 3.1 Decision tree (apply top→bottom, first match)

| # | Condition (from analysis / eyes) | Type ID | Golden recipe |
|---|----------------------------------|---------|---------------|
| 1 | dark area (lum darkAnchor or visual) **>50% near-black** | `black-dominant` | **STOP** — tell Isaac; do not burn rounds |
| 2 | `busyness ≥ 0.08` **and** directional line texture (print/woodcut) | `busy-line` | `woodblock-phase-advect-r139.json` |
| 3 | all-over marble/swirl/galaxy, figure not the color problem | `allover-vivid` | `cosmos-vivid-oklch-r24b.json` |
| 4 | `greenRisk true` **or** pastel/low-sat majority with few vivid focals | `pastel-greenrisk` | start from r221 **or** cosmos but **hueKey/lumKey low + clamp≤0.18**; never full peacock |
| 5 | figure/face/deity + finished vivid paint (`finishedVivid` useful; skin/face large) | `figure-vivid` | `eye-mirror-phase-advect-r221.json` via **`prepare-new-source`** — hero detect writes halo/pour/beam plates; scaffold-only r221 is a FAIL |
| 6 | dense full-frame pattern figure (hand/mushroom/forest) without soft skin wash risk | `dense-pattern-figure` | **first try** `woodblock-phase-advect-r139.json` (hand-face r240 Isaac OK); multi-layer r65 only if layers already exist; avoid body colorCycle as first path (r241 alt only) |
| 7 | else | `unknown` | `prepare-new-source` r221 **one** preview → if repaint FAIL, stop and escalate |

### 3.2 Hard type rules

| Type | MUST | MUST NOT |
|------|------|----------|
| `figure-vivid` | colorCycle **0**; sourcePrism on; **hero must travel** (`04` §2). 2-layer source+hold is legal when it prevents freeze-hero or melt-face (both layers = source pixels) | body colorCycle, peacock, foreign overlay, `nx/ny` box hold |
| `busy-line` | UV fixed; phaseMix=0; phaseFlowPx ∝ width | copy r139 px blindly without width scale |
| `dense-pattern-figure` | start **r139** path; colorCycle **0** first; for **gate/final** clamp maxDrift **≤0.26** (r242) | default colorCycle/hueKey; shipping with clamp 0.42+ without re-gate |
| `allover-vivid` | OKLCH; integer cycle; satInj 0 | HSV + high satFloor |
| `pastel-greenrisk` | clamp; low hueKey | full-field hue “for energy” |
| `figure-vivid` on a dark smoke field (r385 · r386, both “간만에 아주 맘에들어”) | figure held in source colour (hold layer; prism ≤ s12 only where it does not repaint skin). Field lifted (CLAHE × gain) and coloured **only** by a palette layer (`layers[1]`, alpha = soft lifted luma away from the figure): cosine path anchored on the source bg hue, never 35–135°, integer `paletteC` bands for pattern, phase plate histogram-equalised over the field, colour loop ≈ 3 s. Hero light = glowWave on a clone of `layers[0]` whose alpha is the source’s own glow path, one band (`fieldCycles` 2, strength ≈ 0.7). Plates: `scripts/locks/r385-build-*.mjs`, `r386-build-*.mjs` | glowWave on `layers[0]` (rings cross the faces) · prism on the dark field · palette without the source hue · CA / feedback |

---

## 4. NEW SOURCE runbook (copy this checklist)

Replace `<SOURCE>`, `<SLUG>`, `<RECIPE>` only.

### Step A — Classify (no render yet)

1. Open image. Note face/skin vs all-over pattern vs line print. Pick the golden from §3.1.
2. Prepare (lanczos + scaffold + hero detect + plates + session-grade). If the detector’s kind is not the living part, `--hero` + `--hero-reason` is the **only** legal override (`00` §2):

```bash
npx tsx scripts/prepare-new-source.ts \
  --source "<SOURCE>" \
  --slug "<SLUG>" \
  --recipe "recipes/golden/<RECIPE>.json" \
  --work-dir "out/manual-runs/<SLUG>" \
  [--hero "halo@0.50,0.20:130/630" --hero-reason "<why>"]
```

3. Read `out/manual-runs/<SLUG>/hero.json` + `analysis.json` → assign Type ID (§3.1). Confirm `hero.kind` matches what you see (or `hero.json.override`).
4. If Type ID wrong for chosen recipe: re-prepare with the correct golden (overwrite work-dir).
5. Open §5 KILLED — confirm plan is not a killed axis.
6. If prepare / export says `session-grade FAIL`, **do not** show Isaac. Fix plates/hold. There is no skip flag.

### Step B — Preview first (sketch only after 다 별로 / 창의적으로)

Loop: `00` §2. New source: **one `--preview`** of the type-tree map. Do not open with a ¼-res tile grid. Sketch-grid only after Isaac says 다 별로 / 창의적으로 / 다른 프리셋. Do not answer those with a knob delta.

```bash
npx tsx scripts/export-layered.ts \
  --title "<SLUG>" \
  --work-dir "out/manual-runs/<SLUG>" \
  --preview
```

If error mentions `authority-report`: you enabled `sourceRegionAffinity` — run audit first (§2) or **do not use that primitive** (prefer golden r221/r139 which use sourcePrism only).

### Step C — Mandatory stills + QA (every preview)

```bash
WORKDIR="out/manual-runs/<SLUG>"
PREVIEW=$(ls -d out/layered/*<SLUG>* | head -1)/<SLUG>-preview.mp4
STILL="$WORKDIR/stills"
mkdir -p "$STILL"
for t in 2.0 6.0 6.15 6.3 10.0 14.0; do
  ffmpeg -y -ss "$t" -i "$PREVIEW" -frames:v 1 "$STILL/t$(echo $t | tr . _).png"
done
sips -z 1456 816 "$WORKDIR/source.png" --out "$STILL/source.png" 2>/dev/null || true
ffmpeg -y -i "$STILL/source.png" -i "$STILL/t6_0.png" -i "$STILL/t10_0.png" -i "$STILL/t14_0.png" \
  -filter_complex hstack=inputs=4 "$STILL/contact.png"
ffmpeg -y -i "$STILL/t6_0.png" -i "$STILL/t6_15.png" -i "$STILL/t6_3.png" \
  -filter_complex hstack=inputs=3 "$STILL/subsec.png"
npx tsx scripts/qa-motion.ts "$PREVIEW" --source "$WORKDIR/source.png" --json "$WORKDIR/qa-preview.json"
```

### Step D — Self-judge (ordered)

1. **R-002:** Is frame more beautiful than `stills/source.png`? If no → FAIL (stop tuning if 2nd miss).
2. **R-001:** Skin/identity washed cyan/magenta dayglo? → FAIL repaint.
3. **R-038:** Looks like sticker overlay on frozen photo? → FAIL.
4. **R-020:** Subsec shows real travel (not static boil)? If static → FAIL density.
5. QA hard fails (olive/bleach/seam/drift): treat as FAIL for final; preview may still inform direction.

### Step E — Case ledger (required)

Append to §9 using the template. No case = work incomplete.

### Step F — Next action

| Outcome | Action |
|---------|--------|
| FAIL #1 | Change **one axis** only (recipe family or single param group). Re-preview. |
| FAIL #2 same source | **STOP.** Deliver best 1–2 previews + question to Isaac (R-013/R-021). |
| Soft pass, want Isaac eyes | `04` §4 checklist then deliver preview path + contact/subsec. **No full. No audio.** |
| Isaac: “맘에 든다 / 221처럼 이걸로” | Full render §7.1 then wait for audio request |
| Isaac: defect note | §8 triage — crop 3-way before knobs |

**Never:** change 5 knobs at once · re-open closed approved slug · killed axis “just to try”.

---

## 5. KILLED AXES (instant reject if agent proposes)

| Axis | Why |
|------|-----|
| Overlay / separate decorative layers / godRays as main motion | R-038 |
| optical liquid / flowAmp material | R-035 dead |
| Freeze source + edge effects | R-032 |
| Portrait body colorCycle (any speed) | R-018 |
| peacock-b-fast on figure-vivid as final path | CASE-EM r210 FAIL |
| Non-integer colorCycle.speed | R-027 seam |
| noiseAmount>0 on final | R-030 |
| QA PASS claimed as success | R-020 |
| region-affinity amount/cycles retune after r209 | R-053 |
| full-field hue on greenRisk/pastel | R-039 |
| chromaOrbit | refuted |
| dual-profile boiling knob stack r155–157 | R-047 |
| **cosmos-vivid / body colorCycle as “anti-wobble” on figure-vivid / Ganesha** | R-018 · R-063 · r299-v2 FAIL |
| **Zero sourcePrism + glow/godRays-only “structure lock” on figure-vivid** | R-038 · R-063 · r299-v3/v4 FAIL |
| **phase-angular / multipass.rotate spin “for Ganesha/mandala”** | R-062 · §0 item 9 |
| **Axis-aligned hold box (`nx/ny` clip) around a figure** | r325 knee wall · r342 sky rectangle — Isaac always sees it |

---

## 6. Judgment & metrics

### 6.1 Two gates

| Gate | Tools | Pass means |
|------|-------|------------|
| Guard | qa-motion + stills vs source | Not broken (no olive bomb, seam, melt, total repaint) |
| Goal | human 3s watch | Hallucinatory density + more beautiful than source |

### 6.2 QA thresholds (hard)

| Metric | Bound |
|--------|-------|
| oliveDwell | ≤ max(0.05, ~1.5× source) |
| bleachDwell | ≤ 0.05 class |
| seamRatio | ≤ 1.5 |
| sourceColorDrift95 | ≤ 0.18 |
| sourceColorLocalDrift95 | ≤ 0.30 |
| staticZone | hue-only; WARN ok if light motion real |

`lightMotion` / `motionDensity`: record always; **never** sole success proof.

### 6.3 Subsecond

Always 6.00 / 6.15 / 6.30 (R-012). Integer seconds alone → false “no motion”.

---

## 7. Full render · humanOverride · audio

### 7.1 Full render

Requires gate report with scene SHA match:

```bash
npx tsx scripts/export-layered.ts \
  --title "<SLUG>-final" \
  --work-dir "out/manual-runs/<SLUG>" \
  --full-res \
  --gate-report "out/manual-runs/<SLUG>/psychedelic-gate.json"
```

### 7.2 Isaac pick (full-render permit)

Do **not** hand-edit `psychedelic-gate.json`. Verbatim quote is the permit (`00` §2 PICK):

```bash
npx tsx scripts/isaac-pick.ts --work-dir "out/manual-runs/<SLUG>" \
  --quote "<Isaac verbatim>" [--preview <preview.mp4>] [--audio "<Track> @m:ss"]
```

Writes `isaac-pick.json` + `humanOverride` on the gate report. Audio start without `@m:ss` is refused. Scene SHA must match current `scene.json`.

### 7.3 Audio mux (Isaac track + start only)

```bash
DIR="out/layered/<archive-dir>"
VIDEO="$DIR/<name>-final.mp4"
AUDIO="/Users/isaac/Downloads/<track>.wav"
OUT="$DIR/<name>-final-with-<slug>.mp4"
ffmpeg -y -i "$VIDEO" -ss 0 -i "$AUDIO" \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 320k -ar 48000 -ac 2 \
  -shortest "$OUT"
# verify: same video stream frames; duration 20s; has aac
ffprobe -v error -show_entries stream=codec_type,codec_name,nb_frames -of csv=p=0 "$OUT"
```

---

## 8. Defect triage (Isaac feedback)

0. Update case status **before** any knob  
1. No concurrent codex HMR + export if capture dies  
2. `ffprobe` delivery vs original render  
3. Same-timestamp crop: **source | original render | delivery**  
4. If only delivery bad → re-encode (not recipe)  
5. If render bad → §5 mode lookup → **one** variable A/B preview  
6. Re-deliver + case + rule if new pattern  

---

## 9. Case ledger

### 9.1 Append template (required fields)

```markdown
### CASE-YYYY-MM-DD-<seq> | <slug>
- source: <path> <WxH> sha256=<16+> — type=<TypeID> M: satMean= vivid= busyness= greenRisk=
- hypothesis: <one line>
- recipe: golden=<file> OR delta=<knobs>
- quote: "<Isaac verbatim that caused this round>" → axis=<DELTA|NEW-LANGUAGE|STOP|PICK> (00 §4)
- language-map: hero=<L…> · figure=<L…> · field=<L…> · sky=<L…> (00 §3; no region empty)
- work-dir: out/manual-runs/<slug>/
- preview: out/layered/<archive>/<slug>-preview.mp4
- QA: olive= bleach= seam= drift=/ local= static= motionDensity= verdict=
- stills: contact= subsec= (paths)
- judge: PASS|FAIL|HOLD — R-002= R-020= notes=
- learning: <one general sentence>
- rules: R-### new|confirm|counter
- status: open|delivered-preview|final|closed|discard
```

### 9.2 Recent high-value cases

| ID | Result | Lock-in learning |
|----|--------|------------------|
| r210 eye-mirror peacock | FAIL repaint | figure-vivid ≠ peacock final |
| r217 pure phase extreme | HOLD / drift fail | max halluc density, weaker identity |
| **r221** | **Isaac final** | phase-advection balanced; closed |
| r209 region-affinity | FAIL static | authority field ≠ binary capacity |
| r240 hand-face | Isaac visual / **gate REJECT local-drift** | look OK ≠ full-ready; clamp 0.42 too loose |
| **r242 hand-face** | **gate PASS + Isaac final + audio** | single-axis clamp **0.42→0.26** fixed local-drift; keep r139 prism |
| r241 hand-face chroma | alt / not preferred | colorCycle+hueKey ok as A/B, not default |
| r272 dual-abstract A max | gate PASS full | extreme prism baseline |
| **r274 dual-abstract beam-focus** | **Isaac liked + Sapana @2:58** | godRays@eye + bloom threshold + colorMotionMask lum/sat; gate PASS |
| r65 mushroom | approved | keep pattern engine; fix defects only |
| r139 woodblock | approved | UV fixed + phase flow |
| r299 Ganesha thrash v1–v4 | **FAIL / discard** | killed-axis roulette (cosmos, godRays-main, zero-prism); see §9.2c |
| **r299 enterprise v2 fast-silk** | **QA PASS · HOLD Isaac** | r221 + silk/speed delta only; colorCycle0; clamp0.22 |
| r300-v1 rainbow-rings flow40 | **FAIL 꿀렁** | phaseFlow40 ≠ anti-wobble |
| **r300-v2 anti-wobble** | **QA PASS · HOLD Isaac** | flow18 surface6; glow for energy |
| **r301–r303 folder29 batch** | **QA PASS · HOLD Isaac** | native 1632 PNG×3; anti-wobble + bleach-safe bloom |
| r343 mushroom-ganesha-oil | **FAIL look** | oil family discarded vs r221 v1 |
| **r343 r221 v1** | **Isaac final + audio** | golden r221; v2–v4 “아주 별로”; gate PASS; Ancient Aum @0:00 |
| **r344 v3** | **Isaac final + audio** | r139 slow-strong; All Around Us @2:25; gate REJECT + override |
| **r345 v1** | **Isaac final + audio** | r139 golden; v2 not used; Salaam @0:00; gate REJECT + override |
| **r346 v11** | **Isaac final + audio** | v7 rings + figure r139; Adhana @5:06; gate REJECT + override |
| **OS v2.1 2026-09-03** | **ceiling enforced** | r349 golden-as-is + r351 v1 clone slipped through prose; `language-map.ts` composes by default (v2: L1 travel · chromaCycles 3 · L4 · L6 vection · L8 · L10) and `session-grade` refuses golden/clone/<3 composed/no-macro; r349 macro motion 3.40 → 8.81 (Isaac final 11.13). Composer v1 garnish-only was "크게 달라진게 없다" (3.69) — SSIM misled, macro motion did not |
| **OS v2 2026-09-02** | **method change** | floor+ceiling contracts; sketch grid before preview; quote→axis dictionary; `--hero` enforced; textured hold default; `isaac-pick`/`close-lock`; session-plates alpha stride bug fixed |
| r349 uv-pills-face | **HOLD Isaac** · QA PASS | ESRGAN 2x→1632 cover · golden r221 as-is · hero form |
| r350 rainbow-tongue-mouth | **FAIL look** | Isaac “별로야 너무 구려” on v3 · killed · no full |
| r351 eyes-galaxy-sitter | **HOLD Isaac** v2 | v1 was r346 v11 clone (Isaac catch) · v2 L1+L2+L4+L8+L5+L10 |
| r352 engraved-buddha-hands | **HOLD Isaac** | busy-line r139 · face hold · L3+L4+L8 hands · L5 face · QA PASS |
| r353 mushroom-man-stems | **Isaac final** v4 + Bebopper @1:50 | “ㅇㅇ 맘에든다 합격” · do not re-tune |
| r356 buddha-rainbow-monk | **HOLD Isaac** | native 1632 · pour along rainbow ribbon · QA PASS |
| r357 tree-sun-drip-face | **Isaac final** v2 + Lightyears @0:00 | silent + mux · lock pack closed |
| r358 buddha-rain-glitch | **HOLD Isaac** v6 | 부처 sat↑ phaseFlow↓ · rain unchanged · QA PASS macroMotion WARN |
| r359 buddha-halo-rings | **HOLD Isaac** | oval halo L1+L2 · statue L5 · no spin · QA PASS |
| r360 uv-tongue-pills | **HOLD Isaac** | chat JPEG upscaled · tongue pour · QA PASS darkDwell WARN |
| r361 mosaic-eye-fall | **HOLD Isaac** | pour pupil→palm · hand+sclera hold · QA PASS |
| r362 dot-hand-mushrooms | **Isaac final** + Valley of Stevie @0:13 | mux -ss 13.5 · lock closed |
| r363 finger-eye-rings | **HOLD Isaac** | 816 upscaled · halo rings · hand hold · QA PASS |
| r364 oil-eye-drip | **HOLD Isaac** | oil drip eye→finger · no hold layer · QA PASS |
| r365 mushroom-forehead | **HOLD Isaac** v5 | drip cycles 12 (3× v4) · QA not re-run |
| r366 rainbow-eye-tongue | not delivered | oliveDwell FAIL on first preview · not shown |
| r367 cap-head-city | **Isaac final** + Ancient Aum @1:48 | mux -ss 108 · lock closed · QA PASS hueJump+macroMotion WARN |
| r368 sun-runners | **HOLD Isaac** | sun radial out · figures+shadows held · QA PASS hueJump WARN |
| r369 upward-eyes | not delivered | eye whites went pink · QA PASS not shown |
| r370 monk-light-path | **Isaac final** + Shiva @1:05 | mux -ss 64.75 · lock closed · QA PASS hueJump+macroMotion WARN |
| r354 mushroom-man-paint | **HOLD Isaac** | folder31 · beam from face · QA PASS |
| r355 marble-face-profile | **HOLD Isaac** | folder31 · oil sheet + profile hold · QA PASS hueJump WARN |

### 9.2b CASE detail — hand-face (2026-07-15)

#### CASE-2026-07-15-r240 | r240-handface-phase-river
- source: `out/manual-runs/_sources/psy-hand-face-1632.png` 1632×2912 sha256=`369496e278e699d5…` — type=`dense-pattern-figure` M: satMean=0.56 vivid=48.4% busyness=0.022 greenRisk=false finishedVivid=0.32 figureArea≈40%
- hypothesis: dense patterned hand/face responds to woodblock phase-advection (fixed UV, phaseMix=0) better than figure-vivid r221 or body hue-cycle
- recipe: golden=`recipes/golden/woodblock-phase-advect-r139.json` (scaffold as-is; sourcePrism amount=1 phaseFlowPx=36 satBoost=1.72 colorCycle=0)
- work-dir: `out/manual-runs/r240-handface-phase-river/`
- preview: `out/layered/2026-07-15_r240-handface-phase-river-78c509b8/r240-handface-phase-river-preview.mp4`
- QA: olive=0.056 bleach=0.005 seam=0.99 drift=0.12 / local=0.278 static=0 motionDensity=0.197 verdict=**hard PASS** (darkDwell WARN only)
- stills: contact=`out/manual-runs/r240-handface-phase-river/stills/contact.png` subsec=`.../stills/subsec.png`
- judge: **PASS** — R-002=yes (Isaac) R-020=yes notes=agent pick + Isaac “맘에든다”
- learning: for dense-pattern-figure without soft-skin wash risk, **r139 single-source phase river is the proven first recipe** (not peacock, not first-path colorCycle)
- rules: R-001 confirm · R-002 confirm · R-038 confirm · R-042 confirm · R-003 confirm (type→recipe map)
- status: **delivered-preview** (Isaac visual OK; full pending; audio pending)

#### CASE-2026-07-15-r241 | r241-handface-chroma-trance
- source: same as r240
- hypothesis: add integer colorCycle + mild hueKey for denser chroma trance while holding sourcePrism
- recipe: delta from r240 — colorCycle.speed=**19**, hueKey=**0.42**, luminanceKey=0.1, sourcePrism slightly softer (amount 0.9, phaseFlowPx 32), clamp maxDrift 0.30, glowWave up
- work-dir: `out/manual-runs/r241-handface-chroma-trance/`
- preview: `out/layered/2026-07-15_r241-handface-chroma-trance-bc800728/r241-handface-chroma-trance-preview.mp4`
- QA: olive=0.010 bleach=0.008 seam=0.89 drift=0.089 / local=0.181 motionDensity=0.179 verdict=**hard PASS** (hueJump WARN 42>41.8, darkDwell WARN)
- stills: `out/manual-runs/r241-handface-chroma-trance/stills/{contact,subsec}.png`
- judge: **HOLD as alt** — QA ok, Isaac preferred overall look of r240 family; do not promote to default dense-pattern path
- learning: chroma-cycle A/B is valid second preview, not the type default
- rules: R-027 confirm (integer cycle) · R-018 not violated as primary (alt only)
- status: open-alt (not discarded; not preferred)

#### CASE-2026-07-15-r242 | r242-handface-phase-river-gatepass
- source: same as r240
- hypothesis: r240 gate fail was **source-local-drift only** (0.394 > 0.30); single-axis tighten `sourceColorClamp.maxDrift` 0.42→**0.26** (r221-class) keeps phase-river look while anchoring local RGB
- recipe: r240 delta — **only** clamp maxDrift=0.26 (prism/sat/glow unchanged)
- work-dir: `out/manual-runs/r242-handface-phase-river-gatepass/`
- preview: `out/layered/2026-07-15_r242-handface-phase-river-gatepass-973703eb/r242-handface-phase-river-gatepass-preview.mp4`
- final: `out/layered/2026-07-15_r242-handface-phase-river-gatepass-final-209a36a0/r242-handface-phase-river-gatepass-final.mp4`
- audio: `...-with-eating-glue.mp4` (Paranoid London / Mutado Pintado — Eating Glue @0s)
- gate: **PASS** edges=0.877 frameDrift=0.141 **localDrift=0.297** (≤0.30) — no humanOverride
- QA final: hard PASS (darkDwell WARN only); localDrift qa=0.207
- judge: **PASS final** — process fix: Isaac visual → **gate PASS required** before full; do not skip to override when a single-axis clamp can recover
- learning: dense-pattern r139 path for final should ship with **clamp ≤0.26** (golden r139 default 0.55 is preview-loose; final/gate needs tighter clamp)
- rules: R-010 confirm · R-020 confirm (QA≠gate) · R-044 confirm · **R-055 new (P):** Isaac look OK still requires gate PASS or explicit “override OK”; prefer single-axis clamp before override
- status: **final closed**


#### CASE-2026-07-16-r243 | r243-handbuddha-phase-river-halluc
- source: `incoming/r243-handbuddha.png` 1121×2000 sha256=fbae215d2164b24a — type=`dense-pattern-figure` (+busy-line) M: satMean=0.66 vivid=0.57 busyness=0.113 greenRisk=true finishedVivid=0.39
- hypothesis: hand+face engraved deity with finished vivid = hand-face family; **extreme** phase-river (phaseFlowPx↑, surfaceCycles↑, sat↑, multipass↑) + **smooth** (noise/grain/palette=0, bicubic, soft bloom) meets “극도로 환각 + 텍스쳐 매끄럽게”
- recipe: lock r242 base + halluc delta — prism phaseFlowPx=44 surfaceCycles=38 detailBoost=1.45 phaseScale=8.2; satBoost=1.88 clamp maxDrift=**0.30** (preview; final should re-gate ≤0.26 per R-056); glowWave↑; bloom 0.36; multipass 0.30; CA 0.15; grain/noise 0
- work-dir: `out/manual-runs/r243-handbuddha-phase-river-halluc/`
- preview: `out/layered/2026-07-16_r243-handbuddha-phase-river-halluc-f43c87ba/r243-handbuddha-phase-river-halluc-preview.mp4`
- QA: olive=0.047 bleach=0.005 seam=1.06 drift=0.141 local=0.267 static=0 motionDensity=0.332 verdict=**PASS**
- stills: `out/manual-runs/r243-handbuddha-phase-river-halluc/stills/{contact,subsec}.png`
- judge: **HOLD for Isaac visual** — QA PASS; subsec shows smooth color-river travel; identity held; greenRisk mitigated via hueKey=0 + greenCompress 0.55. Full only after Isaac OK + gate (clamp may need 0.26 if local drift fails gate)
- learning: same-class as hand-face; extreme look = phaseFlow/surfaceCycles/multipass/bloom stack, not colorCycle; keep noise=0 for smooth metal-engrave texture
- rules: R-001 confirm · R-030 confirm · R-038 confirm · R-056 note (preview clamp 0.30 > final≤0.26)
- status: delivered-preview


#### CASE-2026-07-16-r244 | r244-handbuddha-smooth-multibreathe
- source: same as r243 (`incoming/r243-handbuddha.png`) — type=`dense-pattern-figure` greenRisk=true busyness=0.113
- defect from Isaac on r243: texture **too rough**; want subject **layers breathe differently**
- diagnosis (frame crops): r243 high `surfaceCycles=38` + `detailBoost=1.45` + multipass warp boiled engraving lines into high-freq chroma noise (face/hand/chest crops)
- hypothesis: optical bands (void/body/ornament/highlight/edge) with **per-layer** phaseFlow/glow/breath desync + **smooth** prism (surfaceCycles 7–13, detailBoost≤1.0, CA↓, soft bloom, noise0)
- recipe: `make-optical-layers` 5-band + sourcePrism per band; pass2 olive fix greenCompress 0.72 satInj0
- work-dir: `out/manual-runs/r244-handbuddha-smooth-multibreathe/`
- preview: `out/layered/2026-07-16_r244-handbuddha-smooth-multibreathe-3d311444/...-preview.mp4` (pass2)
- QA: see qa-preview.json
- stills: inspect2 compare-face/hand r243|r244b
- judge: HOLD Isaac — smoother face vs r243; multi-band desync active; engraving geometry remains (source) but color river less grainy
- learning: roughness on line-engrave dense art = surfaceCycles/detailBoost too high more than phaseFlowPx; multi-breathe = optical bands not single-layer dual glow alone
- status: delivered-preview


#### CASE-2026-07-16-r255 | r255-handbuddha-silk-clean
- source: **1632×2912** full PNG (not session re-encode 1121 JPEG) — type dense-pattern-figure
- Isaac defect on r243/r244: **square blocky noise** in texture (not just “rough”)
- root cause: (1) agent used chat-attachment re-encode **1121×2000 JPEG** with 8×8 blocks; (2) high multipass + multi optical bands + high surface/detailBoost **amplified** blocks into mosaic
- fix: full-res source + silk single-layer prism (surfaceCycles 14, detailBoost 0.95, multipass 0.08, clamp 0.24) + dual glowWave for soft desync breath
- preview: `out/layered/2026-07-16_r255-handbuddha-silk-clean-90495efb/r255-handbuddha-silk-clean-preview.mp4`
- block-inspect: hand/face nearest zoom — **no square mosaic** vs r244
- QA: oliveDwell FAIL (greenRisk) other hard PASS localDrift 0.25
- judge: HOLD Isaac for square-noise check
- learning: **never use session-compressed JPEG as source**; always prefer native res PNG; square noise = source blocks × prism, not only surfaceCycles
- status: delivered-preview


#### CASE-2026-07-16-r256 | r256-handbuddha-silk-soft
- source: **pre-smoothed** 1632 PNG (72% blurσ4 + 28% mild) — busyness 0.10→**0.031**, greenRisk false
- Isaac: still too rough — either preserve original texture cleanly OR remove rough texture
- path chosen: **remove/soft HF engrave** + gentle prism (surfaceCycles **6**, detailBoost **0.75**, phaseFlow 18, multipass 0.05, phase=luminance not edge)
- preview: `out/layered/2026-07-16_r256-handbuddha-silk-soft-058e76ce/r256-handbuddha-silk-soft-preview.mp4`
- verify: hand/face lanczos vs r255 — lines softer, silk metal; full frame no square mosaic
- QA: olive FAIL 0.066; lightStatic WARN 0.45 (motion quieter by design); motionDensity 0.16 PASS; localDrift 0.23
- judge: HOLD Isaac — smoothness priority; may want more halluc if OK
- learning: woodcut engrave roughness cannot be fixed by prism knobs alone — **pre-smooth source** when Isaac asks soft texture
- status: delivered-preview


#### CASE-2026-07-16-r257 | r257-handbuddha-ultra-silk
- Isaac: **극도로 매끄러워야 함**
- source: triple blur (3.5+4.5+5.5) 92% + 8% mild original — busyness **0.013** texture=smooth
- prism: surfaceCycles **2**, detailBoost **0.5**, phaseFlow 14, multipass 0.04, heavy bloom
- preview: `out/layered/2026-07-16_r257-handbuddha-ultra-silk-1fa48345/r257-handbuddha-ultra-silk-preview.mp4`
- verify: hand/face lacnzos = silk paint; engrave nearly dissolved vs r256
- QA: olive FAIL 0.056; seam FAIL 1.55 (soft content); lightStatic 0.52; motionDensity 0.16
- status: delivered-preview (smoothness max path)


#### CASE-2026-07-16-r258 | r258-third-eye-silk-river
- source: new third-eye melting-hands buddha (chat attach → mild deblock + 1632 lanczos) — type **figure-vivid** finishedVivid=0.72 busyness=0.03 greenRisk=true
- recipe: r221 lock base + silk delta (surfaceCycles 12, detailBoost 0.9, phaseFlow 28, clamp 0.24, multipass 0.10)
- work-dir: `out/manual-runs/r258-third-eye-silk-river/`
- preview: `out/layered/2026-07-16_r258-third-eye-silk-river-45f5b741/r258-third-eye-silk-river-preview.mp4`
- QA: olive FAIL 0.087 (cyan cast); localDrift 0.26 PASS; motionDensity 0.25; no square mosaic on hand NN
- judge: HOLD Isaac visual — paint-silk look OK; eye/hand somewhat cyan-shift
- status: delivered-preview (new source, old hand-buddha abandoned)


#### CASE-2026-07-16-r259 | r259-multieye-sun-silk
- source: multi-eye vertical stack + particle field + sun (new) — figure-vivid-ish finishedVivid=0.58 busyness=0.046 greenRisk=false
- recipe: r221 lock + particle-safe silk (surfaceCycles 10, detailBoost 0.85, clamp 0.22, noise0)
- preview: `out/layered/2026-07-16_r259-multieye-sun-silk-3d547136/r259-multieye-sun-silk-preview.mp4`
- status: delivered-preview


#### CASE-2026-07-16-r260 | r260-sunhead-eye-fast-halluc
- source: open-head sunburst single-eye liquid face (new) — figure-vivid finishedVivid=0.51 busyness=0.051 greenRisk=true
- recipe: r221 + fast-halluc (phaseFlow 40, surface 16, glow 26/43, multipass 0.16, clamp 0.26)
- preview: `out/layered/2026-07-16_r260-sunhead-eye-fast-halluc-f8f1b9fe/r260-sunhead-eye-fast-halluc-preview.mp4`
- status: delivered-preview


#### CASE-2026-07-16-r265 | r265-folder28-4-elevated
- source: same as r264 folder28-4 (silhouette dual heads + eye beam + marble) — Isaac pick of batch
- elevate: radial phase + phaseFlow 54, sat 1.78, bloom 0.50 beam hero, glow 41/68, multipass 0.22, detailBoost 0.88 (grain protect), clamp 0.28
- preview: `out/layered/2026-07-16_r265-folder28-4-elevated-9235de03/r265-folder28-4-elevated-preview.mp4`
- status: delivered-preview

#### CASE-2026-07-16-r274 | r274-dual-abstract-a-beam-focus
- source: `sources/approved/r274-dual-abstract-beam.png` 1632×2912 sha256=`5c6b19d4eb013bb9…` (folder28 dual-abstract silhouettes + third-eye light cone) — type=`figure-vivid` / allover psychedelic plate; large pure-black silhouettes + bright high-sat beam
- hypothesis: after r272 extreme full, Isaac wants **beam alone more independent** → godRays centered on third eye + bloom that only keys bright cone + colorMotionMask (lum/sat) so prism prefers beam/background over black silhouettes
- recipe: r272 extreme prism base (phaseFlow~40, surface~32–36, clamp 0.22) + effects:
  - `godRays`: intensity≈1.05, threshold≈0.40, centerX≈0.46 centerY≈0.40, samples 96
  - `bloom`: strength≈0.62, threshold≈0.42
  - `colorMotionMask`: floor 0.18, lumW 0.92, satW 0.55, power 1.85
- work-dir: `out/manual-runs/r274-dual-abstract-a-beam-focus/`
- preview: `out/layered/2026-07-16_r274-dual-abstract-a-beam-focus-d2e4129c/r274-dual-abstract-a-beam-focus-preview.mp4`
- final: `out/layered/2026-07-16_r274-dual-abstract-a-beam-focus-final-54cff7f8/r274-dual-abstract-a-beam-focus-final.mp4`
- audio: `...-with-sapana.mp4` — **Astrix — Sapana (Album Version) @2:58 (178s)**
- gate: **PASS** cohere=0.816 (r273 was 0.8095 near-miss temporal-boiling)
- judge: **PASS final** — Isaac “이 버전 맘에든다” 2026-07-16; lock pack committed
- learning: for **bright focal beam on dark silhouettes**, use post **godRays+bloom threshold** + **colorMotionMask lum/sat** rather than raising global prism (global prism muddies blacks); third-eye center must match composition
- rules: R-001 confirm · R-010 confirm · R-055 confirm · **R-057 new (P):** beam/spotlight hero → godRays center + bloom threshold + luminance colorMotionMask before more phaseFlow
- status: **final closed** (git lock + Sapana meta)

#### CASE-2026-07-16-r275 | r275-mushroom-crown (+ Instagram reels)
- source: session attach → `sources/incoming/r275-mushroom-crown-1632.png` (1121×2000 attach upscaled 1632×2912); **not yet** `sources/approved`
- type: dense-pattern / finished vivid psychedelic (crown light + hand mushroom)
- **drop/full prism:** work-dir `out/manual-runs/r275-mushroom-crown-prism/` — woodblock-r139 base + godRays@crown (0.48,0.28) + bloom + colorMotionMask; gate PASS; full `out/layered/2026-07-16_r275-mushroom-crown-prism-final-ab46062f/r275-mushroom-crown-prism-final.mp4` (20s)
- **narration-only (Isaac “오 이거 좋다 일단 보류”):** full `out/layered/2026-07-16_r275-mushroom-crown-narration-final-282a9cd4/r275-mushroom-crown-narration-final.mp4` — slower prism (~phaseFlow 13 / surface 16 / soft rays); do not overwrite
- **drip narr experiment (not pick):** `…-narration-drip-final-d6f32be8/…` sourceFlowAdvection+Transport
- **Instagram reels (local only, no git MP4):** full ledger `docs/INSTAGRAM_REELS_SESSION_2026-07-16.md`
  - audio: `/Users/isaac/Downloads/Psysex - L.S.Dance (LOUD Remix).wav` — skip 0–1s mute; drop ≈7.78s; narr speed experiments 2×→**1.5×**
  - bans: eye/crown tight crop on open (Isaac)
  - **Isaac pick reel:** `out/instagram/r275-mushroom-crown-reel-v10-matchcut.mp4` (~18.23s; dual A narr + B full; short 0.28s match xfade; bang@~4.52)
  - rejected: long dissolve v11; total≠20 v13; user kept v10 over v14-20s
- status: **reel pick locked (v10)**; product lock pack pending Isaac

#### CASE-2026-07-16-IG | Instagram reel craft (r274 + r275)
- full session detail: **`docs/INSTAGRAM_REELS_SESSION_2026-07-16.md`** (mandatory read for any IG cut from these sources)
- r274 reels: `out/instagram/r274-reel-before-drop-v1…v7.mp4` — pan-to-eye fixed at **v7** (look-at 0.50/0.82→0.42/0.33, z 1.55→2.60); Sapana @cut
- learning: fake “zoom to eye” fails if start still shows eye; zoompan must set portrait `s=` and escape filter commas; L.S.Dance bang measured not guessed; dual-render A/B > setpts-only slowdown for open energy contrast
- status: logged

### 9.2c CASE detail — r299 neon Ganesha (2026-07-30) self-improve failures

> **Purpose:** prevent agent thrash on finished-vivid deity (Ganesha/Om/rainbow aura).  
> Source class: **figure-vivid** · satMean≈0.69 · finishedVivid≈0.65 · greenRisk=true · busyness≈0.03  
> Source path risk: chat session JPEG 1121×2000 upscaled to 1632×2912 (r255 block risk) — prefer native PNG when available.

#### CASE-2026-07-30-r299-v1 | careful-max phase (FAIL Isaac aesthetic)
- hypothesis: high phaseFlow “extreme halluc” like r297/r298 careful-max
- recipe: r221 + phaseFlow **52** surface **16** mp **0.17**
- preview: `out/layered/2026-07-30_r299-neon-ganesha-om-aura-3c844799/…-preview.mp4`
- QA: PASS (hueJump WARN)
- judge: **FAIL Isaac** — “별로” · **꿀렁꿀렁** (melt/wobble feel)
- learning: figure-vivid Ganesha ≠ max phaseFlow first; high flow+surface = body melt not “power”
- status: **discard**

#### CASE-2026-07-30-r299-v2 | cosmos-vivid hard-pulse (FAIL process + aesthetic)
- hypothesis: kill phase → colorCycle + multipass + godRays for “no wobble”
- recipe: golden **cosmos-vivid-oklch-r24b** + colorCycle.speed **14** + godRays main + multipass warp0
- preview: `out/layered/2026-07-30_r299-neon-ganesha-om-aura-v2-cosmos-9f23be31/…-preview.mp4`
- QA: **FAIL** olive + sourceColorDrift/localDrift (repaint path)
- judge: **FAIL** — type tree violated (`allover` recipe on figure); R-018 colorCycle on body; §5 **godRays as main motion KILLED (R-038)**
- learning: cosmos is **not** anti-wobble fix for figure; killed axes stay killed under pressure
- status: **discard** · family blocked for re-preview without new evidence (R-053 spirit)

#### CASE-2026-07-30-r299-v3/v4 | radiance-lock / glow-rays-only (FAIL process)
- hypothesis: Isaac hates 꿀렁 → micro/zero phaseFlow + godRays/glow as energy
- recipe: r221 shell but phaseFlow **12** or **0** · godRays **0.78–0.92** main · multipass warp0
- preview: `…v3-radiance-lock-c4267301/…` · `…v4-glow-rays-7b197365/…`
- QA: PASS / PASS-with-static WARNs
- judge: **FAIL Isaac** — “별로” · “계속 고도화” then forced OS re-read
- learning: “꿀렁 싫다” ≠ kill sourcePrism. Correct fix = **silk surface/detail/warp↓** while keeping moderate phaseFlow (r255–r258). godRays-main remains §5 KILLED
- status: **discard**

#### CASE-2026-07-30-r299-enterprise-v1 | r221 silk return (process PASS · HOLD look)
- hypothesis: re-enter CREATE-OS — figure-vivid r221 + silk delta only
- recipe: r221 · surface **12** · phaseFlow **30** · cycles5 · detail **0.90** · mp **0.10** warp **0.005** · colorCycle **0** · clamp **0.24** · godRays **0** · no spin
- preview: `out/layered/2026-07-30_r299-neon-ganesha-enterprise-silk-20298b50/r299-neon-ganesha-enterprise-silk-preview.mp4`
- stills: `out/manual-runs/r299-neon-ganesha-om-aura/stills/{contact,subsec}.png`
- QA: olive0.015 drift0.12 local0.214 seam1.15 motion0.11 · **PASS** (hueJump WARN)
- judge: HOLD Isaac — process corrected; look intermediate
- learning: enterprise path = type→golden→single silk delta→stills+qa+case; no preset roulette
- status: delivered-preview (superseded by v2 for speed request)

#### CASE-2026-07-30-r299-enterprise-v2 | fast-silk-sharp (QA PASS · HOLD Isaac)
- defect from Isaac on enterprise-v1 path: want **faster + sharper + smoother** + stable QA
- single-family delta (not new recipe): speed↑ via phaseFlow/cycles; silk via surface/detail/warp↓; sharp via cleaner bloom thresh + mild CA + clamp tighten
- recipe: r221 · surface **10** · phaseFlow **40** · cycles **8** · detail **0.86** · mp **0.11** warp **0.004** · clamp **0.22** · greenCompress **0.58** · bloom thr **0.68** · colorCycle **0** · godRays **0** · phase edge+mix only
- work-dir: `out/manual-runs/r299-neon-ganesha-om-aura/`
- preview: `out/layered/2026-07-30_r299-neon-ganesha-enterprise-v2-fast-silk-e6165507/r299-neon-ganesha-enterprise-v2-fast-silk-preview.mp4`
- stills: `out/manual-runs/r299-neon-ganesha-om-aura/stills-v2/{contact,subsec}.png`
- QA: olive0.013 drift0.111 local0.202 seam1.16 motionDensity **0.126** · **PASS** (hueJump WARN only)
- judge: **HOLD Isaac visual** — ready for full only after visual OK + gate
- learning: **fast + silk + sharp + QA** = raise phaseFlow/cycles, lower surface/detail/warp, tighten clamp; never cosmos/godRays-main for Ganesha figure
- rules: **R-062 new** · **R-063 new** · R-001/R-018/R-038/R-013 confirm · §0 no-spin confirm
- status: **delivered-preview** (current best for r299)

#### CASE-2026-07-30-r300-v1 | r300-ganesha-rainbow-rings (FAIL 꿀렁)
- source: `sources/incoming/r300-ganesha-rainbow-rings-1632.png` 1632×2912 (session JPEG R-064) — type=`figure-vivid` satMean=0.94 finishedVivid=0.59 greenRisk=true · concentric rings
- hypothesis: copy r299-enterprise-v2 (phaseFlow**40**) as Ganesha default
- recipe: surface10 · phaseFlow**40** · cycles8 · detail0.86 · mp0.11
- preview: `out/layered/2026-07-30_r300-ganesha-rainbow-rings-47d5932f/…-preview.mp4`
- QA: PASS · localDrift0.296
- judge: **FAIL Isaac** — “별로야 왜 꿀렁꿀렁거려 자꾸”
- learning: **phaseFlow40 = 꿀렁** on smooth deity skin even if surface is silk; r299-v2 “fast” recipe is **not** anti-wobble default. After 꿀렁 flag, never re-raise phaseFlow for speed.
- status: **discard** as look pick

#### CASE-2026-07-30-r300-v2 | r300-anti-wobble-silk
- defect: r300-v1 꿀렁
- fix (single family): phaseFlow **40→18**, cycles **8→4**, surface **10→6**, detail **0.86→0.75**, mp **0.11→0.07** warp **0.003**, glowWave↑ for energy without melt, clamp0.20
- recipe: r221 anti-wobble silk
- preview: `out/layered/2026-07-30_r300-ganesha-anti-wobble-*/r300-ganesha-anti-wobble-preview.mp4`
- work-dir: `out/manual-runs/r300-ganesha-rainbow-rings/` (scene id `r300-ganesha-anti-wobble-silk`)
- judge: HOLD Isaac — form should hold; ring/body less liquid
- learning: **꿀렁 primary knob = phaseFlowPx** (not only surface); energy via glowWave not flow
- rules: **R-063 updated**
- status: **delivered-preview** (current r300 best)

#### CASE-2026-07-30-folder29-v1 | r301–r303 anti-wobble batch (FAIL Isaac aesthetic)
- source dir: `/Users/isaac/Downloads/항목을 포함하는 새로운 폴더 29/` — 3× native 1632 PNG (woman + open skull + buddha stack + rainbow)
- hypothesis (WRONG): blanket r300-v2 anti-wobble (flow**18**/surface**6**) on all three after Ganesha 꿀렁
- previews v1: `…r301…892c5f41…` · `…r302…2082c11c…` · `…r303…fcfd3469…`
- QA: all PASS numerically
- judge: **FAIL Isaac** — “3개 다 별로야 너 왜케 멍청해졌어”
- learning: **QA PASS ≠ product.** Over-correcting 꿀렁 → dead motion (lightStatic 0.7–0.9). These sources need **chroma river on paint/rainbow** with **face hold**, not global low-flow freeze. Do not copy Ganesha anti-wobble onto liquid-portrait plates.
- status: **discard** v1 looks

#### CASE-2026-07-30-folder29-v2 | r301–r303 portrait-chroma-river (FAIL Isaac)
- defect: v1 dead / 별로
- fix: r221 · phaseFlow**34** surface**12** · colorMotionMask satW0.95
- judge: **FAIL Isaac** — still “다 별로 / 극도로 환각”
- status: **discard**

#### CASE-2026-07-30-folder29-v3 | r301–r303 extreme-halluc (FAIL Isaac aesthetic bar)
- recipe: flow**52** surface**18** mp**0.22** sat1.72 glow high
- motionDensity ~0.17–0.23 · QA PASS
- judge: **FAIL Isaac** — “다 별로야 극도로 환각적이어야돼”
- status: **discard** as pick (kept as ledger)

#### CASE-2026-07-30-folder29-v4 | r301–r303 max-halluc (superseded by v5)
- recipe: flow58 surface24 mp0.32 warp**0.012** — high density but risk **muddy boil** (warp+surface grit)
- motionDensity 0.21–0.28 · QA PASS
- status: open-alt (raw intensity)

#### CASE-2026-07-30-folder29-v5 | r301–r303 smooth-extreme (alt)
- silk extreme: flow60 surface14 mp0.28 warp0.005 · motion 0.19–0.26 · QA PASS
- status: open-alt

#### CASE-2026-07-30-folder29-v6 | r301–r303 per-source (FAIL Isaac structure)
- single-layer full-frame prism stacks (v1–v6) felt like **uniform acid overlay** — no optical layer separation
- status: **discard** as look pick

#### CASE-2026-07-30-folder29-v7 | r301–r303 optical multi-layer (FAIL Isaac progressive)
- multi-band optical + low multipass tried after overlay complaint
- judge: **FAIL Isaac** — “점점 더 별로야” (worse trajectory)
- learning: optical multi-layer is **not auto-fix** for this family; can look weaker/broken vs single-layer r221. Don't thrash further without Isaac specific defect.
- status: **discard**

#### CASE-2026-07-30-r304 | r304-openhead-buddha-stack reset
- source: session JPEG→1632 open-head 4-buddha stack + fire face + rainbow (R-064)
- path: **hard reset** to single-layer r221 + sat colorMotionMask + low multipass/CA (stop multi-layer thrash)
- knobs: flow**38** surface**12** detail0.88 · mp**0.06** warp0.002 · CA0.03 · colorCycle0 · no spin
- preview: `out/layered/2026-07-30_r304-openhead-buddha-stack-reset-86670a2c/r304-openhead-buddha-stack-reset-preview.mp4`
- QA: PASS (darkDwell WARN) · motion 0.11
- judge: **HOLD Isaac** — baseline product path after failed experiments
- status: **delivered-preview**

#### CASE-2026-07-30-folder30-v1 | r311–r313 weak-same-pattern (FAIL Isaac)
- source dir: `/Users/isaac/Downloads/항목을 포함하는 새로운 폴더 30/` — 3× native **1632×2912 PNG** (stacked buddha heads + tree/halo family)
- **process fail:** agent did **not** re-read §9 folder29 ledger before batch; applied one halluc knob pack to all three → “패턴 다 똑같”
- recipe v1: r221 single · flow**46** surface**34** glow0.26 · mp0.06 · **same** edge+mix on a/b/c
- previews: `…r311-folder30-a-e940d659…` · `…r312-folder30-b-a04b25e3…` · `…r313…v2-1859a3ba…` (c olive fix)
- QA: a/b PASS · c PASS after olive clamp
- judge: **FAIL Isaac** — “더 세게 / 패턴 다 똑같”
- learning: folder29 already proved **identical recipe on 3 similar stack-buddha plates = fail product**; differentiate phase language only after one golden baseline is visually OK — not invent 3 knob clones first
- status: **discard**

#### CASE-2026-07-30-folder30-v2 | r311–r313 differentiated-extreme (FAIL Isaac)
- defect: v1 weak + same pattern
- recipe: a edge+mix flow**58** surf42 · b **detail+luma-hybrid** flow**64** glow0.44 · c edge+**vertical** flow52 surf48 · still no angular/rotate
- previews: `…r311…v2-extreme-1c886d0e…` · `…r312…v2-extreme-32813d91…` · `…r313…v3-extreme-ee42f2c1…`
- QA: motion **0.24–0.28** PASS · c olive re-fixed
- judge: **FAIL Isaac** — “3개 다 별로야”
- learning: **same class as folder29-v3–v7.** Extreme flow/surface + phase-pair cosmetics ≠ product. §9 folder29 already discarded: anti-wobble dead, extreme still 별로, multi-layer worse trajectory. **Do not thrash folder30 further without Isaac defect line.** R-013 2-miss stop applies (v1+v2 both Isaac FAIL).
- status: **discard** · open only if Isaac names specific axis (or renounces this batch)

#### CASE-2026-07-30-folder30-v3 | r311–r313 r304-reset re-render (FAIL Isaac)
- request: Isaac “3개 다시 다 뽑아” after MD-skip scold
- path: **documented r304 hard-reset only** — single-layer r221 · edge+mix · flow**38** surface**12** detail**0.88** · mp**0.06** warp0.002 · CA0.03 · sat colorMotionMask · colorCycle0 · no spin · native 1632 PNG
- work-dirs: `out/manual-runs/r311-folder30-a/` · `r312-folder30-b/` · `r313-folder30-c/`
- previews:
  - a: `out/layered/2026-07-30_r311-folder30-a-v3-r304reset-54f5d4fc/r311-folder30-a-v3-r304reset-preview.mp4`
  - b: `out/layered/2026-07-30_r312-folder30-b-v3-r304reset-7f3b229f/r312-folder30-b-v3-r304reset-preview.mp4`
  - c: `out/layered/2026-07-30_r313-folder30-c-v3-r304reset-olive-b930d262/r313-folder30-c-v3-r304reset-olive-preview.mp4` (olive single-axis greenCompress0.72 after base olive FAIL)
- stills: each `…/stills-v3-r304reset/`
- QA: a PASS motion~0.11 · b PASS motion~0.12 · c PASS olive0.038 motion~0.12
- judge: **FAIL Isaac** — “다 별로야 더 연구해서 더 좋게 / 더 환각적으로”
- learning: r304 reset is exit-from-thrash baseline, **not** max-halluc product for stack-buddha plates (lightStatic ~0.75)
- status: **discard** as look pick

#### CASE-2026-07-30-folder30-v4 | r311–r313 careful-max-halluc (HOLD Isaac)
- research: §9 r297 careful-max (flow↑ surface**16** detail**0.88** mp**0.16**) · folder29 chroma-river need (sat colorMotionMask) · R-063 silk = surface/detail/warp low + glow energy · avoid v2 phase-pair thrash + surface34 grit + multi-layer
- recipe (single family, edge+mix only): surface**14** detail**0.92** mp**0.15** warp**0.004** · sat colorMotionMask 0.96 · glow dual high · colorCycle0 · rotate0
  - a: flow**54** cycles9 glow0.34 · b: flow**58** cycles11 glow0.38 · c: flow**52** cycles8 glow0.32 green0.70
- previews:
  - a: `out/layered/2026-07-30_r311-folder30-a-v4-careful-max-halluc-5ba453ff/r311-folder30-a-v4-careful-max-halluc-preview.mp4`
  - b: `out/layered/2026-07-30_r312-folder30-b-v4-careful-max-halluc-795a4a51/r312-folder30-b-v4-careful-max-halluc-preview.mp4`
  - c: `out/layered/2026-07-30_r313-folder30-c-v4-careful-max-halluc-a8107d5b/r313-folder30-c-v4-careful-max-halluc-preview.mp4`
- stills: each `…/stills-v4-careful-max/`
- QA: a PASS motion**0.20** · b PASS motion**0.25** · c PASS olive0.031 motion**0.22** (vs v3 ~0.11–0.12)
- judge: **FAIL Isaac** — “다 별로야” → new source (abandon folder30 batch)
- status: **discard** (folder30 series closed for now)



#### CASE-2026-08-04-r318-v1 | mushroom-head-portrait liquid-river (HOLD Isaac)
- source: chat mushroom-crown split-face portrait (1121→lanczos 1632) — figure-vivid finishedVivid≈0.27 sat≈0.52 **greenRisk true** busyness≈0.08
- composition: realistic lower face + rainbow liquid mid-face + mushroom crown + woodcut-wave BG (spiral CW risk)
- path: r221 edge+luma-hybrid phaseMix**0.28** · surface**22** chroma**5** flow**42**/8 · greenCompress**0.68** · mp**0.08** rotate**0** · dual glow slow · sat-weighted CMM
- work-dir: `out/manual-runs/r318-mushroom-head-portrait/`
- preview: `out/layered/2026-08-04_r318-mushroom-head-portrait-v1-7d5154ac/r318-mushroom-head-portrait-v1-preview.mp4`
- stills: `out/manual-runs/r318-mushroom-head-portrait/stills-v1/`
- QA: see qa-preview-v1.txt
- judge: **HOLD Isaac**
- status: preview ready

#### CASE-2026-08-04-r317-v1 | third-eye-liquid-face (HOLD Isaac)
- source: chat attach third-eye liquid face (re-encode **1121×2000** → lanczos **1632×2912**) — type `figure-vivid` finishedVivid≈0.41 sat≈0.55 · **concentric third-eye rings** CW risk (r314 class)
- path: r221 edge+mix · surface**18** chroma**3** flow**36**/cycles**6** detail**1.08** · mp**0.07** warp0.002 rotate**0** · dual glow 0.32/0.18 slow · colorCycle0
- work-dir: `out/manual-runs/r317-third-eye-liquid-face/`
- preview: `out/layered/2026-08-04_r317-third-eye-liquid-face-v1-ce27aff3/r317-third-eye-liquid-face-v1-preview.mp4`
- stills: `out/manual-runs/r317-third-eye-liquid-face/stills-v1/`
- QA: see qa-preview-v1.txt
- judge: **HOLD Isaac**
- status: preview ready · R-064 note: prefer native 1632 if available

#### CASE-2026-08-03-r312-v7 | halluc-slow-river (PASS Isaac · full + Adhana)
- defect: v6 “너무 빨라서 정신없어”
- path: surface**22** chroma**3** flow**34**/cycles**6** detail**1.28** · glow speed 28/42 · mp**0.11** warp0.003 rotate**0**
- work-dir: `out/manual-runs/r312-folder30-b/` · scene `scene-v7-halluc-slow-river.json` · active `scene.json`
- source: `sources/folder30/folder30-2.png` (sha via scaffold-manifest)
- preview: `out/layered/2026-08-03_r312-folder30-b-v7-halluc-slow-river-2638612a/r312-folder30-b-v7-halluc-slow-river-preview.mp4`
- stills: `out/manual-runs/r312-folder30-b/stills-v7-halluc-slow/`
- **full (silent)**: `out/layered/2026-08-03_r312-folder30-b-v7-halluc-slow-river-final-42db4852/r312-folder30-b-v7-halluc-slow-river-final.mp4` · 1632×2912 · 20s@30
- **full + audio**: `…/r312-folder30-b-v7-halluc-slow-river-final-with-adhana.mp4`
  - track: `/Users/isaac/Downloads/Vini Vici & Astrix - Adhana.wav`
  - start: **3:03 (t=183s)** · length 20s · AAC 320k · video copy
- gate: **PASS** cohere**0.824** fine**0.220** · report `out/manual-runs/r312-folder30-b/gate-v7.json`
- QA preview: PASS motion**0.27**
- judge: **PASS Isaac** (“ㅇㅋ 합격 풀렌더” + Adhana @3:03 explicit)
- status: **closed final** (local `out/` only — **not** lock-pack / recipes/locks unless requested)

#### CASE-2026-08-03-r312-v6 | max-halluc-flow (HOLD Isaac)
- defect: v5 “환각 텍스쳐 부족 + 전반 흐르는 느낌 필요”
- path: surface**24** chroma**8** flow**64**/cycles**16** phaseMix**0.12** detail**1.32** phaseScale**8.6** · sat**2.02** dual glow 0.58/0.38 soft sharp · mp**0.18** warp0.007 rotate**0** · CMM floor0.03
- schema caps: phaseFlowPx≤64 · glow fieldCycles≤2
- preview: `out/layered/2026-08-03_r312-folder30-b-v6-max-halluc-flow-62bd47d0/r312-folder30-b-v6-max-halluc-flow-preview.mp4`
- stills: `out/manual-runs/r312-folder30-b/stills-v6-max-halluc-flow/`
- QA: PASS · motion**0.36** (v5 0.30) · lightStatic**0.26** (v5 0.32) · warn hueJump95, darkDwell
- judge: **HOLD Isaac**
- status: preview ready

#### CASE-2026-08-03-r312-v5 | advanced-halluc-river (HOLD Isaac)
- source: `sources/folder30/folder30-2.png` · reopen r312 only after folder30-v4 discard
- path: single-layer r221 edge+mix · **chromaCycles4** (v4=0) · surface**12** silk · flow**50**/cycles**9** · detail**1.05** · sat**1.88** · dual glow 0.44/0.26 · mp**0.11** warp0.003 rotate**0** · CMM floor0.05 satW0.98
- delta vs v4 careful-max: chroma river + silk surface↓ + flow less-boil + glow/sat/bloom↑ + multipass↓ (sun CW safety r314) + CMM inclusive (lightStatic↓)
- preview: `out/layered/2026-08-03_r312-folder30-b-v5-advanced-halluc-river-093742b1/r312-folder30-b-v5-advanced-halluc-river-preview.mp4`
- stills: `out/manual-runs/r312-folder30-b/stills-v5-advanced-halluc/`
- QA: PASS · motion**0.30** (v4 0.25) · hueJump PASS · lightStatic**0.32** (v4 0.38) · warn darkDwell only
- judge: **HOLD Isaac** visual
- status: preview ready · full only after Isaac OK + gate

#### CASE-2026-07-30-r314-v1 | r314-multieye-sun-cascade (FAIL circular psych)
- source: chat multieye cascade + sun + particle glitter (session JPEG **1121×2000**, orig 1632×2912 lost — **R-064**)
- type: `figure-vivid` finishedVivid≈0.57 · particle + **concentric sun/iris** critical
- path v1: r221 · edge+mix · surface12 flow**52** cycles**9** · mp**0.14** rotate**0** · glow high
- preview: `out/layered/2026-07-30_r314-multieye-sun-cascade-fb2d5ada/…-preview.mp4`
- judge: **FAIL Isaac** — “맛이 갔네… 패턴들이 원형으로 빙글빙글”
- diagnosis: **not** multipass.rotate (was already 0) and **not** phase-angular. Drivers = (1) multipass feedback **rings** on concentric sun (2) phase-edge advection riding circular iris/sun contours + high phaseFlowCycles
- learning: concentric-source plates → keep **mp ≤0.04** (r308 ring lesson); lower phaseFlowCycles; energy via glow. “빙글” ≠ always R-060 spin knob violation
- status: **discard** v1 look

#### CASE-2026-07-30-r314-v2 | r314 anti-circular (superseded by v3 layers)
- defect: v1 circular psych rings
- fix: mp **0.14→0.03** warp0.001 · flow **52→38** cycles **9→4** · bloom thr↑ · CA↓ · glow keeps energy · still edge+mix · rotate0
- preview: `out/layered/2026-07-30_r314-multieye-v2-anti-circular-769e82ce/r314-multieye-v2-anti-circular-preview.mp4`
- stills: `out/manual-runs/r314-multieye-sun-cascade/stills-v2-anti-circular/`
- QA: motion**0.18** · **PASS** (hueJump WARN)
- status: open-alt single

#### CASE-2026-07-30-r314-v3 | r314 optical multi-layer desync (HOLD Isaac)
- request: Isaac “레이어들좀 살려줘 각각”
- path: `make-optical-layers` 5-band + per-band desync · **mp 0.035 rotate 0** (keep anti-circular) · no angular/radial phase
  - void lum+vert flow20 · body edge+mix flow32 · ornament detail+mix flow**56** glow0.40 · highlight luma-hybrid flow44 glow0.42 · edge op0.42 flow22
- masks: void25% body64% ornament13% highlight8% edge12%
- preview: `out/layered/2026-07-30_r314-multieye-v3-layers-81e69d2c/r314-multieye-v3-layers-preview.mp4`
- stills: `out/manual-runs/r314-multieye-sun-cascade/stills-v3-layers/`
- QA: motion**0.16** olive0.016 · **PASS** (lightStatic WARN 0.82)
- judge: **HOLD Isaac visual**
- status: **delivered-preview** (current r314 pick)

#### CASE-2026-07-31-r315 | r315-liquid-paint-eye
- source: chat liquid-paint face close-up (eye + melt chroma) session JPEG **1121×2000** (R-064)
- type: `figure-vivid` finishedVivid≈0.26 satMean≈0.35 · paint river + skin identity
- v1: flow48 surface14 mp0.10 clamp0.22 → **FAIL** localDrift **0.358**
- v2: clamp0.18 mp0.08 only → localDrift still **0.358** (clamp alone insufficient)
- v3: flow **36** surface12 mp**0.05** clamp**0.14** glow dual · sat colorMotionMask · edge+mix rotate0
- preview ★: `out/layered/2026-07-31_r315-liquid-paint-eye-v3-2f299fd1/r315-liquid-paint-eye-v3-preview.mp4`
- stills: `out/manual-runs/r315-liquid-paint-eye/stills-v3/`
- QA v3: localDrift **0.260** · motion**0.15** · **PASS** (hueJump WARN)
- judge: **HOLD Isaac visual**
- learning: large white/skin + paint river → localDrift needs **flow↓ + mp↓ + clamp**, not clamp alone (R-044)
- status: **delivered-preview**

#### CASE-2026-07-31-r316-v1 | r316-mushroom-crown-buddha (FAIL CW texture look)
- source: chat mushroom-crown liquid-paint buddha (session JPEG **1121×2000**, R-064)
- path v1: flow40 surface**13** mp0.07 **warp0.002** rotate0
- judge: **FAIL Isaac** — “시계방향으로 도는 텍스쳐”
- diagnosis (shader): **not** multipass.rotate / phase-angular. Drivers = (1) multipass **`warp*r` polar swirl** in `multipass-feedback.frag` (2) **`surfaceCycles` OKLab ab rotation** in `layer.frag`
- status: **discard** v1

#### CASE-2026-07-31-r316-v2 | r316 no-cw re-render (FAIL Isaac aesthetic)
- request: “시계방향으로 도는 텍스쳐 아예 없게”
- fix: multipass **warp=0** · **surfaceCycles=0** · phaseFlow 36 · glow dual
- preview: `out/layered/2026-07-31_r316-mushroom-v2-no-cw-5848d2f3/r316-mushroom-v2-no-cw-preview.mp4`
- judge: **FAIL Isaac** — “이게 더 별로야 이전버전이 좋았어”
- learning: killing warp+surfaceCycles removes CW LOOK but also kills the lively paint river Isaac preferred on this plate. **Do not re-apply full anti-cw stack without softer middle option.**
- status: **discard**

#### CASE-2026-07-31-r316-v1-pick | r316 restore v1 (superseded by v3 soft)
- request: prefer previous version over v2
- path: restore scene-v1 (flow40 surface13 mp0.07 warp0.002) · re-export
- preview: `out/layered/2026-07-31_r316-mushroom-v1-pick-9f75517b/r316-mushroom-v1-pick-preview.mp4`
- QA: **PASS** motion0.16
- status: open-alt (CW still too strong for Isaac)

#### CASE-2026-07-31-r316-v3 | r316 soft-cw middle (superseded by v4 extreme)
- request: “시계열 회전 좀만 죽여줘 너무 거슬려” (not full kill)
- path: v1 base · warp **0.002→0.0006** · surfaceCycles **13→6** · phaseFlowCycles **6→4** · mp 0.06 · flow **40** · glow same · rotate0
- preview: `out/layered/2026-07-31_r316-mushroom-v3-soft-cw-10ea979d/r316-mushroom-v3-soft-cw-preview.mp4`
- QA: motion**0.15** · **PASS**
- status: open-alt

#### CASE-2026-07-31-r316-v4 | r316 extreme + soft-cw (FAIL CW still)
- request: “더 극한으로 세게”
- path: flow**56** surface**8** mp**0.12** warp0.0007 · glow0.42
- preview: `out/layered/2026-07-31_r316-mushroom-v4-extreme-838f04c6/r316-mushroom-v4-extreme-preview.mp4`
- judge: **FAIL Isaac** — “시계열 거슬려” + want sharper/vivid
- status: **discard** as look pick

#### CASE-2026-07-31-r316-v5 | r316 sharp-vivid anti-cw (superseded)
- request: CW kill + “최대한 선명하고 쨍하게”
- path: warp0 surface0 · flow48 · glow sharp high · sat1.78 · bloom thr0.72
- preview: `out/layered/2026-07-31_r316-mushroom-v5-sharp-vivid-9323fccf/…`
- judge: Isaac wants **flow texture not sparkle** (not more glitter)
- status: open-alt

#### CASE-2026-07-31-r316-v6 | r316 flow-texture (superseded by deep review)
- request: “반짝보다는 텍스쳐가 흐르는 느낌”
- path: glow soft · phaseFlow52 surface4 · still **phase-edge default family** + single layer
- preview: `out/layered/2026-07-31_r316-mushroom-v6-flow-15631f00/…`
- status: open-alt

#### CASE-2026-07-31-r316-deep-review | patchy CW vs full-field flow
- Isaac: “군데군데 시계열 회전이 아니라 레이어별 모든 텍스쳐가 흐르듯 환각”
- **Root causes (shader evidence):**
  1. `phase-edge` locks motion to contours → local orbit on body swirls (looks like patch CW)
  2. `phaseFlow` uses `dir*sin + normal*0.55*cos` → geometric normal component orbits flow lines
  3. `colorMotionMask` high edgeWeight/floor → only patches animate
  4. multipass `warp*r` polar swirl (if warp>0); surfaceCycles high = OKLab color spin
  5. optical multi-layer (v7) desync → **seamRatio FAIL 1.7** + lightStatic high — not product-ready on this plate
- **Product path v8:** single full-field · **phase-mix + phase-detail** (not edge) · **no colorMotionMask** · phaseFlow**54** surface**5** · warp**0** · glow soft · rotate0
- multi v7/v7b: kept as evidence only (`scene-v7b-multi-seamfail.json`)

#### CASE-2026-07-31-r316-v8 | r316 fullfield texture flow (superseded by v10)
- preview: `out/layered/2026-07-31_r316-mushroom-v8-fullfield-23116cc0/r316-mushroom-v8-fullfield-preview.mp4`
- stills: `out/manual-runs/r316-mushroom-crown-buddha/stills-v8-fullfield/`
- QA: motion**0.13** lightStatic**0.78** seam1.28 · **PASS**
- learning: architecture OK (anti patchy-CW) but **surface5 + flow54 alone** under-energizes color river (high lightStatic)
- status: open-alt / architecture base for v10

#### CASE-2026-07-31-r316-v9 | r316 r275-family copy (FAIL process + look risk)
- error: treated r316 as r275 same product → **godRays@crown + surface28 + phase-edge/luma-hybrid + cmm lum-led**
- evidence: r275 PNG vs r316 JPEG pixel mean L1 **~230** (different plate — profile third-eye vs meditating liquid-paint buddha)
- QA: hueJump**71** bleachDwell 0.019 · motion0.16 · PASS metrics but wrong class
- preview: `out/layered/2026-07-31_r316-mushroom-v9-r275family-a9fc0e4b/…`
- scene backup: `scene-v9-r275family-discard.json`
- learning: **never copy closed lock knobs across different subjects**; r275 was woodblock+beam hero, r316 is figure-vivid liquid form-paint (R-064 session JPEG)
- status: **discard**

#### CASE-2026-07-31-r316-v10 | r316 form-river silk (ACTIVE — deep redesign)
- Isaac: “계속 구려져… 심층적으로 사고해서 발전”
- **Deep diagnosis (not knob thrash):**
  1. Class = **figure-vivid liquid-paint buddha** (finishedVivid 0.45, concentric form rivers in source) → r221/silk path, **not** r275 crown-beam
  2. CW root (shader): multipass `warp*r` polar · high `surfaceCycles` OKLab ab spin · `phase-edge` contour lock · cmm edge patches · phaseFlow normal orbit
  3. Thrash path: kill surface (v2 dead) ↔ raise flow/surface extreme (v4 CW) ↔ multi-layer (v7 seam FAIL) ↔ r275 copy (v9 wrong class)
  4. v8 architecture correct for anti-patchy but energy floor too low (surface5 → lightStatic 0.78)
- **Product path v10 = v8 architecture + silk color-river energy (one coherent axis):**
  - phase **mix + detail** (not edge) · **no colorMotionMask** · **warp0** · **godRays0** · rotate0
  - surfaceCycles **12** (silk river; not 5 dead / not 28 wheel)
  - phaseFlowPx **38** · phaseMix **0.42** (temporal full-field morph) · phaseScale **5.8**
  - detailBoost **0.98** · clamp **0.20** · sat **1.68** · mp **0.08** warp0
  - bloom thr **0.55** (lift face without godray bleach)
- preview ★: `out/layered/2026-07-31_r316-mushroom-v10-form-river-3c23aafe/r316-mushroom-v10-form-river-preview.mp4`
- stills: `out/manual-runs/r316-mushroom-crown-buddha/stills-v10-form-river/`
- QA: motion**0.16** lightStatic**0.38** seam1.19 localDrift0.16 · **PASS** (hueJump WARN)
- delta vs v8: motion↑ lightStatic↓ (0.78→0.38) without godRays/edge lock
- status: superseded by v11 (Isaac: 자글자글 노이즈)
- open-alts: v1-pick (CW strong but vivid), v8 (architecture base), v10 (form-river pre-denoise)

#### CASE-2026-07-31-r316-v11 | r316 silk-denoise (ACTIVE)
- Isaac: “자글자글 노이즈 낀거같아 전반적으로”
- **HF drivers (r243/r255/R-064):** phase-**detail** spatial grain · detailBoost~1 + surface spin chroma boil · multipass×session JPEG blocks · sat amp
- **one silk axis (keep v10 form-river arch):**
  - phase-detail → **phase-luma-hybrid**
  - surface **12→9** · detailBoost **0.98→0.82** · phaseScale **5.8→5.0**
  - mp **0.08→0.05** · sat **1.68→1.60** · soft bloom radius↑
  - grain/noise **0** · warp0 · godRays0
- preview: `out/layered/2026-07-31_r316-mushroom-v11-silk-denoise-559ad2c9/r316-mushroom-v11-silk-denoise-preview.mp4`
- stills: `out/manual-runs/r316-mushroom-crown-buddha/stills-v11-silk-denoise/`
- gate: **REJECT temporal-boiling** cohere **0.754** < floor **0.810**
- status: superseded by v15 (gate PASS path)

#### CASE-2026-07-31-r316-gate | temporal-boiling → PASS
- fail chain: v11 cohere0.754 · v12 0.794 · v13 structureFlow **worse** 0.774+edge-damage · v14 glue 0.795
- root: HF liquid-paint + **phaseFlowPx sampling morph** → chroma-motion field remaps frame-to-frame (metric: shiftedCorrelation of per-cell chroma Δ)
- **gate next-policy honored:** not amplitude thrash; freeze phase map = new motion regime
- **PASS recipe v15:** `phaseFlowPx=0` · phaseMix0 · mp0 · surface**18** · phase edge+luma-hybrid · lum cmm · glowWave2=0 · breath0 · detail0.90
- gate report: `out/manual-runs/r316-mushroom-crown-buddha/gate-v15.json` — cohere **0.825** · fine0.235 · edge0.865 · **PASS** (no humanOverride)
- preview: `out/layered/2026-07-31_r316-mushroom-v15-gate-pass-6289c4e3/r316-mushroom-v15-gate-pass-preview.mp4`
- full: `out/layered/*r316-mushroom-v15-gate-pass-final*/` (export with `--full-res --gate-report gate-v15.json`)
- learning: on concentric liquid-paint figures, **phaseFlowPx>0** can hard-cap temporalCoherence ~0.79; fixed phase + surface river passes floor
- status: superseded by v16 (Isaac sharp + anti-droplet)

#### CASE-2026-07-31-r316-v16 | sharp + anti-blob (ACTIVE)
- Isaac: “더 선명하게” + “물방울처럼 생긴 텍스쳐 거슬려”
- drivers: glowWave crest blobs + soft bloom disks + low phaseScale oily islands
- delta from v15 (keep gate-critical phaseFlowPx**0**/mp0):
  - glow **0** · bloom **0.16**/thr**0.72** · contrast **1.12** · sCurve **0.09**
  - detailBoost **1.08** · phaseScale **7.2** · surface **16** · CA↓
- preview: `out/layered/2026-07-31_r316-mushroom-v16-sharp-anti-blob-af6774b3/r316-mushroom-v16-sharp-anti-blob-preview.mp4`
- gate: **PASS** cohere **0.829** · edge **0.919** · `gate-v16.json`
- status: superseded by v17 (Isaac max psych + face/crown)

#### CASE-2026-07-31-r316-v17 | psych face+crown (ACTIVE)
- Isaac: 버섯·얼굴 강조 + 최대한 환각 + “지금 컬러 전혀 사이키델릭하지 않아”
- keep: phaseFlowPx**0** · mp0 · glow**0** (anti-blob + gate cohere)
- psych color: surface**30** · chromaCycles**5** · sat**1.88** · inject**0.014** · detail**1.28** · clamp**0.28**
- crown: godRays**0.58** @0.50/0.20 · bloom thr0.50 (highlight key, not soft wash)
- face: valueLift0.03 + high sat river on mid-tones (cmm lum+sat)
- preview: `out/layered/2026-07-31_r316-mushroom-v17-psych-face-crown-e885664a/r316-mushroom-v17-psych-face-crown-preview.mp4`
- gate: **PASS** cohere **0.866** · edge0.912 · `gate-v17.json`
- status: superseded by v17b (face still dark on v17 stills)

#### CASE-2026-07-31-r316-v17b | face+crown max pop (ACTIVE)
- face was still dark/muted on v17 mid still → sat**1.98** inject**0.022** valueLift**0.055** clamp**0.32** surface**32** chroma**6**
- crown godRays**0.78** @0.50/0.19 · bloom thr**0.44** · glow still **0**
- preview ★: `out/layered/2026-07-31_r316-mushroom-v17b-face-crown-pop-b4c08a11/r316-mushroom-v17b-face-crown-pop-preview.mp4`
- gate: **PASS** cohere **0.868** · edge0.917 · `gate-v17b.json`
- full: `out/layered/2026-07-31_r316-mushroom-v17b-face-crown-pop-final-c30e684c/r316-mushroom-v17b-face-crown-pop-final.mp4` (1120×2000 · 20s · gate PASS no override)
- status: superseded by v18 (right-side source mushrooms = “물방울”)

#### CASE-2026-07-31-r316-v18 | remove right-side droplet mushrooms (ACTIVE)
- Isaac: “우측에 도대체 왜 물방울 텍스쳐 수십개”
- **root cause:** not shader glow — **source pixels** = body-right mushroom cluster (dozens of round caps). Crown mushrooms kept.
- fix: inpaint source → `source-no-right-mush.png` (backup `source-with-right-mushrooms.png`) · scene knobs same as v17b
- preview: `out/layered/2026-07-31_r316-mushroom-v18-no-right-droplets-c5016c8e/r316-mushroom-v18-no-right-droplets-preview.mp4`
- gate: **PASS** cohere **0.865** · `gate-v18.json`
- status: superseded by v19 (BG circle outlines were the real “물방울”)

#### CASE-2026-07-31-r316-v19 | BG bubble-circle clean (ACTIVE)
- Isaac crop: right pale-blue BG full of circular outline chains (not body mushrooms)
- **root:** source background mandala/bubble line art; prism/sat makes them neon-pink rings
- fix: source inpaint clean BG circles only · keep rays + crown · scene = v17b knobs
- preview: `out/layered/2026-07-31_r316-mushroom-v19-bg-circles-clean-6b9a660a/r316-mushroom-v19-bg-circles-clean-preview.mp4`
- gate: **PASS** cohere **0.838** · `gate-v19.json`
- status: superseded by v19g

#### CASE-2026-07-31-r316-v19g | BG circles gone + gate PASS (ACTIVE)
- Isaac crop: right BG circular outline “물방울” (not body mushrooms)
- **dual root:** (1) source BG mandala circles (2) stale phase + full-field prism re-colors BG into ring islands
- fix: clean source (no circles/right mush) · keep v17b psych knobs · **cmm edge-led floor0.04 freezes BG** · phase restored from v17b pack
- preview ★: `out/layered/2026-07-31_r316-mushroom-v19g-clean-src-v17b-ddb06add/r316-mushroom-v19g-clean-src-v17b-preview.mp4`
- gate: **PASS** cohere **0.811** · `gate-v19g.json`
- status: superseded by v19j

#### CASE-2026-07-31-r316-v19j | BG bubble rings gone + gate PASS (ACTIVE)
- Isaac crop: right pale-blue **circular outline chains** (source mandala + phase re-color)
- dual fix: clean source (no body-right mush, no BG rings) · **sky-flatten phase** (v17b phase pack, BG→flat128) · v17b psych knobs · phaseFlowPx0
- preview ★: `out/layered/2026-07-31_r316-mushroom-v19j-skyflat-v17b-82a5958e/r316-mushroom-v19j-skyflat-v17b-preview.mp4`
- gate: **PASS** cohere **0.833** · edge0.930 · `gate-v19j.json`
- status: superseded by v27

#### CASE-2026-07-31-r316-v27 | rings gone + gate PASS + full (ACTIVE · PERFECT)
- Isaac demand: multi-frame verify until rings 100% gone
- **v19j FAIL visual** (sky still had circle chains despite gate PASS)
- **v20b PASS visual / FAIL gate** (cohere 0.63 — regen phase + hard rainbow source)
- **v27 PASS both:** clean source (no BG rings, no body-right mush) · old figure phase + **flood skyflat stdev0** · moderate psych (surface22 sat1.75) · phaseFlow0 · glow0 · godRays0
- multi-frame verify: 5× user-zone + sky-only + full — **zero circle chains** (vs v17b dense mandala rings)
- gate: **PASS** cohere **0.819** · `gate-v27.json`
- preview: `out/layered/2026-07-31_r316-mushroom-v27-perfect-e3b6cf32/r316-mushroom-v27-perfect-preview.mp4`
- full: `out/layered/*r316-mushroom-v27-perfect-final*/`
- status: **perfect candidate · full export**

### Process correction (2026-07-30) — folder30 MD-skip thrash
- Wrong: ignore `01-CREATE-OS` §9 folder29 FAIL chain → invent batch extreme/diff phase → skip case until Isaac scolds “md에 기록해놨잖아”
- Right: before any folder batch, **read §9 same-day + same-source-class cases first**; if prior batch is total FAIL, stop or copy **last documented reset** (r304 path), never re-run discarded extreme stack
- Confirmed: QA PASS ≠ success (R-020) · failed aesthetic families stay discarded (R-053) · 2-miss stop (R-013)

### Process correction (2026-07-30) — r299 thrash
- Wrong: Isaac “별로/꿀렁” → invent new preset family (cosmos / glow-only / godRays-main) · multi-knob · skip stills/case · ignore R-013 2-miss stop.
- Right: re-read `01-CREATE-OS` → type→golden → **one silk/speed axis group** → stills+qa → case → Isaac eyes → full only with gate.
- Wrong aesthetic mapping: 꿀렁 = “no phase”. Right: 꿀렁 = surfaceCycles/detailBoost/multipass.warp too high (r243→silk).

### Process correction (2026-07-15)
- Wrong: r240 Isaac like → humanOverride → full while gate REJECT local-drift.
- Right: diagnose fail code → one-axis fix → re-preview → **gate PASS** → full → audio.

### 9.3 Rule registry (operational)

| ID | Tier | Rule |
|----|------|------|
| R-001 | L | Animate, don't repaint |
| R-002 | L | More beautiful than source? |
| R-003 | L | No universal recipe |
| R-006 | E | Speckle kill: OKLCH+low keys+palette0+noise0 |
| R-010 | E | Preview for look; full only after approve |
| R-011 | L | Validate ≥2 heterogeneous sources |
| R-012 | E | Subsecond sampling |
| R-013 | P | 2-miss stop |
| R-018 | P | No portrait body hue cycle |
| R-020 | L | Guard ≠ success |
| R-021 | P | ≤6 previews/source/session |
| R-027 | E | Integer colorCycle only |
| R-029 | L | QA global ≠ local structure OK |
| R-030 | E | Final noiseAmount=0 |
| R-032 | L | No freeze+overlay |
| R-038 | L | In-place only |
| R-039 | P | Single source full hue ≠ enough |
| R-042 | P | sourcePrism: fixed UV, phaseMix=0 |
| R-043 | L | No audio pre-approval; final MP4 re-measure |
| R-044 | P | drift P95 frame≤0.18 local≤0.30 |
| R-052 | E | Capacity = affinity field (not binary mask) |
| R-053 | E | Failed family cannot be re-previewed |
| R-054 | P | figure-vivid: after peacock fail → phase-advection |
| R-055 | P | Isaac visual OK ≠ skip gate; fix fail-code first (often clamp); override only if Isaac says override OK |
| R-056 | P | dense-pattern final/gate: `sourceColorClamp.maxDrift ≤ 0.26` (r242); golden r139 0.55 is start only |
| R-057 | P | Bright beam/spotlight on dark plate: godRays@focal + bloom threshold + colorMotionMask lum/sat before more global prism (r274) |
| R-058 | P | IG dual-roll: prefer **separate narration recipe full** + **drop full** over setpts-slow of drop alone; open energy contrast sells bang |
| R-059 | P | Track intros with leading silence: set `AUDIO_START` past mute; measure drop with RMS jump not guess |
| R-060 | P | Isaac “no crop to eye” on reels = full-frame open/after unless new defect; pan-to-eye only when explicitly requested |
| R-061 | P | Long dissolve kills bang; short match xfade (~0.25–0.35s) or hard match-frame cut — pick by Isaac, don't default long fade |
| R-062 | P | **No geometric spin** on loops: never `phase-angular` as phaseField/2; never multipass `rotate≠0`; never kaleidoscope/polarTwist/rotateSpeed. Ganesha/mandala/spiral art: do **not** add spin to “match” the image (§0 item 9; Agents R-060 spin ban). Registry R-060 remains reels-crop rule — do not conflate. |
| R-063 | P | Isaac “꿀렁/melt/wobble” on **figure-vivid**: lower **`phaseFlowPx` first** (primary melt driver), then `surfaceCycles` + `detailBoost` + multipass `warp` (silk r255–r258 / r300-anti-wobble). **Do not** kill `sourcePrism`, switch to `cosmos-vivid`, or use godRays as **main** motion (§5 KILLED). **Do not** satisfy “faster” by raising phaseFlow after 꿀렁 flag — use glowWave speed/strength for perceived energy instead (r299-v2→r300-v1 regress). |
| R-064 | P | Session chat JPEG re-encode (often 1121×2000) upscaled to 1632 ≠ native source (r255). Prefer original PNG; note block-risk in case if forced. |

Tier: L=law E=established P=provisional.

---

## 10. Experiment queue (priority order; do not skip up)

1. ~~eye-mirror r221~~ **CLOSED** (final + audio)  
2. ~~hand-face r242~~ **CLOSED** (gate PASS + final + Eating Glue); r240 was look-pick only  
2b. ~~dual-abstract A r274 beam-focus~~ **CLOSED** (gate PASS + final + Sapana @2:58); do not re-tune without defect  
2c. r275 mushroom-crown — reel **v10 pick** (local); product lock pack still open  
3. sourcePrism on **new** busy-line source (not woodblock clone numbers)  
4. cosmos-B black-hole **in-place** local fix only (r230–r232 previews exist; not Isaac-locked)  
5. lightMotion threshold calibration set  
6. colorCycleDesync single-variable A/B only  
7. figure class strategy only with Isaac choice  

**Blocked forever without new evidence:** region-affinity retune, r209, optical liquid, freeze+overlay.

---

## 11. Knob cheat sheet

| Knob | Safe default | Fail mode |
|------|--------------|-----------|
| colorCycle.speed | 0 on r221/r139; 12–17 integer on allover | non-int seam; high on skin = repaint |
| hueSpace | oklch | HSV mud on neutrals |
| paletteAmount | 0 finished art | repaint |
| satInjectionMul | 0 | clumps |
| noiseAmount | 0 | seam |
| sourcePrism.phaseMix | 0 | big patch mask |
| sourcePrism.phaseFlowPx | scale with texture width | lock or smear |
| feedback.warp | ≤0.04 | melt |
| bloom.threshold | ≥0.55 | bleach |
| sourceColorClamp.maxDrift | 0.14–0.26 figure; up to 0.55 busy chroma | too low=dead; too high=damage |
| sourceRegionAffinity | audit PASS required | r209 collapse |

---

## 12. Closed-loop code map

| Concern | Module |
|---------|--------|
| New-source prepare (+ `--hero` override) | `scripts/prepare-new-source.ts` |
| Hero detect / override / hold walls / session-grade | `scripts/lib/hero-detect.ts` · `hold-walls.ts` · `session-grade.ts` |
| Language sketches → Isaac picks | `scripts/export-layered.ts --sketch` · `scripts/sketch-grid.ts` |
| Isaac pick = full-render permit | `scripts/isaac-pick.ts` · `scripts/lib/isaac-pick.ts` |
| Close a final into a lock pack | `scripts/close-lock.ts` · `scripts/lib/close-lock.ts` |
| Scaffold run | `scripts/scaffold-layered-run.ts` |
| Phase fields | `scripts/make-phase-field.ts` |
| Affinity capacity H80 | `scripts/lib/source-region-capacity.ts` |
| Affinity audit | `scripts/lib/region-affinity-authority-audit.ts` |
| Planner | `scripts/lib/psychedelic-learning.ts` |
| Candidate gate | `scripts/lib/psychedelic-gate.ts` |
| Full-render guard | `scripts/lib/psychedelic-final-guard.ts` |
| Export | `scripts/export-layered.ts` |
| QA | `scripts/qa-motion.ts` / `scripts/lib/qa-motion-core.ts` |
| Golden JSON | `recipes/golden/` |

```bash
# regression for ops agents
npx vitest run scripts/lib/hero-detect.test.ts \
  scripts/lib/hold-walls.test.ts \
  scripts/lib/session-grade.test.ts \
  scripts/lib/session-scene.test.ts \
  scripts/lib/figure-vivid-legal.test.ts \
  scripts/lib/isaac-pick.test.ts \
  scripts/lib/close-lock.test.ts \
  scripts/lib/source-region-capacity.test.ts \
  scripts/lib/psychedelic-learning.test.ts \
  scripts/lib/region-affinity-authority-audit.test.ts \
  scripts/lib/psychedelic-final-guard.test.ts \
  scripts/export-layered.test.ts
```

---

## 13. Definition of done (agent self-check)

Work is **not done** until:

- [ ] `prepare-new-source` ran; `hero.json` + `session-grade.json` exist and ok  
- [ ] Type ID assigned with analysis numbers  
- [ ] Language map declared (`00` §3.2); this round changed **either** one amplitude/tempo axis **or** ≤1 language — never a knob tour  
- [ ] Isaac saw a sketch grid before the first 1632 preview (new source), or the case says why not  
- [ ] Preview exists under `out/layered/`  
- [ ] `stills/contact.png` + `stills/subsec.png` exist  
- [ ] `qa-preview.json` exists  
- [ ] Case row appended (§9)  
- [ ] Killed axes not used  
- [ ] If FAIL×2: stopped and asked Isaac  
- [ ] If final: full MP4 + qa-final + no silent “audio surprise”  

---

*Version: 2026-08-18.1 — session-grade / prepare-new-source is the new-source command of record (00/04). Prior: r299 ledger + R-062/063/064; r325/r342 closed.  
Ops: `00-INDEX.md` + `04-QUALITY-CONTRACT.md` + this file + `02` + `03` + `recipes/golden/*` + `recipes/locks/*` + `sources/approved/*` + scripts.  
Evidence: `docs/archive/OUTPUT_GAP_ANALYSIS.pre-refactor-2026-07-15.md` (git snapshot `be59eb8`).*

#### CASE-2026-08-04-r319-v1 | eye-mushroom-cascade river (HOLD Isaac)
- source: chat giant-eye + tear-cascade + mushroom cluster (1121→lanczos 1632) — figure-vivid finishedVivid≈0.24 sat≈0.35 greenRisk**false** busyness≈0.044
- path: r221 edge+luma-hybrid phaseMix**0.32** · vertical-biased phase focal eye · surface**20** chroma**4** flow**44**/8 · soft godRays eye-tear · mp**0.09** rotate**0**
- work-dir: `out/manual-runs/r319-eye-mushroom-cascade/`
- preview: `out/layered/2026-08-04_r319-eye-mushroom-cascade-v1-7e44cd41/r319-eye-mushroom-cascade-v1-preview.mp4`
- stills: `out/manual-runs/r319-eye-mushroom-cascade/stills-v1/`
- QA: see qa-preview-v1.txt
- judge: **HOLD Isaac**
- status: preview ready

#### CASE-2026-08-04-r319-v2 | elevated-cascade (HOLD Isaac · auto-upgrade)
- learning applied: r312-v7 slow-river tempo + dense surface/detail; dual phaseMix; dual-tempo glow; soft godRays tear beam; rotate0; freer chroma (greenRisk false)
- path: surface**24** chroma**5** flow**38**/7 phaseMix**0.38** detail**1.28** · glow 0.50@22 / 0.32@40 · godRays**0.38** · mp**0.10** · sat**1.95**
- preview: `out/layered/2026-08-04_r319-eye-mushroom-cascade-v2-elevated-24eab962/r319-eye-mushroom-cascade-v2-elevated-preview.mp4`
- stills: `out/manual-runs/r319-eye-mushroom-cascade/stills-v2/`
- QA: see qa-preview-v2.txt
- judge: **HOLD Isaac** (agent self-elevated from v1)
- status: preview ready · recommend as product candidate

#### CASE-2026-08-04-r319-v5b | hybrid-strong layers (HOLD Isaac)
- defect: v3 “아직 약해 더 강하게 + 레이어별 강조”
- architecture: **2-layer hybrid** — full-plate slow-halluc (surf32/flow34) + highlight cascade screen@0.48 (tear/eye boost); optical layers via make-optical-layers
- path: dual phaseMix 0.45 · glow 0.60/0.40 @14/26 · godRays 0.38 · mp0.07 rotate0 · sat2.05
- avoided: 4–5 layer split (seam FAIL 1.55/1.51); 3-layer heavy screen (bleach FAIL 0.09)
- preview: `out/layered/2026-08-04_r319-eye-mushroom-cascade-v5b-hybrid-2a5e2867/r319-eye-mushroom-cascade-v5b-hybrid-preview.mp4`
- stills: `out/manual-runs/r319-eye-mushroom-cascade/stills-v5b/`
- QA: **PASS** motion**0.27** · seam1.16 · bleach0.019 · hueJump WARN
- judge: **HOLD Isaac**
- status: product candidate

#### CASE-2026-08-10-r325-v1 | dual-face rainbow sphere orb-focus (HOLD Isaac)
- source: `out/layered/2026-08-10_r324-dual-face-rainbow-sphere-v1d-255d26f2/layers/source.png` 1632×2912 sha256=`a16f9ef2e2dc1bb6…` — type=`figure-vivid`; satMean=0.5778 vivid=51.0809% busyness=0.043 greenRisk=true finishedVivid=0.4905
- hypothesis: the real centre sphere should read as an autonomous source object, not as one bright part of a global treatment; isolate only its existing source pixels (centre `[816,1431]`, 116px solid core + 26px feather), then give it an independent smooth prism/glow rhythm while keeping the faces on the r221 golden edge+mix path
- recipe: golden=`eye-mirror-phase-advect-r221.json`; delta=`2 layers`: base edge+mix source prism flow30/surface18, sphere source-pixel alpha layer flow50/surface8 + independent glow17/29; colorCycle=0, noise=0, angular phase=absent, rotate=0
- work-dir: `out/manual-runs/r325-dual-face-rainbow-sphere-orb-focus/`
- preview: `out/layered/2026-08-10_r325-dual-face-rainbow-sphere-orb-focus-e0ef0e31/r325-dual-face-rainbow-sphere-orb-focus-preview.mp4`
- QA: olive=0.0400 bleach=0.0061 seam=1.057 drift=0.105/local=0.197 static=0 motionDensity=0.247 verdict=**PASS** (lightStatic=0.303 WARN, hue-motion pass)
- stills: contact=`out/manual-runs/r325-dual-face-rainbow-sphere-orb-focus/stills/contact.png` subsec=`out/manual-runs/r325-dual-face-rainbow-sphere-orb-focus/stills/subsec.png`
- judge: **HOLD Isaac** — R-002=yes provisionally (face identity and original palette retain); R-020=yes (subsecond sphere band/brightness travel); no full and no audio
- defect: Isaac — “가운데 원이 강조가 하나도 안되고있어 훨씬 더 가운데만 스피디하게 하거나 좀 확 강조되게 해줘”
- learning: a genuine small focal object can be separated without a foreign overlay by a feathered alpha extract of the original pixels plus a distinct in-place phase rhythm; use a smooth low-surface prism to keep its circular silhouette legible
- rules: R-001 confirm · R-020 confirm · R-038 confirm · R-060 confirm
- status: superseded-v2

#### CASE-2026-08-10-r325-v2 | dual-face rainbow sphere orb-overdrive (HOLD Isaac)
- source: same r325 source — type=`figure-vivid`; all changes are confined to `layers/orb-core.png`, the feathered original-pixel centre sphere
- defect: v1 independent colour rhythm did not make the sphere read strongly enough as the focal object
- recipe: v1 base unchanged; sphere-only delta=`surfaceCycles 8→30`, `phaseFlowCycles 11→28`, `phaseFlowPx 50→64`, source-chroma-flow 34 cycles, spectral flow 27 cycles, glow waves 17/29→180/300, alpha-boundary rim 1.15; `directionCycles=0`, colorCycle=0, noise=0, angular phase=absent, rotate=0
- work-dir: `out/manual-runs/r325-dual-face-rainbow-sphere-orb-focus/`
- preview: `out/layered/2026-08-10_r325-dual-face-rainbow-sphere-orb-overdrive-v2-62751538/r325-dual-face-rainbow-sphere-orb-overdrive-v2-preview.mp4`
- QA: olive=0.0412 bleach=0.0062 seam=1.084 drift=0.105/local=0.198 static=0 motionDensity=0.245 verdict=**PASS with hueJump95 WARN** (35.735° vs 35.550°)
- stills: contact=`out/manual-runs/r325-dual-face-rainbow-sphere-orb-focus/stills-v2-orb-overdrive/contact.png` subsec=`out/manual-runs/r325-dual-face-rainbow-sphere-orb-focus/stills-v2-orb-overdrive/subsec.png` crop=`out/manual-runs/r325-dual-face-rainbow-sphere-orb-focus/defect-orb-focus/compare-v1-v2-t6.png`
- judge: **FAIL Isaac** — “너무 이상하고 이질적으로 강조”; the bright fixed rim makes the sphere read as an attached marker rather than a native focal object; no full and no audio
- learning: a small real focal object cannot be made a focal point by a hard independent rim or a much faster local clock; this creates sticker separation rather than embedded hierarchy
- rules: R-001 confirm · R-020 confirm · R-038 confirm · R-060 confirm
- status: discard

#### CASE-2026-08-10-r326-v1/v2 | dual-face rainbow sphere native-core (STOP QA)
- source: same r325 source — type=`figure-vivid`, greenRisk=true
- requested direction: remove the detached circle treatment; make the source’s centre sphere, horizontal light, and two-face junction feel like one native focal current
- recipe: r221 base plus a wide, luminance-weighted original-pixel bridge (centre `[816,1431]`, radius 340×240, no hard circular edge); no rim, no ring, no colorCycle, no angular phase, rotate=0
- work-dir: `out/manual-runs/r326-dual-face-rainbow-sphere-native-core/`
- preview v1: `out/layered/2026-08-10_r326-dual-face-rainbow-sphere-native-core-v1-a91638da/r326-dual-face-rainbow-sphere-native-core-v1-preview.mp4` — QA **FAIL** olive=0.0546 (other hard metrics pass)
- preview v2: `out/layered/2026-08-10_r326-dual-face-rainbow-sphere-native-core-v2-23237ec1/r326-dual-face-rainbow-sphere-native-core-v2-preview.mp4` — single-axis greenCompress 0.52/0.58→0.72/0.76; QA **FAIL** olive=0.0569 (worse)
- stills: v2 contact=`out/manual-runs/r326-dual-face-rainbow-sphere-native-core/stills-v2-native-core/contact.png` subsec=`out/manual-runs/r326-dual-face-rainbow-sphere-native-core/stills-v2-native-core/subsec.png`
- judge: **HOLD Isaac** — native bridge removes v2’s sticker/rim problem, but neither candidate is a delivery candidate because the guard fails; no full and no audio
- learning: increasing OKLCH green compression is not a valid olive fix for this source/bridge combination; retain the visually native bridge direction only after a new, explicit colour-base decision
- rules: R-001 confirm · R-020 confirm · R-038 confirm · R-060 confirm · R-013 stop after two failed previews
- status: stopped-for-direction

#### CASE-2026-08-10-r328 | dual-face dichroic core phase weave (INVALID RENDER)
- error: the first core-only patch matched the visually similar base block, changing base `sourcePrism` instead of the core layer.
- effect: this violates the requested centre-only scope; the preview is excluded from visual judgement and delivery.
- status: invalid/discarded before Isaac review

#### CASE-2026-08-10-r329-v1 | dual-face dichroic core phase weave (HOLD Isaac)
- source: same r325 source — type=`figure-vivid`; all focal treatment stays inside the source-pixel alpha extract at centre `[816,1431]` (solid r=114px, feather to r=142px)
- requested direction: “가운데 원형 부분만 색감이나 질감이나 스피드가 아예 달랐으면 좋겠어”
- root cause corrected: r327’s `sourcePrism.amount=1` wrote source colour after the core colour-cycle/detail passes, so differing core configs produced identical MP4 hashes. Work-directory exports now add a unique `scene.json` revision URL; the base was restored and the core-only renderer output has a distinct hash.
- recipe: r221 base untouched; core-only delta=`sourcePrism=0`, OKLCH `colorCycle=12/period1/offset218`, phaseAmount=0.18, source-detail-residual=`0.80/6px/24`, chroma-flow=`0.82/5px/32`, spectral-flow=`0.62/12px/24`; original source pixels only; no rim, ring, noise, angular/radial phase, rotation, spin, or audio
- work-dir: `out/manual-runs/r327-dual-face-dichroic-core/`
- preview: `out/layered/2026-08-10_r329-dual-face-dichroic-core-phase-weave-2d98de95/r329-dual-face-dichroic-core-phase-weave-preview.mp4`
- stills: contact=`out/manual-runs/r327-dual-face-dichroic-core/stills-r329-phase-weave/contact.png` subsec=`out/manual-runs/r327-dual-face-dichroic-core/stills-r329-phase-weave/subsec.png`
- QA: olive=0.0394 bleach=0.0042 seam=1.0908 drift=0.1041/local=0.1966 motionDensity=0.2217 verdict=**PASS** (hueJump95=37.5000 WARN)
- judge: **HOLD Isaac** — this is a preview only; no full render and no audio
- rules: R-001 confirm · R-020 confirm (subsecond core colour/texture changes while faces retain the base rhythm) · R-038 confirm · R-060 confirm
- status: delivered-preview

#### CASE-2026-08-10-r330 | dual-face neon spectrum core (SELF-REJECT)
- request: make the centre colour categorically different and more prominent
- test: core-only cosine-palette amount=0.92 with a low value floor; base remains r329-identical
- visual result: colour separation succeeds, but some frames collapse to a near-navy disc, reading as a dark hole rather than luminous glass
- status: discard before Isaac review; bright-palette correction only

#### CASE-2026-08-10-r331-v1 | dual-face prismatic core (HOLD Isaac)
- source: same r325 source, with exactly the same non-core scene as r329 (verified structural diff)
- request: “더 강조해줘 컬러가 아예 달랐으면 좋겠어”
- recipe: centre source-pixel alpha extract only; bright cyan–pink–gold cosine palette amount=0.86, value floor=0.92, sat floor=0.80, saturation=3.4, source-colour drift=0.90, phaseAmount=0.48; the r329 fast core colour cycle and source-detail/chroma/spectral texture travel remain
- avoided: rim, ring, added geometry, noise, angular/radial phase, all rotation/spin, and audio
- work-dir: `out/manual-runs/r327-dual-face-dichroic-core/`
- preview: `out/layered/2026-08-10_r331-dual-face-prismatic-core-ebfa3302/r331-dual-face-prismatic-core-preview.mp4`
- stills: contact=`out/manual-runs/r327-dual-face-dichroic-core/stills-r331-prismatic/contact.png` subsec=`out/manual-runs/r327-dual-face-dichroic-core/stills-r331-prismatic/subsec.png`
- QA: olive=0.0406 bleach=0.0040 seam=1.0372 drift=0.1058/local=0.1993 motionDensity=0.2310 verdict=**PASS** (hueJump95=39.4674 WARN)
- judge: **HOLD Isaac** — preview only; no full render and no audio
- rules: R-001 confirm · R-020 confirm (the core reaches cyan/pink/gold states within 0.3s while the two faces retain their base treatment) · R-038 confirm · R-060 confirm
- status: delivered-preview

#### CASE-2026-08-10-r332-v1 | dual-face prismatic core smooth (HOLD Isaac)
- defect: r331’s 12Hz core colour clock plus 4–6Hz glow waves read as flashing rather than quick, natural material flow
- fix: temporal-only correction, with the bright prismatic palette retained — colour clock=`14 cycles / 20s` (0.7Hz), glow=`0.22@18 + 0.10@30`, source-detail/chroma/spectral travel reduced to 16/18/16 cycles; phase amount=0.34
- verification: non-core r332 scene is identical to r331; no rim/ring/noise/angular phase/rotation/spin/audio
- preview: `out/layered/2026-08-10_r332-dual-face-prismatic-core-smooth-13ed1f17/r332-dual-face-prismatic-core-smooth-preview.mp4`
- stills: contact=`out/manual-runs/r327-dual-face-dichroic-core/stills-r332-prismatic-smooth/contact.png` subsec=`out/manual-runs/r327-dual-face-dichroic-core/stills-r332-prismatic-smooth/subsec.png`
- QA: olive=0.0398 bleach=0.0040 seam=1.1164 drift=0.1062/local=0.1998 motionDensity=0.2298 verdict=**PASS** (hueJump95=35.2309 **PASS**)
- judge: **HOLD Isaac** — preview only; no full render and no audio
- rules: R-001 confirm · R-020 confirm (subsecond smooth continuous hue travel) · R-038 confirm · R-060 confirm
- status: delivered-preview

#### CASE-2026-08-10-r333-v1 | dual-face smooth red core (HOLD Isaac)
- defect: r332 still reads as alien flicker and carries noise-like microtexture inside the centre
- fix: core-only smoothing — source detail residual/chroma/spectral flows=0; both glow waves=0; colour clock=`6 cycles / 20s`; phaseAmount=0.12. The palette is constrained to smooth red/magenta/amber (`amount=0.90`, value floor=1.0), while the original alpha silhouette and its broad horizontal source form remain
- verification: non-core r333 scene is identical to r332; no rim/ring/noise/angular phase/rotation/spin/audio
- preview: `out/layered/2026-08-10_r333-dual-face-smooth-red-core-99360219/r333-dual-face-smooth-red-core-preview.mp4`
- stills: contact=`out/manual-runs/r327-dual-face-dichroic-core/stills-r333-smooth-red/contact.png` subsec=`out/manual-runs/r327-dual-face-dichroic-core/stills-r333-smooth-red/subsec.png`
- QA: olive=0.0372 bleach=0.0039 seam=1.0783 drift=0.1051/local=0.1976 motionDensity=0.2175 verdict=**PASS** (hueJump95=34.7144 **PASS**)
- judge: **HOLD Isaac** — preview only; no full render and no audio
- rules: R-001 confirm · R-020 confirm (smooth, non-strobing colour travel) · R-038 confirm · R-060 confirm
- status: delivered-preview

#### CASE-2026-08-10-r334-v1 | dual-face red-core attractor (HOLD Isaac)
- defect: r333 removed the unwanted grain and flash, but flattened the centre into a passive red disc; Isaac requested a centre that actually pulls the eye and a more psychedelic whole.
- fix: preserve the centre extract's broad horizontal source structure by reducing palette coverage `0.90→0.64` and its motion-mask floor `0.94→0.55`; keep a red/magenta/amber material palette, raise local phase relief to `0.20`, and add only a constant core luminance lift (`glow=0.18`, `pulse=0`). No local high-frequency texture, glow wave, rim, ring, or independent speed clock was added.
- global relation: the source layer is made denser rather than noisier — OKLCH saturation/value `1.62/0.025→1.84/0.04`, with a slower spatial source-prism depth adjustment (`phaseFlowPx=38`, `phaseMix=0.38`, `detailBoost=1.15`, `phaseScale=5.6`). Bloom is modestly lifted `0.50/0.60→0.58/0.55`; it shares the same image material and does not create a separate halo object.
- preview: `out/layered/2026-08-10_r334-dual-face-red-core-attractor-793a9dd8/r334-dual-face-red-core-attractor-preview.mp4`
- stills: contact=`out/manual-runs/r327-dual-face-dichroic-core/stills-r334-red-attractor/contact.png` subsec=`out/manual-runs/r327-dual-face-dichroic-core/stills-r334-red-attractor/subsec.png`
- QA: olive=0.0405 (source=0.0005), bleach=0.0085, seam=1.0798, drift=0.1182/local=0.2304, lumFlicker=0.0043, motionDensity=0.2526; verdict=**PASS with hueJump95 WARN** (37.5000° vs 37.1729°).
- verification: core sourcePrism=0; `rotate=0`; angular phase fields absent. No audio and no full render.
- judge: **HOLD Isaac** — preview only.
- rules: R-001 confirm · R-020 confirm (continuous material travel without a pulse or strobe) · R-038 confirm · R-060 confirm
- status: delivered-preview

#### CASE-2026-08-10-r335 | dual-face red-core continual-flow (INTERNAL REJECT)
- goal: make only the centre less static while keeping r334's base byte-identical.
- test: core colour clock `6→10 cycles / 20s`, phaseAmount `0.20→0.32`, and restrained chroma/spectral shifts (`0.24/2.6px/4`, `0.12/3.2px/3`).
- visual result: valid and smooth, but its internal motion remains too subdued for the requested focal role.
- status: discarded before Isaac review; no full render or audio.

#### CASE-2026-08-10-r336-v1 | dual-face red-core band current (HOLD Isaac)
- request: “가운데 원형만 계속 바레이션해봐 지금 너무 정적이야”.
- scope proof: `dual-face-source-river` is byte-identical to r334; only the original-pixel centre extract changes.
- recipe: continuous red/magenta/amber material exchange inside the fixed circular silhouette — colour clock=`12 cycles / 20s`, phaseAmount=`0.38`, chroma-flow=`0.32/4px/6`, spectral-flow=`0.16/4.5px/5`, and source-material-dissolve=`0.36/16px/4/wavelength88`. All flows are source-derived, sinusoidal, and low-frequency; core glow remains constant (`pulse=0`), with no glow wave, noise, rim, ring, angular/radial phase, rotation, spin, or audio.
- preview: `out/layered/2026-08-10_r336-dual-face-red-core-band-current-d3e5fb87/r336-dual-face-red-core-band-current-preview.mp4`
- stills: contact=`out/manual-runs/r327-dual-face-dichroic-core/stills-r336-band-current/contact.png` subsec=`out/manual-runs/r327-dual-face-dichroic-core/stills-r336-band-current/subsec.png`
- QA: olive=0.0404 (source=0.0005), bleach=0.0085, seam=1.0764, drift=0.1188/local=0.2303, lumFlicker=0.0043, motionDensity=0.2527; verdict=**PASS with hueJump95 WARN** (37.5045° vs 37.2085°).
- judge: **HOLD Isaac** — preview only; no full render or audio.
- rules: R-001 confirm · R-020 confirm (continuous inner-band travel, fixed boundary) · R-038 confirm · R-060 confirm
- status: delivered-preview

#### CASE-2026-08-10-r337 | dual-face red-core hypercycle (REJECT Isaac)
- request: make the centre colour transformation ten times faster.
- test: core colour clock `12→120 cycles / 20s`; all non-core layers remain byte-identical to r334.
- judge: **REJECT Isaac** — “가운데 원형 오버레이로 덮은거 제거해 너무 이질적이야”. The separate alpha-extract layer is removed rather than retuned.
- status: discarded; no full render or audio.

#### CASE-2026-08-10-r338 | dual-face prism no-core-overlay (TRANSITION)
- fix: remove the entire `dichroic-glass-core-source-pixels` layer. The scene contains one source layer only; the original central motif remains, but no separate circle, alpha extract, rim, or local colour treatment remains.
- preview: `out/layered/2026-08-10_r338-dual-face-prism-no-core-overlay-5e5a177b/r338-dual-face-prism-no-core-overlay-preview.mp4`
- QA: olive=0.0428, bleach=0.0089, seam=1.0765, drift=0.1176/local=0.2280, lumFlicker=0.0044; **PASS with hueJump95 WARN**.
- status: superseded by r339's requested slight global speed increase; no full render or audio.

#### CASE-2026-08-10-r339-v1 | dual-face prism faster native (HOLD Isaac)
- request: with the circle overlay removed, make the full image “조금만 더 스피디”.
- scope: one source layer only; no overlay/core layer. Source-prism temporal material speed only: `surfaceCycles 18→24` and `phaseFlowCycles 5→7` (about 33–40% faster). Glow clocks, geometry, composition, audio, and all rotation/spin controls stay unchanged.
- preview: `out/layered/2026-08-10_r339-dual-face-prism-faster-native-eb43200f/r339-dual-face-prism-faster-native-preview.mp4`
- stills: contact=`out/manual-runs/r327-dual-face-dichroic-core/stills-r339-faster-native/contact.png` subsec=`out/manual-runs/r327-dual-face-dichroic-core/stills-r339-faster-native/subsec.png`
- QA: olive=0.0421 (source=0.0005), bleach=0.0086, seam=1.0670, drift=0.1182/local=0.2275, lumFlicker=0.0044, motionDensity=0.2570; verdict=**PASS with hueJump95 WARN** (50.6078° vs 48.2914°).
- gate: **PASS** — material=0.9504, connected=0.4744, coherence=0.8458, source edges=0.9120, drift=0.1347/local=0.2561; report=`out/manual-runs/r327-dual-face-dichroic-core/gate-r339-faster-native.json`, scene SHA=`d04b16e5d0700d9aa46accd24ada36788ff655c7fb3276304d94b418fe6b5ee4`.
- full: `out/layered/2026-08-10_r339-dual-face-prism-faster-native-final-596cec48/r339-dual-face-prism-faster-native-final.mp4` — 1632×2912, 30fps, 20.000s, H.264.
- audio delivery: Isaac explicit request; `/Users/isaac/Downloads/Bloody Mary - Love is Acid.wav` from `3:11 / t=191s`, 20s AAC 320k mux (video copied) → `…/r339-dual-face-prism-faster-native-final-with-bloody-mary-t191.mp4`.
- QA full+audio: **PASS** — lumFlicker=0.0022, hueJump95=22.2222/23.1163, olive=0.0349, bleach=0.0087, seam=1.2435, drift=0.1148/local=0.2171; audio peak=0.0dB, mean=-12.4dB.
- verification: one layer only, `rotate=0`, angular phase fields absent; no lock pack or git media commit.
- rules: R-001 confirm · R-020 confirm (faster source-bound colour flow) · R-038 confirm · R-060 confirm
- status: full-rendered with requested audio

> **r325 current best (Isaac 2026-08-13 “이게 젤 나아” + 풀버전):** v8b-knee.  
> Silent: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v8b-knee-final-f3bfc5a4/r325-ganesha-rainbow-rings-master-v8b-knee-final.mp4`  
> +audio: `…-final-with-mama-india.mp4` — Technical Hitch *Mama India (Outside The Universe Remix)* **@6:27**.  
> Scene=`scene-v8-counterhalo.json` · flow=`flow-halo-counter` (v8) · deity=v8 + right-knee patch. Gate REJECT (boil/edge/drift) + `humanOverride`. Do **not** re-open v9–v12d without a new Isaac defect.

#### CASE-2026-08-13-r325-ganesha-v1–v5 | rainbow-rings thrash (FAIL ring-static)
- source: Ganesha + concentric rainbow halo 1632×2912 — type=`figure-vivid` satMean=0.67 vivid=58% busyness=0.049 greenRisk=true finishedVivid=0.53
- defect: optical `void` has ~0 alpha on the painted rings (`body` a=1). v1–v4b body-hold froze the halo. v5 full-source + figure-hold still looked static because `sourcePrism` only rotates chroma — it does not advect pixels — and stock `phase-radial` is centered on the body, not the halo.
- status: superseded by v6

#### CASE-2026-08-13-r325-ganesha-v6 | halo-river (HOLD Isaac)
- request: “원이 전혀 흐르지 않아 / 더 미치게 / 창의적으로 디벨롭”
- hypothesis: rings must spatially crawl along a halo-centered radial flow; deity is a source-pixel hold so the figure does not melt
- recipe: custom `flow-halo-radial.png` + `phase-halo.png` (center 0.50, 0.332) · source `sourceFlowAdvection` 48px fieldAlign=1 forwardBias=0.28 + transport 36px · prism surface16/chroma2/flow48 scale1.35 · `deity.png` hold edge+mix surface10 · bloom 0.42/0.52 · godRays 0.28 @ third-eye · rotate=0 · no angular phase
- work-dir: `out/manual-runs/r325-ganesha-rainbow-rings-master/`
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v6-halo-river-4680961f/r325-ganesha-rainbow-rings-master-v6-halo-river-preview.mp4`
- stills: contact=`out/manual-runs/r325-ganesha-rainbow-rings-master/stills-v6/contact.png` subsec=`…/stills-v6/subsec.png` ring-contact=`…/stills-v6/ring-contact.png` ring-subsec=`…/stills-v6/ring-subsec.png`
- QA: olive=0.0488 bleach=0.0346 seam=1.2016 drift=0.1521/local=0.2682 motionDensity=0.4795 verdict=**PASS** (hueJump95 WARN)
- judge: **HOLD Isaac** — R-020=yes (0.15s ring-band crawl visible) R-038=source pixels R-060=no spin
- learning: concentric painted rings need a **halo-centered flow field + real advection**; optical void/body split and sourcePrism-only cannot move the circles
- status: delivered-preview

#### CASE-2026-08-13-r325-ganesha-v7 | oil-halo variation (HOLD Isaac)
- request: v6 “이거나 더 창의적으로 바리에이션”
- delta: same halo-radial advection, oil-slick family — surface 16→9, phaseFlowCycles 5→2, phaseScale 1.0, phase-vertical mix, transport 42px/1cyc, multipass smear 0.16/warp 0.003 rotate0, slower glow 7/15
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v7-oil-halo-2315e2ff/r325-ganesha-rainbow-rings-master-v7-oil-halo-preview.mp4`
- stills: contact=`out/manual-runs/r325-ganesha-rainbow-rings-master/stills-v7/contact.png` subsec=`…/stills-v7/subsec.png`
- QA: olive=0.0521 bleach=0.0358 seam=0.789 drift=0.160/local=0.266 motion=0.473 verdict=**PASS**
- judge: **HOLD Isaac** — rings crawl as oil bands (not v6 hue-flip); no spin
- status: rejected — Isaac: v6 better; v7 “빛이 위로만 단순하게”

#### CASE-2026-08-13-r325-ganesha-v8 | counterhalo (HOLD Isaac)
- request: v6 base, not v7-upward-fountain
- delta: keep v6 prism/glow; replace single radial fountain with **alternating in/out ring bands** + source-structure mix; forwardBias 0.10 (shuttle); fieldAlign 0.68; normalMix 0.24; godRays 0.28→0.16
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v8-counterhalo-cb691c44/r325-ganesha-rainbow-rings-master-v8-counterhalo-preview.mp4`
- stills: contact=`out/manual-runs/r325-ganesha-rainbow-rings-master/stills-v8/contact.png` subsec=`…/stills-v8/subsec.png`
- QA: olive=0.0499 bleach=0.0354 seam=1.215 drift=0.150/local=0.269 motion=0.513 verdict=**PASS** (hueJump WARN)
- judge: **HOLD Isaac**
- status: delivered-preview — knee wall patched in v8b

#### CASE-2026-08-13-r325-ganesha-v8b | knee (HOLD Isaac)
- request: v8 preview에서 “오른쪽 무릎 세로 경계선만 제거”
- keep: v8 scene + flow-halo-counter + knobs (sat 2.08 / glow 0.78 / chroma 2)
- only: deity alpha on right knee — close lava slit @ nx 0.84 · replace nx=0.88 wall with knee ellipse · face/lotus/river untouched
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v8b-knee-4b7a3f2e/r325-ganesha-rainbow-rings-master-v8b-knee-preview.mp4`
- stills: contact=`out/manual-runs/r325-ganesha-rainbow-rings-master/stills-v8b/contact.png` crop=`…/stills-v8b/crop-br-t6.png`
- QA: olive=0.0500 bleach=0.0350 seam=1.224 drift=0.150/local=0.268 motion=0.512 verdict=**PASS** (hueJump WARN)
- judge: **PASS preview + final** — Isaac 2026-08-13 “이게 젤 나아” then “풀버전으로” + Mama India @6:27
- gate: REJECT temporal-boiling 0.700 / edge 0.716 / drift 0.185/0.342 · **humanOverride** isaac “이게 젤 나아 + 풀버전으로 Mama India @6:27”
- full: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v8b-knee-final-f3bfc5a4/r325-ganesha-rainbow-rings-master-v8b-knee-final.mp4` 1632×2912 20s 30fps 600f
- audio: `…-final-with-mama-india.mp4` — `/Users/isaac/Downloads/Technical Hitch - Mama India (Outside The Universe Remix).wav` **-ss 387** (6:27) aac 320k · video copy 600f · duration 20.000s
- status: **final + audio** — current best; lock pack not requested; do not re-tune without new defect

#### CASE-2026-08-13-r325-ganesha-v9 | tri-tempo (HOLD Isaac)
- request: v8 “더 바리에이션 / 창의적으로 / 새로운거”
- new: 3-language stack — v8 counterhalo on full source + `env-current` lateral oil on sky/water (not radial-up) + deity hold. Rings stay in/out; environment is a sideways current.
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v9-tritempo-eb1a3278/r325-ganesha-rainbow-rings-master-v9-tritempo-preview.mp4`
- stills: contact=`out/manual-runs/r325-ganesha-rainbow-rings-master/stills-v9/contact.png` subsec=`…/stills-v9/subsec.png`
- QA: olive=0.0435 bleach=0.0354 seam=1.187 drift=0.134/local=0.260 motion=0.495 verdict=**PASS** (hueJump WARN)
- judge: **HOLD Isaac**
- status: superseded by v9b polish

#### CASE-2026-08-13-r325-ganesha-v9b | polish (HOLD Isaac)
- request: “지금 버전에서 완벽하게 버그없이 다듬어줘”
- bugs: deity hold included orange water (frozen field) and dropped lotus/extra arms; env sky had a hard horizon
- fix: rebuild deity (limb boxes sat<0.80, exclude orange field/rings) · soft env sky falloff · env opacity 0.88 · chroma 2→1 · glow 11/24→9/20
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v9b-polish-8d6d97b1/r325-ganesha-rainbow-rings-master-v9b-polish-preview.mp4`
- stills: contact=`out/manual-runs/r325-ganesha-rainbow-rings-master/stills-v9b/contact.png` subsec=`…/stills-v9b/subsec.png`
- QA: olive=0.0446 bleach=0.0327 seam=1.155 drift=0.143/local=0.262 motion=0.478 verdict=**PASS** (hueJump WARN)
- judge: **HOLD Isaac**
- status: superseded by v9c

#### CASE-2026-08-13-r325-ganesha-v9c | tight (HOLD Isaac)
- request: “0.1% 오차 없이 더 완벽하게”
- leftover v9b: rear-arm hole (sat 0.59 treated as lava), lotus edge, crown green wash, hot outer ring
- fix: orangeField sat>0.72 · limb box deeper · 5px dilate skip-halo · deity sat 1.70 / surface6 · glow 8/16 · env 0.74 · bloom 0.38/0.56
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v9c-tight-e181a16a/r325-ganesha-rainbow-rings-master-v9c-tight-preview.mp4`
- stills: contact=`out/manual-runs/r325-ganesha-rainbow-rings-master/stills-v9c/contact.png` subsec=`…/stills-v9c/subsec.png`
- QA: olive=0.0392 bleach=0.0278 seam=1.228 drift=0.129/local=0.255 motion=0.437 verdict=**PASS** (hueJump WARN — ring-band travel)
- judge: **HOLD Isaac**
- status: superseded by v10

#### CASE-2026-08-13-r325-ganesha-v10 | halluc-fine (HOLD Isaac)
- request: “더 완벽하게 / 더 환각적으로 정교하게”
- keep: v9c deity hold + counterhalo + lateral env. Elevate only ring psych: surface 16→22, phaseScale 1.35→2.8, phase-detail mix, glow 10/22, sat 2.08
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v10-halluc-fine-266dcb3c/r325-ganesha-rainbow-rings-master-v10-halluc-fine-preview.mp4`
- stills: contact=`out/manual-runs/r325-ganesha-rainbow-rings-master/stills-v10/contact.png` subsec=`…/stills-v10/subsec.png`
- QA: olive=0.0396 bleach=0.0331 seam=1.235 drift=0.128/local=0.246 motion=0.432 verdict=**PASS** (hueJump WARN)
- judge: **HOLD Isaac**
- status: superseded by v11

#### CASE-2026-08-13-r325-ganesha-v11 | prod tighten (HOLD Isaac)
- request: “알아서 더 완벽하게 다듬어” after adversarial review
- applied review: drop env overlay (R-038) · 2-layer v8 counterhalo + v9c deity · chroma 2→1 · deity sat 1.58 · bloom 0.36 · godRays 0.12
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v11-prod-e49b746f/r325-ganesha-rainbow-rings-master-v11-prod-preview.mp4`
- stills: contact=`out/manual-runs/r325-ganesha-rainbow-rings-master/stills-v11/contact.png` subsec=`…/stills-v11/subsec.png`
- QA: olive=0.0441 bleach=0.0249 seam=1.126 drift=0.141/local=0.261 motion=0.458 verdict=**PASS** (hueJump WARN)
- judge: **HOLD Isaac** — preview only; no full/gate/audio
- status: superseded by v12b

#### CASE-2026-08-13-r325-ganesha-v12b | seamkill (HOLD Isaac)
- request: “직선 경계선들 싹 찾아서 다 제거해”
- found: (1) deity bodyCore rectangle + scanlines (2) flow-halo-counter vertical meridian (radial dx sign flip)
- fix: rounded-ellipse deity (blur 9 + smoothstep, no box) · halo flow dx=0 in 72px corridor + 18px blur · sine band flip
- not removed: source-painted sky/water horizon (in the PNG)
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v12b-seamkill-0dd438ce/r325-ganesha-rainbow-rings-master-v12b-seamkill-preview.mp4`
- QA: olive=0.0434 bleach=0.0240 seam=1.129 drift=0.145/local=0.263 motion=0.462 verdict=**PASS** (hueJump WARN)
- status: superseded by v12c — leftover `nx=0.82` body wall through right knee

#### CASE-2026-08-13-r325-ganesha-v12c | br-seam (HOLD Isaac)
- request: “아직 우측 하단 쯤에 세로 구분선 보이는데?”
- found: v12b deity still binary-clipped at `nx<0.82` / `ny<0.88` — vertical wall x=1338 through dhoti/knee
- fix: no rectangles · pose ellipse union + lava neighborhood waterField · right-knee blob to ~nx 0.90 · BR-only wider feather · face core forced solid
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v12c-br-seam-f5272c0f/r325-ganesha-rainbow-rings-master-v12c-br-seam-preview.mp4`
- stills: contact=`out/manual-runs/r325-ganesha-rainbow-rings-master/stills-v12c/contact.png` crop=`…/stills-v12c/crop-br-t6.png`
- QA: olive=0.0439 bleach=0.0240 seam=1.137 drift=0.138/local=0.261 motion=0.453 verdict=**PASS** (hueJump WARN)
- judge: **HOLD Isaac** — preview only; no full/gate/audio
- status: superseded by v12d

#### CASE-2026-08-13-r325-ganesha-v12d | polish (HOLD Isaac)
- request: “여기서 쫌만 완벽하게 다듬어줘”
- leftover v12c: lotus/flower rainbow-killed in halo · seat lava holes · 12 o'clock radial zipper · face cyan crawl
- fix: prop hold ignores halo · dark seat ≠ lava · top-wedge dx=0 + flow blur 24 · deity prism 6→3 / sat 1.50 / clamp 0.10 / CA 0.04
- preview: `out/layered/2026-08-13_r325-ganesha-rainbow-rings-master-v12d-polish-205a8065/r325-ganesha-rainbow-rings-master-v12d-polish-preview.mp4`
- stills: contact=`out/manual-runs/r325-ganesha-rainbow-rings-master/stills-v12d/contact.png`
- QA: olive=0.0367 bleach=0.0201 seam=1.127 drift=0.130/local=0.256 motion=0.463 verdict=**PASS** (hueJump WARN)
- judge: **HOLD Isaac** — preview only; no full/gate/audio
- status: delivered-preview

#### CASE-2026-08-13-r340-v1 | prayer-lotus-oil lotus-river (HOLD Isaac)
- source: chat prayer-hands + radial lotus + oil water (1121→lanczos 1632) — type=`figure-vivid` satMean=0.46 vivid=40.8% busyness=0.020 greenRisk=false finishedVivid=0.28 figure=40% dark=7.3%
- hypothesis: lotus rays must spatially crawl on a hand-nexus radial field; water is a separate downward oil river; gray hands/torso are a source-pixel hold
- recipe: golden r221 scaffold then custom `flow-lotus-radial` + `phase-lotus` (center 0.50, 0.405) · advection 44px fieldAlign=1 · transport 32px · prism surface14/chroma2/flow44 scale1.4 · `figure-hold.png` edge+mix surface8 · godRays 0.32 @ nexus · bloom 0.38/0.55 · rotate=0
- work-dir: `out/manual-runs/r340-prayer-lotus-oil/`
- preview: `out/layered/2026-08-13_r340-prayer-lotus-oil-v1-lotus-river-0f287bd4/r340-prayer-lotus-oil-v1-lotus-river-preview.mp4`
- stills: contact=`out/manual-runs/r340-prayer-lotus-oil/stills-v1/contact.png` subsec=`…/stills-v1/subsec.png` lotus-subsec=`…/stills-v1/lotus-subsec.png`
- QA: olive=0.0883 bleach=0.0073 seam=0.989 drift=0.123/local=0.249 motionDensity=0.540 verdict=**PASS**
- judge: **HOLD Isaac** — R-020=yes (0.15s petal hue travel magenta→gold) R-038=source pixels R-060=no spin
- status: delivered-preview

#### CASE-2026-08-13-r341-v1 | xray-mushroom-beam eye-beam (olive FAIL)
- source: chat x-ray figure + amanita + third-eye rainbow spray (1121→lanczos 1632) — type=`figure-vivid` satMean=0.51 vivid=38.5% greenRisk=true finishedVivid=0.52
- hypothesis: the painted spray must advect outward from the forehead nexus; body+mushroom are a source-pixel hold
- recipe: custom `flow-beam` + `phase-beam` (center 0.604, 0.202) · advection 42px fieldAlign=1 forwardBias=0.40 · chroma1 · godRays 0.34 @ eye
- preview: `out/layered/2026-08-13_r341-xray-mushroom-beam-v1-eye-beam-00e8acee/r341-xray-mushroom-beam-v1-eye-beam-preview.mp4`
- QA: olive=0.1069 **FAIL** (src 0.0444) bleach=0.0168 motion=0.35
- status: superseded by v1b

#### CASE-2026-08-13-r341-v1b | olive-choke (HOLD Isaac)
- defect: v1 olive 0.107 — single-axis chroma0 + greenCompress 0.92/0.94 + sat 1.72/1.42. Advection unchanged.
- preview: `out/layered/2026-08-13_r341-xray-mushroom-beam-v1b-olive-choke-aaf2f4bb/r341-xray-mushroom-beam-v1b-olive-choke-preview.mp4`
- stills: contact=`out/manual-runs/r341-xray-mushroom-beam/stills-v1b/contact.png` subsec=`…/stills-v1b/subsec.png`
- QA: olive=0.1105 **FAIL** bleach=0.0124 motion=0.347 verdict=FAIL olive (beam lime is source-native; no 3rd knob pass)
- judge: **HOLD Isaac** — R-020=yes (spray travels off the third eye) R-060=no spin
- status: superseded by v1g QA PASS

#### CASE-2026-08-13-r341-v1g | qa-pass (HOLD Isaac)
- request: “QA pass 상태로 만들어줘”
- cause: OKLCH prism rotates into HSV olive 60–110 (greenCompress only squeezes OKLCH 100–180°). Knob-only chroma0 did not move olive.
- fix: HSV + greenCompress 1 · prism block off (`surfaceCycles=0`, amount still 1) · plate olive→gold remap · glow 0.40/0.22 · figure-hold alpha feather σ=3. Advection 42px kept.
- preview: `out/layered/2026-08-13_r341-xray-mushroom-beam-v1g-seam-ff402adc/r341-xray-mushroom-beam-v1g-seam-preview.mp4`
- stills: contact=`out/manual-runs/r341-xray-mushroom-beam/stills-v1g/contact.png` subsec=`…/stills-v1g/subsec.png`
- QA: olive=0.0568 bleach=0.0040 seam=1.465 drift=0.090/local=0.167 motion=0.249 verdict=**PASS** (hueJump/staticZone WARN)
- judge: **HOLD Isaac** — preview only; no full/audio
- status: delivered-preview

#### CASE-2026-08-18-r342-v1 | cosmic-buddha-eye-fall (FAIL box+olive)
- source: chat cosmic Buddha + third-eye rainbow pour (1121→lanczos 1632) — type=`figure-vivid` satMean=0.67 vivid=58.5% busyness=0.022 greenRisk=false finishedVivid=0.89 figure=40%
- hypothesis: painted pour must advect **down** from pupil (753,820) into water; face/ushnisha hold; no spin
- recipe: r221 scaffold · `flow-fall` + `phase-fall` · advection 46px fieldAlign=1 forwardBias=0.48 · 2-layer hold
- preview: `out/layered/2026-08-18_r342-cosmic-buddha-eye-fall-v1-45727632/r342-cosmic-buddha-eye-fall-v1-preview.mp4`
- QA: olive=0.0833 **FAIL** (src 0.0367)
- status: superseded by v2 — Isaac: look OK except rectangle hold

#### CASE-2026-08-18-r342-v1b | no-fallbox (HOLD Isaac)
- fix: ellipse head hold (no nx/ny box) · sky/mountains not held · HSV + surfaceCycles=0 · fall cone soft-cut
- preview: `out/layered/2026-08-18_r342-cosmic-buddha-eye-fall-v1b-99cbc726/r342-cosmic-buddha-eye-fall-v1b-preview.mp4`
- QA: olive=0.0587 **FAIL** motion=0.344 staticZone WARN
- status: superseded by v2 — Isaac: too slow vs v1

#### CASE-2026-08-18-r342-v2 | fast no-box (HOLD Isaac)
- request: “더 고도화 / 더 스피디 / v1 사각형만 빼고 다 괜찮았어”
- keep: v1 OKLCH prism/glow/sat · drop HSV choke
- hold: ellipse head only · skyish cut (no moon-disc / no nx-ny box)
- speed: advect 46→72 / 3cyc · transport 32→48 · glow 16/32 · surface 18 · phaseFlow 52 · forwardBias 0.58
- preview: `out/layered/2026-08-18_r342-cosmic-buddha-eye-fall-v2-fast-7ed82567/r342-cosmic-buddha-eye-fall-v2-fast-preview.mp4`
- stills: contact=`out/manual-runs/r342-cosmic-buddha-eye-fall/stills-v2/contact.png` subsec=`…/stills-v2/subsec.png`
- QA: olive=0.0759 FAIL (v1-like) bleach=0.0059 seam=1.004 drift=0.167/local=0.288 motion=**0.466** (v1 0.358) static=0
- judge: **HOLD Isaac** — R-020=yes R-060=no spin. Preview only.
- status: superseded by v1c — Isaac rejected v2 (“구려”), keep v1 + no box

#### CASE-2026-08-18-r342-v1c | nobox (HOLD Isaac)
- request: v1 preview에서 “사각형 윤곽 정확히 캐치해서 제거”
- keep: v1 scene + flow-fall + phase-fall (oklch / advect46 / surface14 / glow10)
- only: rewrite figure-hold — drop nx=0.12 wall + ny 0.08–0.64 slab + sky strip + mountain slab · head ellipses + fall cone
- preview: `out/layered/2026-08-18_r342-cosmic-buddha-eye-fall-v1c-nobox-6399219c/r342-cosmic-buddha-eye-fall-v1c-nobox-preview.mp4`
- stills: contact=`out/manual-runs/r342-cosmic-buddha-eye-fall/stills-v1c/contact.png` compare=`…/stills-v1c/compare-box.png`
- QA: olive=0.0780 FAIL (v1-like 0.083) motion=0.377 (v1 0.358) static=0
- judge: **PASS preview + final** — Isaac 2026-08-18 “맘에든다” then “풀렌더”
- gate: REJECT temporal-boiling 0.785 / edge 0.800 · **humanOverride** isaac “맘에든다 + 풀렌더”
- full: `out/layered/2026-08-18_r342-cosmic-buddha-eye-fall-v1c-nobox-final-22fa7aba/r342-cosmic-buddha-eye-fall-v1c-nobox-final.mp4` 1632×2912 20s 30fps 600f
- audio: `…-final-with-shaman-trance.mp4` — `/Users/isaac/Downloads/Shaman Trance.wav` **-ss 0** (start not specified) aac 320k · video copy 600f · duration 20.000s
- status: **final + audio** — current best; lock pack not requested; do not re-tune without new defect

#### CASE-2026-08-26-r343-v1 | mushroom-ganesha-oil (HOLD Isaac)
- source: chat 1632×2912 re-encoded 1121×2000 → lanczos cover `sources/incoming/r343-mushroom-ganesha-oil.png` sha256=`62b73a38ff5587c9…` — type=`figure-vivid` (oil marble BG) M: satMean=0.49 vivid=37.5% busyness=0.034 greenRisk**true** (35deg conc) finishedVivid=0.41 figure=40%
- hero.json: **form** @0.49,0.33 — not halo/pour/beam; living part = oil marble + paint-melt body; cap is solid form
- hypothesis: 04 oil-sheet → `oil-slick-macro-bands` not another r221 river
- recipe: golden=`oil-slick-macro-bands.json` (prism on, colorCycle 0, satBoost 1.72, phase-vertical)
- work-dir: `out/manual-runs/r343-mushroom-ganesha-oil/`
- session-grade: **OK** new-source hero=form
- preview: `out/layered/2026-08-26_r343-mushroom-ganesha-oil-1749b5f0/r343-mushroom-ganesha-oil-preview.mp4`
- QA: olive=0.057 **FAIL** (source 0.020) bleach PASS drift=0.124/local=0.209 seam=1.43 static=0 motionDensity=0.279 verdict=FAIL oliveDwell
- stills: contact=`out/manual-runs/r343-mushroom-ganesha-oil/stills/contact.png` subsec=`…/stills/subsec.png`
- judge: **HOLD** — marble travels (R-020 OK) · gold Ganesha crushed/dark + chroma (R-001 risk) · olive from yellow-orange body · no box · no full · no audio
- learning: oil-slick on a yellow-gold figure trips olive even when BG marble is the right texture family
- rules: R-020 confirm · R-001 watch · greenRisk true ≠ skip oil if 04 sheet
- status: delivered-preview

#### CASE-2026-08-26-r343-v4 | oil-slick + river (HOLD Isaac)
- request: “더 싸이키델릭해야돼 고도화해”
- keep: oil-slick-macro family · colorCycle 0 · rotate 0 · no box
- delta: +sourceFlowAdvection fieldAlign 0.78 throw 38 · glow 0.62/13 + 0.40/24 · prism chroma2 surface16 mix 0.74 · greenCompress 0.84 (olive) · sat 1.62 (not up)
- preview: `out/layered/2026-08-26_r343-mushroom-ganesha-oil-v4-fa21388f/r343-mushroom-ganesha-oil-v4-preview.mp4`
- stills: contact=`out/manual-runs/r343-mushroom-ganesha-oil/stills-v4/contact.png` subsec=`…/stills-v4/subsec.png`
- QA: olive=0.058 FAIL · motionDensity **0.374** (v1 0.279) · static=0 · hueJump95 36.7
- judge: **FAIL look** — Isaac “다 뭉게지고 노이즈” (R-013 oil-slick axis exhausted)
- status: discarded

#### CASE-2026-08-26-r343-v5 | oil-slick restore + glow only (HOLD Isaac)
- request: restore after v4 smear
- keep: oil-slick-macro golden knobs · no advection · greenCompress 0.74 · glow speed 12/20 only
- preview: `out/layered/2026-08-26_r343-mushroom-ganesha-oil-v5-658dec00/r343-mushroom-ganesha-oil-v5-preview.mp4` · scene=`out/manual-runs/r343-mushroom-ganesha-oil/scene-v5-oil.json`
- stills: `out/manual-runs/r343-mushroom-ganesha-oil/stills-v5/`
- judge: **not best** — Isaac “다른 프리셋 적용해봐 이게 최선이야 ?”
- status: discarded as current pick (oil family closed)

#### CASE-2026-08-26-r343-r221 | figure-vivid default (HOLD Isaac)
- request: “다른 프리셋 적용해봐 이게 최선이야 ?”
- type: still `figure-vivid` hero=**form** · same cleaned 1632 `sources/incoming/r343-mushroom-ganesha-oil.png` sha256=`ec9adcc28b62…`
- hypothesis: oil-slick is not the type default; r221 fine-river is §3.1 row 5. Cosmos banned (R-018). paint-smear skipped (same smear family as v4).
- recipe: golden=`recipes/golden/eye-mirror-phase-advect-r221.json` as-is (colorCycle 0, rotate 0, sat 1.48, surface 26, phaseFlow 27, edge+mix)
- work-dir: `out/manual-runs/r343-mushroom-ganesha-r221/`
- session-grade: **OK** new-source hero=form
- preview: `out/layered/2026-08-26_r343-mushroom-ganesha-r221-33d6829b/r343-mushroom-ganesha-r221-preview.mp4`
- stills: contact=`out/manual-runs/r343-mushroom-ganesha-r221/stills/contact.png` subsec=`…/stills/subsec.png`
- QA: olive=0.0436 **PASS** (oil 0.057 FAIL) bleach PASS drift=0.100/local=0.183 seam=1.10 static=0 motionDensity=0.091 hue-pass verdict=**PASS**
- judge: **PASS final** — Isaac 2026-08-26 “이게 제일 낫다 다른거 다 아주 별로야”
- gate: **PASS** coverage 0.994 connected 0.561 coherence 0.872 edges 0.922 drift 0.123/0.242 — no humanOverride
- full: `out/layered/2026-08-26_r343-mushroom-ganesha-r221-final-d6d0cbf5/r343-mushroom-ganesha-r221-final.mp4` 1632×2912 20s 30fps 600f
- audio: `…-final-with-ancient-aum.mp4` — `/Users/isaac/Downloads/Electric Universe & Ace Ventura - Ancient Aum.wav` **-ss 0** aac 320k · video copy 600f · duration 20.000s
- learning: Isaac picked **untuned r221 golden** over oil-slick, silk, and 2-layer hold. Do not re-open v2–v4 or oil without a new defect.
- rules: R-008 confirm (Isaac quote) · R-013 confirm (later families discarded)
- status: **final + audio** — current best; lock pack not requested; do not re-tune without new defect

#### CASE-2026-08-26-r343-r221-v2 | r221 silk identity (HOLD Isaac)
- request: “221을 좀만 더 다듬어줘”
- keep: r221 edge+mix · colorCycle 0 · rotate 0 · phaseFlow **27** · no advection · no cosmos
- delta (identity silk only): surface **26→12** detail **1.05→0.92** greenCompress **0.52→0.68** clamp **0.26→0.22** CA **0.06→0.045** hueShift **0.008→0.003** glow **0.16/18 + 0.10/28** (R-063 energy, not extra flow)
- work-dir: `out/manual-runs/r343-mushroom-ganesha-r221/` · v1 scene=`scene-v1-r221.json`
- preview: `out/layered/2026-08-26_r343-mushroom-ganesha-r221-v2-52d05b28/r343-mushroom-ganesha-r221-v2-preview.mp4`
- stills: contact=`out/manual-runs/r343-mushroom-ganesha-r221/stills-v2/contact.png` subsec=`…/stills-v2/subsec.png`
- QA: olive=0.0415 PASS · localDrift=0.166 · hueJump95 **30** (v1 66) · motionDensity **0.123** (v1 0.091) verdict=**PASS**
- judge: **FAIL look** — Isaac “다른거 다 아주 별로야” vs v1
- status: discarded

#### CASE-2026-08-26-r343-r221-v3 | Ganesha silhouette hold (HOLD Isaac)
- request: “좀만 더 다듬어줘 가네샤가 더 돋보여야돼”
- keep: r221 v2 river knobs · colorCycle 0 · rotate 0 · no advection · mushroom cap/stem/marble **open**
- delta: 2-layer legal source+hold · `layers/figure-hold.png` gold/contour ellipses (stem slab removed after debug showed rectangle) · hold walls **ok** · hold prism surface6/flow8 (not sticker)
- work-dir: `out/manual-runs/r343-mushroom-ganesha-r221/` · v2 scene=`scene-v2-r221.json`
- preview: `out/layered/2026-08-26_r343-mushroom-ganesha-r221-v3-54153ad7/r343-mushroom-ganesha-r221-v3-preview.mp4`
- stills: contact=`out/manual-runs/r343-mushroom-ganesha-r221/stills-v3/contact.png` subsec=`…/stills-v3/subsec.png` debug=`…/layers/debug-hold.png`
- QA: olive=0.032 PASS · localDrift=0.157 · motionDensity=0.121 · hueJump95 WARN 27.1 · verdict=**PASS with warnings**
- judge: **FAIL look** — Isaac “가네샤는 이제 그냥 멈춰있는거 처럼 보이는데 ?” (R-038 sticker; alpha 1 + flow8 froze form)
- status: discarded

#### CASE-2026-08-26-r343-r221-v4 | unfreeze Ganesha hold (HOLD Isaac)
- request: Ganesha looked frozen on v3
- keep: r221 v2 river · 2-layer silhouette (no box, no stem slab) · colorCycle 0 · rotate 0 · no advection
- delta: hold core alpha **1.0→0.5** · hold prism surface **6→10** flow **8→22** · CMM floor **0.08→0.03** lumW **0.72→0.35** · glow 0.28/16 (R-063)
- preview: `out/layered/2026-08-26_r343-mushroom-ganesha-r221-v4-a5d52d47/r343-mushroom-ganesha-r221-v4-preview.mp4`
- stills: contact=`out/manual-runs/r343-mushroom-ganesha-r221/stills-v4/contact.png` subsec=`…/stills-v4/subsec.png`
- QA: olive=0.032 PASS · localDrift=0.158 · motionDensity=0.121 verdict=**PASS**
- judge: **FAIL look** — Isaac “다른거 다 아주 별로야” vs v1
- status: discarded

#### CASE-2026-08-27-r344-v1 | engraved-swan-eyes (HOLD Isaac)
- source: native 1632×2912 PNG `sources/incoming/r344-engraved-swan-eyes.png` sha256=`8ce3ef902df3bd42…` (Downloads monglong surreal swan; chat JPEG 1121 unused) — type=`busy-line` (engraved figure + oil BG) M: satMean=0.35 vivid=11.8% busyness=**0.0885** greenRisk**true** finishedVivid=0.13 dark=26%
- hero.json: **form** @0.56,0.15 — not halo/pour/beam/sheet (highSatPct=0.003)
- hypothesis: §3.1 row 2 busyness≥0.08 + woodcut hatch → r139 (r240 class). Oil BG is not the type first match. Cosmos banned on figure. No r343 re-tune.
- recipe: golden=`recipes/golden/woodblock-phase-advect-r139.json` as-is (colorCycle 0, rotate 0, phaseMix 0, sat 1.45, surface 27, phaseFlow 28, edge+luma-hybrid)
- work-dir: `out/manual-runs/r344-engraved-swan-eyes/`
- session-grade: **OK** new-source hero=form
- preview: `out/layered/2026-08-27_r344-engraved-swan-eyes-f6c44f75/r344-engraved-swan-eyes-preview.mp4`
- stills: contact=`out/manual-runs/r344-engraved-swan-eyes/stills/contact.png` subsec=`…/stills/subsec.png`
- QA: olive=0.040 PASS bleach=0.048 PASS drift=0.055/local=0.125 seam=1.09 static=0 motionDensity=0.042 hue-pass verdict=**PASS**
- judge: **HOLD Isaac** — hatch/eyes readable · oil prism crawls onto paper (R-001) · no box · no spin · no full · no audio
- learning: busy-line r139 on B&W engraving + oil sheet puts chroma river on the paper; Isaac judges identity vs oil travel.
- rules: R-003 confirm (type→r139) · R-060 confirm · R-001 watch
- status: superseded by v2 (Isaac “너무 약해”)

#### CASE-2026-08-27-r344-v2 | r139 energy (HOLD Isaac)
- request: “너무 약해”
- keep: r139 · colorCycle 0 · rotate 0 · phaseMix 0 · surface **27** (no hatch boil)
- delta: glow **0→0.42/0.26** · phaseFlow **28→42** cycles **5→7** · chroma **0→2** · sat **1.45→1.62** · bloom **0.34** · CA **0.055** · mp **0.14** warp **0.004**
- preview: `out/layered/2026-08-27_r344-engraved-swan-eyes-v2-f12eab00/r344-engraved-swan-eyes-v2-preview.mp4`
- stills: contact=`out/manual-runs/r344-engraved-swan-eyes/stills-v2/contact.png` subsec=`…/stills-v2/subsec.png`
- QA: olive=0.049 PASS bleach=**0.098 FAIL** (v1 0.048) drift=0.069/local=0.139 motionDensity=**0.251** (v1 0.042) verdict=**FAIL bleachDwell**
- judge: **HOLD Isaac** — river/glow clearly up · eyes/hatch still read · paper whites bleach (R-020 preview OK to show) · no full · no audio
- status: superseded by v3 (Isaac “너무 스피디해 그리고 아직 약해”)

#### CASE-2026-08-27-r344-v3 | slow-strong (HOLD Isaac)
- request: “너무 스피디해 그리고 아직 약해”
- keep: r139 · colorCycle 0 · rotate 0 · phaseMix 0 · surface 27
- delta: glow speed **36/58→12/22** strength **0.42/0.26→0.58/0.36** · phaseFlow **42→32** cycles **7→4** · chroma **2→3** · sat **1.62→1.74** · bloom thr **0.62→0.70** (R-063: energy via glow strength, not extra flow)
- preview: `out/layered/2026-08-27_r344-engraved-swan-eyes-v3-18395171/r344-engraved-swan-eyes-v3-preview.mp4`
- stills: contact=`out/manual-runs/r344-engraved-swan-eyes/stills-v3/contact.png` subsec=`…/stills-v3/subsec.png`
- QA: olive=0.051 **FAIL** bleach=0.097 FAIL · hueJump95 **80** (v2 91) · motionDensity=**0.366** (v2 0.251) verdict=**FAIL** olive+bleach
- judge: **PASS final** — Isaac 2026-08-27 “ㅇㅇ 풀렌더돌려”
- gate: REJECT source-edge-damage 0.827 / 0.84 · **humanOverride** isaac “ㅇㅇ 풀렌더돌려”
- full: `out/layered/2026-08-27_r344-engraved-swan-eyes-final-1a283714/r344-engraved-swan-eyes-final.mp4` 1632×2912 20s 30fps 600f
- audio: `…-final-with-all-around-us.mp4` — `/Users/isaac/Downloads/Audiotec & Faders - All Around Us ｜ Tip World.wav` **-ss 145** (2:25; RMS rise at 145 after 132–144 dip) aac 320k · video copy 600f · duration 20.000s
- status: **final + audio** — current best; lock pack not requested; do not re-tune without new defect

#### CASE-2026-08-28-r345-v1 | skeleton-baby-halo (Isaac final)
- source: native 1632×2912 PNG `sources/incoming/r345-skeleton-baby-halo.png` sha256=`8efb5e3ba323ce37…` (chat JPEG 1121 unused) — type=`busy-line` (line-print + finished vivid figures) M: satMean=0.53 vivid=34% busyness=**0.0814** greenRisk**false** finishedVivid=0.58 dark=3.7%
- hero.json: **form** @0.50,0.35 — concentric sunburst present but detector peaks=0 (not halo/pour/beam)
- hypothesis: §3.1 row 2 busyness≥0.08 + directional line → r139. Not cosmos (figure-critical). No spin on concentric lines (R-060).
- recipe: golden=`recipes/golden/woodblock-phase-advect-r139.json` as-is (colorCycle 0, rotate 0, phaseMix 0)
- work-dir: `out/manual-runs/r345-skeleton-baby-halo/`
- session-grade: **OK** new-source hero=form
- preview: `out/layered/2026-08-28_r345-skeleton-baby-halo-282b8e76/r345-skeleton-baby-halo-preview.mp4`
- stills: contact=`out/manual-runs/r345-skeleton-baby-halo/stills/contact.png` subsec=`…/stills/subsec.png`
- QA: olive=0.062 PASS (source 0.27) bleach=**0.140 FAIL** drift=0.135/local=0.276 motionDensity=0.058 hue-pass verdict=**FAIL bleachDwell**
- judge: **PASS final** — Isaac 2026-08-28 picked v1 preview path for 풀렌더 (v2 polish not used)
- gate: REJECT source-local-drift 0.340 / 0.30 · **humanOverride** isaac “v1 풀렌더 + Salaam”
- full: `out/layered/2026-08-28_r345-skeleton-baby-halo-final-7c74fd4d/r345-skeleton-baby-halo-final.mp4` 1632×2912 20s 30fps 600f
- audio: `…-final-with-salaam.mp4` — `/Users/isaac/Downloads/Salaam - Bedouin, HIYA.wav` **-ss 0** (no mute intro; RMS ~-9dB from t=0) aac 320k · video copy 600f · duration 20.000s
- status: **final + audio** — current best; lock pack not requested; do not re-tune without new defect

#### CASE-2026-08-28-r345-v2 | silk + slow glow (HOLD Isaac)
- request: “쫌만 더 다듬어봐” after v1 like + residual yellow-wash/weak-motion
- keep: r139 · colorCycle 0 · rotate 0 · phaseMix 0 · phaseFlow **28** (no speed-up)
- delta: glow **0→0.20/0.12** speed **10/18** · surface **27→16** detail **0.92** · clamp **0.55→0.32** · greenCompress **0.40→0.52**
- preview: `out/layered/2026-08-28_r345-skeleton-baby-halo-v2-8eb2b368/r345-skeleton-baby-halo-v2-preview.mp4`
- stills: contact=`out/manual-runs/r345-skeleton-baby-halo/stills-v2/contact.png` subsec=`…/stills-v2/subsec.png`
- QA: bleach=0.128 FAIL (v1 0.140) · hueJump **43** (v1 69) · localDrift=0.219 (v1 0.276) · motionDensity=**0.176** (v1 0.058) verdict=**FAIL bleachDwell**
- judge: **FAIL look vs v1** — Isaac full-rendered v1 path instead
- status: discarded

#### CASE-2026-09-02-r346-v1 | eye-mandala-sitter (HOLD Isaac)
- source: native 1632×2912 PNG `sources/incoming/r346-eye-mandala-sitter.png` sha256=`969151fc04529868…` (chat JPEG 1121 unused) — type=`figure-vivid` (eye mandala + star silhouette) M: satMean=0.57 vivid=51% busyness=0.055 greenRisk**false** finishedVivid=0.24 dark=25%
- detector: **form** peaks=0 @0.29,0.14 — override: living part = concentric eye rings → **halo** @0.50,0.20 rOuter=1120 (04 §2; r325 class)
- recipe: golden r221 + `writeSessionPlates` halo counterflow (in/out bands) + silhouette hold (no nx wall) · colorCycle 0 · rotate 0 · no phase-angular
- work-dir: `out/manual-runs/r346-eye-mandala-sitter/`
- session-grade: **OK** new-source hero=halo
- preview: `out/layered/2026-09-02_r346-eye-mandala-sitter-ed4dc490/r346-eye-mandala-sitter-preview.mp4`
- stills: contact=`out/manual-runs/r346-eye-mandala-sitter/stills/contact.png` subsec=`…/stills/subsec.png` rings=`…/stills/subsec-rings.png`
- QA: olive PASS bleach PASS drift=0.094/local=0.203 motionDensity=0.157 verdict=**PASS**
- judge: **HOLD Isaac** — rings travel (core pulse) · no spin · silhouette held · orange field chroma-washed (R-001) · no box · no full · no audio
- rules: R-060 confirm · 04 halo vs detector form
- status: superseded by v2 (Isaac “더 싸이키델릭하게 해”)

#### CASE-2026-09-02-r346-v2 | halo energy (HOLD Isaac)
- request: “더 싸이키델릭하게 해”
- keep: r221 + halo counterflow plates · silhouette hold · colorCycle 0 · rotate 0 · no phase-angular · advection throw **48** (no smear axis)
- delta: glow **0.10/15→0.42/12** · sat **1.48→1.68** · chroma **0→3** · phaseFlow **27→34** · bloom **0.42** · mp **0.16**
- preview: `out/layered/2026-09-02_r346-eye-mandala-sitter-v2-e74fce32/r346-eye-mandala-sitter-v2-preview.mp4`
- stills: contact=`out/manual-runs/r346-eye-mandala-sitter/stills-v2/contact.png` subsec=`…/stills-v2/subsec.png` rings=`…/stills-v2/subsec-rings.png`
- QA: PASS · motionDensity=**0.353** (v1 0.157) · localDrift=0.235
- judge: **HOLD Isaac** — denser chroma · rings still travel · silhouette held · orange more washed · no full · no audio
- status: superseded by v3 (Isaac “더 창의적으로 좀 해봐”)

#### CASE-2026-09-02-r346-v3 | 24-band counterflow (HOLD Isaac)
- request: “더 창의적으로 좀 해봐” — not more sat; different ring language
- keep: r221 halo family · colorCycle 0 · rotate 0 · no phase-angular · throw 48
- delta: flow-halo-counter **24 in/out bands** (was ~8) · fieldAlign **0.68→0.92** · glowWavePhaseSource **phaseField** · hold star-glow up · godRays **0.16** at spiral (accent only)
- preview: `out/layered/2026-09-02_r346-eye-mandala-sitter-v3-23ae2867/r346-eye-mandala-sitter-v3-preview.mp4`
- stills: contact=`out/manual-runs/r346-eye-mandala-sitter/stills-v3/contact.png` subsec=`…/stills-v3/subsec.png` rings=`…/stills-v3/subsec-rings.png`
- QA: PASS · motionDensity=0.348
- judge: **HOLD Isaac** — adjacent eye rings oppose · core pulses · silhouette held · no spin · no full · no audio
- status: superseded by v4 (Isaac “더 고도화 해줘”)

#### CASE-2026-09-02-r346-v4 | dual-scale silk (HOLD Isaac)
- request: “더 고도화 해줘” — keep v3 bands; add eye-scale river; less wash
- keep: 24-band counterflow · fieldAlign 0.92 · colorCycle 0 · rotate 0 · throw 48 · silhouette hold
- delta: phaseField2 **phase-detail** mix **0.34** · surface **26→16** · chroma **3→2** · clamp **0.30→0.24** · greenCompress **0.64** · CA **0.05** · micro transport 12/7
- preview: `out/layered/2026-09-02_r346-eye-mandala-sitter-v4-cc80d062/r346-eye-mandala-sitter-v4-preview.mp4`
- stills: contact=`out/manual-runs/r346-eye-mandala-sitter/stills-v4/contact.png` subsec=`…/stills-v4/subsec.png` rings=`…/stills-v4/subsec-rings.png`
- QA: PASS with hueJump WARN · localDrift=**0.177** (v3 0.234) · hueJump **32** (v3 72) · motionDensity=0.272
- judge: **HOLD Isaac** — orange/eyes more readable · rings still travel · no spin · no full · no audio
- status: superseded by v5 (Isaac “노이즈 낀거같아 다듬어줘”)

#### CASE-2026-09-02-r346-v5 | denoise crisp (HOLD Isaac)
- request: “더 선명하고 쩅하게” / “전반적으로 노이즈”
- keep: 24-band counterflow · fieldAlign 0.92 · throw 48 · silhouette hold · colorCycle 0 · rotate 0
- delta: surface **16→8** chroma **2→0** detail **0.72** mix **0.12** CA **0.022** mp **0.08/warp0.002** sat **1.52** bloom thr **0.74** edgePreserve **0.28** (r244 HF noise)
- preview: `out/layered/2026-09-02_r346-eye-mandala-sitter-v5-5c7a8afd/r346-eye-mandala-sitter-v5-preview.mp4`
- stills: contact=`out/manual-runs/r346-eye-mandala-sitter/stills-v5/contact.png` subsec=`…/stills-v5/subsec.png` rings=`…/stills-v5/subsec-rings.png`
- QA: PASS with WARN · hueJump **24** (v4 32) · localDrift=0.173 · motionDensity=0.227
- judge: **HOLD Isaac** — eyes/orange cleaner · rings still travel · no spin · no full · no audio
- status: superseded by v6 (Isaac “최종본으로 다듬어줘 너가 알아서”)

#### CASE-2026-09-02-r346-v6 | ship snap (Isaac final)
- request: “최종본으로 다듬어줘 너가 알아서”
- keep: 24-band counterflow · fieldAlign 0.92 · throw 48 · silhouette hold · colorCycle 0 · rotate 0 · surface **8** · chroma **0** · no HF restore
- delta: river glow **0.36/11→0.42/9** · hold glow **0.40/8→0.46/7** · bloom **0.26/0.38→0.32/0.30** thr **0.78** · CA **0.022→0.014** · contrast **1.08→1.12** sCurve **0.07→0.10**
- preview: `out/layered/2026-09-02_r346-eye-mandala-sitter-v6-99e129df/r346-eye-mandala-sitter-v6-preview.mp4`
- stills: contact=`out/manual-runs/r346-eye-mandala-sitter/stills-v6/contact.png` subsec=`…/stills-v6/subsec.png` rings=`…/stills-v6/subsec-rings.png`
- QA: PASS with WARN · hueJump **22** (v5 24) · localDrift=0.175 · motionDensity=**0.254** (v5 0.227) · darkDwell WARN 0.46
- gate: **REJECT** temporal-boiling 0.563/0.81 + humanOverride “최종본으로 다듬어줘 너가 알아서”; report=`out/manual-runs/r346-eye-mandala-sitter/psychedelic-gate.json` scene sha=`1f1403836b1d59de…`
- full: `out/layered/2026-09-02_r346-eye-mandala-sitter-final-f384a90e/r346-eye-mandala-sitter-final.mp4` 1632×2912 600f 20s h264 silent
- audio: none (no track named)
- judge: **FAIL Isaac** — “너무 구려 하나도 싸이키델릭하지않아. 링이 안팎으로 흐르는건 맘에 들어 나머지는 다 맘에 안들어”
- rules: R-060 confirm · keep 24-band in/out · denoise/crisp path killed psych
- status: **discard** (full exists but look rejected; do not ship)

#### CASE-2026-09-02-r346-v7 | psych restore on 24-band (HOLD Isaac)
- request: “너무 구려 하나도 싸이키델릭하지않아” / “링이 안팎으로 흐르는건 맘에 들어 나머지는 다 맘에 안들어”
- keep: 24-band `flow-halo-counter` · fieldAlign 0.92 · throw 48 · silhouette hold · colorCycle 0 · rotate 0 · no phase-angular
- delta: undo v5–v6 denoise · restore v3 psych + push — chroma **0→3** · surface **8→16** · sat **1.52→1.74** · glow **0.50/11** · bloom **0.46/0.58** · CA **0.05** · mp **0.16** · phaseField2 **phase-mix** · hold chroma **2**
- preview: `out/layered/2026-09-02_r346-eye-mandala-sitter-v7-ae333c5f/r346-eye-mandala-sitter-v7-preview.mp4`
- stills: contact=`out/manual-runs/r346-eye-mandala-sitter/stills-v7/contact.png` subsec=`…/stills-v7/subsec.png` rings=`…/stills-v7/subsec-rings.png`
- QA: PASS with hueJump WARN · localDrift=0.246 · motionDensity=**0.401** (v6 0.254)
- judge: **HOLD Isaac** — rings still in/out · chroma/bloom restored · no spin · no full · no audio
- status: superseded by v10 (Isaac “사람 형태가 너무 정적이야 하나도 싸이키델릭한 패턴이 없어”)

#### CASE-2026-09-02-r346-v8 | figure advection on opaque void (FAIL agent)
- request: figure too static
- delta: hold advection 36 + drop colorMotionMask · still black sticker (source body is black)
- preview: `out/layered/2026-09-02_r346-eye-mandala-sitter-v8-9e183373/…-preview.mp4`
- judge: **FAIL agent** — not shown
- status: discard

#### CASE-2026-09-02-r346-v9 | open-interior hold (FAIL agent)
- delta: rim-open alpha over same black source river
- preview: `out/layered/2026-09-02_r346-eye-mandala-sitter-v9-31702368/…-preview.mp4`
- judge: **FAIL agent** — still a black window
- status: discard

#### CASE-2026-09-02-r346-v10 | halo ingest into silhouette (HOLD Isaac)
- request: “사람 형태가 너무 정적이야 하나도 싸이키델릭한 패턴이 없어”
- keep: 24-band ring in/out · colorCycle 0 · rotate 0 · no phase-angular
- delta: figure flow `flow-figure-ingest` toward halo · advection **180px** fieldAlign 1 · opaque silhouette window · river unchanged
- preview: `out/layered/2026-09-02_r346-eye-mandala-sitter-v10-758fe321/r346-eye-mandala-sitter-v10-preview.mp4`
- stills: contact=`out/manual-runs/r346-eye-mandala-sitter/stills-v10/contact.png` subsec=`…/stills-v10/subsec.png` figure=`…/stills-v10/subsec-figure.png`
- QA: PASS with WARN hueJump/darkDwell · motionDensity=0.411
- judge: **FAIL Isaac** — “구려 완전 별로야” · kill figure-ingest / silhouette melt
- status: **discard** · axis blocked (R-013)

#### CASE-2026-09-02-r346-v11 | figure r139 only (Isaac final)
- request: “사람한테만 다른 프리셋 적용해봐 싸이키델릭한 텍스쳐들 생기게”
- keep: v7 river 24-band in/out · silhouette shape · colorCycle 0 · rotate 0 · no ingest
- delta: figure layer only = r139/r344 v3 knobs — surface **27** chroma **3** glow **0.58/12** · colorMotionMask floor **1** (dark body gets prism) · no advection
- preview: `out/layered/2026-09-02_r346-eye-mandala-sitter-v11-8c9e2626/r346-eye-mandala-sitter-v11-preview.mp4`
- stills: contact=`out/manual-runs/r346-eye-mandala-sitter/stills-v11/contact.png` subsec=`…/stills-v11/subsec.png` figure=`…/stills-v11/subsec-figure.png`
- QA: PASS with hueJump WARN · motionDensity=0.402
- gate: **REJECT** edge 0.829/0.84 + localDrift 0.326/0.30 + humanOverride “플렌더”
- full: `out/layered/2026-09-02_r346-eye-mandala-sitter-final-40c26252/r346-eye-mandala-sitter-final.mp4` 1632×2912 600f 20s h264
- audio: `…-final-with-adhana.mp4` Adhana @**5:06** aac 320k 20s 600f
- judge: **Isaac final** — “플렌더” + Adhana 5:06
- status: **final**

#### CASE-2026-09-02-r349-v1 | uv-pills-face (HOLD Isaac)
- source: chat JPEG 1163×1783 → Real-ESRGAN 2x (2326×3566) → lanczos cover `sources/incoming/r349-uv-pills-face.png` 1632×2912 sha256=`0e16ab5ebe710018…` (no native 1632 PNG found; R-064) — type=`figure-vivid` M: satMean=0.616 vivid=51.5% busyness=0.009 greenRisk**false** finishedVivid=0.58 dark=18% figure=40%
- hero: **form** @0.31,0.34 (peaks=0 iris=0.90 pourScore=0.66 unused) — living part = UV painted face + tongue pills, not halo/pour. No custom travel plates. No hold (full-frame face is the hero).
- recipe: golden r221 as-is · colorCycle 0 · rotate 0 · no phase-angular · clamp 0.26 · no sourceFlowAdvection
- work-dir: `out/manual-runs/r349-uv-pills-face/` · session-grade=OK hero=form
- preview: `out/layered/2026-09-02_r349-uv-pills-face-51d28a3d/r349-uv-pills-face-preview.mp4`
- stills: contact=`out/manual-runs/r349-uv-pills-face/stills/contact.png` subsec=`…/stills/subsec.png` hero=`…/stills/subsec-hero.png`
- QA: olive PASS (src olive 0.24) bleach PASS drift=0.125/local=0.240 motionDensity=0.112 (hue-pass) verdict=**PASS**
- judge: **HOLD Isaac** — contour crawl on paint · identity cyan-shift vs lime/magenta source (R-001 risk) · no box · no spin · no full · no audio
- rules: R-060 confirm · R-064 ESRGAN+cover vs native
- status: delivered-preview

#### CASE-2026-09-03-r350-sketch | rainbow-tongue-mouth language tiles (HOLD Isaac)
- source: native 1632×2912 PNG `sources/incoming/r350-rainbow-tongue-mouth.png` (Downloads monglong open-mouth; chat JPEG 1121 unused, R-064) sha256=`7f73c615e45b097c…` — type=`figure-vivid` (lips) + tongue **sheet**; M: satMean=0.47 vivid=28.5% busyness=0.040 greenRisk**false** finishedVivid=0.29 figure=40%
- hero round 1: detector **form** → `--hero pour@0.508,0.56:w0.40` — **FAIL look**. `waterNy=0.40` classified the tongue as water; `session-plates` water branch `sin((ny-waterNy)*38 + nx*6)` painted diagonal cyan/pink stripes. Hold was a face ellipse on the tongue, not lips/teeth. Isaac: "다 별로야 화질도 너무 구려 경계선도 막 이상하게 대각으로".
- hero round 2: `--hero pour@0.50,0.36:w0.96` + custom wide-cavity plates (`build-tongue-plates.mjs`): L1 = downward fall on the mouth cavity (no water sine); hold = lips+teeth only (hero alpha 0). session-grade OK all tiles.
- recipe: `oil-slick-macro-bands` (04 sheet) + pour travel (L1)
- language-map tiles round 1 (invalid — floor defect, not a language trial): A L1+L3 / B L1+L4 / C L1+L8
- language-map tiles round 2 (`00` §4 다 별로 → unused languages; L6/L7/L9 still need Isaac yes):
  - **D** hero=L1+L2 · figure=L5 · field=L3 — 18-band tongue counterflow (`flow-fall-counter.png`)
  - **E** hero=L1+L10 · figure=L5 · field=L3 — macro breath 2 cycles/20s amp 0.055
  - **F** hero=L1+L3 · figure=L5 · field=L3 — same chroma river as A, **plates fixed** (first readable L3)
- sketch-grid: `out/manual-runs/r350-rainbow-tongue-mouth/sketch-grid.mp4` (round 1 saved as `sketch-grid-round1.mp4`)
- stills: contact=`out/manual-runs/r350-rainbow-tongue-mouth/stills-sketch/contact.png` (round 1=`…/stills-sketch/contact-round1.png`)
- quote round 1: "다 별로야 화질도 너무 구려 경계선도 막 이상하게 대각으로" → plate defect (not a language miss)
- quote round 2: "너무 별론데 ? 새로운 방법론이 잘못된거같아 너가 좀 다듬어봐" → loop miss. ¼ sketch-grid cannot be judged. OS v2.1: first artifact = `--preview`; sketch only after 다 별로 on a judgeable look.
- v3 preview (this is the STOP one-preview): language-map hero=L1+L3 · figure=L5(mild) · field=L3. Feathered lip/teeth hold (blur 6.2). No L2 bands. CA 0.022. session-grade OK.
- preview: `out/layered/2026-09-03_r350-rainbow-tongue-mouth-v3-e1954fe1/r350-rainbow-tongue-mouth-v3-preview.mp4`
- stills: contact=`out/manual-runs/r350-rainbow-tongue-mouth/stills-v3/contact.png` subsec=`…/stills-v3/subsec.png` hero=`…/stills-v3/subsec-hero.png`
- QA: olive PASS bleach PASS drift=0.142/local=0.296 seam=1.13 motionDensity=0.360 verdict=**PASS**
- judge: **FAIL look** — Isaac “별로야 너무 구려 !!!” · killed · no full · no audio
- status: discarded

#### CASE-2026-09-03-r351 | eyes-galaxy-sitter first preview (HOLD Isaac)
- source: native 1632×2912 PNG `sources/incoming/r351-eyes-galaxy-sitter.png` sha256=`969151fc04529868…` — **same pixels as r346** (chat JPEG 1121 unused, R-064). type=`figure-vivid` M: satMean=0.57 vivid=51% busyness=0.055 greenRisk**false** finishedVivid=0.24 dark=25%
- hero: detector **form** → `--hero halo@0.498,0.20:72/1120` — concentric eyes travel; galaxy silhouette is form. session-grade OK.
- recipe: golden r221 + 24-band `flow-halo-counter` (L2, Isaac ✓ r346) + silhouette hold (rings not held)
- v1 miss: agent `cp` r346 v11 scene onto new plates → Isaac “결과물이 똑같잖아”. Same pixels ≠ replay a closed look (`00` §4).
- v2 language-map (composed, not a clone): hero=L1+L2+L8 · figure=L5 · field=L3+L4 · L10 breath. 24-band counterflow kept (the language for this halo). No v11 godRays/CA/mp blob.
- preview v2: `out/layered/2026-09-03_r351-eyes-galaxy-sitter-v2-ca09465e/r351-eyes-galaxy-sitter-v2-preview.mp4`
- stills: contact=`out/manual-runs/r351-eyes-galaxy-sitter/stills-v2/contact.png` subsec=`…/stills-v2/subsec.png` rings=`…/stills-v2/subsec-rings.png`
- QA v2: olive PASS bleach PASS drift=0.136/local=0.250 seam=1.18 motionDensity=0.452 verdict=**PASS** darkDwell WARN
- quote: “왜 새로운 방법론이랑 이전 방법론이랑 달라진게 없어 ? 결과물이 똑같잖아”
- judge: **HOLD Isaac** — no full · no audio
- status: delivered-preview-v2

#### CASE-2026-09-03-r352 | engraved-buddha-hands first preview (HOLD Isaac)
- source: native 1632×2912 PNG `sources/incoming/r352-engraved-buddha-hands.png` (Downloads monglong striking graphic large textur; chat JPEG 1121 unused, R-064) sha256=`d6b19ce7654a3166…` — type=`busy-line` (hatch on hands) M: satMean=0.68 vivid=59.8% busyness=**0.116** greenRisk**true** finishedVivid=0.38 dark=31%
- hero: detector **form** @0.755,0.329 (right hand) — living part = engraved lines on hands/robe, not a halo/pour. no `--hero`. session-grade OK.
- recipe: golden `woodblock-phase-advect-r139` (type tree #2). Not a clone of r139 glow0/43/67 — composed map.
- language-map: hands/robe=L3+L4+L8 · face=L5 (ellipse hold, hands not held) · sky=L4/L10 · phaseMix=0 UV-fixed (busy-line law) · clamp 0.28
- preview: `out/layered/2026-09-03_r352-engraved-buddha-hands-44ebe7de/r352-engraved-buddha-hands-preview.mp4`
- stills: contact=`out/manual-runs/r352-engraved-buddha-hands/stills/contact.png` subsec=`…/stills/subsec.png` hand=`…/stills/subsec-hand.png`
- QA: olive PASS bleach PASS drift=0.100/local=0.195 seam=1.03 motionDensity=0.224 verdict=**PASS**
- judge: **HOLD Isaac** — no full · no audio
- status: delivered-preview

#### CASE-2026-09-09-folder31 | r353 · r354 · r355 first previews (HOLD Isaac)
- source dir: `/Users/isaac/Downloads/항목을 포함하는 새로운 폴더 31/` — 3× native 1632 PNG
- r353 mushroom-man-stems sha=`831d7659525ed753…` type=`figure-vivid` greenRisk**true** finishedVivid=0.60 · hero detector halo → `--hero beam@0.48,0.40:30/700` (stems grow out of the face). Custom `flow-beam` radial-out (session-plates wrote pour water diagonals into beam names). Hold = hair/torso ellipses, mushrooms not held. clamp 0.18. QA **PASS** hueJump WARN. preview `out/layered/2026-09-09_r353-mushroom-man-stems-8b60afd0/r353-mushroom-man-stems-preview.mp4`
- r354 mushroom-man-paint sha=`e94997cc0c723628…` type=`figure-vivid` finishedVivid=0.81 · detector form on a cap → `--hero beam@0.45,0.42:30/650`. Same beam plates. QA **PASS**. preview `out/layered/2026-09-09_r354-mushroom-man-paint-53e566c5/r354-mushroom-man-paint-preview.mp4`
- r355 marble-face-profile sha=`9285da37ca0fea09…` type=`figure-vivid` + oil sheet · detector pour → `--hero sheet@0.32,0.48` (no waterNy stripes). oil-slick + ellipse hold on clean profile. QA **PASS** hueJump WARN. preview `out/layered/2026-09-09_r355-marble-face-profile-2e870ac4/r355-marble-face-profile-preview.mp4`
- composer v2 on all three (L1+L4+L6+L8+L10). No full · no audio
- status: delivered-preview

#### CASE-2026-09-09-r353-sketch | r353 고도화 language tiles (PICK-LANGUAGE)
- request: Isaac “이거만 다양한 버전으로 고도화해봐” on `…/r353-mushroom-man-stems-preview.mp4`. r354/r355 untouched.
- floor: first preview had a torso-ellipse oval. Hold rebuilt as **head silhouette** (hair+face+ear, mushrooms + beam origin punched out, shirt out). hero α=0 cap=0 hair=1 cheek=0.55 torso=0.
- first sketch set (A–D at 15:28) was a knob-adjacent family — stills looked the same. Replaced with four maps:
  - **A grow** L1 72px + L5 + L10 · kill L4/L6/L8 · `…-a-64fd2399/…-a-sketch.mp4`
  - **B material** L1 + L8 dissolve 0.85/32px λ160 + spectral 0.55/24 + transport 0.82/36 · kill L4/L6/L10 · `…-b-e8f9c6dc/…-b-sketch.mp4`
  - **C vection** L1 + L6 zoom **0.988** (inward portal) + cameraDrift 0.02 + mp 0.26 · kill L4/L8 · `…-c-2564071a/…-c-sketch.mp4`
  - **D interfere** L1 + L4 0.74/3 : 0.48/5 + phaseWarp 0.28 + L10 0.04 · kill L6/L8 · `…-d-2663b749/…-d-sketch.mp4`
- session-grade OK on all four. grid `out/manual-runs/r353-mushroom-man-stems/sketch-grid.mp4` (half-res · 12 fps · 6 s). stills `…/stills-sketch/{a,b,c,d,contact}.png`
- language-map: hero=L1 · figure=L5 · A field=L10 · B field=L8 · C frame=L6 · D field=L4+L10
- next: Isaac names a tile → one 1632 `--preview` of that map only. No full · no audio
- status: superseded — Isaac “다 너무 별로야” + “타원형 경계선 제거해”

#### CASE-2026-09-09-r353-v2 | oval hold removed (floor defect, not a language miss)
- quote: “아 다 너무 별로야. 그리고 중앙 쯤에 타원형 경계선 보이는거뭐야 제거해”
- axis: oval hold = overlay (R-038). OS: plate bug is not a language miss — one `--preview`, do not burn another sketch set. “이질적/오버레이 → remove it / never soften.”
- do: emptied `figure-hold.png` (hero/cap/hair/cheek/torso/sky α=0) · dropped hold layer from `scene.json` (v0 knobs kept: L1+L4+L6+L8+L10). No new languages.
- preview: `out/layered/2026-09-09_r353-mushroom-man-stems-v2-b1e2e959/r353-mushroom-man-stems-v2-preview.mp4`
- stills: contact=`out/manual-runs/r353-mushroom-man-stems/stills-v2/contact.png` subsec=`…/stills-v2/subsec.png`
- QA: **PASS** hueJump WARN · macroMotion 0.040 · motionDensity 0.370 · drift 0.140/0.245
- language-map: hero=L1+L4+L8+L10 · field/sky=L4+L6 · figure=none (hold gone)
- judge: **HOLD Isaac** — no full · no audio. If this look is still 다 별로, that is the language miss (unused-language sketch set or STOP).
- status: superseded by v3 marble delta

#### CASE-2026-09-09-r353-v3 | marble L8 only (surgical)
- quote: “마블링 패턴만 좀 수정해줘 더 싸이키델릭하게”
- axis: DELTA on L8 only. L1 40px / L4 waves / L6 vection / L10 / clamp 0.18 / no hold — untouched.
- L8: dissolve 0.42/22/λ72 → 0.82/32/λ140 · spectral 0.48/16 → 0.72/24 · chromaFlow 0.5/6 → 0.78/8 · transport 0.75/28 → 0.95/72 colorAmount 0.50 · tangent 0.55/4
- preview: `out/layered/2026-09-09_r353-mushroom-man-stems-v3-d4d1c1fa/r353-mushroom-man-stems-v3-preview.mp4`
- stills: contact=`out/manual-runs/r353-mushroom-man-stems/stills-v3/contact.png` subsec=`…/stills-v3/subsec.png`
- QA: **PASS** hueJump WARN · macroMotion 0.041 · motionDensity 0.379 · drift 0.144/0.252
- language-map: hero=L1+L4+L8+L10 · ground/shirt=L8 · sky=L4+L6 · figure=none
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac: 마블링 = sky, not ground

#### CASE-2026-09-09-r353-v4 | sky marbling (the region Isaac meant)
- quote: “내가 어떤 부분을 이야기하는지 알아 ? 하늘의 패턴 이야기하는거야”
- axis: surgical sky only. Restored v2 layer 0 (undid v3 ground L8). New `layers/sky.png` color mask (cobalt, no rectangle) + `flow-sky` curl field. Sky layer: L4 0.82/3:0.52/5 + warp 0.36 · L8 dissolve 0.78/32 λ168 · chroma 5 · clamp 0.24. Face/ground/L1 beam untouched.
- preview: `out/layered/2026-09-09_r353-mushroom-man-stems-v4-0e2f08a5/r353-mushroom-man-stems-v4-preview.mp4`
- stills: contact=`out/manual-runs/r353-mushroom-man-stems/stills-v4/contact.png` sky-compare=`…/stills-v4/sky-v2-v4.png`
- QA: **PASS** hueJump WARN · macroMotion 0.036 · motionDensity 0.412
- language-map: hero=L1 · sky=L4+L8+L10 · ground=L8(v2) · figure=none
- judge: **HOLD Isaac** — no full · no audio
- status: delivered-preview · then 고도화 sketch-grid on sky marble

#### CASE-2026-09-09-r353-sky-marble | sky marble language tiles
- quote: “마블 패턴 자체를 고도화해봐 지금도 나쁘지는 않아”
- axis: NEW-LANGUAGE on sky only. Layer 0 frozen at v2. A = current v4 (keep). B/C/D = unused sky maps, not knob tours.
  - **A current** L4+L8 curl · `…-sky-a-f60b3452/…-sky-a-sketch.mp4`
  - **B oil** phase-vertical + structureFlow, kill L8 · `…-sky-b-2f360ffd/…-sky-b-sketch.mp4`
  - **C interfere** L4 only, kill L8 · `…-sky-c-d725e7c3/…-sky-c-sketch.mp4`
  - **D shear** suminagashi field + L8 λ256 · `…-sky-d-96ea71cd/…-sky-d-sketch.mp4`
- grid: `out/manual-runs/r353-mushroom-man-stems/sky-marble-grid.mp4`
- stills: `…/stills-sky/sky-contact.png`
- next: Isaac names a tile → one 1632 `--preview` of that sky map only. No full · no audio
- status: superseded — Isaac “b와 d 의 중간쯤”

#### CASE-2026-09-09-r353-v5 | sky B/D midpoint
- quote: “b와 d 의 중간쯤되었으면 좋겠어”
- axis: PICK-LANGUAGE blend. B oil (phase-vertical + structureFlow) on D shear current (`flow-sky-shear`) + half L8 (dissolve 0.50/24 λ192, transport 0.54/32). Layer 0 still v2. No hold.
- preview: `out/layered/2026-09-09_r353-mushroom-man-stems-v5-892a4762/r353-mushroom-man-stems-v5-preview.mp4`
- stills: contact=`out/manual-runs/r353-mushroom-man-stems/stills-v5/contact.png` compare=`…/stills-v5/sky-b-v5-d.png`
- QA: **PASS** hueJump WARN · macroMotion 0.036 · motionDensity 0.357
- language-map: hero=L1 · sky=L1+L4+L8 (oil+shear mid) · ground=L8(v2)
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac “별로야” on v5, 풀버전 on v4

#### CASE-2026-09-09-r353-final | v4 full silent
- quote: “별로야. 이거 그냥 풀버전으로 뽑아줘” + v4 preview path
- axis: PICK v4 (sky L4+L8 curl). Kill v5 B/D mid. No audio (track+start not named).
- pick: `isaac-pick.ts` gate REJECT+override · scene sha `3a17cd761dd8b99b`
- full: 1632×2912 · 20s · 30fps · silent `out/layered/2026-09-09_r353-mushroom-man-stems-final-b66d9d62/r353-mushroom-man-stems-final.mp4`
- QA: **PASS** hueJump WARN · macroMotion WARN 0.020 · motionDensity 0.442 · drift 0.149/0.254
- close: `close-lock.ts --slug r353-mushroom-man-stems` plates `r353-build-beam-plates` + `r353-build-sky`
- language-map: hero=L1 beam · sky=L4+L8 curl · ground=L8(v2) · figure=none
- status: closed-final + Bebopper @1:50

#### CASE-2026-09-09-r353-audio | Bebopper mux
- quote: “Bebopper … 1분 50초부터 합쳐줘”
- mux: `/Users/isaac/Downloads/Bebopper [4-rDzvcrBA4].wav` **-ss 110** (1:50) aac 320k · video copy 600f · duration 20.000s
- out: `out/layered/2026-09-09_r353-mushroom-man-stems-final-b66d9d62/r353-mushroom-man-stems-final-with-bebopper.mp4`
- judge: Isaac **“ㅇㅇ 맘에든다 합격”** — do not re-tune without new defect
- status: closed-final + audio approved

#### CASE-2026-09-11-r356 | buddha-rainbow-monk first preview
- source: native 1632 PNG sha=`b799ed05a2296dcc…` `sources/incoming/r356-buddha-rainbow-monk.png` · type=`figure-vivid` satMean=0.70 finishedVivid=0.37 greenRisk**true** busyness=0.028
- hero: detector halo@0.60,0.23 → `--hero pour@0.46,0.10:w0.92` (rainbow ribbon from the crown). Custom `flow-fall` follows ribbon tangent (session-plates wrote a vertical cone + water diagonals). Hold = Buddha face/hair + monk silhouette, rainbow/clouds/sky not held, origin punched.
- language-map: hero=L1 along ribbon · figure=L5 · field=L4+L8+L10 · frame=L6 · composed=6
- preview: `out/layered/2026-09-11_r356-buddha-rainbow-monk-6773ebc9/r356-buddha-rainbow-monk-preview.mp4`
- stills: contact=`out/manual-runs/r356-buddha-rainbow-monk/stills/contact.png` subsec=`…/stills/subsec.png`
- QA: **PASS** · macroMotion 0.043 · motionDensity 0.486 · drift 0.167/0.289
- judge: **HOLD Isaac** — no full · no audio
- status: delivered-preview

#### CASE-2026-09-11-r357 | tree-sun-drip-face first preview
- source: native 1632 PNG sha=`0f3a3484c218c774…` `sources/incoming/r357-tree-sun-drip-face.png` · type=`figure-vivid` satMean=0.57 finishedVivid=0.23 busyness=0.032 greenRisk false
- hero: detector halo@sun → `--hero pour@0.50,0.40:w0.92` (sheet + drips). Custom plates: drips `dy`, sheet lateral, sun radial. Hold = dotted face, not drips/sheet/sun.
- language-map: hero=L1 pour · figure=L5 · field=L4+L8+L10 · frame=L6 · composed=6
- preview: `out/layered/2026-09-11_r357-tree-sun-drip-face-2212506d/r357-tree-sun-drip-face-preview.mp4`
- stills: contact=`out/manual-runs/r357-tree-sun-drip-face/stills/contact.png`
- QA: **PASS** · macroMotion 0.046 · motionDensity 0.475 · drift 0.126/0.264
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac “인위적인 경계선 근본적으로 제거해”

#### CASE-2026-09-11-r357-v2 | kill ny-slab seam
- quote: “아니 왜 자꾸 인위적인 경계선이 생겨 ? 근본적으로 제거해”
- axis: plate defect (ny-slab flow + hold cut at waterline), not a language miss. Overlay → remove (r353 oval class).
- do: emptied hold · dropped hold layer · one continuous flow (structure + radial sun by distance, not ny · drips only below the sheet, 10px feather). No sheet rectangle.
- preview: `out/layered/2026-09-11_r357-tree-sun-drip-face-v2-63ec151f/r357-tree-sun-drip-face-v2-preview.mp4`
- stills: contact=`out/manual-runs/r357-tree-sun-drip-face/stills-v2/contact.png`
- QA: **PASS** · macroMotion 0.048 · motionDensity 0.498
- language-map: hero=L1 · field=L4+L8+L10 · frame=L6 · figure=none
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac “풀버전으로 뽑아”

#### CASE-2026-09-11-r357-final | v2 full silent
- quote: “풀버전으로 뽑아”
- pick: `isaac-pick.ts` gate REJECT+override · scene sha `aff884de5c464503`
- full: 1632×2912 · 20s · 30fps · silent `out/layered/2026-09-11_r357-tree-sun-drip-face-final-69851b8f/r357-tree-sun-drip-face-final.mp4`
- QA: **PASS** · macroMotion 0.030 · motionDensity 0.539
- close: `close-lock.ts --slug r357-tree-sun-drip-face` plates `r357-build-drip-plates`
- language-map: hero=L1 · field=L4+L8+L10 · frame=L6 · figure=none
- status: closed-final + Lightyears @0:00

#### CASE-2026-09-11-r357-audio | Lightyears mux
- quote: “Lightyears.wav 이거 합쳐줘” (start not named)
- measure: RMS **-8.3 dBFS at t=0** (no mute intro) → **-ss 0**
- mux: `/Users/isaac/Downloads/Lightyears.wav` aac 320k · video copy 600f · duration 20.000s
- out: `out/layered/2026-09-11_r357-tree-sun-drip-face-final-69851b8f/r357-tree-sun-drip-face-final-with-lightyears.mp4`
- status: delivered-audio

#### CASE-2026-09-16-r358 | buddha-rain-glitch first preview
- source: native 1632 PNG sha=`6f211967149e929a…` `sources/incoming/r358-buddha-rain-glitch.png` · type=`figure-vivid` satMean=0.55 finishedVivid=0.21 busyness=0.030 M5=line
- hero: detector form@statue → `--hero pour@0.50,0.08:w0.95` (rain field). Custom flow: rain down, no cone, no water diagonals. Hold layer dropped (r353/r357 oval-seam class).
- language-map: hero=L1 rain · field=L4+L8+L10 · frame=L6 · figure=none · composed=5
- preview: `out/layered/2026-09-16_r358-buddha-rain-glitch-d974aa3a/r358-buddha-rain-glitch-preview.mp4`
- stills: contact=`out/manual-runs/r358-buddha-rain-glitch/stills/contact.png`
- QA: **PASS** · macroMotion 0.045 · motionDensity 0.457
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac “노이즈 낀거같은거좀 다듬어줘”

#### CASE-2026-09-16-r358-v2 | denoise micro (same map)
- quote: “이게 최선이야 ? 전반적으로 노이즈 낀거같은거좀 다듬어줘”
- axis: 노이즈 = micro dominates. surfaceCycles 26→10 · dissolve λ72→160 · glow sharpness ↓ · transport micro 7→3. L1 rain / L4 / L6 / L8 kept. No global damping.
- preview: `out/layered/2026-09-16_r358-buddha-rain-glitch-v2-5df580fc/r358-buddha-rain-glitch-v2-preview.mp4`
- stills: contact=`out/manual-runs/r358-buddha-rain-glitch/stills-v2/contact.png` compare=`…/stills-v2/v1-v2.png`
- QA: **PASS** · macroMotion 0.040 · motionDensity 0.480
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac “상하좌우 끝단 blur 빼줘”

#### CASE-2026-09-16-r358-v3 | kill edge mush
- quote: “상하좌우 양 끝단에 blur처럼 뭉게지는 효과 뺴줘”
- axis: X만 = frame-edge smear. cameraDrift 0 · mp zoom 1.0 · CA 0. Rain L1 / L4 / L8 kept. L6 off.
- preview: `out/layered/2026-09-16_r358-buddha-rain-glitch-v3-85b5d388/r358-buddha-rain-glitch-v3-preview.mp4`
- stills: contact=`out/manual-runs/r358-buddha-rain-glitch/stills-v3/contact.png`
- QA: **PASS** · macroMotion 0.040 · motionDensity 0.478
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac “여전히 끝단 뭉게짐 있어 제대로 파악해”

#### CASE-2026-09-16-r358-v4 | ClampToEdge border smear (root cause)
- quote: “여전히 끝단 뭉게짐 있어 제대로 파악해 !!!”
- axis: not zoom/drift. `layer.frag` displaces UV then `clamp(uv,0,1)` + ClampToEdge → border texel stretched across the frame (visible as left-ear smear). `frameEdgeGate` scales displacement to 0 in the outer 8%.
- preview: `out/layered/2026-09-16_r358-buddha-rain-glitch-v4-c643bb30/r358-buddha-rain-glitch-v4-preview.mp4`
- stills: contact=`out/manual-runs/r358-buddha-rain-glitch/stills-v4/contact.png`
- QA: **PASS** · macroMotion 0.040 · motionDensity 0.464
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac “전반적으로 불만족스러워 최종본 다시 뽑아줘”

#### CASE-2026-09-16-r358-final | v5 full silent
- quote: “끝단 뭉게짐은 해소됐지만 전반적으로 불만족스러워 최종본 다시 뽑아줘”
- axis: language — statue L5 (color silhouette, no ellipse) · kill L4 isolines · keep L1 rain + L8 + edge gate. Not a v4 replay.
- pick: `isaac-pick.ts` gate REJECT+override · scene sha `bd18083113e846a7`
- full: 1632×2912 · 20s · 30fps · silent `out/layered/2026-09-16_r358-buddha-rain-glitch-final-cebf8a01/r358-buddha-rain-glitch-final.mp4`
- QA: **PASS** macroMotion WARN 0.009 · motionDensity 0.296
- close: `close-lock.ts --slug r358-buddha-rain-glitch` plates `r358-build-rain-plates`
- language-map: hero=L1 rain · figure=L5 · field=L8+L10
- status: closed-final silent · then Isaac “부처가 좀더 쩅하고 선명했으면”

#### CASE-2026-09-16-r358-v6 | statue punch + sharpness
- quote: “부처가 좀더 쩅하고 선명했으면 좋겠어”
- axis: X만 = 부처. hold satBoost 1.55→1.88 · valueLift 0.04 · phaseFlowPx 14→4 (R-063 선명). Rain layer untouched.
- preview: `out/layered/2026-09-16_r358-buddha-rain-glitch-v6-7bee61fb/r358-buddha-rain-glitch-v6-preview.mp4`
- stills: contact=`out/manual-runs/r358-buddha-rain-glitch/stills-v6/contact.png`
- QA: **PASS** macroMotion WARN 0.015 · motionDensity 0.275
- judge: **HOLD Isaac** — no full until named
- status: delivered-preview

#### CASE-2026-09-16-r359 | buddha-halo-rings first preview
- source: native 1632 PNG sha=`455a416422c264fe…` `sources/incoming/r359-buddha-halo-rings.png` · type=`figure-vivid` satMean=0.62 finishedVivid=0.48 busyness=0.066 greenRisk**true**
- hero: detector form → `--hero halo@0.50,0.46:280/820`. Custom **ellipse** counterflow (session-plates was a circle + oval hold on the rings). Hold = statue color silhouette.
- R-060: mp 0.04 · zoom 1 · rotate 0 · drift 0. clamp 0.18
- language-map: hero=L1+L2 · figure=L5 · field=L4+L8+L10 · composed=6
- preview: `out/layered/2026-09-16_r359-buddha-halo-rings-ab02d6ee/r359-buddha-halo-rings-preview.mp4`
- stills: contact=`out/manual-runs/r359-buddha-halo-rings/stills/contact.png`
- QA: **PASS** · macroMotion 0.031 · motionDensity 0.404
- judge: **HOLD Isaac** — no full · no audio
- status: delivered-preview

#### CASE-2026-09-16-r360 | uv-tongue-pills first preview
- source: **chat JPEG** 1163×1783 lanczos→1632 (no native PNG) sha-jpg=`01d11f97…` `sources/incoming/r360-uv-tongue-pills.jpg`
- type=`figure-vivid` satMean=0.63 finishedVivid=0.59 busyness=0.009
- hero: detector form@eye → `--hero pour@0.32,0.70:w0.92` (tongue+pills). Custom flow: tongue `dy`, no cone/water. Hold = face, not tongue.
- language-map: hero=L1 · figure=L5 · field=L4+L8+L10 · composed=5
- preview: `out/layered/2026-09-16_r360-uv-tongue-pills-bdfe3daa/r360-uv-tongue-pills-preview.mp4`
- stills: contact=`out/manual-runs/r360-uv-tongue-pills/stills/contact.png`
- QA: **PASS** darkDwell WARN · macroMotion 0.045 · motionDensity 0.375
- judge: **HOLD Isaac** — no full · no audio
- status: delivered-preview

#### CASE-2026-09-16-r361 | mosaic-eye-fall first preview
- source: native 1632 PNG `sources/incoming/r361-mosaic-eye-fall.png` · type=`figure-vivid` satMean=0.50 finishedVivid=0.52 busyness=0.028
- hero: detector form@lid → `--hero pour@0.50,0.36:w0.72` (waterfall into the palm). Custom fall column, no cone/water diagonals. Hold = hand + sclera (not the fall).
- language-map: hero=L1 · figure=L5 · field=L4+L8+L10 · composed=5
- preview: `out/layered/2026-09-16_r361-mosaic-eye-fall-ff1fadee/r361-mosaic-eye-fall-preview.mp4`
- stills: contact=`out/manual-runs/r361-mosaic-eye-fall/stills/contact.png`
- QA: **PASS**
- judge: **HOLD Isaac** — no full · no audio
- status: delivered-preview

#### CASE-2026-09-16-r362 | dot-hand-mushrooms first preview
- source: native 1632 PNG `sources/incoming/r362-dot-hand-mushrooms.png` · type=`figure-vivid` satMean=0.53 finishedVivid=0.36 busyness=0.049
- hero: detector form → `--hero beam@0.58,0.42:40/800` (radial sunburst). Custom radial-out (no pour water). Hold = dark hand+mushrooms, not sky.
- language-map: hero=L1 · figure=L5 · field=L4+L6+L8+L10 · composed=6
- preview: `out/layered/2026-09-16_r362-dot-hand-mushrooms-9842f83b/r362-dot-hand-mushrooms-preview.mp4`
- stills: contact=`out/manual-runs/r362-dot-hand-mushrooms/stills/contact.png`
- QA: **PASS** darkDwell WARN · macroMotion 0.038 · motionDensity 0.480
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac 풀렌더 + Valley of Stevie @0:13

#### CASE-2026-09-16-r362-final | full + Valley of Stevie
- quote: “풀렌더 뽑아 그리고 … 00:13~00:14에 여자 오디오 들어갈 때 붙여”
- measure: RMS jump **13.50s** −23.2 → −17.6 dBFS (vocal in). Mux **-ss 13.5**
- full: 1632×2912 · 20s · 30fps silent `…-final-70ed5825/r362-dot-hand-mushrooms-final.mp4`
- +audio: `…-final-with-valley-of-stevie.mp4` aac 320k · 20.000s · 600f
- QA: **PASS** darkDwell WARN · macroMotion WARN 0.022
- close: `close-lock.ts --slug r362-dot-hand-mushrooms`
- status: closed-final + audio

#### CASE-2026-09-17-r363 | finger-eye-rings first preview
- source: **816 PNG** lanczos→1632 (no native 1632) `sources/incoming/r363-finger-eye-rings.png` · busyness 0.088 → r139 then 0.052 after upscale
- hero: detector form@iris → `--hero halo@0.50,0.26:160/580`. Custom counterflow on sat rings. Hold = grayscale hand, not rings. mp 0.04 zoom 1. clamp 0.18
- language-map: hero=L1+L2 · figure=L5 · field=L4+L8+L10 · composed=6
- preview: `out/layered/2026-09-17_r363-finger-eye-rings-b5de51d2/r363-finger-eye-rings-preview.mp4`
- stills: contact=`out/manual-runs/r363-finger-eye-rings/stills/contact.png`
- QA: **PASS**
- judge: **HOLD Isaac** — no full · no audio
- status: delivered-preview

#### CASE-2026-09-17-r364 | oil-eye-drip first preview
- source: native 1632 PNG `sources/incoming/r364-oil-eye-drip.png` · figure-vivid greenRisk true
- hero: `--hero pour@0.50,0.32:w0.78` oil drip to fingertip. Custom fall, no cone. Hold dropped (ellipse read as overlay).
- preview: `out/layered/2026-09-17_r364-oil-eye-drip-e8b5ebdd/r364-oil-eye-drip-preview.mp4`
- QA: **PASS** · judge **HOLD Isaac** — no full
- status: delivered-preview

#### CASE-2026-09-18-r365 | mushroom-forehead first preview
- source: native 1632 PNG `sources/incoming/r365-mushroom-forehead.png` · figure-vivid satMean=0.42 finishedVivid=0.18
- hero: `--hero pour@0.55,0.28:w0.88` stem+blue drip. Custom dy on stem/drip, cap oil. Hold = face skin, not mushroom.
- preview: `out/layered/2026-09-18_r365-mushroom-forehead-3f54178a/r365-mushroom-forehead-preview.mp4`
- stills: contact=`out/manual-runs/r365-mushroom-forehead/stills/contact.png`
- QA: **PASS** · macroMotion 0.051 · motionDensity 0.374
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac “극도로 선명하고 극도로 쩅하게”

#### CASE-2026-09-18-r365-v2 | sharp + punch
- quote: “극도로 선명하고 극도로 쩅하게 해줘 지금은 너무 노이즈 낀거같아”
- axis: 노이즈=micro · 선명=phaseFlow ↓ · 쨍=satBoost ↑. surface 26→8 · λ72→168 · hold phaseFlow 32→3 · hold L4 off · sat 1.48/1.74 → 2.15/2.45. L1 drip kept.
- preview: `out/layered/2026-09-18_r365-mushroom-forehead-v2-958b6156/r365-mushroom-forehead-v2-preview.mp4`
- QA: **PASS** · macroMotion 0.027 · motionDensity 0.374
- judge: **HOLD Isaac** — no full until named
- status: superseded — Isaac “환각적인 패턴 좀 죽여도”

#### CASE-2026-09-18-r365-v3 | kill L4/L8 pattern
- quote: “그리고 환각적인 패턴 좀 죽여도 될거같아”
- axis: kill that language (L4 isolines + L8 dissolve). Keep L1 drip + L5 face + sat punch. composed L1+L5+L10.
- preview: `out/layered/2026-09-18_r365-mushroom-forehead-v3-21fb9ec8/r365-mushroom-forehead-v3-preview.mp4`
- QA: **PASS** macroMotion WARN 0.019
- judge: **HOLD Isaac** — no full until named
- status: superseded — Isaac “좀 더 스피디하게”

#### CASE-2026-09-18-r365-v4 | faster drip
- quote: “그리고 좀 더 스피디하게 해줘”
- axis: tempo. advection cycles 2→4 · displacement 46→56 · breath freq 2→3. L4/L8 stay off.
- preview: `out/layered/2026-09-18_r365-mushroom-forehead-v4-09bd8c03/r365-mushroom-forehead-v4-preview.mp4`
- QA: **PASS** macroMotion WARN 0.019
- judge: **HOLD Isaac** — no full until named
- status: superseded — Isaac “3배 더 스피디하게”

#### CASE-2026-09-18-r365-v5 | 3× tempo
- quote: “3배 더 스피디하게 해”
- axis: tempo ×3 from v4. advection cycles 4→12 · breath freq 3→9. Patterns stay off.
- preview: `out/layered/2026-09-18_r365-mushroom-forehead-v5-de5c243a/r365-mushroom-forehead-v5-preview.mp4`
- judge: **HOLD Isaac** — no full until named
- status: delivered-preview

#### CASE-2026-09-23-r366 | rainbow-eye-tongue not delivered
- source: native 1632 PNG `sources/incoming/r366-rainbow-eye-tongue.png` sha256=`e647348333064373…` · figure-vivid satMean=0.64 finishedVivid=0.40 busyness=0.065 greenRisk false
- hero: `--hero halo@0.50,0.42:140/780` rainbow arcs around the golden iris. Custom counterflow. Tongue+lips+sclera held. mp 0.04 zoom 1 drift 0.
- preview rendered `out/layered/2026-09-23_r366-rainbow-eye-tongue-3ca8a14c/` then **not shown**: QA **FAIL oliveDwell** 0.145 (source 0.041) and the frame washed to neon. Isaac sent the next source before a fix.
- status: not-delivered

#### CASE-2026-09-23-r367 | cap-head-city first preview
- source: native 1632 PNG `sources/incoming/r367-cap-head-city.png` sha256=`bdb44cf57ab35d8c…` · figure-vivid satMean=0.52 finishedVivid=0.46 busyness=0.069 greenRisk false
- hero: detector form@left mushroom → `--hero beam@0.66,0.12` cap radial burst. Custom outward field, no pour cone, no water diagonals. Hold = skyline silhouette + cream stem/gills (prism off on that layer so the stem does not go salmon). Source maxDrift 0.18. mp strength 0.05. rotate 0.
- language-map: hero=L1 · field=L4+L8+L10 · L6 vection · composed=L1+L4+L6+L8+L10
- preview: `out/layered/2026-09-23_r367-cap-head-city-448166be/r367-cap-head-city-preview.mp4`
- stills: contact=`out/manual-runs/r367-cap-head-city/stills/contact.png`
- QA: **PASS** hueJump95 WARN · macroMotion 0.032 · motionDensity 0.457 · olive 0.109 (source 0.144)
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac “맘에 들어 풀렌더”

#### CASE-2026-09-23-r367-final | cap-head-city full + Ancient Aum
- quote: “맘에 들어 풀렌더 하고 … 1분48초 쯤 확 터질떄부터 합쳐줘”
- measure: RMS jump **108.0s** −17.4 → −9.9 dBFS (then −6.6). Mux **-ss 108**
- full: 1632×2912 · 20s · 30fps · 600f silent `out/layered/2026-09-23_r367-cap-head-city-final-fa865e04/r367-cap-head-city-final.mp4`
- +audio: `…-final-with-ancient-aum.mp4` aac 320k · 20.000s · 600f
- QA: **PASS** hueJump95 WARN · macroMotion WARN 0.018 · olive 0.106 · motionDensity 0.469
- close: `close-lock.ts --slug r367-cap-head-city` · plates `node scripts/locks/r367-build-beam-plates.mjs`
- status: closed-final + audio

#### CASE-2026-09-28-r368 | sun-runners first preview
- source: native 1632 PNG `sources/incoming/r368-sun-runners.png` sha256=`38427dcf7ad0a9e9…` · figure-vivid-ish satMean=0.40 finishedVivid=0.08 busyness=0.087 M5=texture (not line) greenRisk false · orange conc 0.86
- hero: detector form@upper-right → `--hero halo@0.50,0.38:70/740` sun ripples. Outward radial field (no in-pull, no water diagonals). Hold = large dark figures, shadows, rocks. Bubble specks not held. Hue sweep off so the orange sun stays orange. mp 0.04 zoom 1 drift 0 rotate 0. source maxDrift 0.12.
- language-map: hero=L1+L2 · field=L4+L8+L10 · composed=L1+L2+L4+L8+L10
- preview: `out/layered/2026-09-28_r368-sun-runners-ab1ff01a/r368-sun-runners-preview.mp4`
- stills: contact=`out/manual-runs/r368-sun-runners/stills/contact.png`
- QA: **PASS** hueJump95 WARN · macroMotion 0.043 · motionDensity 0.383 · olive 0.027 (source 0.025)
- judge: **HOLD Isaac** — no full · no audio
- status: delivered-preview

#### CASE-2026-09-28-r370-sketch | more hallucinatory languages
- quote: “좀 더 환각적으로 고도화해줘”
- tiles (half-res, 6s): A L2 counter-tunnel, robes locked · B L5 living robes, tunnel unchanged · C L2+L5 and the field recolors
- grid: `out/manual-runs/r370-monk-light-path/sketch-grid.mp4`
- judge: **HOLD Isaac** — pick a tile, then one preview
- status: delivered-sketch

#### CASE-2026-09-28-r369 | upward-eyes not delivered
- source: native 1632 PNG `sources/incoming/r369-upward-eyes.png` · figure-vivid satMean=0.54 finishedVivid=0.71 busyness=0.040
- hero: form@left eye. Structure flow. Hold = white eyes only.
- preview: `out/layered/2026-09-28_r369-upward-eyes-3cbf1d04/r369-upward-eyes-preview.mp4`
- QA: **PASS** hueJump WARN · macroMotion 0.033 · but the eye whites rendered pink. Not shown.
- status: not-delivered

#### CASE-2026-09-28-r370 | monk-light-path first preview
- source: native 1632 PNG `sources/incoming/r370-monk-light-path.png` sha256=`5db801d803d4b9c0…` · satMean=0.59 vivid=50% finishedVivid=0.05 busyness=0.035 M5=texture · hues 355/345/5 conc 0.94 greenRisk false
- hero: detector form@left trees → `--hero beam@0.55,0.30` light-tunnel streaks. Custom radial-out, no pour cone. Hold = tall orange robe shapes on the path (prism off so the robes stay orange).
- language-map: hero=L1 · field=L4+L6+L8+L10 · composed=L1+L4+L6+L8+L10
- preview: `out/layered/2026-09-28_r370-monk-light-path-091c0d51/r370-monk-light-path-preview.mp4`
- stills: contact=`out/manual-runs/r370-monk-light-path/stills/contact.png`
- QA: **PASS** hueJump95 WARN · macroMotion 0.032 · motionDensity 0.317 · olive 0.016
- judge: **HOLD Isaac** — no full · no audio
- status: superseded — Isaac “그냥 …preview.mp4 이거 풀버전으로”

#### CASE-2026-09-28-r370-final | monk-light-path full + Shiva
- quote: “그냥 [091c0d51 preview] 이거 풀버전으로 뽑고 … Shiva.wav 이거 적절히 합펴줘”
- measure: intro sits −26 to −15 dBFS. Body locks at **64.75s** −17.0 → −12.7, then −9.9 dBFS, and holds ~−11.5. Mux **-ss 64.75**
- full: 1632×2912 · 20s · 30fps · 600f silent `out/layered/2026-09-28_r370-monk-light-path-final-ddc6703d/r370-monk-light-path-final.mp4`
- +audio: `…-final-with-shiva.mp4` aac 320k · 20.000s · 600f
- QA: **PASS** hueJump95 WARN · macroMotion WARN 0.017 · olive 0.013 · motionDensity 0.324
- close: `close-lock.ts --slug r370-monk-light-path` · plates `node scripts/locks/r370-build-beam-plates.mjs`
- status: closed-final + audio

#### CASE-2026-09-29-r371 | buddha-beam preview, not shown
- source: native 1632×2912 `/Users/isaac/Downloads/monglong_a_highly_detailed_psychedelic_digital_artwork_depictin_106da4f9-7989-4383-99b7-e30cb33d3475.PNG` sha256=`4b69ded43528deef…` — type=pastel-greenrisk on a deity (r221 + clamp 0.18) satMean=0.5935 vivid=48.6% busyness=0.0388 greenRisk=true
- hero: detector form → `--hero beam@0.50,0.34` vertical column through the urna. Custom radial-up crown, no pour cone, no water diagonals. Hold alpha 0 (no separable stroke).
- language-map: hero=L1 · field=L4+L6+L8+L10 · composed=L1+L4+L6+L8+L10
- preview: `out/layered/2026-09-29_r371-buddha-beam-00ada705/r371-buddha-beam-preview.mp4` (816×1456 · 20s · silent)
- QA: **PASS** hueJump95 WARN 2.52 · staticZone WARN 0.333 · olive 0.005 · drift 0.123/0.200 · seam 1.26 · motionDensity 0.314 · macroMotion 0.043
- judge: not handed over — the next image arrived first. No full, no audio.
- status: rendered, not shown

#### CASE-2026-09-29-r372 | third-eye-burst first shown preview
- source: native 1632×2912 `/Users/isaac/Downloads/monglong_a_highly_detailed_psychedelic_digital_artwork_depictin_0d29ba09-e8cb-4528-8734-c468f9255bb8.PNG` sha256=`dc2ed2e22e3607b1…` — type=figure-vivid satMean=0.4429 vivid=20.2% busyness=0.0211 greenRisk=false finishedVivid=0.3464
- hero: detector form@lower face → `--hero beam@0.50,0.46`. Rays leave the third eye. Flow is radial-out in the burst, structure-led on the face, structure-mixed in the robe. Hold = the face linework (eyes, third-eye outline, lips, curls) with the pupil punched out. No filled ellipse.
- language-map: hero=L1+L8 · figure=L4 · field=L4+L6+L10 · composed=L1+L4+L6+L8+L10
- preview: `out/layered/2026-09-29_r372-third-eye-burst-00fe03e2/r372-third-eye-burst-preview.mp4` (816×1456 · 20s · 15fps · silent)
- stills: contact=`out/manual-runs/r372-third-eye-burst/stills/contact.png` hero-subsec=`…/stills/hero-subsec.png`
- QA: **PASS** hueJump95 WARN 3.47 · staticZone WARN 0.156 · olive 0.0016 · bleach 0.0007 · drift 0.116/0.190 · seam 1.19 · motionDensity 0.368 · macroMotion 0.047
- judge: third eye, closed eyes, and lips stay a face through t=14; crown rays travel.
- status: superseded — Isaac “그냥 이거 풀버전을 뽑아”

#### CASE-2026-09-29-r372-sketch | 고도화 — three languages, face kept
- quote: “이거 더 고도화해줘” on `out/layered/2026-09-29_r372-third-eye-burst-00fe03e2/r372-third-eye-burst-preview.mp4`
- base scene kept (`scene-base.json`, flow-beam, hue lock, line hold). Tiles are half-res 6s, not knob variants.
- A rings in/out around the third eye, face on its own lines, mp 0.04. composed=L1+L2+L4+L6+L8+L10. `…-a-c60aaff3/`
- B the face lines take on moving color, the rays stay the outward beam. composed=L1+L4+L5+L6+L8+L10. `…-b-c6b3a3e0/`
- C rings + line color + the field recolors, phaseFlow 0, drift clamp 0.18. composed=L1+L2+L4+L5+L6+L8+L10. `…-c-de5f64a5/`
- grid: `out/manual-runs/r372-third-eye-burst/sketch-grid.mp4` (left A, middle B, right C)
- judge: Isaac did not pick a tile. He asked for the original preview full.
- status: superseded — original preview closed as the final

#### CASE-2026-09-29-r372-final | third-eye-burst full, silent
- quote: “그냥 이거 풀버전을 뽑아” on `out/layered/2026-09-29_r372-third-eye-burst-00fe03e2/r372-third-eye-burst-preview.mp4`
- full: 1632×2912 · 20s · 30fps · 600f silent `out/layered/2026-09-29_r372-third-eye-burst-final-43c4fc16/r372-third-eye-burst-final.mp4`
- QA: **PASS** hueJump95 WARN 2.44 · staticZone WARN 0.154 · macroMotion WARN 0.024 · olive 0.0016 · bleach 0.0007 · drift 0.117/0.192 · seam 1.35 · motionDensity 0.368
- stills: t=6 and t=14 keep the third eye, closed eyes, and lips. `out/manual-runs/r372-third-eye-burst/stills/full-t6.png` `…/full-t14.png`
- close: `close-lock.ts --slug r372-third-eye-burst` · plates `node scripts/locks/r372-build-beam-plates.mjs` · scene sha `16cae0857362b4c2…` · gate REJECT + humanOverride
- status: closed-final + audio

#### CASE-2026-09-29-r372-audio | third-eye-burst + Ancient Aum
- quote: “오디오는 … Ancient Aum.wav 이거 합쳐줘” — track named, no start
- measure: 0–8s sits **−27.0 dBFS**. Music enters at **10.50s** (−27.0 → −20.5) and stays above the bed. Mux **-ss 10.5**
- +audio: `out/layered/2026-09-29_r372-third-eye-burst-final-43c4fc16/r372-third-eye-burst-final-with-ancient-aum.mp4` aac 320k · 48 kHz · stereo · 20.000s · 600f · video copy
- status: closed-final + audio

#### CASE-2026-09-29-r373 | urna-column first preview
- source: native 1632×2912 `/Users/isaac/Downloads/monglong_a_highly_detailed_psychedelic_digital_artwork_depictin_56211a0b-b80e-4468-9cab-be8b35b51b2a.PNG` sha256=`0a4fc1b760be290f…` — type=figure-vivid satMean=0.5938 vivid=46.0% busyness=0.0318 greenRisk=false finishedVivid=0.5872
- hero: detector halo → `--hero beam@0.50,0.42`. The column lands on the pale jewel. Flow leaves the jewel upward through the cool core and the orange curtains. Hold = drawn lines of the face, the side heads, and the crown ornament, jewel punched out. No filled ellipse, no water diagonals.
- language-map: hero=L1+L8 · figure=L4 · field=L4+L6+L10 · composed=L1+L4+L6+L8+L10
- preview: `out/layered/2026-09-29_r373-urna-column-b7d653a1/r373-urna-column-preview.mp4` (816×1456 · 20s · 15fps · silent)
- stills: contact=`out/manual-runs/r373-urna-column/stills/contact.png` hero-subsec=`…/stills/hero-subsec.png`
- QA: **PASS** hueJump95 WARN 4.41 · olive 0.0039 · bleach 0.0014 · drift 0.117/0.203 · seam 1.23 · staticZone 0.031 · motionDensity 0.351 · macroMotion 0.045
- judge: **HOLD Isaac** — eyes, lips, and cheek swirls stay a face; the column travels off the jewel. No full, no audio.
- status: delivered-preview

#### CASE-2026-09-30-r374 | tongue-buddha first preview
- source: native 1632×2912 `/Users/isaac/Downloads/monglong_an_close_up_view_of_open_lips_with_a_small_gold_buddha_5423918a-76b8-4e98-b41b-ed5abae870ed.PNG` sha256=`8c9a407e5b56d04a…` — type=figure-vivid satMean=0.6988 vivid=72.9% busyness=0.0497 greenRisk=false finishedVivid=0.2279 dark=8.6%
- hero: detector pour waterNy=0.65 (that stripe would land on the tongue) → `--hero pour@0.50,0.33:w0.96`. The tongue leaves the dark mouth. Custom plates: tongue downward, lips on their own ridges, seated figure held by its paint. No water diagonals, no filled ellipse.
- language-map: hero=L1 · field=L4+L6+L8+L10 · composed=L1+L4+L6+L8+L10. Prism surface/phaseFlow 0, transport colorAmount 0, maxDrift 0.18, mp strength 0.08 hueShift 0 rotate 0.
- preview: `out/layered/2026-09-30_r374-tongue-buddha-f275a8fc/r374-tongue-buddha-preview.mp4` (816×1456 · 20s · 15fps · silent)
- stills: contact=`out/manual-runs/r374-tongue-buddha/stills/contact.png` hero-subsec=`…/stills/hero-subsec.png`
- QA: **PASS** hueJump95 WARN 3.73 · darkDwell WARN 0.423 (the mouth) · staticZone WARN 0.384 · olive 0.047 · bleach 0 · drift 0.104/0.190 · seam 0.89 · motionDensity 0.319 · macroMotion 0.037
- judge: Isaac “완전 별로야 최악” — first rejection of this judgeable preview. See CASE-2026-09-30-r374-sketch. No full, no audio.
- status: delivered-preview → rejected

#### CASE-2026-09-30-r374-sketch | tongue-buddha unused languages
- quote: “완전 별로야 최악” on the f275a8fc preview. The seated figure was intact, no oval, no water diagonals, no salmon — a language miss, not a plate bug. First miss on this map. A second “다 별로” stops and asks.
- tiles (half-res 816×1456 · 6s · 12fps · silent). L7/L9 stay off.
- A counter: composed L1+L2+L4+L6+L8+L10. Tongue bands oppose; the statue’s flow is not flipped. Advection 64px, forwardBias 0.42. `out/layered/2026-09-30_r374-tongue-buddha-a3-aa31963a/r374-tongue-buddha-a3-sketch.mp4`
- B figure color: composed L1+L4+L5+L6+L8+L10. The statue’s paint cycles hue (phaseFlowPx 0, hold maxDrift 0.75). Hold is the paint silhouette in the B archive, not the work-dir line hold. `out/layered/2026-09-30_r374-tongue-buddha-b4-1d075721/r374-tongue-buddha-b4-sketch.mp4`
- C both: composed L1+L2+L4+L5+L6+L8+L10. `out/layered/2026-09-30_r374-tongue-buddha-c-af00ee84/r374-tongue-buddha-c-sketch.mp4`
- grid: `out/manual-runs/r374-tongue-buddha/sketch-grid.mp4` (2448×1456 · 6s · silent)
- judge: **HOLD Isaac** — pick a tile. No full, no audio.
- status: delivered-sketch

#### CASE-2026-09-03-r352-composed | composer v2 on a second source + 자글자글 diagnosis (verification renders only)
- request: Isaac "v2가 훨씬 나아 그리고 다른 소스 써봐" → then "자글자글 끓는 듯한 픽셀 모양의 거친 텍스쳐 근본적으로 제거해줘"
- source: `sources/incoming/r352-engraved-buddha-hands.png` (`busy-line`, M4.busyness **0.116**, edgeDensity 0.60), golden r139, hero `form` @0.755,0.329, no `--hero`
- prepare (composer v2): `languages layer0=[L1+L3+L4+L8+L10] composed=5` · session-grade OK · work-dir `…/scratchpad/verify-r352-composed-v2`
- preview: `out/layered/2026-09-03_verify-r352-composed-v2-3a5a9d01/verify-r352-composed-v2-preview.mp4`
- result vs the hand-composed r352: macro motion **2.40 → 9.91** (Isaac final r346 v11 = 11.13). QA olive 0.058 **FAIL** (source 0.006) · bleach 0.0067 PASS · seam 1.04 · drift 0.184/0.384 **FAIL** · motionDensity 0.440 · deadZone 0.000 · macroMotion 0.039 PASS. Frames: engraved lines on face/hands stay readable, the field flows full-rainbow, hue sweeps over 20 s. Olive/drift profile matches **r344 v3** (Isaac final, busy-line, chroma 3: olive 0.051 FAIL + bleach 0.097 FAIL, overridden) — precedented, not silently tuned.
- **자글자글 diagnosis (measurement done, cause not yet isolated):** new `microShare` probe = top-octave share of inter-frame |Δluma| at 408×728. Calibration — Isaac finals r346 v11 0.240 / v7 0.241 / r344 v3 0.245; "노이즈 낀거같아" r346 v4 0.374; r345 v1 0.464 and r343 v1 0.416 are finals but with almost no motion (meanDelta 1.9–2.5). **Share alone does not predict; absolute micro (share × macro) does:** Isaac finals 1.18–1.52, r346 v4 1.45, **r352 composer v2 = 2.05** — above every accepted case. Threshold sits near **1.6**.
- mechanism (hypothesis): per-frame resampling at the source's own hatch pitch (~2–4 px) aliases the engraving. Suspects — prism `surfaceCycles 22` × `phaseFlowPx 28`; `sourceChromaFlow` 6px/5cyc `detailGain 2`; `phaseWarpAmount 0.2`. Three causal probes rendered and **left unmeasured** (session stopped for PR): `probe-nol8-eb367e3a` (L8+phaseWarp off) · `probe-coarseprism-5e50e667` (surface 8 / flow 14) · `probe-both-68c29b0c` (both + scale-aware L8 wavelength 220px, edgePreserve 0.95, detailGain 1).
- next: measure the three probes → pick the dominant cause → make the composer **source-frequency aware** (read `analysis.json` M4.busyness/edgeDensity; keep prism and L8 displacement scales above the hatch pitch) → promote `microShare` to a qa-motion row with the ~1.6 absolute-micro line. Unused primitive `sourceDetailResidualFlow` (`bandLimitPx`, `chromaOnly`) is the principled "move the coarse, leave the fine lines" candidate — unvalidated, do not adopt blind (R-013).
- judge: **HOLD** — Isaac liked v2's motion ("v2가 훨씬 나아") and flagged the grain. No full, no audio, no lock.
- status: delivered-preview (verification), boiling fix open

#### CASE-2026-09-03-OS-v2.1 | ceiling as code — golden-as-is and clones refused (verification render only)
- request: Isaac "새로운 방법론대로 돌려봤는데 결과물이 달라진게 없는데 ? 도대체 뭐가 달라진거야 ?" → "브랜치하나 파서 똑바로 작업해줘"
- diagnosis (measured, not argued): v2 shipped the floor as code and the ceiling as prose ("Enforced by: agent self-check"). One day later: **r349** scene = golden r221 **key-identical (82 keys, 0 diffs)**, session-grade OK, QA PASS, reached Isaac. **r351 v1** = r346 v11 replay (SSIM 0.980). Only r351 v2 actually composed (SSIM 0.548 vs its clone — the largest pixel change in the ledger). Second defect: the ceiling counted language *names*, and golden r221 already carries `glowWave2 0.06` + `breath 0.003`, so "≥3 languages" was satisfied by an untouched golden.
- shipped (code, branch `feat/ceiling-enforced`): `scripts/lib/language-map.ts` — `measureLanguages` counts **shader activations above thresholds** (L3 baseline never counts; golden defaults below threshold) · `composeLanguageMap` **v2**: form/sheet heroes get L1 travel along the scaffold flow-field (44 px, fieldAlign 1, forwardBias 0.35) + transport 30 px; every scene gets prism `chromaCycles 3` + L4 (glowWave 0.55/9 : 0.32/14 + phaseWarp 0.2) + L6 (`cameraDrift` 0.01 + feedback zoom 1.006) + L8 (dissolve 0.42/22px · spectral 0.48/16px · chromaFlow 0.5/6px) + L10 (breath 0.032×2); phaseFlowPx / surfaceCycles / colorCycle / plates / hold / rotate untouched; L7/L9 never enabled · `gradeCeiling` refuses key-identical golden, same-source replay of another slug's scene, composed <3, **no macro language (L1·L2·L6·L9)**, hero layer <2 — unless Isaac waived that exact scene sha · `prepare-new-source` composes by default and writes `language-map.json`; `--compose off` requires `--ceiling-waive "<Isaac verbatim>"` · `session-grade` runs the ceiling on every new-source grade (export refuses too) · `isaac-pick.ts --ceiling-waive` = preview-only waiver bound to the scene sha · `qa-motion` **`macroMotion`** WARN row (mean |luma(t)−luma(t−0.2s)| on the 32×57 grid, floor 0.025).
- composer v1 miss (same day): L4+L8+L10 garnish only. Rendered on r349: SSIM 0.654 vs golden-as-is looked like proof, Isaac looked and said "크게 달라진게 없는데" — correct. Macro motion (low-res |Δluma| at 0.2 s, 0–255): golden 3.40 · composed-v1 3.69 · r346 v6 (구려) 5.56 · r346 v11 (final) 11.13. SSIM tracked contour wobble, not what Isaac sees. Fix: the **macro-language rule** + composer v2 above + the `macroMotion` metric.
- verification (composer v2, r349 source → `--preview` 816×1456, 300f): macro motion **8.81** (golden 3.40 · v1 3.69 · r346 v11 11.13) · SSIM vs golden 0.548 · QA olive 0.069 PASS (source 0.243) · bleach 0.008 · seam 1.03 · motionDensity 0.459 · deadZone 0.001 · verdict PASS (darkDwell WARN) · frames: eyes/lips/pills crisp (no melt), face hue sweeps over 20 s, light bands travel, whole frame drifts. **Flag for Isaac:** `chromaCycles 3` shifts skin hue on a photographic face (in r346 v11 it sat on silhouette + rings) — possible R-001 read; not tuned blind. Preview: `out/layered/2026-09-03_verify-r349-composed-v2-d42a9b84/verify-r349-composed-v2-preview.mp4`. Tests 31 green in the ceiling set; tsc clean.
- not decided by this change: L7 / L9 remain Isaac's (composer never enables them). L6 vection is now a composer default because Isaac's 2026-07-03 standard names 벡션 outright — one constant in `language-map.ts` if he says no. Isaac has **not** judged the composed look — this guarantees a preview that moves differently exists, not that he likes it.
- rules: 00 §1 ceiling row rewritten (enforced by script) · 00 §3.2 thresholds · 04 §2 compose note · golden README compose note
- status: **shipped on branch, one verification render, no Isaac-facing preview, no full, no audio**

#### CASE-2026-09-02-OS-v2 | operating-system rewrite + session-plates alpha bug (no render)
- request: Isaac "환각적인 요소들이 너무 적어 … 새로운 작업 방식이 필요해 / 기존 작업방식 싹 갈아엎어도돼 다 너맘대로해"
- diagnosis: the OS had a **floor** (nothing dead/boxed/spinning ships) and no **ceiling** (nothing knob-only ships). With only a floor, the agent's optimum is the untouched golden — r343 and r345 finals literally were. Gate is anti-correlated with Isaac: last 6 finals = 5× REJECT+override, the only PASS (r343) had the lowest motionDensity (0.091). Isaac's accepted moves were always *language* changes (r346 v3 24-band counterflow, v11 figure-only r139); the five knob rounds in between were all "하나도 싸이키델릭하지않아".
- shipped (docs): `00-INDEX.md` **v2** = two contracts + state-machine loop + ceiling contract (language set L1–L10, region map, ≥3 languages, ≥2 scales/tempos) + **Isaac quote → axis dictionary** + knowledge-lifetime table (R-numbers frozen at R-064). 01 keeps §3 type tree, §5 killed, §9 ledger. 7 root redirect stubs deleted; `AGENTS.md` + skill now point at 00 only.
- shipped (code): `--hero <kind@cx,cy[:rIn/rOut][:wNy]> --hero-reason` written to `hero.json` (sha-tagged) and **enforced by session-grade** (r346/r348 overrides used to be re-detected away) · hold layer default = r346 v11 textured figure knobs (surface 27 / chroma 3 / glow 0.58/12 / CMM floor 1) replacing surface 6 / floor 0.08 "sticker" · halo hold now punches out the hero radius · `export-layered --sketch` (¼ res / 12fps / 6s) + `scripts/sketch-grid.ts` (2–6 language tiles, one grid, legend) · `scripts/isaac-pick.ts` (verbatim quote = full-render permit; no more hand-edited humanOverride; refuses an audio start without `@m:ss`) · `scripts/close-lock.ts` (lock pack is the default close, 02 §4.2 E–H) · qa-motion `deadZone` WARN (hue-static AND luma-static cells).
- **bug found + fixed:** `session-plates.ts` `blurAlpha` read sharp's blurred output as 1 channel; sharp returns **3** for a 1-channel raw input. Every generated `figure-hold.png` alpha was sampled with a 3× stride — the hold mask did not match the mask that was computed or wall-scanned. Silent since 757aff5 (r325/r342 ship lock plates, so their products are unaffected). Now strided by `info.channels`, with a regression test comparing `figure-hold` alpha to `debug-hold` grey plus a hero-alpha ≤0.28 assertion.
- verification: 77+ tests green (`hero-detect`, `session-grade`, `session-scene`, `hold-walls`, `figure-vivid-legal`, `export-layered`, `isaac-pick`, `close-lock`, `qa-motion-core`, `psychedelic-final-guard`, `rebuild-closed-lock`); `tsc --noEmit` clean on touched files; prepare smoke on r325 (halo), r342 (pour) and r221+override (halo) all `session-grade OK`; `isaac-pick` → `close-lock` → `rebuild-closed-lock` sha verify in an isolated temp repo; `sketch-grid` 3-tile output 1224×728 + legend.
- open for Isaac (05 §6): **L6** vection (`feedback.zoom` 1.003–1.010 + micro `camDrift`) · **L7** luminance-only reaction-diffusion on field/ground masks · **L9** integer `colorCycle` on non-skin region masks (R-018 re-entry by region). All three are built in the shader and unused; the rest of the ceiling works without them.
- rules: R-numbers frozen at R-064 — new lessons go to `00` §4 (taste), a test (mechanical), or this ledger (evidence)
- status: **shipped, unrendered** — no preview, no full, no audio in this session

#### CASE-2026-09-01-r346-v1 | cosmic-eyes void tunnel (HOLD Isaac)
- source: native 1632×2912 PNG `/Users/isaac/Downloads/monglong_vibrant_psychedelic_illustration_depicting_a_black_sil_3fc6ae00-ffcd-4517-ae31-8b142907bbb9.PNG` sha256=`ec249918ed67d242…` — type=`figure-vivid`; satMean=0.4723 vivid=30.9327% busyness=0.0347 greenRisk=false finishedVivid=0.1938 figure=40%
- hero correction: auto detector called the small red sphere `form` at `(0.593,0.311)`, but visual review identified the living subject as the repeated-iris tunnel converging on the red void. Its working hero is a measured `halo` at `(0.500,0.339)`, inner/outer radii `130/630`; no spin.
- recipe: r221 source-derived two-layer halo path — custom `flow-halo-counter` + `phase-halo`, alternating in/out iris bands, `sourceFlowAdvection` 48px / fieldAlign 0.68 and transport 34px on the source; soft source-pixel figure hold only. `colorCycle=0`, noise=0, angular phase absent, rotate=0; no decorative overlay, rim, or added texture.
- work-dir: `out/manual-runs/r346-cosmic-eyes-void/` · session-grade=OK · custom hold-wall scan=OK
- preview: `out/layered/2026-09-01_r346-cosmic-eyes-void-03901cd2/r346-cosmic-eyes-void-preview.mp4`
- stills: contact=`out/manual-runs/r346-cosmic-eyes-void/stills-v1/contact.png` subsec=`…/stills-v1/subsec.png` hero-subsec=`…/stills-v1/hero-subsec.png`
- QA: olive=0.0424 bleach=0.0026 seam=1.1070 drift=0.0837/local=0.1655 static=0.0022 motionDensity=0.1176 verdict=**PASS with hueJump95 WARN**; lumFlicker=0.0020
- gate: **PASS** material=0.9907 connected=0.4892 coherence=0.8597 edge=0.8970 drift=0.1165/local=0.2375; report=`out/manual-runs/r346-cosmic-eyes-void/psychedelic-gate-v1.json`, exact scene sha=`3989550af0c4776862f1093a64ab9028b69c36e11f20da6b04d5a8039484d305`
- judge: **FAIL Isaac** — “구려 다른 프리셋 돌려봐”. The r221 global prism read as a plastic recolor despite valid halo travel; no full and no audio.
- status: discarded

#### CASE-2026-09-01-r347-v1 | cosmic-eyes r139 pattern river (HOLD Isaac)
- source: same native 1632×2912 r346 PNG sha256=`ec249918ed67d242…` — reclassified `dense-pattern-figure`: the repeated iris field is visually dominant and the cosmic silhouette has no soft-skin color to protect; M remains satMean=0.4723 vivid=30.9327% busyness=0.0347 greenRisk=false figure=40%.
- request: after r346 rejection, Isaac asked for a different preset. This is a recipe-family switch only: r221 → `woodblock-phase-advect-r139`.
- hero: identical visually measured eye-tunnel `halo` at `(0.500,0.339)`, radii `130/630`; custom `flow-halo-counter` + `phase-halo` make alternating iris bands source-advect toward/away from the red void. Soft source-pixel figure hold has no axis-aligned wall.
- recipe: r139 fixed-UV source prism, `colorCycle=0`, no palette/noise/CA/bloom/feedback; clamp=`0.26`; real source advection 48px plus transport 34px. No overlay, rim, angular phase, or rotation.
- work-dir: `out/manual-runs/r347-cosmic-eyes-r139/` · session-grade=OK · custom hold-wall scan=OK
- preview: `out/layered/2026-09-01_r347-cosmic-eyes-r139-eeb39ed6/r347-cosmic-eyes-r139-preview.mp4`
- stills: contact=`out/manual-runs/r347-cosmic-eyes-r139/stills-v1/contact.png` subsec=`…/stills-v1/subsec.png` hero-subsec=`…/stills-v1/hero-subsec.png`
- QA: olive=0.0414 bleach=0.0005 seam=1.1580 drift=0.0874/local=0.1691 static=0.0016 motionDensity=0.0655 verdict=**PASS with hueJump95 WARN**; lumFlicker=0.0007.
- gate: **PASS** material=0.9585 connected=0.4477 coherence=0.8397 edge=0.9225 drift=0.1049/local=0.2100; report=`out/manual-runs/r347-cosmic-eyes-r139/psychedelic-gate-v1.json`.
- judge: **HOLD Isaac** — R-020=yes (continuous eye-tunnel travel in the 6.00/6.15/6.30 hero crop); R-002 pending. No full and no audio.
- status: delivered-preview

#### CASE-2026-09-01-r348-v1 | brushed-eye-tunnel r139 (INTERNAL REJECT)
- source: native 1632×2912 PNG `/Users/isaac/Downloads/monglong_psychedelic_artwork_featuring_a_silhouette_of_a_person_1ff94c62-77f7-474e-87ed-838140f08b2b.PNG` sha256=`969151fc04529868…` — type=`dense-pattern-figure`; satMean=0.5734 vivid=51.3647% busyness=0.0554 greenRisk=false finishedVivid=0.2421 figure=40%.
- hero correction: detector falsely picked a peripheral upper-left eye (`form` @0.295,0.136). Visual hero is the central luminous pupil and surrounding iris tunnel; working `halo` @`(0.500,0.206)`, radii `80/550`, no spin.
- recipe: r139 + custom `flow-halo-counter` / `phase-halo` / soft source-pixel figure hold; sourcePrism surface14/flow34/3 cycles, clamp0.24, all visible imagery source-derived.
- preview: `out/layered/2026-09-01_r348-brushed-eye-tunnel-5d118b6e/r348-brushed-eye-tunnel-preview.mp4`
- QA: PASS with hueJump95 WARN; olive=0.0214 bleach=0.0009 seam=1.2867 drift=0.0814/local=0.1673.
- judge: **INTERNAL REJECT** — central architecture travels, but prism amount=1 makes the painted eye texture read as a broad magenta/cyan recolor rather than native paint motion; not presented to Isaac.
- status: discarded

#### CASE-2026-09-01-r348-v2 | brushed-eye-tunnel silk (STOP gate)
- request: new source supplied after r347; preserve the source’s red paint, black star-silhouette, and individual eyelash/iris texture while retaining the central eye tunnel as the moving hero.
- one-axis correction from v1: source color treatment only — prism amount `1→0.32`, saturation `1.45→1.12`, clamp `0.24→0.16`; halo source advection/transport and all geometry unchanged. No overlay, noise, angular phase, or rotation.
- preview: `out/layered/2026-09-01_r348-brushed-eye-tunnel-v2-silk-292b3a62/r348-brushed-eye-tunnel-v2-silk-preview.mp4`
- stills: contact=`out/manual-runs/r348-brushed-eye-tunnel/stills-v2-silk/contact.png` subsec=`…/stills-v2-silk/subsec.png` hero-subsec=`…/stills-v2-silk/hero-subsec.png`
- QA: **FAIL seamRatio=1.5878**; other hard metrics pass — olive=0.0431 bleach=0.0000 drift=0.0666/local=0.1393; hueJump95 WARN.
- gate: **REJECT temporal-boiling** coherence=0.6364 (<0.8102), fineMotion=0.3960 (>0.34); source edges=0.9287 and drift=0.0691/local=0.1477. Report=`out/manual-runs/r348-brushed-eye-tunnel/psychedelic-gate-v2-silk.json`.
- judge: **HOLD Isaac** — R-001 visual texture preservation improved versus v1; R-020 visible in hero subsec, but r348 has two internal misses (v1 recolor, v2 QA/gate), so stop under R-013. No full and no audio.
- status: stopped-for-direction

#### CASE-2026-09-01-r348-v3 | extreme halo transport (INTERNAL REJECT)
- request: Isaac explicitly reopened the stopped source with “훨씬더 극도로 싸이키델릭해야되고 스피디해야돼”. The prior stopped audit is retained; this is a fresh direction, not a retune of v2.
- hypothesis: replace the rejected high-detail advection regime with one fast, connected source-material transport along the measured central halo; keep the black star-silhouette as a source-pixel hold. No overlay, spin, angular phase, noise, palette, or fixed base.
- recipe: custom halo flow, minimal required advection (24px/1 cycle) plus dominant `sourceFlowTransport` (84px/5 macro cycles; 6px/7 micro cycles), static source prism surface map, saturated source-derived colour; no artificial strobe.
- work-dir: `out/manual-runs/r348-brushed-eye-tunnel-v3-transport/` · session-grade=OK · hold-wall scan=OK.
- preview: `out/layered/2026-09-01_r348-brushed-eye-tunnel-v3-transport-8219918e/r348-brushed-eye-tunnel-v3-transport-preview.mp4`
- stills: contact=`out/manual-runs/r348-brushed-eye-tunnel-v3-transport/stills-v3-transport/contact.png` subsec=`…/stills-v3-transport/subsecond-contact.png`
- QA: **PASS with hueJump95 WARN**; olive=0.0288 bleach=0.0002 seam=1.3268 drift=0.0814/local=0.1637 motionDensity=0.1845.
- gate: **REJECT temporal-boiling + source-edge-damage** — coherence=0.7112 (<0.8102), source edges=0.8266 (<0.8400), fineMotion=0.3373. Report=`out/manual-runs/r348-brushed-eye-tunnel-v3-transport/psychedelic-gate.json`.
- causal diagnostic: removed transport, glow and hold prism only; anchors recover (edges=0.9671, drift=0.0442/local=0.1094), but resulting motion is too static/non-connected. Evidence=`out/manual-runs/r348-brushed-eye-tunnel-v3-causal-diagnostic/diagnostic-evidence/{source-reference-candidate-contact,amplified-difference-t6}.png` · fresh gate report=`…/psychedelic-gate.json`.
- status: discarded; source transport is blocked for this direction.

#### CASE-2026-09-01-r348-v4 | fast source stream pulse (STOP gate)
- hypothesis: after causal isolation, replace v3 transport—not its amplitude—with broad, radial source-stream pulses through the same custom central halo. The eye tunnel should pulse rapidly without dissolving individual painted eyes.
- recipe: minimal required advection retained; `sourceFlowTransport=0`; new `sourceStreamFlow`=38px/9 cycles/wavelength168, high edge preservation; source prism=0.48, saturation=1.32. No overlay, rotation, angular phase, glow, bloom, noise, or palette.
- work-dir: `out/manual-runs/r348-brushed-eye-tunnel-v4-stream-pulse/` · session-grade=OK.
- preview: `out/layered/2026-09-01_r348-brushed-eye-tunnel-v4-stream-pulse-175180b1/r348-brushed-eye-tunnel-v4-stream-pulse-preview.mp4`
- stills: contact=`out/manual-runs/r348-brushed-eye-tunnel-v4-stream-pulse/stills-v4-stream-pulse/contact.png` subsec=`…/stills-v4-stream-pulse/subsecond-contact.png`
- QA: **FAIL seamRatio=1.5758**; hard colour bounds pass (olive=0.0466 bleach=0, drift=0.0608/local=0.1342).
- gate: **REJECT temporal-boiling** — coherence=0.6489 (<0.8102), fineMotion=0.3712 (>0.34), source edges=0.9637. Report=`out/manual-runs/r348-brushed-eye-tunnel-v4-stream-pulse/psychedelic-gate.json`.
- decision: two fresh-direction candidates are rejected (R-013). Do not make a third blind render; no full and no audio. Isaac must select a preview for explicit human override or name a narrower new visual direction.
- status: stopped-for-direction

#### CASE-2026-09-30-r366-v2 | lips-buddha-tongue — composer default + clamp 0.12 (identity guard)
- source: `~/Downloads/monglong_an_close_up_view_of_open_lips_with_a_small_gold_buddha_6b307047-….PNG` 1632×2912 native (no lanczos) sha256=e3b6131247d1d098 — type=**figure-vivid** M: satMean=0.650 vivid=62.7% busyness=0.020 greenRisk=false finishedVivid=0.264 (not busy-line: 0.02 ≪ 0.08; not allover: figure 40% is the colour subject)
- hero: detector `form @ 0.655,0.387` (conf 0.62; pour 0.47 / halo 0.36 / waterNy 0.685 = the rainbow pool's top edge). **Not overridden.** The plate generator's `pour` model is a stream from a point down to a waterline (`session-plates.ts` else-branch: fall cone dy 0.92, hold=0 inside it); this image is a bottom-sheet pool with no stream, so `pour@buddha` would drop the buddha into the fall cone and melt it downward. `form` + L1 along the scaffold flow-field is the correct macro.
- hypothesis: composer v2 default (L1 44 px + L4 + L6 + L8 + L10 on r221) moves the whole frame; the source's identity is one small gold object, so r221's prism OKLab chroma rotation (`surfaceCycles 26` · `amount 1` · `layer.frag:1667`) must be clamped or the buddha is repainted.
- recipe: golden=`eye-mirror-phase-advect-r221.json` + composer v2 · delta=**`sourceColorClamp.maxDrift 0.26 → 0.12`** — the golden's own identity guard (`layer.frag:1839`, wired; r372 lock uses 0.18 source / 0.12 hold). Zero cost to the ceiling: L3 never counts.
- v1 (clamp 0.26, composer as-is): **internal FAIL R-001** — gold buddha, red lips and skin all repainted cyan/magenta/green (04 §4 "identity washed to dayglo"). Not shown to Isaac. Probes: 0.18 buddha half green · **0.12 gold, lips red, rainbow pool keeps its own hues** → 0.12.
- quote: — (first look, no Isaac quote yet) → axis=PICK-pending
- language-map: layer0 = **L1** (advection 44 px fieldAlign 1 forwardBias 0.35) + **L4** (glowWave 0.55/9 : 0.32/14 + phaseWarp 0.2) + **L8** (dissolve 0.42/22 px · spectral 0.48/16 px · chromaFlow 0.5/6 px · transport 0.75/30 px) + **L10** (breath 0.032 × 2) · scene **L6** (zoom 1.006 + cameraDrift 0.01) · L3 baseline (surface 26 · chromaCycles 3 · clamped, not counted). composed=5 · macro=L1+L6 · session-grade ok. Regions: lips/tongue form=L1+L4+L8 · buddha=clamped L3+L4 (silhouette intact, gold held by clamp, no melt) · rainbow pool=L1+L8 · cavity=L4+L6. No region empty.
- work-dir: `out/manual-runs/r366-lips-buddha-tongue/` (`scene-v1.json` = pre-clamp kept · `stills-v2/`)
- preview: `out/layered/2026-09-30_r366-lips-buddha-tongue-v2-012-88efb9ae/r366-lips-buddha-tongue-v2-012-preview.mp4` · v1 repaint `…_r366-lips-buddha-tongue-v1-17eef4a5/` · 0.18 probe `…v2-018-f8f8ad97/` (internal, not shown)
- QA (v2-012): olive=0.0159 (source 0.0323) bleach=0.0018 seam=1.087 drift=0.093/local=0.160 static=0.0011 dead=0 motionDensity=0.299 macroMotion=0.0297 verdict=**PASS** (WARN hueJump95 25.2 > 22.4 — prism sweep)
- probes (same ruler — node rebuild of the 2026-09-03 micro/macro in `stills-v2/micromacro.mjs`; macro reproduces the 09-03 table within 1 %, microShare does not (0.29 vs 0.24 on r346 v11), so only the **relative** order is valid): r366 v2 macro **7.56** · share 0.351 · micro **2.65** — vs finals r346 v11 11.28/0.292/3.29 · r344 v3 12.88/0.285/3.67 · "노이즈" r346 v4 7.26/0.414/3.00 · r366 v1 10.96/0.351/3.84. Clamp cut macro 10.96→7.56 (hue-sweep luma removed) and micro 3.84→2.65 (below the noise case). Displacement languages carry the motion now.
- stills: `out/manual-runs/r366-lips-buddha-tongue/stills-v2/` — `full_row.png` (src | v1 repaint 6.00 | 6.30) · `clamp_row.png` (src | 0.26 | 0.18 | 0.12 @6.00) · `buddha012.png` (hero crop src | 6.00 | 6.15 | 6.30 — travel visible, gold intact, ushnisha + robe folds readable)
- judge: **HOLD for Isaac** — R-001 fixed by clamp; R-020 (QA pass ≠ like) applies.
- learning: on a source whose identity is one small saturated object, r221's prism chroma rotation is a repaint at the golden's clamp 0.26. `sourceColorClamp.maxDrift` is the wired identity dial and costs zero composed languages (L3 never counts) — but tightening it also drops macro ~30 % because hue-sweep was contributing luma delta. A `figure-vivid` source with a gold/skin identity object should start at 0.12–0.18, not 0.26.
- rules: R-001 confirm · 00 §3.2-6 (face core, no repaint) confirm · 01 §3.2 figure-vivid (colorCycle 0 · rotate 0 · no phase-angular) confirm
- status: delivered-preview

#### CASE-2026-09-30-r366-sketch1 | lips-buddha-tongue — 다 구려 → sketch set (3 tiles, unused languages)
- quote: **"완전 구려"** on the v2-012 preview → axis=**NEW-LANGUAGE** (00 §4 다 구려 = wrong language set on a judgeable preview → one sketch set with unused languages, half-res). No knob touched on the v2 map.
- read: the v2 look was r221's fine-contour chroma river over a *smooth, glossy, already-finished* source. Every tile below turns the prism river **off** on layer 0 (prism amount 0) and gets its hallucination from displacement / light / vection instead — the source keeps looking like itself and *moves*.
- tiles (each a different map; every tile passes `session-grade` ceiling, macro L1+L6; `sourceColorClamp 0.12`; scenes kept as `scene-A/B/C/D.json`):
  - **A liquid** = L1 (advection 64 px fieldAlign 1 forwardBias 0.5) + L8 macro (dissolve 0.6/32 px λ240 · spectral 0.5/24 px · chromaFlow 0.3/8 px · transport 0.75/40 px) + L6 (zoom 1.010 · drift 0.014) + L10. No L3, no L4. composed=L1+L6+L8+L10.
  - **B portal-waves** = L1 (44 px) + L4 macro (glowWave 0.85/5 fc0.55 : 0.5/8 fc0.85 + phaseWarp 0.35) + L6 heavy (zoom 1.016 · fb strength 0.22 · drift 0.02 = schema cap) + L10. No L3, no L8. composed=L1+L4+L6+L10.
  - **C void-texture** = A + **L5 re-entry** on the dark mouth cavity: second source-pixel layer `layers/cavity-hold.png` (alpha = value band 0.26..0.44, 2×box-blur r12, coverage 6.7 %, buddha head / tongue / teeth are holes — `scripts/locks/r366-build-cavity-plate.mjs`) with the r346 v11 textured-hold block (surface 27 · chromaCycles 3 · phaseScale 7 · floor 1 · valueLift 0.06 · clamp 0.3). L5 in a *new region class* (cavity, not body) — logged as re-entry per 00 §3.2. composed=L1+L4+L5+L6+L8+L10.
  - **D sheet-bands** (04 §2 sheet path: `oil-slick-macro-bands` golden + L1 44 px + phaseWarp 0.1 + L6 1.008/0.01 + L10, clamp 0.14) — rendered, **internal FAIL olive**: `directionCycles 2` on a red-dominant frame shifts lips to khaki/olive and the buddha to pale. A defect, not a language → **not shown**. `stills-v2/tile-D-olive-fail_3s.png`.
- schema caps hit while composing (for the next agent): `sourceMaterialDissolve.maxDisplacementPx ≤32` · `sourceSpectralFlow.radiusPx ≤24` · `sourceChromaFlow.maxDisplacementPx ≤8` · `effects.cameraDrift.radius ≤0.02`. Validate with `sceneSchema.safeParse` before `--sketch`; export titles are lower-cased in the archive name.
- grid: `out/manual-runs/r366-lips-buddha-tongue/sketch-grid-1.mp4` (+ `.txt` legend) — 3 tiles, half-res 12 fps 6 s. Tiles: `out/layered/2026-09-30_r366-a-52f83ada/` · `…_r366-b-51d9f65f/` · `…_r366-c-f7046126/`.
- stills: `stills-v2/sketch-grid-1_3s.png` — identity intact on all three (lips red, buddha gold, pool keeps its hues; teeth read violet from bloom+CA at sketch res).
- pending Isaac yes (not built): **L9** region colorCycle on the rainbow pool mask only (non-skin, non-body — R-018 killed it on *portrait body*; the pool is neither). One line from Isaac makes it a tile.
- judge: HOLD — Isaac picks a tile's *language*, then one 1632 `--preview` of that tile only (00 §2 PICK-LANGUAGE). Second 다 별로 → STOP.
- status: delivered-sketch

#### CASE-2026-09-30-r366-v3-b | lips-buddha-tongue — Isaac picks tile B, second 다 구려 → STOP
- quote: **"다 구려 그나마 …/r366-b-sketch.mp4 이게 나아"** → axis=**PICK-LANGUAGE (B) + second NEW-LANGUAGE miss** → one 1632 `--preview` of B only, then STOP and ask (00 §2 PICK-LANGUAGE · §4 two same-class quotes).
- map (B, `scene-B.json` = `scene.json`): L1 44 px fieldAlign 1 · L4 glowWave 0.85/5 fc0.55 : 0.5/8 fc0.85 + phaseWarp 0.35 · L6 zoom 1.016 fb 0.22 drift 0.02 · L10 breath 0.032 · prism **off** · no L8 · clamp 0.12. composed=L1+L4+L6+L10.
- preview: `out/layered/2026-09-30_r366-lips-buddha-tongue-v3-b-1be224d0/r366-lips-buddha-tongue-v3-b-preview.mp4` · QA **PASS w/ WARN** staticZone 0.291 · **macroMotion 0.0233 < 0.025** · drift95 0.1753 (cap 0.18) · hueJump ≈0 (no hue motion at all) · probe macro 5.98 share 0.287 micro 1.72 (finals 11–13 / 0.29 / 3.3–3.7).
- seen (stills `stills-v2/v3b_buddha.png` · `v3b_full.png`): identity held but **glow 0.85 clips** the buddha/lips to near-white-yellow (robe shading lost); **phaseWarp 0.35 draws contour crawl** on the flat dark cavity; between 6.00/6.15/6.30 light rolls over the buddha, pixels barely travel.
- B2 (internal, **not shown**, `scene-B2.json`, `…_r366-lips-buddha-tongue-v4-b2-865c8527/`): same map, defects + floor attempted — glow 0.62/0.38 sharp 0.22/0.2 (clip) · phaseWarp 0.1 (crawl) · L1 96 px forwardBias 0.6 · zoom 1.03 · drift 0.02. Result **worse**: macroMotion 0.0207 · **QA FAIL sourceColorDrift95 0.190** · staticZone 0.363 · probe 5.31/0.314/1.67. Bigger advection on a smooth gloss surface raises *position* drift without raising *visible* motion. Two misses on B → STOP (R-013 / 04 §1.7). scene.json restored to B.
- **root cause (structural, not knob):** this source is a smooth, glossy, finished-vivid still with one small identity object. Every language in 00 §3.1 either (a) rotates chroma → repaint (L3, v2 "완전 구려"), or (b) displaces pixels along the scaffold flow-field, which on gloss follows iso-luma contours → pixels slide invisibly (L1/L8: macro ≤0.03, drift cap blown before anything reads as motion). L4 light waves are the only visible motion and they clip on already-bright lips. The language set was proven on **textured** sources (engraving r344/r352, mandala r346, halo r325); `01` §3.1 has no branch for smooth/glossy and `04` §2 has no "living part" row for *specular gloss*. Not a type-tree edit without Isaac (00 §7).
- untried and legal-with-a-yes: **L9** colorCycle on the rainbow-pool mask only (non-body; R-018 died on portrait body). Not built — asked twice, no answer yet. A gloss-following highlight flow (specular-aware field) does **not** exist in the shader set.
- judge: **STOP** — one preview (v3-b) + one question to Isaac. No third family, no knob tour, no full, no audio.
- learning: on smooth/glossy sources, `qa-motion macroMotion` and `sourceColorDrift95` move in *opposite* directions under L1 amplitude — displacement is the wrong lever there; if this class recurs, it needs a new language (gloss/highlight flow or masked L9), not more px.
- rules: R-013 confirm · R-001 confirm · R-020 confirm (QA PASS on B ≠ like)
- status: stopped-for-direction

#### CASE-2026-09-30-r366-v4-b3 | lips-buddha-tongue — "이 방향 맞아 더 다듬어" on v3-b → defects only
- quote: **"…/r366-lips-buddha-tongue-v3-b-preview.mp4 이 방향 맞아 더 다듬어"** → axis=**keep the picked map, polish = defects only** (00 §4 알아서 다듬어 row; not "reduce everything", r346 v6). Supersedes the v3-b STOP question.
- measured first (region stats, `scratchpad/r366/regions.mjs`: buddha = gold hue mask, cavity = `cavity-hold.png`, pool = bottom rainbow): v3-b @6.00 clip (any ch ≥ 250) lips **70.9%** · buddha **75.7%** · pool **72.8%** (source 0.2 / 2.7 / 0.6). Buddha = most clipped **and** least moving (|Δluma| 1.72 vs 3.2–3.7) → clipped pixels cannot show a crest: clipping was eating macroMotion.
- root cause by one-knob sketch probes (12 fps · 6 s, same ruler): **`multipassFeedback.strength` 0.22** — additive `cur + prev·s` lifts steady state ≈ +24 % and is a temporal low-pass. 0.22→0.08: lips clip 55.7→36.6 %, lips motion 6.75→8.23, buddha motion 7.84→10.15. `saturationBoost` 1.48→1.15 and `bloom` off: **no change** (dead ends, not tried again). Clip happens after the layer's `sourceColorClamp` (post stack), so the clamp cannot catch it.
- B2's miss explained: it cut glow (the only visible motion) and left feedback at 0.22.
- change (vs `scene-B.json`, 2 values): `multipassFeedback.strength` 0.22→**0.12** (keeps the L6 zoom echo; 0.08 gave less motion than 0.12 in sketch) · `phaseWarpAmount` 0.35→**0.12** (cavity contour crawl). Glow 0.85/0.5, L1 44 px, zoom 1.016, drift 0.02, prism off, clamp 0.12 — untouched. `scene-B3.json` = `scene.json`. Grade ok, composed L1+L4+L6+L10.
- preview: `out/layered/2026-09-30_r366-lips-buddha-tongue-v4-b3-37e15932/r366-lips-buddha-tongue-v4-b3-preview.mp4` · QA **PASS w/ WARN** · macroMotion 0.0233→**0.0249** (floor 0.025) · drift95 0.175→**0.151** · staticZone 0.291→0.409 (hue-only metric, blind to glow; rose because feedback hueShift contributes less — not a visual regression) · probe macro 5.98→**6.38**, micro 1.72→1.75 · regions @6.00: lips clip 56.4 % · pool 59.4 % · buddha 72.9 % (R at crest on gold) · buddha motion 1.72→**2.16**.
- seen (`stills-v2/v4b3_buddha.png` · `v4b3_full.png`): buddha back from yellow-white to orange-gold, robe folds and face shading read; hot palette of v3-b kept; cavity rings stay (L4 on that region) but crawl less.
- tried and dropped: B4 = B3 + zoom 1.02 → PSNR 41.9 dB vs B3, macroMotion 0.0249 unchanged. Zoom is wired (`effect-composer.ts` → `uFeedbackZoom`) but has ~no sensitivity at strength 0.12. Kept B3 (smaller diff).
- judge: one preview to Isaac. No full (needs `isaac-pick.ts` + 풀렌더/최종 quote), no audio.
- learning: on bright/glossy sources, **feedback strength is a motion damper, not a motion source**. When macroMotion is short and clip % is high, cut feedback strength before touching glow or advection.
- rules: R-001 confirm · R-020 confirm · 04 floor (macroMotion) at the line, WARN not FAIL
- status: preview-for-isaac

#### CASE-2026-09-30-r366-v5-b5 | lips-buddha-tongue — "점점 괜찮아지고있어 더 다듬어" on B3 → defects only, round 2
- quote: **"점점 괜찮아지고있어 더 다듬어"** → same axis as v4-b3 (keep map, defects only). Second polish quote in a row but *positive trend* → one preview + one question (00 §4 last line), not a stop.
- seen on B3 @9.00 (native-res lip crops, `stills-v2/v5b5_lips_t9.png` row 2): glow bands on the lips are **hard-edged zebra/maze fragments**. Two causes: (1) `phase-edge.png` is a densely wrapped stripe field — its white→black wraps draw the fragments; (2) `sourceColorClamp 0.12` (set for prism, prism is off) pins every crest on the clamp sphere → plateau → binary bands. Also macro 6.4 vs finals 11–13.
- lock precedent (`recipes/locks/*.json`): every strong-glow final runs clamp **0.18–0.26** on a smooth travel field (r325 0.24 · phase-halo; r342 0.22 · phase-fall). B3 was the narrowest clamp in the set on the busiest field.
- one-change sketches from B3 (12 fps · 6 s; sketch seamRatio always FAILs = 6 s cut, ignore): clamp 0.18 → macro 6.20→**8.15**, qa macro 0.030→0.039, drift 0.151→0.169 · crest sharpness 0.3→0.1 → macro **5.53** (softer = less motion; dropped, and c18+soft 7.44 < c18) · primary `phaseField` → `phase-luminance.png` → macro 7.10, lips motion 8.16→**12.36**, micro 1.54→1.22 (energy moved micro→macro) · c18 + lum → macro **9.40**, drift 0.171.
- change (vs B3, 2 values): `sourceColorClamp.maxDrift` 0.12→**0.18** · `phaseField` phase-edge→**phase-luminance** (wave 1 only; wave 2 stays on phase-mix → some contour texture kept). Glow 0.85/0.5, sharpness, L1, feedback 0.12, zoom, drift, breath untouched. `scene-B5.json` = `scene.json`. Grade ok, composed L1+L4+L6+L10 (unchanged).
- preview: `out/layered/2026-09-30_r366-lips-buddha-tongue-v5-b5-9ca504b0/r366-lips-buddha-tongue-v5-b5-preview.mp4` · QA **PASS w/ WARN** hueJump95 2.14 (thr 2.03) · staticZone 0.224 (B3 0.409) · **macroMotion 0.0344 PASS** (floor cleared) · drift95 **0.171** (cap 0.18) · seamRatio 1.44 (cap 1.5) · probe macro 6.38→**8.83**, micro 1.47.
- seam check (`scratchpad/r366/seam.mjs`): not a pop — frame diffs 3.56 → wrap 5.04 → 4.97 are continuous; a fast wave phase happens to sit on the wrap. Per-second motion envelope min 0.8 (B3) → 2.1 (B5, excl. last second): fewer dead beats.
- seen (`stills-v2/v5b5_full.png` · `v5b5_buddha.png` · `v5b5_lips_t9.png`): lip maze gone, whole lip surface brightens/darkens along its gloss volume, specular streaks survive as pink-white; buddha now breathes bronze ↔ bright gold with folds readable (clip @6.00 72.9 % → 7.1 %); cavity still green with wave-2 rings.
- open question to Isaac: the zebra/maze texture of B/B3 is mostly gone. If he misses it, `probe-c18.json` (= B3 + clamp 0.18, phase-edge kept) is the fallback: sketch macro 8.15.
- learning: on smooth/glossy sources, **glow on `phase-luminance` is the gloss-following light flow** the 09-30 v3-b row said was missing — it travels along the gloss volume instead of cutting mazes. And the source clamp sets the ceiling of visible glow swing: a clamp tuned for prism must be reopened when prism goes off.
- rules: R-001 confirm · R-020 confirm · R-037 confirm (axis kept, defect fixed locally)
- status: preview-for-isaac

#### CASE-2026-09-30-r366-v6-b6 | lips-buddha-tongue — B5 "더 나빠졌어" → back to B3, color/light only
- quote: **"더 나빠졌어 이전에 내가 좋았다고한 마지막 버전에서 너무 밝은 컬러,빛만 좀 조정해줘 눈이 아퍼"** → B5 **rejected**; base = **B3** (last "좋다" = "점점 괜찮아지고있어"); axis = **X만 (color + light only)**, every other byte of B3 kept. "눈이 아퍼" = eye strain.
- B5 miss: clamp 0.18 + glow on phase-luminance made the whole lip surface pulse as one → more neon and more flash (below). Maze texture of B/B3 was part of what Isaac liked; the "zebra = defect" read was wrong. Metric wins (macro 8.83, floor PASS) did not matter.
- measured first (`scratchpad/r366/glare.mjs`, whole clip at 204×364; hot = max ch ≥ 240 **and** sat ≥ 0.7): source meanL 111 · hot 1.6 % · sat 0.647 · B3 meanL 106 · **hot 22.9 %** · sat 0.849 · flash 2.39 · B5 hot 27.4 % · flash **3.12**. Mean luma was never high — the pain is **neon saturation at channel max**, plus flash in B5.
- one-change sketches from B3: `saturationBoost` 1.48→1.15 hot 24.1→19.4 · feedback 0.12→0.06 hot →17.5 (feedback's `satTarget` push) · contrast 1.04→1.0 + sCurve 0 hot →21.4 · glow 0.85/0.5→0.6/0.35 hot **24.9 (no help)** but flash 2.92→2.52. Neon = sat boost + feedback; flash = glow. Combos: m1 (sat 1.15 + fb 0.06 + ct 1.0) hot 11.9 · flash 3.13 (unclipped waves show more) · **m2 = m1 + glow 0.72/0.42** hot 11.6 · flash 2.96 · macro 6.33 · m3 (sat 1.0) hot 8.7 · sat 0.684 · flash 3.28. Picked m2: "좀 조정" = moderate, flash held at B3.
- change (vs `scene-B3.json`): `saturationBoost` 1.48→**1.15** · `multipassFeedback.strength` 0.12→**0.06** · `filmGrade` contrast 1.04→**1.0**, sCurve 0.05→**0** · glow **0.72 / 0.42** (was 0.85 / 0.5). Field, phaseWarp, clamp 0.12, L1, zoom, drift, breath untouched. `scene-B6.json` = `scene.json`. Grade ok, composed L1+L4+L6+L10.
- preview: `out/layered/2026-09-30_r366-lips-buddha-tongue-v6-b6-2c18ae43/r366-lips-buddha-tongue-v6-b6-preview.mp4` · glare hot 22.9→**11.5 %** · sat 0.849→**0.755** · meanL 108 · flash 2.39→2.42 · QA **PASS w/ WARN** hueJump95 1.95 (thr 1.82) · staticZone 0.478 (hue-only) · **macroMotion 0.0253 PASS** · drift95 0.124 · seam 0.91 · probe macro 6.46 (B3 6.38).
- seen (`stills-v2/v6b6_full.png` · `v6b6_buddha.png`): B3 maze texture and motion intact; lip neon orange → red-orange, tongue back to pink, buddha less yellow-white, cavity green dimmer.
- fallback if still too hot: `probe-m3.json` (sat 1.0, hot 8.7 %). If too tame: m1 (glow back to 0.85/0.5).
- learning: **"눈이 아퍼" on a vivid source = neon (sat at channel max), not luma** — measure hot % first; `saturationBoost` and additive-feedback `satTarget` make it, glow strength only makes flash. Widening the source clamp for macro raises flash — on bright sources it trades eye comfort for a metric.
- rules: R-020 confirm (QA/metric gains ≠ like, B5) · 00 §4 "X만" confirm
- status: preview-for-isaac

#### CASE-2026-09-30-r366-v7-b7 | lips-buddha-tongue — B6 "아직도 너무 쨍해서 눈아퍼 더 다듬어 그리고 더 스피디하게 해" + "그리고 너무 밋밋해졌어"
- quotes (two, same turn): **"아직도 너무 쨍해서 눈아퍼 더 다듬어 그리고 더 스피디하게 해"** then **"그리고 너무 밋밋해졌어"** → B6 still neon **and** flat; tempo ↑ explicitly asked (00 §4: tempo = cycles/speed; the r344 "너무 스피디해" ban is for unasked speed).
- read: 쨍 = neon (sat at channel max); 밋밋 = B6 cut four energy sources at once (contrast, sCurve, glow, sat). Fix = sat ↓ further, energy back through **tempo + tonal contrast**, not through saturation.
- sketches from B6 (`glare.mjs` now also reports `lumStd` = spatial luma std, the flatness proxy; source 29.3 · B3 32.1 · B6 31.2): v1 tempo only macro 6.33→9.99 · v2 tempo + sat 1.0 + B3 glow 0.85/0.5 + contrast 1.04/sCurve 0.05 hot 9.3 · lumStd 32.7 · macro 11.54 · **v3 = v2 with sat 0.9** hot **7.0** · sat 0.669 · macro 11.76 · v4 = v2 with sCurve 0.12 lumStd **33.3**. Single frames lie across tempos (crest vs trough); judged on 5-frame time strips.
- change (vs `scene-B6.json`): tempo ≈ ×1.6 — glow speed 5→**8**, 8→**13** · `sourceFlowAdvection.cycles` 2→**3** · `breath.period` 20→**10** · `cameraDrift.cycles` 1→**2** · color/energy — `saturationBoost` 1.15→**0.9** · glow back to **0.85 / 0.5** · contrast 1.0→**1.04** · sCurve 0→**0.12**. Feedback 0.06, clamp 0.12, phase-edge field, phaseWarp 0.12, L1 44 px, zoom 1.016 kept. `scene-B7.json` = `scene.json`. Grade ok, composed L1+L4+L6+L10.
- preview: `out/layered/2026-09-30_r366-lips-buddha-tongue-v7-b7-9ed64113/r366-lips-buddha-tongue-v7-b7-preview.mp4` · glare hot **8.2 %** (B3 22.9 · B6 11.5) · sat **0.678** (source 0.647) · lumStd **33.3** · flash 4.46 (B6 2.42 — the asked speed) · probe macro **11.94** (first r366 render in the finals' 11–13 band), micro 2.93 · QA **PASS w/ WARN** hueJump95 2.92 · staticZone 0.464 · lumFlicker 0.0131 (≤ 0.015, closest to its line) · macroMotion 0.0468 · drift95 0.126 · seam 0.62 (wrap continuous).
- seen (`stills-v2/v7b7_strip.png` · `v7b7_buddha.png`): swings fast between orange contour crests and deep source-red troughs; B3 maze kept, neon gone; buddha near source gold, cavity green dim. Minor: at 2.0 s scattered dark specks on the buddha robe/tongue (trough of the phase-edge maze deepened by sCurve 0.12) — not fixed, flagged.
- if too fast: glow 13→10 first (wave 2 carries most flash). If specks read: sCurve 0.12→0.05 (v3, hot 7.0).
- learning: "쨍 + 밋밋" together = saturation carries glare, tempo and tonal contrast carry energy. Pull them apart: sat below 1.0 while restoring contrast/sCurve and speed kept eye comfort and doubled macro.
- rules: 00 §4 tempo row (asked) · R-020 confirm
- status: preview-for-isaac

#### CASE-2026-10-01-r366-v11-b11 | lips-buddha-tongue — "이거 좀 더 다듬어줘" on v10-b10 → defects only
- quote: **"…/r366-lips-buddha-tongue-v10-b10-preview.mp4 이거 좀 더 다듬어줘"** — B8–B10 were made in another session and are not ledgered here; B10 taken as the accepted direction, map kept (L1+L4+L6, same as B10).
- defect found: B10 pulsed the **whole frame** bright↔dull (global-luma share of frame change **0.81**, p-p 46.5 L). Cause: `phase-mix.png` (and `phase-edge.png`) put ~70 % of pixels in phase [0, 0.2], so each glow crest lit most of the frame at once — a flash, not a travelling wave. Second: L1 advection 44 px / edgePreserve 0.5 smeared lip and tongue edges.
- fix (6 values, all else B10): wave 2 phase → histogram-equalised `layers/phase-mix-eq.png` (`scripts/locks/r366-build-phase-eq.mjs`), fieldCycles 0.85→**1.0**, strength 0.24→**0.36**; wave 1 kept on raw phase-edge (equalising it turned the lips into a fine zebra maze — probes e1/e2 rejected on sight) but 0.4→**0.3**; advection 44→**28 px**, edgePreserve 0.5→**0.9**. `scene-B11.json` = `scene.json`.
- preview: `out/layered/2026-10-01_r366-lips-buddha-tongue-v11-b11-a235ec4e/r366-lips-buddha-tongue-v11-b11-preview.mp4` · pumpShare **0.40** (B10 0.81) · global|Δ| 1.84 (3.31) · local|Δ| 4.61 (4.08) · macro **11.76** (11.07) · hot% 5.7 (6.2) · sharp lipTop 1.96 (1.77) tongue 0.98 (0.75) cavity 1.29 (1.01) · subject scale range 1.000–1.005 (size pulse stays removed) · seam 1.05 · QA **PASS w/ WARN** hueJump95 2.50 (line 2.47) · staticZone 0.82 (hue-only metric) · grade ok.
- seen (`scratchpad fin_cmp.png`): B10 row alternates bright/dull frames; B11 row holds one exposure while orange crests travel over lips and tongue.
- if wave 2 reads too busy: strength 0.36→0.3. If too calm: wave 1 back to 0.4 (pump returns ~0.6).
- learning: a phase plate with a skewed histogram turns a glow wave into a global flash. Check the phase histogram before blaming speed or strength; equalise only the smooth (mix) field — equalising an edge field exposes its contour stripes.
- status: preview-for-isaac

#### CASE-2026-10-01-r366-v12-b12 | lips-buddha-tongue — "점점 맘에 들어가 … 종합해서 더 다듬어봐" on v11-b11 → defects only
- quote: **"ㅇㅇ 점점 맘에 들어가. 나와의 대화, 지금까지의 작업 내역 종합해서 너가 더 다듬어봐. 내가 맘에 들게"**. Map kept (L1+L4+L6).
- synthesis of every r366 quote: wants less glare (B5/B6 "눈이 아퍼", B7 "흰색 쨍 아예 제거"), no subject size pulse, more speed (asked three times), keeps the B3 maze; B11's cut of the whole-frame pulse landed. Recovered B7→B10 (other session): bloom/CA/sCurve → 0 (white glare), breath 0 (size), glow 8/13→11/18 + L1 cycles 3→4 + drift 2→3 (speed), glow 0.85/0.5→0.4/0.24.
- defects in B11 (hotmap over the clip): neon left mostly in the rainbow pool (11.2 % vs source 4.1) and on the buddha. One-knob sketches: **feedback 0.06 is the remaining neon source** (pool 10.6→6.0, macro unchanged; it also carried the last zoom-1.016 trail). `colorMotionMask` lum floor 0.5 had **no effect** (10.8). Wave 1 (raw phase-edge) carries the residual global pulse (wave 1 off → pump 0.087). Buddha dark specks and cavity ghost shapes are in B10 too and in every probe — not from feedback or wave 1; not fixed, flagged.
- fix (6 values, all else B11): `multipassFeedback.strength` 0.06→**0** · glow speeds 11/18→**13/21** · L1 cycles 4→**5** · wave 1 0.3→**0.24** · wave 2 0.36→**0.4**. `scene-B12.json` = `scene.json`.
- preview: `out/layered/2026-10-01_r366-lips-buddha-tongue-v12-b12-674b67d9/r366-lips-buddha-tongue-v12-b12-preview.mp4` · hot% **2.9** (B11 5.7, source 1.6) · pumpShare **0.31** (0.40) · local|Δ| 5.69 (4.61) · macro **14.18** (11.76) · meanL 110.4 (source 111.1) · sat 0.624 · sharp ≈ B11 · scale range 1.000–1.005 · seam 1.07 · QA **PASS w/ WARN** hueJump95 2.86 (line 2.84) · staticZone (hue-only) · grade ok.
- seen (`scratchpad fin_cmp2.png`, `pl_cmp.png`): one exposure across frames, maze crests on lips kept, pool yellow no longer blown.
- if too fast: glow 13/21→11/18 first. If 밋밋: wave 1 back to 0.3 (pump ~0.37).
- learning: on this source the 6 % additive feedback cost half the neon and bought no motion — check post-stack adds before trimming saturation again.
- status: preview-for-isaac

#### CASE-2026-10-01-r366-final | lips-buddha-tongue — "맘에 들어 풀버전 뽑고 … Love is Acid.wav 이거 합쳐" → final + audio + lock
- quote: **"맘에 들어 풀버전 뽑고 '/Users/isaac/Downloads/Bloody Mary - Love is Acid.wav' 이거 합쳐"** → `isaac-pick.ts` (B12 preview, gate REJECT + humanOverride). Start not named → measured and asked: the track holds ~-11 dBFS throughout; the only breakdown is 3:10.5–3:18 (~-22 dBFS); kick returns at **198.15 s**. Isaac picked **3:18 드롭**.
- final: `out/layered/2026-10-01_r366-lips-buddha-tongue-final-1777d73e/r366-lips-buddha-tongue-final.mp4` (1632×2912 · 30 fps · 600 f · H.264) · **+audio** `…-final-with-love-is-acid.mp4` (mux `-ss 198.15`, aac 320k, 20.0 s) · QA **PASS w/ WARN** hueJump95 2.28 · staticZone (hue-only) · lumFlicker 0.0035 · macroMotion 0.0291 · seamRatio 1.20 · hot% 3.0 · pumpShare 0.31.
- lock: `close-lock.ts` done; `rebuild-closed-lock.ts --slug r366-lips-buddha-tongue` reproduced every plate byte-identical (source, flow-field, phase-edge, phase-mix, phase-mix-eq) and the gate scene sha → **closed**.
- open: wrap step 1.73× median frame step (same as r370 final) — `phaseWarp` flow uses raw `time × noiseSpeed`, not loop-periodic. Shared across finals; not fixed here.
- status: **closed**

#### CASE-2026-10-02-r378 | raised-palm first preview
- source: native 1632×2912 `/Users/isaac/Downloads/monglong_a_striking_graphic_art_piece_presenting_a_large_textur_07954972-e957-45ec-a18f-7ccbc7e5693b.PNG` sha256=`d6b19ce7654a3166…` — **same pixels as r352** (not a scene replay). type=`busy-line` (hatch on the hands; M5 coherence 0.17 reads texture because the lines change direction) M: satMean=0.6785 vivid=59.8% busyness=**0.1159** greenRisk**true** finishedVivid=0.375 dark=30.5%
- hero: detector **form** @0.755,0.329 (the hand over the crown). Living part is the engraved palm and that hand, so no `--hero`. Face is an ellipse hold (0.495,0.385); palm, crown hand, chest, and sky are open. phaseMix=0.
- language-map: hands/robe/sky=L1+L4+L6+L8+L10 · face=L3+L4 · composed=L1+L4+L6+L8+L10. Travel prism surface 12 (hatch pitch), phaseFlow 28, chromaFlow 8px detailGain 1, clamp 0.16. Face chromaCycles 0, clamp 0.12.
- preview: `out/layered/2026-10-02_r378-raised-palm-6fa6524f/r378-raised-palm-preview.mp4` (816×1456 · 20s · 15fps · silent)
- stills: contact=`out/manual-runs/r378-raised-palm/stills/contact.png` palm=`…/stills/subsec-palm.png` face=`…/stills/subsec-face.png`
- QA: **PASS** olive 0.0325 · drift 0.100/0.162 · seam 1.18 · motionDensity 0.352 · macroMotion 0.026 · hueJump95 25.7
- judge: **HOLD Isaac** — palm lines travel, face stays a face. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-06-r379 | palm-eye-vine first preview
- source: native 1632×2912 `sources/incoming/r379-palm-eye-vine.png` (Downloads `monglong_a_flat_vector_illustration_featuring_a_pink_hand_with__a49fb790-….PNG`) sha256=`9a40f6c5f8a15af2…` — type=`figure-vivid` M: satMean=0.6184 vivid=53.1% busyness=0.0185 greenRisk**false** finishedVivid=0.6929 dark=0.0002% figure=40%
- hero: detector **pour** @0.298,0.354 waterNy=0.75 (left thumb). Override `--hero beam@0.505,0.538` — the palm eye is the radial nexus. Custom plates replace the session-plates pour cone and water diagonals: field radiates from the palm eye, the green vine follows its own tangent toward the flower. Hold is two feathered eye ellipses; the palm pupil is punched (hero alpha 0). Wrist eye @0.50,0.842 stays shut. No nx/ny box.
- language-map: hero/field/hand/vine=L1+L3+L4+L6+L8+L10 · eyes=L4+L5 (chromaCycles 0, phaseFlow 0, clamp 0.12) · composed=L1+L4+L5+L6+L8+L10. Layer-0 prism surface 26→**6** after the first render repainted the flower; phaseFlow 27 and chromaCycles 3 stayed. The second render did not bring the petals back.
- preview: `out/layered/2026-10-06_r379-palm-eye-vine-eb9fcd0e/r379-palm-eye-vine-preview.mp4` (816×1456 · 20s · 15fps · silent). Discarded same-class render: `out/layered/2026-10-06_r379-palm-eye-vine-974ad8df/r379-palm-eye-vine-preview.mp4` (surface 26, hueJump95 52.3).
- stills: contact=`out/manual-runs/r379-palm-eye-vine/stills/contact.png` hero-subsec=`…/stills/hero-subsec.png`
- QA: **FAIL bleach** 0.0754 (line 0.0504, source 0.0252) · olive 0.0237 · drift 0.162/0.259 · seam 1.27 · motionDensity 0.461 · macroMotion 0.040 · hueJump95 18.1 WARN. Eyes stay eyes. Flower petals and the radial bouquet become a chroma river.
- judge: **STOP** — two misses, same repaint class (R-013). No third render. No full, no audio.
- learning: on a flat vector, lowering prism surfaceCycles does not restore a pale flower once phaseFlow 27, chromaCycles 3, and L8 spectral/dissolve are still on.
- status: delivered-preview

#### CASE-2026-10-06-r379-preserve | palm-eye-vine — "원본이 너무 훼손됐어 원본 최대한 보존해줘"
- quote: **"원본이 너무 훼손됐어 원본 최대한 보존해줘"** → axis=DELTA (stop the repaint; keep the beam). Not a new language, not a sketch grid.
- recipe: same plates. Layer 0 prism stays amount 1 with chromaCycles 0, surfaceCycles 0, phaseFlowPx 0, detailBoost 0.25, clamp 0.08, saturation 1. L8 dissolve/spectral/chromaFlow/transport amount 0. Bloom 0, chromatic aberration 0, feedback strength 0.03 hueShift 0. Advection 32px, edgePreserve 0.85, detailGain 1. Glow 0.22/0.14, phaseWarp 0.06, breath 0.012. Hold is the palm iris only (pupil punched); wrist eye is free.
- language-map: field/hand/vine/flower=L1+L4+L6+L10 · palm iris=held still · composed=L1+L4+L6+L10
- preview: `out/layered/2026-10-06_r379-palm-eye-vine-035666b8/r379-palm-eye-vine-preview.mp4` (816×1456 · 20s · 15fps · silent)
- stills: contact=`out/manual-runs/r379-palm-eye-vine/stills/contact.png` hero-subsec=`…/stills/hero-subsec.png`
- QA: **PASS w/ WARN** hueJump95 2.99 · staticZone 0.42 · macroMotion 0.020 · bleach 0.005 (was 0.075) · olive 0.049 · drift 0.091/0.166 · seam 1.34 · motionDensity 0.212
- judge: **HOLD Isaac** — flower, vine, both eyes, and the radial field read as the source. Flat pink stays still. No full, no audio.
- learning: on this flat vector the repaint was the prism river plus L8, bloom, and CA. Edge-preserved advection keeps the drawing and still moves the soft field.
- status: delivered-preview

#### CASE-2026-10-06-r379-v3-preserve | palm-eye-vine — "원본 최대한 보존해줘 너무 훼손하지마"
- quote: **"원본 최대한 보존해줘 너무 훼손하지마"** → axis=DELTA, made in parallel with `-preserve` above (other session, same work-dir). Same intent, one change: the drawing never moves.
- recipe: `scene-v3.json`. Layer 0 = source, prism amount 0, L8 dissolve/spectral/chromaFlow/transport 0, saturation 1.0, greenCompress 0, valueLift 0, clamp 0.12, colorMotionMask {floor 0.35, luminanceWeight 1} (pale petals take less glow). L1 advection 28px, edgePreserve 0.9, cycles 3 on `flow-beam`. Glow 0.3 speed 9 on `phase-beam` + glow2 0.3 speed 14 on `phase-mix`, phaseWarp 0.12. Bloom 0, CA 0, feedback 0, breath 0, contrast 1 sCurve 0, cameraDrift 0.01. Layer 1 = `layers/hand-hold.png` (`scripts/locks/r379-build-hand-hold.mjs`): flood fill of skin + vine from 8 seeds, holes (both eyes) filled, 12px margin, feathered, palm pupil punched for hero travel. Layer 1 has the same glow, no advection, so light crosses the edge without a seam.
- language-map: field/flower=L1+L4+L6 · hand/vine/eyes=L4+L6 (held, no displacement) · composed=L1+L4+L6
- preview: `out/layered/2026-10-06_r379-palm-eye-vine-v3-preserve-5a16655e/r379-palm-eye-vine-v3-preserve-preview.mp4` (816×1456 · 20s · 15fps · silent). Probes: `r379-probe-{v2,a,b2,c,v3}` sketches.
- QA: **PASS w/ WARN** staticZone 0.58 (hue-only, expected for a preservation map) · macroMotion 0.035 · drift 0.097/0.170 · seam 1.19 · motionDensity 0.225 · grade PASS.
- vs `-preserve` (035666b8), same probes: flower sharp **0.98** vs 0.71 · flower sat 0.427 vs 0.512 (source 0.430) · flower meanL 146 vs 138 (source 148) · whole sat 0.608 vs 0.641 (source 0.614) · macro 8.9 vs 5.2 · |Δsrc| 14.8 vs 13.6. Fingers hold in both.
- judge: **HOLD Isaac**. No full, no audio.
- learning: on a flat vector, "보존" = prism amount 0 (not prism with cycles 0 at clamp 0.08, which still pinks and softens the pale flower) + a silhouette hold so L1 moves only the bokeh field.
- status: delivered-preview

#### CASE-2026-10-06-r379-v5 | palm-eye-vine — "여기서 좀 더 싸이키델릭하게 다듬어줘" + "빛이 너무 인위적으로 흐르고있어 지금"
- quote: on v3-preserve. Two axes: the L4 light waves read as artificial (R-038 class: remove, do not soften) · more psychedelic, still under "원본 최대한 보존".
- finding: v3's visible motion was almost all L4. Legacy `sourceFlowAdvection` moves pixels by `interiorDetail × detailGain`, which is ~0 on soft bokeh. With L4 off, the 48/64 px legacy advection sketches measured local|Δ| 0.03. Stream mode (`forwardBias ≥ 0.5`) shreds the bokeh and lotus into a zigzag. `structureFlow` is capped at 0.005 (≈15 px), too weak. L2 counter bands: a hard flip tears; a smooth sin-weighted flip leaves thin arc scratches on every band edge. Feedback zoom is additive, forces saturation up, and the warp accumulates spin. None of these were used.
- recipe: `scene-v5.json`, three layers. **0** `source.png`: still. L1 advection 28px (inert on bokeh) + L10 breath 0.012. Glow 0, transport 0. It shows only through the punched palm pupil and wherever the field layer is transparent. **1** `layers/field-fill.png` (`scripts/locks/r379-build-field-fill.mjs`): L8 `sourceFlowTransport` 128px, macroCycles 4, phaseScale 2, normalMix 0.35, edgePreserve 0.5 on `flow-beam` (radial from the palm eye). The bokeh breathes toward and away from the eye in travelling waves. Alpha is 0 under the hand (soft edge), so whatever transport drags out from under the hand shows the original bokeh from layer 0, not skin. The shader samples alpha at the displaced uv: an opaque field plate dragged skin out as pink echo outlines and mashed the punched pupil. Flat fill and radial-mirror fill both showed (pale ghost band / torn streaks). **2** `hand-hold.png` = `R379_FLOWER=1 node scripts/locks/r379-build-hand-hold.mjs <W> 6`: hand + vine + eyes + lotus. Margin 24px keeps the source's pale rim on the hand. Pupil punched. No glow. Effects: bloom/CA/feedback 0, cameraDrift 0.01 cycles 2. Color: clamp 0.12, sat 1.0, prism 0, L8 colour 0.
- language-map: field=L8+L6 · hand/vine/eyes/lotus=L6 (held, untouched) · palm pupil=L1+L10 (still) · composed=L1+L6+L8+L10
- preview: `out/layered/2026-10-06_r379-palm-eye-vine-v5b-3382c30f/r379-palm-eye-vine-v5b-preview.mp4` (816×1456 · 20s · 15fps · silent). Superseded same-session renders: `…-v4-439cc896` (transport on the source: pink echoes + mashed pupil) and `…-v5-319742a5` (lotus not held: bobbing, smeared petals).
- QA: **PASS w/ WARN** drift 0.085/0.185 · seam 1.48 · motionDensity 0.272 · macroMotion 0.0063 WARN (no luma waves left; r367/r370 finals shipped with this WARN) · staticZone/deadZone WARN (held figure, by design) · grade PASS. Probes vs source: sat 0.609/0.614 · meanL 122.4/123.4 · hot 0.6%/0.7% · lotus |Δsrc| 6.6 (v3 15.9).
- judge: **HOLD Isaac**. No full, no audio.
- learning: on a soft-bokeh field, the only clean macro motion is legacy L8 transport (support floor 0.55), and it needs its own layer. That layer must be transparent under every held element: alpha travels with the displacement.
- status: delivered-preview

#### CASE-2026-10-06-r379-v7c | palm-eye-vine — "더 사이키델릭하게가 너무 심심해 지금 단조롭고" + "대신 너무 인위적이면안돼 기존 작업물들 내가 만족했던거 참고해서 디벨롭해" + "연꽃 우측 하단이 배경과 같이 움직이고있는데 연꽃은 움직이지 않게 정확히 해줘"
- quote: on v5b. Three asks: v5b's single radial pulse reads as monotonous (약해 + 패턴 다 똑같) · develop from the approved locks · lotus lower-right rode the field (hold defect).
- finding (one-knob sketches, field layer): the approved r353/r367/r370 source stack, ported onto the field. **L3 prism** (surface 26, phaseFlow 27 px, clamp 0.18) turned the soft bokeh into grey oil-slick contour rings, the same "머디" seen on colourful smooth sources before; `probe-v6b-prism.json`. **L8 chroma 0.5 + spectral 0.48** stayed clean and vivid (`probe-v6c-chromaspec.json`). **L9** field colorCycle 3 on phase-beam (`scene-v7-l9.json`, greenCompress 0.6): strongest look, but sourceColorDrift95 0.221 > 0.18 FAIL and LocalDrift 0.45 FAIL, and the 04 §4 figure-vivid checklist needs colorCycle 0. Preview `…-v7-l9-c02c6051` was rendered and **not presented**; it needs Isaac's yes.
- lotus: the v5 petal class (pink/white, s ≤ 0.38, v ≥ 0.72) missed the shaded lower-right petals (lavender, h ≈ 260, v ≈ 0.65). New lotus hold = every non-bokeh pixel (not green, not blue with s ≥ 0.3, v ≥ 0.45) inside a traced envelope. The envelope also keeps out the pink bokeh blobs that v5 had held. Frame-to-frame |Δ| on the lower-right petals: 1.50 (v7) → 0.000 (v7c). Lower-left: 0.71 → 0.000.
- recipe: `scene-v7.json` = v5 + field layer: chroma flow 0.5 / 6 px / 5 cycles · spectral 0.48 / 16 px / 3 cycles · material dissolve 0.42 / 22 px / λ72 / 3 cycles · breath 0.032 · transport micro 6 px / 7 cycles · sat 1.2 · clamp 0.18 · colorMotionMask floor 1. Effects: bloom 0.3, CA 0.06. Still off: prism, glow/L4, feedback strength, colorCycle. Plates: `R379_FLOWER=1 node scripts/locks/r379-build-hand-hold.mjs <W> 6` (hold coverage 41.5 %), then `node scripts/locks/r379-build-field-fill.mjs <W>`.
- language-map: field = L8 (transport + dissolve + chroma + spectral) + L6 + L10 · hand/vine/eyes/lotus = held · palm pupil = L1 + L10 · composed L1 + L6 + L8 + L10 · tempos 2 / 3 / 4 / 5 / 7 · scales 128 px / 72 px / 6 px
- preview: `out/layered/2026-10-06_r379-palm-eye-vine-v7c-bdf460e5/r379-palm-eye-vine-v7c-preview.mp4`. Superseded same session: `…-v7-263b4535` (old lotus hold).
- QA: grade ok · **seamRatio 1.519 FAIL** · macroMotion 0.0062 WARN · static/dead WARN (held figure). Drift 0.101 / 0.223 PASS · olive 0.054 (source 0.055) · hot 2.6 % (source 0.7) · sat 0.642 (source 0.614).
- seam root cause = **encoder, not content**. The palm is static: frames 1–299 have |Δ| = 0 there, but frame 0 differs from every frame ≥ 30 by 0.92, and frames 0–29 match each other within 0.09. I-frames come every 30 frames, and the first GOP is quantised differently from the rest. v5b shows the same jump, so every 15 fps preview inherits it; the 1.5 threshold is crossed only on low-motion scenes.
- judge: **HOLD Isaac**. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-06-r379-v8 | palm-eye-vine — "ㅇㅇ색 돌리자. 더 싸이키델릭하게 해줘 색 순환 환각적으로 보이게빠르게 해주고 …r379-probe-v6a-sketch.mp4 여기 넣었던 패턴 조금만 살려줘"
- quote: Isaac's one-line yes to **L9 re-entry on the field region** (figure class, figure-vivid). Logged as re-entry per `00` §3.2. The 04 §4 box "figure-vivid: colorCycle 0" and the sourceColorDrift FAIL are waived by this quote for the field layer only. Hand, vine, eyes and lotus stay held, uncycled.
- finding: `sourcePrism` writes `rgb = mix(texColor, prismRgb, amount)`, so on one layer it **discards colorCycle** at any amount. Prism and L9 are mutually exclusive per layer. The v6a pattern = prism hue rotation along `phase-mix` contours (×5.8). Its mud was mostly the 0.18 clamp: the unclamped prism engine (`probe-v8-s2-prism.json`) was clean but less vivid than L9. A 35 % prism copy-layer over the cycling field (`probe-v8-s4-blend.json`) muddied by RGB mixing. **Picked:** L9 with `luminanceKey 0.6`. Hue offset by luma draws contour bands around the bokeh blobs (the v6a pattern, small) inside the clean OKLCH rotation (`probe-v8-s3-lumkey.json`).
- recipe: `scene-v8.json` = v7c + field layer `colorCycle.speed 16` (period 20) · `phaseAmount 1.0` on phase-beam (radial hue rings from the palm eye) · `luminanceKey 0.6` · `greenCompress 0.6` · clamp **1**. Plates unchanged from v7c.
- language-map: field = L9 + L8 + L6 + L10 · figure held · pupil = L1 + L10 · composed L1 + L6 + L8 + L9 + L10
- preview: `out/layered/2026-10-06_r379-palm-eye-vine-v8-53485bdc/r379-palm-eye-vine-v8-preview.mp4`
- QA: grade ok · seam 1.13 PASS · lumFlicker 0.0012 · hueJump95 33.1 PASS · olive 0.072 PASS (source 0.055) · hot 0.9 % (source 0.7) · sat 0.608 / 0.614 · **sourceColorDrift95 0.184 / local 0.43 FAIL (waived: L9 on field)** · macroMotion 0.0133 WARN (v7c 0.0062) · probe macro 3.31 (v7c 1.6). Lotus, lower-left petals and palm frame |Δ| = 0.000.
- open: the 24 px held rim around the hand is the source's pale-blue glow and stays uncycled. Next move if Isaac calls it an outline.
- judge: **HOLD Isaac**. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-07-r381 | tree-woman first preview
- source: native **816×1456** `/Users/isaac/Downloads/monglong_a_stylized_watercolor_depicting_a_tree_woman_hybrid_on_b67905f3-c853-4c62-aad5-f09e195daad7.PNG` sha256=`bcda386dcdf511f6…`. Lanczos 2× (same aspect, no crop) → `sources/incoming/r381-tree-woman.png` sha256=`a93140b38d86f4e5…` 1632×2912. type=`pastel-greenrisk` (greenRisk true wins before figure 40%). M on the 1632: satMean=0.8078 vivid=78.1% hues 45/35/25 conc=0.40 busyness=0.0213 dark=8.43% finishedVivid=0.6002 focal on the torso.
- hero: detector **form** @0.710,0.143 (a gap in the upper-right canopy). Living part is the wood grain along the body, branches, and roots, so no `--hero` and no custom plates. Scaffold `flow-field`. Nothing held.
- miss: composed r221 (`…-7aa112a4`) passed grade and QA but the prism river (surface 26, phaseFlow 27, chroma 3) plus L8, bloom, and CA repainted the wood into a chroma soup. Not shown.
- shown: one correction. Prism amount 1 with chroma/surface/phaseFlow 0, detailBoost 0.25. L8 amounts 0. Bloom 0, CA 0, feedback strength 0.05 hueShift 0 zoom 1.006. Saturation 1, hueKey 0, clamp 0.18, greenCompress 0.52. Advection 44px, edgePreserve 0.62, detailGain 2. Glow 0.24/0.14, phaseWarp 0.12, breath 0.032.
- language-map: whole frame=L1+L4+L6+L10 · composed=L1+L4+L6+L10
- preview: `out/layered/2026-10-07_r381-tree-woman-b1a10189/r381-tree-woman-preview.mp4` (816×1456 · 20s · 15fps · silent)
- stills: contact=`out/manual-runs/r381-tree-woman/stills/contact.png` torso=`…/stills/torso-row.png` hero-subsec=`…/stills/hero-subsec.png`
- QA: **PASS w/ WARN** hueJump95 3.55 · darkDwell 1.00 · staticZone 0.27 · lightStaticZone 0.47 · deadZone 0.18 · macroMotion 0.010 · drift 0.071/0.125 · olive 0.149 · bleach 0 · seam 1.32 · motionDensity 0.229
- judge: **HOLD Isaac** — torso, canopy, and roots still read as the drawing. Grain and light move slowly; the outline is not pinned. A faint phase pattern sits in the magenta band. No full, no audio.
- learning: on this watercolor the type-tree river repaints the figure the same way it did on the flat vector. Stopping the color stack (not only surfaceCycles) brings the drawing back. Edge-preserved advection then moves the grain only a little (macro under the warn).
- status: delivered-preview

#### CASE-2026-10-07-r381-mix | tree-woman — "두 버전을 적절히 섞어봐. lsd 비쥬얼 스럽게"
- quote: **"두 버전을 적절히 섞어봐. lsd 비쥬얼 스럽게"** → axis=DELTA. Blend the river preview (`…-7aa112a4`, not shown) and the drawing preview (`…-b1a10189`). Not a new language, not a sketch grid.
- recipe: figure lock stays near the drawing version (advection 44px, edgePreserve 0.70, detailGain 3, clamp 0.18, hueKey 0, colorCycle 0). Color stack returns part-way: prism chroma 2, surface 8, phaseFlow 8, detailBoost 0.6. L8 dissolve 0.22/12px edge 0.65, spectral 0.34/12px, chromaFlow 0.4/6px. Transport 0.4 (under the L8 macro line), colorAmount 0.08, edgePreserve 0.55. Saturation 1.24. Glow 0.40/0.22, phaseWarp 0.16. Bloom 0.16, CA 0.036, feedback 0.10 hueShift 0.003 zoom 1.006 rotate 0. Breath 0.032.
- language-map: whole frame=L1+L3+L4+L6+L8+L10 · composed=L1+L4+L6+L8+L10
- preview: `out/layered/2026-10-07_r381-tree-woman-mix-88aed6a8/r381-tree-woman-mix-preview.mp4` (816×1456 · 20s · 15fps · silent)
- stills: contact=`out/manual-runs/r381-tree-woman/stills/mix/contact.png` torso=`…/stills/mix/torso-row.png` hero-subsec=`…/stills/mix/hero-subsec.png`
- QA: **PASS w/ WARN** darkDwell 1.00 · macroMotion 0.015 · hueJump95 21.0 · drift 0.107/0.168 · olive 0.071 · bleach 0 · seam 1.17 · staticZone 0.015 · motionDensity 0.255
- judge: **HOLD Isaac** — silhouette, belly, branches, and roots still read. Wood tone shifts into cyan/magenta tracers. Contour pattern sits on the belly and the magenta band. Nothing held. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-07-r381-lsd | tree-woman — "b1a10189 움직임이 mix에서 너무 약해. 더 극한의 lsd"
- quote: **"…b1a10189…에서 표현되었던 움직임이 mix 버전에서는 너무 약해. 더 극한의 lsd 비쥬얼을 원해"** → axis=DELTA. Amplitude only. Cycles and glow speeds stay (advection cycles 2, glow 9/14, breath frequency 2). Not a sketch grid.
- recipe: same shuttle as b1a10189 (`forwardBias` 0.35, `fieldAlign` 1). Throw 44→**140px**, detailGain 2→**6**, edgePreserve 0.62→**0.38**. LSD color up from the mix: prism chroma 3, surface 8, phaseFlow **18**, detailBoost 1.4. Spectral 0.9/24px, chromaFlow 0.85/8px, dissolve 0.36/24px. Glow 0.78/0.50, phaseWarp 0.32, breath 0.07. Bloom 0.42, CA 0.11, feedback 0.16 hueShift 0.01, rotate 0. Saturation 1.42, clamp 0.18, hueKey 0, colorCycle 0.
- language-map: whole frame=L1+L3+L4+L6+L8+L10 · composed=L1+L4+L6+L8+L10
- preview: `out/layered/2026-10-07_r381-tree-woman-lsd-83db5a9b/r381-tree-woman-lsd-preview.mp4` (816×1456 · 20s · 15fps · silent)
- stills: torso=`out/manual-runs/r381-tree-woman/stills/lsd/torso-row.png` motion=`…/stills/lsd/motion-torso.png`
- motion check, torso mean |Δ|: quiet 6→6.3 **7.2** / 6→14 **17** · mix **19** / **35** · this **27** / **46**
- QA: **PASS w/ WARN** darkDwell 0.84 · macroMotion **0.030** (mix 0.015, quiet 0.010) · motionDensity 0.427 · hueJump95 22.0 · drift 0.128/0.205 · olive 0.079 · bleach 0 · seam 1.32 · staticZone 0.006
- judge: **HOLD Isaac** — belly, branches, and roots still read. Grain throw is the b1a10189 shuttle, larger. Color is the extreme fringe. Nothing held. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-07-r381-smooth | tree-woman — "질감이 너무 거칠어 … 매끈하고 선명하게"
- quote: **"질감이 너무 거칠어 전반적으로 좀 다듬어줘 매끈하고 선명하게"** → axis=DELTA, defects only. Micro down, band width up. Macro throw stays 140px, cycles stay. Not a new language.
- recipe: surfaceCycles 8→**3**, prism phaseScale 5.8→**2.2**, detailBoost 1.4→0.45, phaseFlow 18→10. Glow samples **flowField** (was phase-edge), sharpness 0.22/0.18, fieldCycles 0.7/1.05, strength still 0.78/0.5. chromaFlow detailGain 5→1.2, 8px→5px. Spectral 0.9/24→0.48/10. Dissolve wavelength 96→**200**, 24px→14px, edge 0.72. Transport micro 6px→**0**. Advection edgePreserve 0.38→0.6, detailGain 6→4. CA 0.11→0.04, bloom 0.42→0.18. phaseWarp 0.32→0.12. Contrast 1.08, grain 0.
- language-map: whole frame=L1+L3+L4+L6+L8+L10 · composed=L1+L4+L6+L8+L10
- preview: `out/layered/2026-10-07_r381-tree-woman-smooth-935c4549/r381-tree-woman-smooth-preview.mp4` (816×1456 · 20s · 15fps · silent)
- stills: `out/manual-runs/r381-tree-woman/stills/smooth/t6.png` torso=`…/stills/smooth/torso-row.png` vs-lsd=`…/stills/smooth/vs-lsd.png`
- QA: **FAIL seamRatio 1.58** (line 1.5). Other metrics PASS except darkDwell WARN. macroMotion **0.032** · motionDensity 0.454 · hueJump95 10.3 · drift 0.146/0.222 · olive 0.070 · bleach 0 · staticZone 0. The ratio rose because adjacent-frame grit dropped; t6/t14 show no spatial seam.
- judge: **HOLD Isaac** — body reads smooth, branch and belly edges stay sharp, color still travels. Nothing held. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-07-r381-rich | tree-woman — "b1a10189가 제일 맘에 들어. 조금만 다듬어 쫌만 더 화려하게"
- quote: **"이게 제일 맘에 들어. 이걸 조금만 다듬어줘 쫌만 더 화려하게"** on `…-b1a10189`. Not a full permit. axis=DELTA. Same map. Small amplitude only.
- recipe: restored the b1 scene, then sat 1→**1.14**, glow 0.24/0.14→**0.36/0.22** (speeds 9/14 unchanged, sharpness 0.38/0.30), phaseWarp 0.12→0.16, breath 0.032→0.04. Advection 44→52px, detailGain 2→2.4, edgePreserve 0.64. Bloom 0→0.10, CA 0→0.016. Prism cycles stay 0. L8 stays 0. Clamp 0.18. Contrast 1.04.
- language-map: whole frame=L1+L4+L6+L10 · composed=L1+L4+L6+L10
- preview: `out/layered/2026-10-07_r381-tree-woman-rich-eec235e2/r381-tree-woman-rich-preview.mp4` (816×1456 · 20s · 15fps · silent)
- stills: `out/manual-runs/r381-tree-woman/stills/rich/t6.png` vs=`…/stills/rich/vs.png` (left = b1a10189)
- QA: **PASS w/ WARN** hueJump95 3.79 · darkDwell 1.00 · staticZone 0.21 · lightStaticZone 0.25 · macroMotion 0.017 · drift 0.083/0.144 · olive 0.171 · bleach 0 · seam 1.29 · motionDensity 0.318
- judge: **HOLD Isaac** — wood figure is the b1 drawing, light and magenta a step richer. Nothing held. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-06-r379-v9 | palm-eye-vine — "프리즘 넣지말자 색순환만 넣자"
- quote: on v8. Read the contour bands (luma-keyed hue offset, the v6a look) as "prism" and dropped them. v8 already had `sourcePrism.amount 0` on every layer.
- recipe: `scene-v9.json` = v8 with field `luminanceKey 0`. The field's colour is now pure L9: colorCycle 16 on phase-beam, phaseAmount 1, greenCompress 0, clamp 1. Spatial motion (transport / dissolve / chroma / spectral / breath) unchanged.
- preview: `out/layered/2026-10-06_r379-palm-eye-vine-v9-5c5a146c/r379-palm-eye-vine-v9-preview.mp4`
- QA: grade ok · seam 1.12 PASS · lumFlicker 0.0006 · olive 0.067 PASS · hot 1.0 % · sat 0.614 (= source) · pumpShare 0.089 · macroMotion 0.0148 WARN · probe macro 3.72 · sourceColorDrift 0.201 / 0.45 FAIL (waived: L9 on field, v8 quote) · lotus / palm frame |Δ| 0.000
- judge: **HOLD Isaac**. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-06-r379-v10 | palm-eye-vine — "왼쪽 오른쪽 가장자리의 색 변화가 너무 인위적인데 마치 빛이 위라래로 흐르는거같은 느낌이 들어서 너무 구려"
- quote: on v9. 구려 on one region → kill L9 in that region class, keep the rest (`00` §4). The cause: `phase-beam` is a smooth radial ramp from the palm eye, so L9 hue rings expand outward. On the coherent vertical red-tulip columns at x < 0.06 / > 0.93 the rings travel up and down the column and read as light flowing (the r379 v3 L4 complaint again, now in colour).
- fix: new plate `scripts/locks/r379-build-edge-columns.mjs` (tulip class h ≥ 340 or ≤ 55, s ≥ 0.5, v ≥ 0.45, flood-filled from column seeds inside x < 0.085 / > 0.915, closed, 8 px margin, blur 6). New layer `edge-columns` at z 2 carries the v7c field animation (same transport / dissolve / chroma / spectral / breath, colorCycle 0, clamp 0.18), so the tulips ride the field's motion with their source red/orange. The hand hold moves to z 3. Over 4.0–5.0 s the edge-strip sequence shows the tulips red in every frame.
- recipe: `scene-v10.json` = v9 + the `edge-columns` layer.
- language-map: field = L9 + L8 + L6 + L10 · edge tulips = L8 + L6 + L10 (no L9) · figure held · pupil = L1 + L10
- preview: `out/layered/2026-10-06_r379-palm-eye-vine-v10-457f7ac2/r379-palm-eye-vine-v10-preview.mp4`
- QA: grade ok · seam 1.17 PASS · lumFlicker 0.0008 · olive 0.064 PASS · hot 1.9 % · sat 0.612 / 0.614 · sourceColorDrift95 0.162 PASS · local 0.378 FAIL (waived: L9 on field) · macroMotion 0.0120 WARN · probe macro 2.99 · lotus / palm |Δ| 0.000
- open: the thin bokeh strip between the tulips and the frame edge still cycles with the rings. The next move, if Isaac still sees edge flow, is to widen the column layer to the whole x < 0.085 band with a feathered silhouette, not a wall.
- judge: **HOLD Isaac**. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-06-r380 | palm-eye-lotus — "이걸로 다시 뽑아줘" (sister source of r379, sent after the r379 v10 preview)
- source: native 1632×2912 `sources/incoming/r380-palm-eye-lotus.png` (Downloads `monglong_a_flat_vector_illustration_featuring_a_pink_hand_with__49294a2c-….PNG`) sha256=`5658d6fe0f350010…`. Same layout as r379: palm pupil @0.502,0.527, wrist pupil @0.509,0.837, lotus on top, red tulip columns on both frame edges. The background is a denser pink/blue ray burst.
- hero: prepare `--hero beam@0.502,0.527`. Plates come from the r379 work-dir beam builder (radial from the palm eye, vine tangent), copied into the r380 work-dir with the path and wrist-eye changes. Session-plates pour cone not used.
- recipe: r379 `scene-v10.json` as is (`scene-v1.json`). Plates: `r379-build-hand-hold.mjs` (margin 6, `R379_FLOWER=1`; the lotus envelope fits unchanged), `r379-build-field-fill.mjs`, `r379-build-edge-columns.mjs`. One seed added to the hand hold at the wrist stub below the vine loop (0.5, 0.97): the loop cut it off on r380. On r379 the seed is a no-op (coverage 41.5 % before and after).
- language-map: field = L9 + L8 + L6 + L10 · edge tulips = L8 + L6 + L10 (no L9) · figure held · pupil = L1 + L10
- preview: `out/layered/2026-10-06_r380-palm-eye-lotus-ac0ab8e0/r380-palm-eye-lotus-preview.mp4`
- QA: grade ok · seam 1.23 PASS · lumFlicker 0.0008 · olive 0.062 PASS · bleach 0.022 PASS · sat 0.627 / 0.636 · sourceColorDrift95 0.172 PASS · local 0.386 FAIL (L9 on field, same as r379 v10) · macroMotion 0.0123 WARN · probe macro 3.07 · lotus / palm / wrist |Δ| 0.000
- judge: **HOLD Isaac**. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-06-r380-v2 | palm-eye-lotus — "대체로 맘에들어 전반적으로 너가 알아서 좀 다듬어줘"
- quote: on r380 v1. 맘에들어 + polish, so keep the direction and fix defects only.
- defect found: the wide hold (margin 6 ≈ 24 px + blur 10) kept a band of still source bokeh around the hand, fingers and lotus. It never took the field's colour cycle, so it stayed blue through every phase and read as a sticker outline. Checked across one cycle (7.0 / 7.3 / 7.6 / 7.9 s). Sampling 5 s apart hides it: 5 s is exactly 4 cycles at speed 16 / 20 s.
- fix: new plate `scripts/locks/r379-build-color-ring.mjs`. Ring = source RGB, alpha = wide hold × (1 − tight hold). It is a new `color-ring` layer at z 3 with the field's L9 cycle and every displacing motion off (transport, dissolve, spectral, chromaFlow, breath = 0), so it is in place (R-038). `colorMotionMask` is floor 0, saturation 1, so the pale light rim on the hand edge stays nearly still. The hand hold is rebuilt tight (margin 2) at z 4. The field-fill hole still comes from the wide hold (`hand-hold-wide.png`), so transport does not carry the rim off.
- recipe: `scene-v2.json` = v1 + `color-ring`. Build order: hold margin 6 → field-fill → copy to `hand-hold-wide.png` → hold margin 2 → color-ring.
- language-map: field = L9 + L8 + L6 + L10 · ring = L9 (in place) · edge tulips = L8 + L6 + L10 · figure held · pupil = L1 + L10
- preview: `out/layered/2026-10-06_r380-palm-eye-lotus-v2-4bc99a7e/r380-palm-eye-lotus-v2-preview.mp4`
- QA: grade ok · seam 1.23 PASS · lumFlicker 0.0008 · olive 0.064 PASS · bleach 0.024 PASS · sat 0.624 / 0.636 · sourceColorDrift95 0.174 PASS · local 0.388 FAIL (L9 on field, as v1) · macroMotion 0.0126 WARN · probe macro 3.13 · lotus / palm |Δ| 0.000, wrist 0.002
- left alone: tulip columns keep their form under transport. hot % 2.3 is at or below the source's 2.5 (no neon).
- judge: **HOLD Isaac**. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-06-r380-final | palm-eye-lotus — "풀버전 뽑아줘 '/Users/isaac/Downloads/Avalon & Stryker - Dusk Till Dawn.wav' 이거 3초부근에 여자 목소리 시작지점부터 넣어" → final + audio + lock
- quote: verbatim above → `isaac-pick.ts` (v2 preview, scene `3805895c…`, gate REJECT + humanOverride, audio `Dusk Till Dawn @0:02.55`).
- start (R-059: Isaac gave "3초부근"): measured, not guessed. The kick enters at ≈1.75 s. A harmonic stack up to 5 kHz with vibrato from ≈3.9 s (the female vocal) starts at ≈2.57 s. Its 2–5.5 kHz energy rises −46 → −35 dBFS over 2.55–2.66 s, and the mid (L+R) 250–3500 Hz band steps from −28 to −23 dBFS at 2.70 s while the side band stays flat. Cut at the start of the attack: **-ss 2.55**.
- final: `out/layered/2026-10-06_r380-palm-eye-lotus-final-e8c63e19/r380-palm-eye-lotus-final.mp4` (1632×2912 · 30 fps · 600 f · H.264) · **+audio** `…-final-with-dusk-till-dawn.mp4` (mux `-ss 2.55`, aac 320k, 20.0 s) · QA as preview: seam 1.17 · lumFlicker 0.0005 · olive 0.063 · bleach 0.024 · drift 0.176 PASS · local 0.389 FAIL (L9 field, waived as v1/v2) · hueJump95 16.6 WARN · macroMotion 0.0074 WARN · lotus / palm / wrist |Δ| 0.000.
- lock: `close-lock.ts` done. The plate chain needed args and env, which `rebuild-closed-lock` refuses (`node scripts/locks/<f>.mjs` only), so it lives in `scripts/locks/r380-build-plates.mjs`. The work-dir beam builder is now `scripts/locks/r380-build-beam-plates.mjs`, with the hero baked in. `r379-build-hand-hold` and `r379-build-field-fill` read `R379_HERO="cx,cy"` when there is no hero.json. `rebuild-closed-lock.ts --slug r380-palm-eye-lotus` reproduced flow-beam, phase-beam, hand-hold, hand-hold-wide, field-fill, color-ring, edge-columns, and phase-mix byte-identical, and the gate scene sha matched → **closed**.
- status: **closed**

#### CASE-2026-10-07-r382 | profile-eye — image only, first preview
- quote: none (image drop). axis=first look.
- source: native 1632×2912 session PNG sha256=`50f94dfa44a82d88316f79459d6f54580cb539c35f0a3aebfdfac80450b738ef` (chat JPEG 1121 unused). type=`figure-vivid` (rule 5; rule 3 allover does not match — the painted eye is the colour subject). M: satMean=0.7309 vivid=69.1% busyness=0.06 M5=texture greenRisk=false finishedVivid=0.9485 dark=38.4% figure=40% focal on the burst.
- hero: detector `beam` at 0.442,0.318 locked a speckle in the upper silhouette. Override `--hero beam@0.4498,0.5474:w0.92` on the painted pupil. session-plates pour cone replaced: radial-out from the pupil (`out/manual-runs/r382-profile-eye/build-beam-plates.mjs`). Hold = the two dark profiles. Pupil disk punched after the feather. Eye, burst, and liquid field are free.
- recipe: golden r221 composed. language-map: field=L1+L4+L6+L8+L10 · figure=L5 (textured hold) · composed=L1+L4+L5+L6+L8+L10. L3 baseline.
- preview: `out/layered/2026-10-07_r382-profile-eye-51ebf0e6/r382-profile-eye-preview.mp4` (816×1456 · 20s · 15fps · silent)
- stills: contact=`out/manual-runs/r382-profile-eye/stills/contact.png` subsec=`out/manual-runs/r382-profile-eye/stills/subsec.png` eye=`…/stills/eye-subsec.png`
- QA: **PASS w/ WARN** darkDwell 0.380 (source is 38% black) · macroMotion 0.034 · seam 1.06 · drift 0.100/0.225 · olive 0.043 · bleach 0.025 · motionDensity 0.463 · hueJump95 68.9 · deadZone 0 · staticZone 0
- judge: **HOLD Isaac**. Profiles stay black drawings. The burst and the liquid field radiate from the eye. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-07-r381-field | tree-woman — image only, sent to the r379/r380 session (field take)
- source: the same Downloads file as CASE r381 (sha256 `bcda386dcdf511f6…`, 816×1456), via the existing 2× `sources/incoming/r381-tree-woman.png` (`a93140b3…`). The r381 work-dir belongs to another session (5 previews, HOLD Isaac), so this take lives in `out/manual-runs/r381-tree-woman-field/` and does not touch it.
- hero: prepare `--hero beam@0.495,0.548`, the belly swirl (the womb as nexus). Plates: `scripts/locks/r381-build-beam-plates.mjs` (radial phase/flow from the belly, the r380 builder without the vine tangent, since green here is canopy and grass).
- hold: new `scripts/locks/r381-build-tree-hold.mjs`. Wood class h 8–42, s 0.30–0.68, v ≥ 0.40. The sunlit grass patches share the hue at s ≥ 0.75. Shaded wood (h 25–60, v 0.22–0.50) is allowed only inside the hip box (x 0.36–0.66, y 0.50–0.68), which closes the crotch triangle and the right hip. Flood from 11 body / arm / branch / root seeds, closed, holes filled, feathered. The belly core is punched smooth(24, 80) px so the hero travels on layer 0. The punch stays inside the body, so field transport (128 px) does not reach it. Coverage 19 %. The thin shaded branches inside the canopy are not held; they ride and cycle with the leaves.
- recipe: r380 `scene-v2.json` without `edge-columns`, godRays centre on the belly (`scene-v1.json`). Plate chain `scripts/locks/r381-build-plates.mjs`: beam → hold m6 → field-fill → wide → hold m2 → color-ring → hold m2 punched.
- language-map: field (canopy · sky band · grass) = L9 + L8 + L6 + L10 · ring = L9 in place · wood figure held · belly core = L1 + L10
- preview: `out/layered/2026-10-07_r381-tree-woman-field-c52cb238/r381-tree-woman-field-preview.mp4`
- QA: grade ok · seam 1.13 PASS · lumFlicker 0.0013 · olive 0.066 PASS (source 0.354) · bleach 0 · hot 0.4 % · meanL 62.2 / 61.9 · sat 0.732 / 0.796 · sourceColorDrift95 0.155 PASS · local 0.358 FAIL (L9 field, as r380) · darkDwell WARN (source black band) · macroMotion 0.0115 WARN · probe macro 2.83 · torso |Δ| 0.000
- judge: **HOLD Isaac**. No full, no audio.
- status: delivered-preview

#### CASE-2026-10-07-r381-vivid | tree-woman — "장난치나 인위적인 움직임 다 빼. [b1a10189] 이게 가장 맘에 들었어. 여기서 좀만 더 화려하게 싸이키델릭했으면 좋겠어"
- verdict on the field take (CASE r381-field): **rejected**. Radial L9 rings, transport and the field colour cycle read as artificial motion. Isaac's pick is the other session's `out/layered/2026-10-07_r381-tree-woman-b1a10189/` (single layer, L1 advection 44 px + glow 0.24/0.14 + breath, no colour cycle).
- method: copy the b1 work-dir to `out/manual-runs/r381-tree-woman-vivid/` (plates identical to the b1 export), `scene-b1.json` = the b1 scene. **Every motion uniform stays at the b1 value**; only colour and grade change.
- dead ends:
  - v1/v2: prism params with `radiusPx` 0 do nothing (the prism block runs only when radiusPx > 0 or |surfaceCycles| > 0.5).
  - v3/v4: radiusPx 2.5/5 enables the prism edge iridescence, but the prism mixes from unboosted `texColor`, so saturationBoost is lost. At full frame v4 was indistinguishable from b1 (sat 0.808).
  - `sourceColorClamp.maxDrift` exists in the schema only; no shader reads it.
- v5 (`scene-v5.json`): b1 + saturationBoost 1.35 · bloom 0.22 / r 0.45 / thr 0.68 · feedback 0.08 hueShift 0.01 · contrast 1.06 sCurve 0.06. Prism off, CA 0.
- preview: `out/layered/2026-10-07_r381-tree-woman-vivid-v5-49271783/r381-tree-woman-vivid-v5-preview.mp4`
- QA (b1 → v5): grade ok · sat 0.799 → 0.905 (source 0.796) · hot 0.2 → 1.5 % (under r366 B12's 2.9 %) · meanL 62.6 → 59.8 · |Δsrc| 18.5 → 20.5 · local|Δ| 1.31 → 1.36 · pumpShare 0.454 → 0.459 · qa-motion motionDensity 0.229 → 0.242, macroMotion 0.0104 → 0.0110 (WARN in both).
- Isaac on v5: "컬러가 너무 심심하고 단조로워". Saturation alone keeps the source's few hues, so it is still monotonous.
- v6a/v6b sketch: L3 chroma river (surfaceCycles 2/4, phaseScale 3/5.8). Many hues but muddy: phase-mix is high-frequency in the canopy and grass, so hue speckles average to mud.
- v7: colorCycle + luminanceKey/hueKey. **Refused by session-grade**: "colorCycle.speed must be 0 for figure-vivid" (R-018 enforced).
- phase textures cannot be swapped for a smoother one: uPhaseTex/uPhaseTex2 also drive b1's advection and glowWave2, so swapping them would change b1's motion.
- v8a/v8b sketch: L3, surfaceCycles 2, radiusPx 3, detailBoost 0.4, chromaCycles 3, satBoost 1.6. phaseScale 1 is one hue family per frame; **phaseScale 2 gives tree, sky band, canopy and ground different hues at once**.
- the contour lines in the sky band are already in b1 (its advection grain); the hue rotation only makes them more visible. v9 (edge prism off) shows the same lines, so they come from the phase texture, not the prism.
- v10 (`scene-v10.json`) = v8b + satBoost 1.8 + contrast 1.0 / sCurve 0.03, which lifts meanL 57.8 → 60.8.
- preview v10: `out/layered/2026-10-07_r381-tree-woman-vivid-v10-576950e6/r381-tree-woman-vivid-v10-preview.mp4`
- QA v10: grade ok · olive 0.074 PASS (source 0.354) · drift95 0.136 PASS · hueJump95 6.74 PASS · seam 1.42 PASS · lumFlicker 0.0019 · hot 0.3 % · meanL 60.8 / 61.9 · HSV sat 0.739 / 0.796 · local|Δ| 1.19 (b1 1.31) · macroMotion 0.0085 WARN (b1 0.0104)
- previews this source/session: 9 including sketches (over R-021's 6). Each was a single-knob diagnosis, not a retune.
- Isaac on v10: "괜찮은데 아직 조금 부족해 좀만 더 극적으로 다듬어줘". The direction holds; he wants more drama. Per the r366 lesson, drama comes from tempo, light and S-curve, not saturation.
- v11 (`scene-v11.json`) = v10 + surfaceCycles 2 → 3 · detailBoost 0.4 → 0.7 · glowWave 0.24/0.14 → 0.30/0.18 (b1's own light waves, same speeds and fields) · bloom 0.32 / r 0.5 / thr 0.62 · contrast 1.04 sCurve 0.08. No new motion language.
- preview v11: `out/layered/2026-10-07_r381-tree-woman-vivid-v11-af48f187/r381-tree-woman-vivid-v11-preview.mp4`
- QA v11: grade ok · olive 0.070 PASS · drift95 0.136 PASS · hueJump95 8.60 PASS (limit 9.86) · **seam 1.49 PASS (limit 1.5, re-check on the full render)** · lumFlicker 0.0024 · hot 0.4 % · meanL 57.9 / 61.9 · local|Δ| 1.48 · pumpShare 0.409 · macroMotion 0.0111 WARN
- Isaac on v11: "조금만 더 스피디하게".
- v12 (`scene-v12.json`) = v11 with every carrier ~×1.35, all still integer cycles. Advection cycles 2 → 3 (amplitude unchanged at 44 px) · glowWave speed 9 → 12 · glowWave2 speed 14 → 19 (still non-integer ratio, L4) · prism surfaceCycles 3 → 4.
- preview v12: `out/layered/2026-10-07_r381-tree-woman-vivid-v12-d4e05f27/r381-tree-woman-vivid-v12-preview.mp4`
- QA v12: grade ok · local|Δ| 1.48 → 1.84 · pumpShare 0.435 · seam 1.31 PASS · hueJump95 10.69 PASS (limit 12.78) · lumFlicker 0.0031 · olive 0.070 · drift95 0.137 · hot 0.4 % · meanL 57.9 · macroMotion 0.0142 WARN (up from 0.0111)
- Isaac on v12: "움직이는 폭도 조금만 더 크게".
- v13 = v12 + advection maxDisplacementPx 44 → 58: **no visible effect**. PSNR v12↔v13 39.6 dB. A 58 vs 150 px sketch differed by only 36.9 dB.
  - cause (layer.frag legacy advection): `edgePreservedSourceFlowDelta` scales the delta by (1 − edgePreserve·crossing), and a larger delta crosses more luminance, so amplitude limits itself.
  - cause: `sourceInteriorDetailWeight` zeroes support on coarse silhouettes (canopy, branches).
  - so on this recipe maxDisplacementPx alone is not the amplitude knob.
- v14 (`scene-v14.json`) = v12 + maxDisplacementPx 58 · edgePreserve 0.62 → 0.50 · breath amplitude 0.032 → 0.042 (the radial scale wave b1 already had, same period and frequency). PSNR v12↔v14 29.4 dB (visible). Torso and root crops show no smear of the drawing.
- preview v14: `out/layered/2026-10-07_r381-tree-woman-vivid-v14-72cab7bc/r381-tree-woman-vivid-v14-preview.mp4`
- QA v14: grade ok · motionDensity 0.251 → 0.273 · seam 1.34 PASS · hueJump95 10.74 PASS · lumFlicker 0.0031 · olive 0.069 · drift95 0.140 · hot 0.3 % · meanL 57.9 · macroMotion 0.0142 WARN (unchanged)
- Isaac on v14: "영상 시작되자마자 움직임이 시작되었으면 좋겠어 3초안에 비쥬얼 임팩트가 확 와야돼", then mid-turn: "색 3초주기로 순환해야돼".
- cause of the slow opening: the legacy advection clock `sourceFlowLoopProgress(t) = t − sin(2πt)/2π` (layer.frag) has speed 1 − cos(2πt). That is 0 at the loop start and end and peaks (2× mean) at 10 s, so the flow is almost still for the first ~3 s. The first frames also start with a cold multipass buffer (frame Δ 1.0 → 2.0 by frame 7).
- fix without a shader change (closed locks untouched): **rotate the seamless loop**. The opening is cut from old 8.6 s (frame 129 @ 15 fps): flow speed ≥ 1.87× mean for the first 3 s, the colour phase is exactly 3 cycles in (= the warm orange of old frame 0), and the feedback is warm. The new loop wrap is two consecutive source frames, so it is seamless. The old seam (seam 1.34) moves to new 11.4 s.
  - **Known gap**: the eased-clock lull (flow slow at old 17–3 s) now sits at new ~8–14 s. Colour, glow and breath keep moving through it.
  - the clean fix is an opt-in linear clock for legacy advection (integer cycles are already seamless). It needs schema + uniform + shader work.
- colour period: surfaceCycles 4 → **7** (20/7 = 2.86 s). Exactly 3 s is impossible on a 20 s loop with integer cycles (6 cycles = 3.33 s).
- v16 (`scene-v16.json`) = v14 + surfaceCycles 7. Raw render `out/layered/2026-10-07_r381-tree-woman-vivid-v16-a6d9e685/r381-tree-woman-vivid-v16-preview.mp4`. **Delivered** `…/r381-tree-woman-vivid-v16-open-preview.mp4` = raw rotated by 129 frames (ffmpeg trim + concat, x264 crf 14).
  - **the full render needs the same 8.6 s rotation** before the audio mux.
- QA v16-open: grade ok · seam 0.89 PASS · hueJump95 17.0 PASS (limit 21.4) · lumFlicker 0.0031 · olive 0.069 · drift95 0.139 · hot 0.4 % · meanL 57.9 · local|Δ| 1.95 · motionDensity 0.282 · macroMotion WARN
- judge: **Isaac pick v16-open** — "ㅇㅇ 풀버전으로 뽑고 /Users/isaac/Downloads/Ancestors.wav 이거 합쳐 맘에들어". The opt-in linear advection clock was offered but not applied: the full render is the approved v16 as previewed.
- status: delivered-preview → **closed**

#### CASE-2026-10-07-r381-final | tree-woman vivid v16 → final + audio + lock
- pick: `isaac-pick.ts` on scene `cdff731ee3432cd7` (= `scene-v16.json`), gate REJECT + override, audio `Ancestors @0:00.77`.
- audio start (R-059, measured): `Ancestors.wav` (44.1 kHz stereo, 5:21) is silent to 0.22 s with a −55 dB floor. The first attack is at 0.78 s (−49 → −36 dB over 0.75–0.80 s), reaching −21 dB by 1.05 s. Cut at the attack so the sound lands on frame 0: **-ss 0.77**.
- final: export `--full-res` → `out/layered/2026-10-07_r381-tree-woman-vivid-final-8e878db7/r381-tree-woman-vivid-final-raw.mp4` (1632×2912 · 30 fps · 600 f).
  - rotated by 258 frames (8.6 s, as the preview) with ffmpeg trim + concat, x264 crf 12 → `…/r381-tree-woman-vivid-final.mp4`.
  - **+audio** `…/r381-tree-woman-vivid-final-with-ancestors.mp4` (aac 320k 48 kHz, 20.0 s; first 100 ms −37.5 dB → −21 dB by 0.5 s).
- QA final (rotated): seam 0.98 PASS · lumFlicker 0.0017 · hueJump95 9.41 PASS · olive 0.069 · bleach 0 · drift95 0.138 PASS · motionDensity 0.287 · macroMotion 0.0082 WARN · darkDwell WARN (source black band).
- lock: `close-lock.ts --slug r381-tree-woman` → closed (REJECT + Isaac override); the notes carry the rotation and the audio offset. `rebuild-closed-lock.ts --slug r381-tree-woman`: no custom plates, scene sha matches gate → verified.
  - **incident**: rebuild-closed-lock scaffolds into the fixed `out/manual-runs/<slug>`, which was the other session's live r381 work-dir. It rewrote `scene.json` and `scaffold-manifest.json` there; `source.png`, `analysis.json` and `layers/*` were rewritten with identical bytes. Restored `scene.json` from that session's last export (`out/layered/2026-10-07_r381-tree-woman-clear-55965d2d/scene.json`, sha `a96b8a19…`, exported 11:05 right after its 11:04 session-grade) and `scaffold-manifest.json` from the 11:32 copy. **Rule: before running rebuild-closed-lock, check that `out/manual-runs/<slug>` is not another session's live work-dir.**
  - rebuild-closed-lock only reproduces the 20 s render; the 8.6 s rotation and the audio cut are delivery steps recorded in the lock notes and the finals row.
- status: **closed**


#### CASE-2026-10-07-r383 | mushroom-hand — image only, then "이건 움직임 주지말고 기존에 작업했던 방식으로 뽑자"
- source: `~/Downloads/monglong_studio_A_blue_hand_with_mushrooms_growing_on_it_reachi_8067f6b3-… 2.PNG` (sha256 `a7479850…`) → Lanczos 2× `sources/incoming/r383-mushroom-hand.png` 1632×2912 (sha256 `db37a91a87a2797a…`). M: satMean 0.587 · vivid 53.7% · dark 20.8% · greenRisk false · figure 40% · finishedVivid 0.257. A pale hand pinches a mushroom forest in front of a tie-dye zoom burst, with a black tree line at the bottom.
- field take (v1, v2), **dropped by Isaac before he saw it**: r380 stack (still source / field-fill with radial transport and colorCycle 7 / colour ring / hold). Hero override `beam@0.56,0.56`, moved off `0.515,0.555` because that point sat on the right stem pair.
  - The hold is a traced envelope for the hand and forest (`scripts/locks/r383-build-hand-hold.mjs`). Pixel classes failed there: blurred sat was 0.3–0.6 on both the caps and the tie-dye.
  - v1 held the whole envelope, so the forest read as a box of source colour against the cycling field.
  - v2 (`bodies=1`) held only the lit tan caps/stems, the pinched cap and the hand; the trees came from a dark flood.
  - `r379-build-field-fill.mjs` gained `R379_HERO=none` (no pupil to close when the hero is in the open field).
  - Previews: `out/layered/2026-10-07_r383-mushroom-hand-f521cf97/` (v1 QA FAIL: olive 0.0605 > 0.0584 and localDrift 0.477) and `…-v2-742d6a06/` (not sent). Scenes are in `out/manual-runs/r383-mushroom-hand/archive-field/`.
- Isaac: "이건 움직임 주지말고 기존에 작업했던 방식으로 뽑자" → the r381 v16 method (the last approved: single layer in place, L3 surfaceCycles 7 ≈ 2.9 s colour, advection 58 px / edgePreserve 0.5, glow 12/19, breath 0.042, no field or transport).
  - Re-prepared with `--hero form@0.70,0.17` (no travel hero in that method).
  - `scene-v3.json` = `recipes/locks/r381-tree-woman.json` verbatim; session-grade OK (L1+L3+L4+L10, composed 5).
- preview v3: `out/layered/2026-10-07_r383-mushroom-hand-v3-c5d4b309/r383-mushroom-hand-v3-preview.mp4`.
  - Delivered `…/r383-mushroom-hand-v3-open-preview.mp4`: rotated 129 frames (8.6 s) so it opens at the advection peak (memory: reel opening). 129 f ≈ 3.01 colour periods, so the colour phase is kept.
- QA v3: **PASS w/ WARN** macroMotion 0.023 · seam 1.36 · hueJump95 18.0 · olive 0.0575 · bleach 0.007 · drift95 0.137 / local 0.237 · motionDensity 0.54 · staticZone 0.015. probe: sat 0.614 (src 0.569) · hot% 2.9 · pumpShare 0.405 (r381 v16 0.404).
- known weak spot: the global prism rotation pumps frame sat 0.50 ↔ 0.70 on the 2.86 s period. The source is red/magenta-dominated and phase-mix std is only 0.106 (× phaseScale 2), so the whole frame passes a muted pink-grey phase together (first at ≈ 2.2 s after the open).
  - Lever if Isaac says 탁하다: wider prism phase spread (phase-luminance std 0.258 or phase-radial 0.234 on phaseField2). Not tried: the ask was the existing method as-is.
- status: superseded by v6c (below).
- Isaac on v3: **"움직임 아예 주지마, 그리고 내가 지금까지 맘에 들었던 작업물들 전수 분석하고 다시 뽑아봐"**.
  - v3 still carried the r381 lock's motion: advection 58 px, breath 0.042, feedback zoom 1.006, cameraDrift 0.01, phaseWarp 0.12.
- taste audit, written up:
  - Every approved final/preview, with lock params and Isaac's verbatim quotes.
  - Colour stats measured on 16 final MP4s (scratchpad `taste/measure.mjs`, 72×128 @ 10 fps).
  - Findings:
    - Frame saturation is flat over time on most finals: ±0.003–0.007 on r343/r344/r345/r357/r362/r366/r367/r370/r372. The largest swings are r381 ±0.051, r342 ±0.050 and r325 ±0.040; **r383 v3 ±0.070 was the worst**.
    - Hue variety per frame is ≈ 3.0–3.4 bits, except gold-dominant r366/r370.
    - The works closest to zero displacement are all UV-fixed in-place prism colour: r343 "이게 제일 낫다 다른거 다 아주 별로야", r345, r344, r221, r242, r274.
    - Colour must not travel in a direction (r379 v10 "빛이 위라래로 흐르는거같은 … 구려", r325 "빛이 위로만", r381-field).
    - No whole-frame pump (r366 B10→B12).
    - Glow waves read as 인위적 (r379).
    - Grain at high surfaceCycles ("노이즈 낀거같아" ×4).
- root cause of the v3 muted phase:
  - `clampSourceColorDrift` (maxDrift 0.18) pulls a rotated colour back along the line to the source.
  - Near a 180° rotation that line passes through grey.
  - phase-mix (std 0.106) × phaseScale 2 puts the whole frame near the same rotation at once, so it greys together.
  - Spreading the phase removes it.
- test renders (not sent):
  - v4 phase-beam ps1: radial rings, so directional, and still ±0.055.
  - v5 two-layer colorCycle on phase-beam: radial rings, not rendered.
  - v6b phase-mix ps4: ±0.013, but confetti grain on the skin at 1:1.
  - **v6c phase-luminance ps2**: ±0.016, hue follows the drawing's light bands, smoother.
- **preview v6c**: `out/layered/2026-10-07_r383-mushroom-hand-v6c-8520f6d2/r383-mushroom-hand-v6c-preview.mp4`.
  - `scene-v6c.json` = r381 v16 colour block (prism s7 c3 r3 detail 0.7, sat 1.8, clamp 0.18, bloom 0.32/0.62, contrast 1.04, sCurve 0.08) + phaseField2 `phase-luminance.png`.
  - Zero displacement: advection, breath, phaseWarp, glow, prism phaseFlow, feedback (strength 0, zoom 1), cameraDrift and CA all 0.
  - No loop rotation is needed: there is no eased flow clock, and frame 0 is already in full colour.
  - Ceiling: `ceiling-waiver.json` binds Isaac's verbatim quote to the scene sha (no motion languages by his words).
- QA v6c: **PASS w/ WARN** macroMotion 0.006 (zero motion by design) · seam 1.30 · lumFlicker 0.0003 · hueJump95 17.1 · olive 0.0524 · bleach 0.014 · drift95 0.096 / local 0.184 · staticZone 0.029. probe: sat 0.584 (src 0.569) · hot% 1.5 · sharp 0.99 · **pumpShare 0.066** (v3 0.405).
- status (v6c): delivered-preview, superseded.
- Isaac on v6c: **"훨씬더 스피디하고 다이나믹해야돼"**, with zero displacement still standing.
  - Speed comes from colour period and light, not motion.
- v7a (not sent): prism s14 c5 ps2, glow 0.30@16 / 0.20@24, sCurve 0.12. hueSpd 153 °/s · lumSpd 18.2.
- **preview v7b**: `out/layered/2026-10-07_r383-mushroom-hand-v7b-29e7d0f4/r383-mushroom-hand-v7b-preview.mp4`.
  - `scene-v7b.json` = v6c + prism surfaceCycles 20 (≈ 1 s hue period), chromaCycles 7, phaseScale 2.5.
  - In-place light shimmer: glowWave 0.35@20 / glowWave2 0.22@30 (integer per loop). Both glow phases sit on `phase-luminance.png` (phaseField too), so the light pulses on the drawing's own value bands instead of travelling from an edge.
  - filmGrade sCurve 0.12.
  - Displacement is still 0 everywhere; the waiver was re-bound to the v7b sha.
- v6c → v7b: hueSpd 77 → **212 °/s** · lumSpd 4.6 → **24.1** · sat ±0.016 → ±0.021 · pumpShare 0.066 → 0.146 (v3 0.405) · hot% 1.5 → 0.6 · sharp 0.99.
  - At 1:1 (frame 40, mushroom crop vs source and v6c), no grain is added beyond the source's own spotted caps and radial brush strokes.
- QA v7b: **PASS** lumFlicker 0.0027 · hueJump95 46.3 ≤ 47.8 · olive 0.048 · bleach 0.018 · drift95 0.098 / local 0.182 · seam 1.06 · staticZone 0.028 · macroMotion 0.037.
- risk: glow was called 인위적 on r379, where it travelled. Here it is in place on the light bands. If Isaac reads it as artificial anyway, v7b with glow 0 keeps the s20 colour speed.
- R-021: preview count overran (exports v1–v4, v6b, v6c, v7a, v7b). Only v3, v6c and v7b were sent.
- status (v7b): delivered-preview, superseded.
- Isaac on v7b: **"뭔가 좀더 불규칙했으면 좋겠어 요소들이"**.
  - v8a/v8b (not sent): `phase-elements.png` (`scripts/locks/r383-build-element-phase.mjs`). It gives one random value per hand-hold component, cap-sized value noise inside each element, and slow blobs in the tie-dye.
  - The prism morphs between this field and luminance: `phaseMix` 1, `phaseFlowCycles` 3 → 7, `phaseFlowPx` 0. The result is a per-element colour tempo of base ± ~80 %, with no displacement.
  - glow 17/29 (coprime).
  - The tempo metric (scratchpad `taste/irreg.mjs`) barely moved, 0.82 → 0.96, because greenCompress noise sets the floor. Frame strips do not show tempo.
- Isaac sent a reference frame (Image #6, a symmetric ornamental face): **"이거 한프레임씩 전수 분석해봐 이런느낌으로 못해 ?"**. No video file was on disk, so the frame was read by eye:
  - a luminance gradient map with ~2–3 palette wraps, so every line and ring gets its own band;
  - warm palette: pink ≫ orange > yellow > lime, with thin cyan and violet;
  - value flattened bright, no black, with dark violet line work.
- v9a (not sent): prism off, `paletteAmount` 1 with an IQ palette fitted to that hue mix (scratchpad `taste/palfit.cjs`: A [.688,.445,.429] B [.677,.384,.394] C [1,1,1] D [.127,.177,.093]), `phaseField` = `phase-luma-s1.5.png` × phaseAmount 3, colorCycle 20, clamp off.
  - It read like the reference, but the hand lost its form and the black areas became flat cycling pink.
- Isaac: **"이건 너무 극단적이잖아 너가 최종적으로 좀 다듬어봐 내 스타일에 맞게"**. The full repaint was dropped. The reference's idea (colour split by the drawing's own detail, elements out of step) went back into the in-place prism.
  - v10a: v8b + phaseField2 = `phase-luma-s2.5.png` (`scripts/locks/r383-build-luma-phase.mjs`), ps 2, phaseFlowCycles 5, clamp 0.22. Rejected: sat ±0.036, a frame-wide pump.
  - v10b: ps 3 → ±0.019.
  - v10c: ps 2.5, clamp 0.18 → ±0.022 but less hue variety (hueEnt 2.94).
  - **v10d**: v10b with `phase-luma-s4.png`. The hand at 1:1 matches v10b, and the striation is the source's own brush texture.
- **preview v10d**: `out/layered/2026-10-07_r383-mushroom-hand-v10d-adc8629d/r383-mushroom-hand-v10d-preview.mp4`.
  - Prism s20 c7 ps3, phaseField2 `phase-luma-s4.png`, phaseField `phase-elements.png`, phaseMix 1, phaseFlowCycles 5, phaseFlowPx 0, clamp 0.22.
  - glow 0.35@17 / 0.22@29, sCurve 0.12, bloom 0.32.
  - Zero displacement. The waiver is re-bound to the v10d sha.
- v7b → v10d: hueEnt 3.03 → **3.11** · hueDom 0.55 → 0.50 · hueSpd 212 → 216 °/s · sat ±0.021 → ±0.018 · pumpShare 0.146 → 0.196 · hot% 0.6 → 1.2 · sharp 0.98.
- QA v10d: **PASS** lumFlicker 0.0036 · hueJump95 48.0 ≤ 48.8 (tight) · olive 0.044 · bleach 0.029 · drift95 0.112 / local 0.209 · seam 1.15 · staticZone 0.023 · macroMotion 0.034.
- R-021: preview count overran further (v8a, v8b, v9a, v10a–d exported). Only v10d is sent.
- status: delivered-preview → **closed** (below)

#### CASE-2026-10-07-r383-final | mushroom-hand v10d → final + audio + lock
- pick: **"ㅇㅇ 풀버전으로 뽑고 음악 합쳐 '/Users/isaac/Downloads/Great Spirit.wav'"** → `isaac-pick.ts` on scene `7a93bffbb2cd34b0` (= `scene-v10d.json`), gate REJECT + override, audio `Great Spirit @0:00.06`.
- audio start (R-059, measured): `Great Spirit.wav` (44.1 kHz stereo, 3:35.8) is silent to 0.05 s (−80 dB). The attack is at 0.06–0.07 s (−57 → −30 dB), and the track is at −15 dB by 0.12 s. Cut at the attack: **-ss 0.06**.
- final: export `--full-res` → `out/layered/2026-10-07_r383-mushroom-hand-final-7dab020f/r383-mushroom-hand-final.mp4` (1632×2912 · 30 fps · 600 f · H.264). No loop rotation: there is no eased flow clock, and frame 0 is already in full colour.
  - **+audio** `…/r383-mushroom-hand-final-with-great-spirit.mp4` (video copy, aac 320k 48 kHz, 20.0 s; first 10 ms −57.7 dB → −30 dB, −17 dB by 50 ms).
- QA final: **PASS w/ WARN** macroMotion 0.0203 (zero motion by design) · lumFlicker 0.0018 · hueJump95 24.4 ≤ 25.1 · olive 0.043 · bleach 0.030 · drift95 0.113 / local 0.209 · seam 1.09 · staticZone 0.024 · motionDensity 0.305.
- lock: `close-lock.ts --slug r383-mushroom-hand --plates "node scripts/locks/r383-build-plates.mjs"` → closed (REJECT + Isaac override).
  - The wrapper was rewritten from the dropped field-take chain to the v10d chain: hand-hold margin **1** bodies 1 → phase-elements (seed 383) → phase-luma-s4.
  - The first draft used margin 2 and did not reproduce the approved hold. The approved margin was found by searching margins 1–6 against the backup. All three plates now rebuild byte-identical.
  - `rebuild-closed-lock.ts --slug r383-mushroom-hand`: the scene sha matches the gate. hand-hold, phase-elements, phase-luma-s4, flow-field, source and scene.json are byte-identical to the pre-rebuild backup (the work-dir is this session's own).
- status: **closed**

#### CASE-2026-10-07-r384 | skeleton-mushroom — image only
- source: chat image only (Image #7, 1121×2000 JPEG, sha256 `aad24f3bddb60662…`). It was extracted from the session transcript, because no file is in Downloads. Lanczos to `sources/incoming/r384-skeleton-mushroom.png` 1632×2912 (sha256 `0e642c5c758ef305…`).
  - The picture: a skeleton with a red brain sniffs glowing orange mushrooms in its palm, painted in oil-swirl strokes against a grey wall with colour smoke at the edges.
  - M: lum p50 0.28 / p95 0.46 · satMean 0.53 · vivid 41 % · dark 16.9 % · hues red 355/5/345 · greenRisk false · finishedVivid 0.41.
  - **The native PNG is not on disk.** For the final, Isaac can drop the original file and the same scene will be re-rendered from it.
- prepare: recipe `recipes/locks/r381-tree-woman.json`, `--hero form@0.74,0.45` (the mushrooms in the palm). Composed scene kept as `scene-prepare-composed.json` (L1+L3+L4+L8+L10).
- method (no words from Isaac on this image): his two latest approvals combined.
  - **Motion** = r381 v16 in-place advection along the stroke flow: 58 px fieldAlign 1, breath 0.042, phaseWarp 0.12, feedback 0.08 / zoom 1.006, cameraDrift 0.01. The ceiling holds with no waiver.
  - **Colour** = r383 v10d: prism s20 c7 ps3, phaseMix 1 / phaseFlowCycles 5 / phaseFlowPx 0, clamp 0.22, glow 0.35@17 / 0.22@29, sCurve 0.12.
  - A zero-motion take like r383 needs Isaac's own words for a waiver.
- plates:
  - `scripts/locks/r384-build-element-phase.mjs`: colour k-means k 6 → connected regions. Those of 150 px – 6 % of the frame (at ¼ res) each get one random value plus cap-sized noise; the grey wall and speckle keep slow blobs. 101 elements.
  - `r383-build-luma-phase.mjs <wd> 4 clahe`: the new `clahe` option runs CLAHE then histogram equalisation. r383's no-arg output is still byte-identical.
- v1: phaseField2 `phase-luma-s4` (std **0.118**: the source sits in luma 0.04–0.46).
  - pumpShare **0.390**, sat ±0.023, and the grey wall moved as one value.
  - QA **FAIL oliveDwell 0.054** (source 0.009): dark grey rotating through yellow.
- **v2**: phaseField2 `phase-luma-s4-clahe` (std 0.272) + greenCompress 0.52 → 0.65.
  - pumpShare **0.151** · sat ±0.017 · val ±0.011 · hueEnt **3.33** · hueDom 0.30 · hueSpd 273 °/s · hot 0.1 % · sharp 1.05.
  - QA PASS w/ WARN darkDwell (dark source): olive 0.0455 · hueJump95 53.8 ≤ 59.6 · lumFlicker 0.0025 · drift95 0.108 / local 0.185 · seam 0.99 · macroMotion 0.033.
- delivery rotation: the advection clock (speed 1 − cos 2πt) peaks at t = 0.5, and the s20 colour is vivid at every phase. The open starts at **10.0 s** (preview frame 150 @ 15 fps; the full render needs frame 300 @ 30 fps).
  - Delivered `out/layered/2026-10-07_r384-skeleton-mushroom-v2-0b84a455/r384-skeleton-mushroom-v2-open-preview.mp4` (trim + concat, x264 crf 14): seam 1.00 PASS, olive 0.045.
- judge: Isaac **"너무 구리다 이번꺼 폐기해"** (no reason given).
  - Deleted: work-dir, both renders, the incoming PNG and `r384-build-element-phase.mjs`.
  - The `clahe` option was taken back out of `r383-build-luma-phase.mjs`; r383 phase-luma-s4 is still byte-identical.
- learning: r381 motion + r383 v10d colour on a dark, oil-swirl, grey-walled figure = rejected outright.
  - The r383 colour block is not a general recipe. Do not reuse this combination on a similar source without Isaac's direction.
- status: **killed**

#### CASE-2026-10-08-r385 | xray-mushroom — image only
- source: Isaac dropped Image #8 with no words: a colourful x-ray drawing of a skinny figure that sniffs a glowing amanita held in its hand, with spectral rays on a dark field.
  - Native PNG `~/Downloads/monglong_studio_a_colorful_x-ray_drawing_…a4591ce3….PNG`, which is `<wd>/source.png` (sha256 `e837639311199412…`).
- plates: `scripts/locks/r385-build-beam-plates.mjs`.
  - figure-hold = the x-ray body as source pixels (luma opening drops the rays).
  - flow-beam = radial from nexus (0.241, 0.340), the least-squares convergence of the streaks.
  - phase-beam = distance from the nexus.
- method: two layers. L0 is the field with in-place advection along the rays. L1 is the figure with in-place prism s12 ps1.2 and clamp 0.3. Everything else in the colour path is neutral.
- colour skew found on the way (v1–v3c; isolated with short low-res sketches, one effect off at a time):
  - filmGrade sCurve/contrast and the multipass-feedback saturation floor tinted the white x-ray bone.
  - Final values: filmGrade contrast 1 · sCurve 0, feedback 0.
- olive (v3e–v3g FAIL 0.0501–0.0506, source 0.033): half the olive pixels are dark (v < 0.5) and half low-sat. The clamp drags rotated colours through grey.
  - greenCompress does not help here. The OKLCH squeeze moves the green arc toward teal and stretches orange/yellow (0–100°) up into yellow-green, so 0.52 → 0.8 changed nothing.
  - Fix: L1 clamp 0.22 → **0.3**, sat 1.3 → 1.4, gc back to 0.52 → olive **0.048** PASS.
- double skull contour (v3h–v3j): **L0 breath 0.032 @2** zoomed only the field layer. Its copy of the skull rim slid outside the static hold.
  - Changing advection (56 → 32 px, edgePreserve 1) or CA (→ 0) left that frame pixel-identical.
  - Fix: L0 breath = L1 breath (0.004 @0.8), CA 0 like r366/r381/r383 → seam 1.04 → **1.0006**.
- **v3k** (scene sha `ab9427f2310e79df`): session-grade ok (composed L1 L4 L6, no waiver).
  - QA PASS w/ WARN macroMotion 0.014: olive 0.048 · hueJump95 27.0 ≤ 29.3 · drift95 0.089 / local 0.23 · seam 1.0006 · neon 0 %.
  - Delivered rotated to open at **10.0 s** (advection peak; preview frame 150 @ 15 fps, full = 300 @ 30 fps): `out/layered/2026-10-08_r385-xray-mushroom-v3k-0ceb460b/r385-xray-mushroom-v3k-open-preview.mp4`, seam 1.0018 PASS.
- judge v3k: Isaac **"백그라운드 배경이 너무 심심해"**. The figure was not criticised, so the figure layer is unchanged.
- why the field was flat: it read source pixels (near-black teal smoke). Glow is multiplicative, and with prism amount 1 the HSV path (valueLift/sat) is overwritten by `mix(texColor, prismRgb)`.
- plates: `scripts/locks/r385-build-field-plates.mjs <wd> 1 0.5 2.2 10 0`.
  - field-lift = CLAHE (96 px tiles, slope 10) × 2.2 outside the body, so the smoke becomes a visible nebula.
  - hold-lift = field-lift under the hold alpha. Without it, the hold rim carried the old dark field as a dark outline.
  - cloud-layer = field-lift with alpha = soft lifted luma, kept clear of the body (hold blur 20 × 2).
  - phase-field-bg = 0.5 smoke luma bands + 0.5 nexus distance, blur 8, **histogram-equalised over the field**.
- olive on a dark field (v4–v7, all field-only): OKLab rotation keeps L, so mid-dark teal turned yellow reads brown/olive (QA counts any v < 0.5 at hue 60–110).
  - Full rotation: field olive 0.026–0.029. gc only moves the olive time share 9 % → 6 % (oklch or hsv band).
  - Partial prism (0.5) is worse, 0.043: the RGB mix of teal and orange is muddy.
  - Neutral gaps: the encoder's chroma noise gives them a random hue, so 0.025.
  - colorMotionMask cannot select bright clouds: its lumMask is `1 − smoothstep(0.58, 0.92)` (it protects highlights).
- fix = **palette cloud layer** (layers[1], role midground). R-018 forbids colorCycle only on layers[0], and layers[0] keeps a no-op prism.
  - Cosine palette searched so that s ≥ 0.45 and v ≥ 0.55 at every t, and the hue never enters 35–135°: A (0.794, 0.383, 0.717), B (0.687, 0.165, 0.556), C 1, D (0.579, 0.614, 0.064).
  - The palette path is blue → violet → magenta → red → orange and back, never yellow-green.
  - colorCycle 3 / 20 s, desync 0.25 @2, phaseAmount 2.5, luminanceKey 0. luminanceKey 0.5 had put CLAHE noise into the phase and cut jagged colour edges. paletteSatFloor 0.6, valueFloor 0.12.
- v8c → v8d: valueFloor 0.25 → 0.12 brought local drift from 0.315 FAIL to 0.275. Phase equalisation brought pumpShare from 0.243 to 0.143.
- **v8d** (scene sha `88e6973111dd5eda`): session-grade ok.
  - QA PASS w/ WARN macroMotion 0.021: olive 0.043 (field 0.0006) · drift95 0.143 / local 0.275 · hueJump95 26.1 · seam 1.04 · neon 0 % · hot 0.1 %.
  - Delivered open @10.0 s: `out/layered/2026-10-08_r385-xray-mushroom-v8d-1755e88c/r385-xray-mushroom-v8d-open-preview.mp4` (seam 1.09 PASS).
- Isaac **"내 취향에 완벽히 맞는지 너가 스스로 검증, 판단해. 이게 최선인지"** → self-audit of v8d against the approved finals (r366/r372/r380/r381/r383), same probes.
  - **hueDom** (mean resultant of sat×val-weighted hue): every approved output ≥ 0.35 and ≥ ~its source. v8d 0.26 < source 0.39. The bg palette dropped the source's own field hue: the bg is cyan 50 % + azure 40 %, and the palette had no teal. That is a repaint, not an animation.
  - **bg tempo**: colorCycle 3 → 6.7 s. Isaac's preference is ~3 s (r381).
  - **meanL**: v8d is +10 over the source, where every approved output is ≤ source. This was kept as the requested bg lift (dark 23 % → 1.9 %).
  - **brain olive**: the hold prism passes the crimson brain through olive for ~⅓ of each 1.67 s cycle. Worst 4×6-cell olive peak is 0.17, the same as r383 final 0.17 (r366 0.30, r381 0.44), so this is inside the approved range and was not chased.
  - Detail-band phase on the hold (luma-s4 ×3 / luma-s12 ×2, phaseMix 1, flow 5) was **rejected**. Brain olive mean was unchanged (0.058), the cell peak got worse (0.22), the vivid share dropped, and the x-ray went pastel and confetti-like. The r383 band trick needs flat drawn regions.
- v9d = v8d plus a teal-anchored palette, A (0.318, 0.376, 0.766), B (0.508, 0.544, 0.277), D (0.118, 0.592, 0.573). Its hue path is magenta → violet → azure → cyan and back, avoiding 35–135°. colorCycle 7 (2.9 s).
  - The cyan↔red variant (v9e) put red bg against the figure's red rims and read as a halo.
  - Metrics: hueDom 0.37 · pumpShare 0.140 · meanL +7 · sat 0.547 ± 0.011.
- **v9d** (scene sha `eec55edbe0e4e705`): session-grade ok.
  - QA PASS w/ WARN macroMotion 0.021: olive 0.043 · drift95 0.132 / local 0.249 · hueJump95 25.7 · seam 1.03.
  - Open @10.0 s: `out/layered/2026-10-08_r385-xray-mushroom-v9d-f86397e3/r385-xray-mushroom-v9d-open-preview.mp4` (seam 1.11 PASS).
- Isaac **"배경에 패턴이 좀 들어갔으면 좋겠어"** (after the v8d/v9d report) → bg-only pattern on v9d. The figure (layers[0] and [2]) is unchanged.
  - B contour: cloud-palette `phaseAmount` 2.5 → 4 (schema max is 4) and `paletteC` [1,1,1] → [3,3,3]. That gives 12 palette loops across the equalised smoke+nexus phase, so the hue bands become iso-lines.
    - colorCycle 7 → 2, so the field runs 6 palette loops per 20 s (3.3 s) and loops seamlessly (speed × C is an integer).
    - The ray streaks around the mushroom turn into eye-shaped contour loops, and the bands travel outward. This is not a spin.
  - C interference was weak: the r353 v4 sky L4 (0.82/3 : 0.52/5, sharpness 0.22/0.18, fieldCycles 1.85/3.1, warp 0.36) on the cloud layer looked almost identical to v9d. D (B+C) was ≈ B and darker. Both were dropped.
  - L8 marble on the cloud layer was not tried. Displacing only layers[1] would ghost against the advected layers[0] clouds (same failure as the breath-mismatch ghost).
- **v10b** (scene sha `890dc4b2bde7850f`): session-grade ok.
  - QA PASS w/ WARN macroMotion 0.0195: olive 0.043 · drift95 0.126 / local 0.237 · hueJump95 25.8 · seam 0.99.
  - Metrics: hueDom 0.39 (= source) · pumpShare 0.140 · sharp 1.25.
  - Open @10.0 s: `out/layered/2026-10-08_r385-xray-mushroom-v10b-641a464c/r385-xray-mushroom-v10b-open-preview.mp4` (seam 1.02 PASS).
- judge v10b: Isaac **"마음에들어 너가 자율적으로 다듬어줘"**. That is a pick plus polish = defects only (00 §4). No full render was made, since 풀렌더 was not said.
  - **Grey disc in the gills** (since v3k):
    - The nexus hole in figure-hold (26×22 px, kept so the hero is never held) showed L0 at the advection singularity. At the hero point that is light grey, pulsing 205–250 against pink-white gills.
    - Fix: `scripts/locks/r385-build-beam-plates.mjs` shrinks the hole to 5×4.5 px. Hold alpha at the hero pixel is still 0, so session-grade is ok.
  - **Contour rings on the cap top** (new in v10b):
    - The crimson cap top (148, 17, 43) has luma ≈ 0.23. It fell out of the luma > 0.22 mask at ¼ res, so hold alpha was 0.14, and the cloud layer (α 0.2–0.6) painted 12-loop rings onto the hero.
    - Fix: the hold mask also takes vivid pixels (max > 110 and s > 0.6). That adds 0.18 % of the frame: the cap top plus one red notch on the right body edge. Nothing was removed.
    - Field plates were rebuilt with the same args.
  - **Not changed:**
    - Band density: 10 % of cloud area has a period under 16 px, around the hand–body gap and left of the cap. It reads as oil slick, not 자글자글.
    - Brain olive is inside the approved range.
    - 8-bit phase stepping: 12 loops / 255 levels ≈ 17° per level, which shows as faint blocky plateaus in dark bands. The real fix is a 2-byte phase decode in `layer.frag`: `dot(tex.rg, vec2(65280, 255) / 65535)` is the identity for greyscale plates and linear, so it is bilinear-safe. That is a shared-shader change, so it needs Isaac's yes.
- **v10e** (scene = v10b, sha `890dc4b2bde7850f`; plates rebuilt): session-grade ok.
  - QA PASS w/ WARN macroMotion 0.0195: olive 0.043 · drift95 0.126 / local 0.238 · hueJump95 25.8 · seam 0.99.
  - Metrics: hueDom 0.39 · pumpShare 0.141.
  - Open @10.0 s: `out/layered/2026-10-08_r385-xray-mushroom-v10e-14fe5b2c/r385-xray-mushroom-v10e-open-preview.mp4` (seam 1.01 PASS).
- status: polished preview delivered → **closed** (see r385-final)

#### CASE-2026-10-08-r385-final | xray-mushroom v10e — "풀렌더로 뽑아줘 … Love is Acid.wav … 간만에 아주 맘에들어. 몇개월만인거같아" → final + audio + lock
- quote: **"풀렌더로 뽑아줘 오디오는 '/Users/isaac/Downloads/Bloody Mary - Love is Acid.wav'. 그리고 간만에 아주 맘에들어. 몇개월만인거같아"** → `isaac-pick.ts` on scene `890dc4b2bde7850f` (= `scene-v10e.json`), gate REJECT + humanOverride.
  - Start not named → asked with the r366 measurement (breakdown 3:10.5–3:18, kick back at 198.15 s). Isaac picked **3:18 드롭** (same as r366).
- final: export `--full-res` → `out/layered/2026-10-08_r385-xray-mushroom-final-ddf0cb71/r385-xray-mushroom-final-raw.mp4` (1632×2912 · 30 fps · 600 f).
  - rotated by 300 frames (10.0 s, as the preview) with ffmpeg trim + concat, x264 crf 12 → `…/r385-xray-mushroom-final.mp4` (raw f300 ↔ final f0 PSNR 39.5).
  - **+audio** `…/r385-xray-mushroom-final-with-love-is-acid.mp4` (mux `-ss 198.15`, aac 320k 48 kHz, 20.0 s; first 100 ms −12.7 dB, kick at 0.1 s −6.9 dB).
- QA final (rotated): **PASS w/ WARN** macroMotion 0.0110 · seam 0.98 · lumFlicker 0.0009 · hueJump95 13.84 · olive 0.0426 (src 0.0329) · bleach 0.0466 · drift95 0.125 · local drift95 0.239 · motionDensity 0.249 · dark 0.
- lock: `node scripts/locks/r385-build-field-plates.mjs` defaults set to the v10e final (lift 1 · dist 0.5 · gain 2.2 · slope 10 · shape 0), so the plate command takes no args. `close-lock.ts --slug r385-xray-mushroom` → closed. `rebuild-closed-lock.ts --slug r385-xray-mushroom` (own work-dir, backed up first) reproduced scene.json and all 20 layer plates byte-identical; scene sha matches gate → verified.
- taste note: first "아주 맘에들어" in months. What carried it: dark source field lifted and coloured by a teal-anchored palette layer (hueDom kept ≥ source), contour-band pattern in the smoke (paletteC integer bands), figure held in place with prism only, CA 0, feedback 0.
- status: **closed**

#### CASE-2026-10-08-r386 | hourglass-faces — image only
- source: Isaac dropped Image #9 with no words: two human heads joined by a glowing hourglass neck, a third eye on the lower head, dark stippled smoke, orange/teal stipple corners.
  - Native PNG `~/Downloads/monglong_studio_psychedelic_illustration_of_two_human_profiles__629ddd76….PNG` → `sources/incoming/r386-hourglass-faces.png` (sha256 `38ec6437e9b79…`).
  - Same pixels as `r294-dual-face-rainbow-stream`, which only got a scaffold and was never judged, so this is a fresh slug.
  - Hue histogram (sat × val): orange 0.32 + teal 0.27 and nothing in blue/violet/magenta. Source hueDom 0.47.
- hero override `beam@0.5055,0.7091:60/900`: the glow leaves the lower head's third eye and rides up the neck. The detector had picked the upper nostril.
- plates:
  - `scripts/locks/r386-build-beam-plates.mjs`:
    - flow-beam = radial-out from the third eye, damped on the face features, which ride the structure field.
    - phase-beam = distance from the eye.
    - figure-hold = feature edges (eye, nostrils, lips, ears) as source pixels, third eye punched out.
    - The source is stippled all over, so features are edges of luma blur 4 inside feature ellipses.
  - `scripts/locks/r386-build-field-plates.mjs` (r385 route):
    - Traced envelope of both heads. Grain energy and luma could not separate the stippled skin from the smoke.
    - field-lift = smoke lifted by CLAHE × 1.6.
    - cloud-layer = soft lifted luma away from the envelope (blur 16; blur 4 gave confetti).
    - phase-field-bg = 0.25 luma bands + 0.75 eye distance, blur 24, equalised over the field.
- versions:
  - v1, in-place prism on the face (s7, phase-mix pf2, clamp 0.18): repaint. sat 0.50 vs 0.62 and oil-slick contours on the skin, because the RGB clamp pulls rotated colour through grey. → No hue rotation on the faces (r372/r366 portrait route).
  - v2a, source colour, gw 0.55 / 0.32: luminance motion weak (lumSpd 16 vs 26–31 on the luminance-led finals), hueDom 0.40.
  - v2b / v3a / v3b, smoke colour via prism or sat on L0: hueDom 0.10 / 0.12 / 0.21, and v3b had a sat pump of ±0.048. The source key was lost.
  - v4, r385 palette cloud layer (layers[1]) with paletteC [3,6,3] and phaseAmount 4: bg bands too fine and wiggly.
  - v4b, paletteC [2,4,2] and phaseAmount 3: the bright stipple corners turned pastel rainbow.
  - v4c, no lift on the bright corners (srcSoft > 0.25–0.5), and cloud alpha × (1 − 0.6 · bright) there: fixed.
  - Palette:
    - A (0.535, 0.445, 0.636), B (0.588, 0.292, 0.139), C [2,4,2], D (0.234, 0.462, 0.741).
    - Its path holds teal plus coral/peach. A cosine path from orange to teal that avoids olive must cross violet/magenta, so hueDom < source is structural here.
- **v4d** = v4c + colorCycle 2 → 3 (bg colour loop 5 s → 3.3 s, Isaac's ~3 s). Scene sha `58e7151e7915dae8`.
  - session-grade ok. Languages: L1, L4, L8, L9 (+L6 cameraDrift 0.01).
    - The L6 "feedback zoom 1.006" hit is spurious: multipassFeedback strength is 0.
  - QA **PASS w/ WARN**: hueJump95 12.12, darkDwell 1.0 (source black), staticZone 0.208, lightStaticZone 0.269.
    - These WARNs are the un-rotated faces, by design.
    - olive 0.111 (src 0.156) · drift95 0.075 / local 0.159 · seam 0.93 · motionDensity 0.339 · macroMotion 0.0286 PASS.
  - Metrics: sat 0.598 ± 0.005 · hueDom 0.28 (src 0.47) · hueSpd 24°/s · lumSpd 15.3 · period 4.4 s · neon 0.1 % · meanL 61.5 (src 61.1) · pumpShare 0.183.
  - Hero: the 6.00/6.15/6.30 s crops show the glow travelling up the neck from the eye. Faces and features are intact on the contact sheet.
  - No rotation: motion energy is flat (2.0–2.8 per 10 frames) and frame 0 already moves.
  - Delivered: `out/layered/2026-10-08_r386-hourglass-faces-v4d-fc4027ec/r386-hourglass-faces-v4d-preview.mp4`.
- open: hueDom 0.28 is below the source and below the approved ≥ 0.35. A possible next lever is hue motion on the neck glow only.
- judge v4d: Isaac **"위 얼굴에서 아래얼굴로 빛 흐르는거 너무 인위적이고 저급해. 나머지는 다 맘에들어"** → defects only (00 §4).
  - Isolation: v5a = L0 glowWave 0 / glowWave2 0; v5b = v5a + L0 advection/transport forwardBias 0.
    - Neck motion (mean frame |Δ|): v4d 4.22 → v5a 0.13, v5b 0.12. So the light was all L0 glowWave, travelling bands on phase-beam.
    - Advection does not move the smooth neck. v5b adds nothing, so it was dropped.
  - L1 (bg palette) and L2 (hold) are unchanged.
    - Hold glowWave 0.22 leaves face-feature |Δ| at 0.26 (upper) / 0.40 (lips), against v4d 2.19 / 3.11.
- **v5a** (scene sha `8123f1b1a6838a55`): session-grade ok (L1, L4 on L1/L2, L8, L9, L6).
  - QA **PASS w/ WARN**: hueJump95 10.0, darkDwell 1.0, staticZone 0.328, lightStaticZone 0.673, deadZone, macroMotion 0.0069.
    - The heads and neck are now source-still, and the motion is the bg.
    - olive 0.113 · drift95 0.052 / local 0.123 · seam 1.39 (≤ 1.5) · motionDensity 0.215.
  - Metrics: sat 0.602 ± 0.003 · hueDom 0.28 · lumSpd 4.2 · meanL 61.4 (src 61.1) · pumpShare 0.165 · neon 0 %.
  - Delivered: `out/layered/2026-10-08_r386-hourglass-faces-v5a-595e31f0/r386-hourglass-faces-v5a-preview.mp4`.
- judge v5a: Isaac **"흐름을 아예 없애지는 말고 좀 다듬어봐"** → keep the flow and change how it is made.
  - What read as cheap in v4d: two strong waves (0.55@9 + 0.32@14), about one sweep per 2.2 s, in distance rings that crossed both faces.
    - Neck centre Y swung 97–168.
- fix = **neck-glow layer**. `r386-build-field-plates.mjs` now also writes `neck-glow.png`, and the other three plates are byte-identical.
  - Pixels are field-lift. The alpha is the warm glow channel (hue 300–60°, s > 0.2–0.4, v > 0.35–0.55) inside the envelope.
  - A density gate (blur 60) and a cut below y 0.85 drop the stipple slivers. Edges are soft (blur 32).
  - The layer is a clone of layers[0] (same advection, clamp and breath, so no ghost), at zIndex 2 under the hold.
  - Its only change is one glowWave on phase-beam: speed −4 (5 s per sweep), rising from the third eye up the neck, sharpness 0.25, fieldCycles 1. glowWave2 is 0.
- **v6** (scene sha `8540c252f769c668`), glow 0.25: neck centre Y swings 115–148 (±11 %), and the faces do not move.
  - QA PASS w/ WARN (as v5a): seam 1.32, macroMotion 0.0075, olive 0.112.
- **v6b** (scene sha `a0f1a4788ec3d513`), glow 0.4: neck centre Y swings 109–159 (±18 %).
  - session-grade ok.
  - QA PASS w/ WARN: seam 1.46 (≤ 1.5) · macroMotion 0.0079 · olive 0.112 · lightStaticZone 0.586.
  - Metrics: sat 0.601 ± 0.003 · hueDom 0.28 · meanL 61.5 (src 61.1) · pumpShare 0.174 · neon 0 %.
  - Delivered: v6b `out/layered/2026-10-08_r386-hourglass-faces-v6b-6e3140ee/r386-hourglass-faces-v6b-preview.mp4`, with v6 `…-v6-d682360d/…-v6-preview.mp4` as the softer option.
- judge v6b: Isaac **"조금 더 강조되어도돼 지금은 너무 은은해서 잘 안보여"**.
  - At fieldCycles 1 the neck holds half a wavelength, so the whole neck brightens at once. That reads as a pulse, not travel.
- **v7** (scene sha `49891ed9317f15cf`): neck glowWave 0.7 · speed −5 (4 s) · sharpness 0.45 · fieldCycles 2.
  - Now one defined band rises at a time. The crest reaches neck y 0.65 → 0.55 → 0.45 at f ≈ 30 → 40 → 56, and the centre Y swing is ±25–30 %.
  - The faces and bg are unchanged.
  - session-grade ok.
  - QA PASS w/ WARN: seam 1.42 · macroMotion 0.0087 · olive 0.111 · bleach 0.0003.
  - Metrics: neon 0.1 % · white 0 % · meanL 61.3 (src 61.1) · pumpShare 0.167.
  - Delivered: `out/layered/2026-10-08_r386-hourglass-faces-v7-35ea1c72/r386-hourglass-faces-v7-preview.mp4`.
- status: **closed** (see r386-final)

#### CASE-2026-10-08-r386-final | hourglass-faces v7 — "간만에 아주 맘에들어 풀렌더 뽑고 오디오는 이거 '/Users/isaac/Downloads/Attack of the 303.wav'" → final + audio + lock
- quote: **"간만에 아주 맘에들어 풀렌더 뽑고 오디오는 이거 '/Users/isaac/Downloads/Attack of the 303.wav'"** → `isaac-pick.ts` on scene `49891ed9317f15cf` (= `scene-v7.json`), gate REJECT + humanOverride.
  - Start not named, so I asked with the measured drops (kick re-entry at 2:00.95, 2:42.53 after the longest 26 s breakdown, 4:05.68, 5:08.05). Isaac picked **0:00 처음부터**. The first kick lands at 0.03 s.
- final: export `--full-res` → `out/layered/2026-10-08_r386-hourglass-faces-final-988fa093/r386-hourglass-faces-final.mp4` (1632×2912 · 30 fps · 600 f).
  - Not rotated, same as the preview: motion is flat and frame 0 already moves.
  - **+audio** `…/r386-hourglass-faces-final-with-attack-of-the-303.mp4` (mux `-ss 0`, aac 320k 48 kHz, 20.0 s; first 100 ms peak −2.8 dB).
- QA final: **PASS w/ WARN** hueJump95 6.30, darkDwell 1.0 (source black), staticZone 0.316, lightStaticZone 0.569, deadZone, macroMotion 0.0048.
  - The heads are held by design.
  - seam 1.06 · lumFlicker 0.0005 · olive 0.111 (src 0.156) · bleach 0.0003 · drift95 0.056 / local 0.135 · motionDensity 0.252.
- lock: `close-lock.ts --slug r386-hourglass-faces` → closed. The plates command takes no args (field-plate defaults = v7).
  - `rebuild-closed-lock.ts` (work-dir backed up first) reproduced scene.json (= v7) and all 10 scene-referenced plates byte-identical. Scene sha matches gate → verified.
- taste note: second "간만에 아주 맘에들어" in a row after r385, on the same route.
  - The figure is held in source colour.
  - The bg palette layer is teal-anchored, with paletteC contour bands.
  - The hero motion is a **confined** glowWave: only the warm glow channel, one defined band rising from the hero.
  - Path: v4d whole-frame rings (the cheap look) → v5a off ("don't remove it") → v6b soft swell ("too faint") → v7.
- status: **closed**
