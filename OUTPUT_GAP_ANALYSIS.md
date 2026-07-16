# Masterpiece Pipeline — Agent Operating System

**READ THIS FIRST. This file is the only operating truth for image→20s psychedelic loop work.**

| Layer | Path | When to open |
|-------|------|----------------|
| **OS (this file)** | `OUTPUT_GAP_ANALYSIS.md` | Always — create / judge / gate / cases |
| **Repro + locks playbook** | `docs/REPRO_LOCKS_PLAYBOOK.md` | Closed product store/rebuild / other PC / what to commit |
| **Evidence archive** | `docs/archive/OUTPUT_GAP_ANALYSIS.pre-refactor-2026-07-15.md` | Recurrence / “why is this rule?” / deep debug only |
| **Golden recipes** | `recipes/golden/*` | Every **new** source start (not closed re-export) |
| **Locks + sources** | `recipes/locks/*` + `sources/approved/*` | Closed finals only |

| Supersedes (if conflict) | Action |
|--------------------------|--------|
| `IMAGE_TO_LOOP_WORKFLOW.md` peacock-default | **Ignore** for figure-vivid finals |
| `PER_IMAGE_TUNING_GUIDE.md` tone presets | Do not invent prism-sunset for finished vivid |
| Archive peacock / legacy preserve recipes | Archive is evidence, **not** current defaults |

If two docs disagree: **this file wins.** Archive is not deleted knowledge — it is **read-on-demand**.

---

## 0. Non-negotiables (violate = wrong product)

1. **GLSL only.** No Kling/Runway/Seedance/img2video.
2. **In-place source motion only (R-038).** Never: fixed original + overlay, optical liquid layers, foreign textures, generated noise as motion.
3. **Animate, don't repaint (R-001).** Finished-vivid art: destroy source color identity → FAIL.
4. **Guard PASS ≠ success (R-020).** Success = source-more-beautiful (R-002) + “3s stare = hallucinate”.
5. **Preview first.** Full render only after Isaac visual OK (or explicit “풀렌더”).
6. **No audio** until Isaac explicitly requests a track (R-043).
7. **Record every render** in §9 case ledger (PASS and FAIL).
8. **2 misses → stop (R-013).** No third blind render. 6 previews/source/session max (R-021).

**Roles:** implementation may use any coding agent · orchestration agent records cases · **Isaac = final aesthetic judge**.

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
| **Approved locks (git)** | `recipes/locks/<slug>.json` + `<slug>.gate.json` — **pull → scaffold → cp lock → full** |
| Repro index | `recipes/locks/manifest.json` |
| **Repro playbook (agents)** | `docs/REPRO_LOCKS_PLAYBOOK.md` — usage · management · maintenance (mandatory for locks) |
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

### Approved previews (Isaac visual OK — full only after gate PASS §7.1; do not re-open without new defect)

| Source | Slug | Type | Preview MP4 | Recipe | Note |
|--------|------|------|-------------|--------|------|
| hand-face | r240 | `dense-pattern-figure` | `out/layered/2026-07-15_r240-handface-phase-river-78c509b8/r240-handface-phase-river-preview.mp4` | r139, clamp **0.42** | Isaac visual pick; **gate REJECT local-drift 0.394** — do not full without fix |
| hand-face | **r242** | same | `out/layered/2026-07-15_r242-handface-phase-river-gatepass-973703eb/...-preview.mp4` | r240 + clamp **0.26** | **gate PASS** local 0.297; **final + audio** |
| hand-face | r241 | same source (alt) | `out/layered/2026-07-15_r241-handface-chroma-trance-bc800728/r241-handface-chroma-trance-preview.mp4` | r139 delta: colorCycle 19 + hueKey 0.42 | alt only |

### Golden recipe files (copy these)

| Recipe file | Use when |
|-------------|----------|
| `recipes/golden/eye-mirror-phase-advect-r221.json` | finished vivid figure / multi-eye / painted portrait with dense color detail |
| `recipes/golden/woodblock-phase-advect-r139.json` | busy high-frequency line/print texture **and** dense-pattern-figure (hand-face r240 Isaac-validated) |
| `recipes/golden/cosmos-vivid-oklch-r24b.json` | all-over colorful swirl (not figure-skin critical) |

---

## 2. Machine closed loop (must run; not optional)

```
source
  → scaffold (fields + golden scene)
  → preview export
  → stills + qa-motion
  → (if region-affinity) authority audit before preview
  → gate:psychedelic vs 2 refs
  → plan:psychedelic (next action; never reselect blocked families)
  → case ledger append
  → Isaac visual
  → full-res export ONLY with --gate-report (PASS or humanOverride)
  → audio ONLY after explicit Isaac request
```

| Step | Exact command |
|------|----------------|
| Scaffold | `npx tsx scripts/scaffold-layered-run.ts --source <png> --slug <slug> --recipe recipes/golden/<file>.json --work-dir out/manual-runs/<slug>` |
| Preview | `npx tsx scripts/export-layered.ts --title <slug> --work-dir out/manual-runs/<slug> --preview` |
| QA | `npx tsx scripts/qa-motion.ts out/layered/*<slug>*/<slug>-preview.mp4 --source out/manual-runs/<slug>/source.png --json out/manual-runs/<slug>/qa-preview.json` |
| Stills | §6.2 commands |
| Gate | `npm run gate:psychedelic -- --candidate <preview.mp4> --source <source.png> --reference "$REF1" --reference "$REF2" --work-dir out/manual-runs/<slug> --axis <axis> --primitive <primitive>` |
| Plan next | `npm run plan:psychedelic -- --source <source.png> --report out/manual-runs/<slug>/psychedelic-gate.json --output out/manual-runs/<slug>/next-plan.json` |
| Affinity audit | `npm run audit:region-affinity -- --source <png> --scene <scene.json> --work-dir <dir> --output <audit.json>` |
| Full | `npx tsx scripts/export-layered.ts --title <slug>-final --work-dir <dir> --full-res --gate-report <report.json>` |
| Audio | §7.3 |

