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
8. **2 misses → stop (R-013).** No third blind render. Budget per source: 1–2 sketch grids + **≤3** 1632 previews after Isaac picks a language (`00` §2; supersedes the R-021 six-preview cap).
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

State machine: **INTAKE → PREPARE → SKETCH → PICK-LANGUAGE → PREVIEW → QUOTE → PICK → FULL → AUDIO → CLOSE**.  
Isaac picks a **language tile**, not a knob. `gate:psychedelic` is optional diagnostics. Full-render permit = `isaac-pick.ts`.

| Step | Exact command |
|------|----------------|
| Intake | `npx tsx scripts/analyze-source.ts <png> --out out/manual-runs/<slug>/analysis.json` |
| Prepare | `npx tsx scripts/prepare-new-source.ts --source <png> --slug <slug> --recipe recipes/golden/<file>.json --work-dir out/manual-runs/<slug>` `[--hero "kind@cx,cy[:rIn/rOut]" --hero-reason "<why>"]` |
| Sketch | `npx tsx scripts/export-layered.ts --title <slug>-<tile> --work-dir out/manual-runs/<slug> --sketch` then `npx tsx scripts/sketch-grid.ts --out out/manual-runs/<slug>/sketch-grid.mp4 "A L1+L2=…/a-sketch.mp4" …` |
| Preview | `npx tsx scripts/export-layered.ts --title <slug> --work-dir out/manual-runs/<slug> --preview` |
| QA | `npx tsx scripts/qa-motion.ts out/layered/*<slug>*/<slug>-preview.mp4 --source out/manual-runs/<slug>/source.png --json out/manual-runs/<slug>/qa-preview.json` |
| Stills | §6.2 commands |
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

### Step B — Sketch, then preview

Loop: `00` §2. New source: **sketch grid first** (language tiles). Isaac picks a tile. Then one 1632 `--preview`. Do not answer “더 창의적으로” with a knob delta.

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
| **OS v2 2026-09-02** | **method change** | floor+ceiling contracts; sketch grid before preview; quote→axis dictionary; `--hero` enforced; textured hold default; `isaac-pick`/`close-lock`; session-plates alpha stride bug fixed |
| r349 uv-pills-face | **HOLD Isaac** · QA PASS | ESRGAN 2x→1632 cover · golden r221 as-is · hero form |

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