**Reference videos (motion contract only, never as footage):**

```text
REF1=/Users/isaac/Downloads/double-iris-f38f09ba-prism-amber-with-audio.MP4
REF2=/Users/isaac/Downloads/lotus-clean-1x-separated-audio.MP4
```

If refs missing on this machine: still run qa-motion + stills; note “gate skipped: refs missing” in case — do **not** invent PASS.

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
| 5 | figure/face/deity + finished vivid paint (`finishedVivid` useful; skin/face large) | `figure-vivid` | `eye-mirror-phase-advect-r221.json` |
| 6 | dense full-frame pattern figure (hand/mushroom/forest) without soft skin wash risk | `dense-pattern-figure` | **first try** `woodblock-phase-advect-r139.json` (hand-face r240 Isaac OK); multi-layer r65 only if layers already exist; avoid body colorCycle as first path (r241 alt only) |
| 7 | else | `unknown` | scaffold r221 **one** preview → if repaint FAIL, stop and escalate |

### 3.2 Hard type rules

| Type | MUST | MUST NOT |
|------|------|----------|
| `figure-vivid` | single layer; colorCycle **0** on r221 path; sourcePrism on | body colorCycle, peacock satBoost 1.8+palette, overlays |
| `busy-line` | UV fixed; phaseMix=0; phaseFlowPx ∝ width | copy r139 px blindly without width scale |
| `dense-pattern-figure` | start **r139** path; colorCycle **0** first; for **gate/final** clamp maxDrift **≤0.26** (r242) | default colorCycle/hueKey; shipping with clamp 0.42+ without re-gate |
| `allover-vivid` | OKLCH; integer cycle; satInj 0 | HSV + high satFloor |
| `pastel-greenrisk` | clamp; low hueKey | full-field hue “for energy” |

---

## 4. NEW SOURCE runbook (copy this checklist)

Replace `<SOURCE>`, `<SLUG>`, `<RECIPE>` only.

### Step A — Classify (no render yet)

1. Open image. Note face/skin vs all-over pattern vs line print.
2. Scaffold (also runs analysis + phase fields):

```bash
npx tsx scripts/scaffold-layered-run.ts \
  --source "<SOURCE>" \
  --slug "<SLUG>" \
  --recipe "recipes/golden/<RECIPE>.json" \
  --work-dir "out/manual-runs/<SLUG>"
```

3. Read `out/manual-runs/<SLUG>/analysis.json` → assign Type ID (§3.1).
4. If Type ID wrong for chosen recipe: re-scaffold with correct golden recipe (overwrite work-dir).
5. Open §5 KILLED — confirm plan is not a killed axis.

### Step B — Preview

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
| Soft pass, want Isaac eyes | Deliver preview path + contact/subsec. **No full. No audio.** |
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

### 7.2 Isaac humanOverride (when gate REJECT but Isaac picked the look)

Only when Isaac **explicitly** selected that candidate (e.g. “221로”).

Edit `psychedelic-gate.json` to add (keep `status: "REJECT"` allowed):

```json
"humanOverride": {
  "approvedBy": "isaac",
  "reason": "<exact quote or selection>",
  "at": "<ISO-8601>"
}
```

Scene SHA in report **must** match current `scene.json` (re-run gate after scene edit).

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

Tier: L=law E=established P=provisional.

---

## 10. Experiment queue (priority order; do not skip up)

1. ~~eye-mirror r221~~ **CLOSED** (final + audio)  
2. ~~hand-face r242~~ **CLOSED** (gate PASS + final + Eating Glue); r240 was look-pick only  
2b. ~~dual-abstract A r274 beam-focus~~ **CLOSED** (gate PASS + final + Sapana @2:58); do not re-tune without defect  
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
npx vitest run scripts/lib/source-region-capacity.test.ts \
  scripts/lib/psychedelic-learning.test.ts \
  scripts/lib/region-affinity-authority-audit.test.ts \
  scripts/lib/psychedelic-final-guard.test.ts \
  scripts/export-layered.test.ts
```

---

## 13. Definition of done (agent self-check)

Work is **not done** until:

- [ ] Type ID assigned with analysis numbers  
- [ ] Recipe is a golden file or single-axis delta from golden  
- [ ] Preview exists under `out/layered/`  
- [ ] `stills/contact.png` + `stills/subsec.png` exist  
- [ ] `qa-preview.json` exists  
- [ ] Case row appended (§9)  
- [ ] Killed axes not used  
- [ ] If FAIL×2: stopped and asked Isaac  
- [ ] If final: full MP4 + qa-final + no silent “audio surprise”  

---

*Version: 2026-07-16.1 — r274 dual-abstract beam-focus closed (godRays+bloom+mask; Sapana @2:58); R-057.  
Ops: this file + `docs/REPRO_LOCKS_PLAYBOOK.md` + `recipes/golden/*` + `recipes/locks/*` + `sources/approved/*` + scripts.  
Evidence: `docs/archive/OUTPUT_GAP_ANALYSIS.pre-refactor-2026-07-15.md` (git snapshot `be59eb8`, ~1640 lines).*
