# video-os — Operating System (v2 · 2026-09-02)

**This is the only start page.** Isaac is the final aesthetic judge. Scripts guarantee the **floor** (nothing dead, boxed, spinning, or plate-less reaches Isaac). This page adds the **ceiling** (nothing knob-only or single-language reaches Isaac either) and the loop that connects them.

If anything disagrees with this page — `AGENTS.md`, the skill, `01` §0–§8 prose, chat memory — **this page wins**.

---

## 0. Read budget

| Job | Read | Never |
|-----|------|-------|
| **New image → Isaac** | this page → `04-QUALITY-CONTRACT.md` → `01` **§3 only** (type) | `01` §9 in full · `archive/` |
| **Rebuild a closed final** | this page §6 → `02-REPRO-LOCKS.md` | improvising plates |
| **Reel edit** | `03-INSTAGRAM-REELS.md` | using reel cuts as loop look |
| Why this OS looks like this | `05-HALLUCINATION-METHOD.md` (rationale + evidence) | treating it as a command source |

`01` §9 is the **ledger**: open only the slugs this page or `04` cites (r221 · r139 · r242 · r299 · r325 · r342 · r343–r346 · r349). Root legacy playbooks were deleted 2026-09-02; `docs/video-os/archive/**` is evidence, not law. History of this rewrite: `OS-V2-HANDOVER-2026-09-02.md` (not a command source).

---

## 1. Two contracts

| Contract | Guarantees | Enforced by | Can an agent skip it? |
|----------|------------|-------------|-----------------------|
| **Floor** (`04`) | hero travels · no rectangle hold · no spin · custom plates present · source 1632×2912 · closed-lock plates | `prepare-new-source` → `session-grade` (export refuses) · `rebuild-closed-lock` | **No.** There is no skip flag. |
| **Ceiling** (§3) | every region has a motion language · ≥3 languages in frame · ≥2 scales · ≥2 tempos · a creative request is answered by a **language change**, never a knob delta | agent self-check §3 + `qa-motion` `deadZone` row + Isaac | Not if you want Isaac to say anything but “구려”. |

Why two: the last six Isaac finals were **5× gate REJECT + override**. The only gate PASS was the most static preview (r343). Guards stop broken movies; they never made a hallucinatory one. Evidence: `05` §1.

---

## 2. The loop (state machine — every state has one command and one exit)

```
INTAKE → PREPARE → SKETCH → PICK-LANGUAGE → PREVIEW → QUOTE ─┬─ DELTA ──────┐
                                                             ├─ NEW-LANGUAGE┤→ PREVIEW (≤3 total)
                                                             └─ STOP (2 misses same class → ask Isaac)
PICK → FULL → AUDIO (only if track+start named) → CLOSE (lock pack, default)
```

| State | Command | Artifact / exit | Who decides |
|-------|---------|-----------------|-------------|
| **INTAKE** | `npx tsx scripts/analyze-source.ts <png> --out out/manual-runs/<slug>/analysis.json` | type from `01` §3.1 + golden file. Native PNG over chat JPEG (R-064). `black-dominant` → stop, tell Isaac. | agent |
| **PREPARE** | `npx tsx scripts/prepare-new-source.ts --source <png> --slug <slug> --recipe recipes/golden/<g>.json --work-dir out/manual-runs/<slug>` `[--hero <kind@cx,cy[:rIn/rOut][:wNy]> --hero-reason "<why>"]` | lanczos → scaffold → `hero.json` → plates → textured hold → `session-grade.json ok`. **If the detector’s kind is not the living part you see, `--hero` is the only legal disagreement**; grade enforces it (r346/r348 class). | script |
| **SKETCH** | per language map: `cp scene-<tile>.json scene.json && npx tsx scripts/export-layered.ts --title <slug>-<tile> --work-dir out/manual-runs/<slug> --sketch` then `npx tsx scripts/sketch-grid.ts --out out/manual-runs/<slug>/sketch-grid.mp4 "<tile> <languages>=<sketch.mp4>" …` | 2–6 tiles (quarter-res · 12 fps · 6 s) in one grid + legend. Each tile = a **different language map** (§3), not a knob variant. Floor still graded per tile. | agent builds, **Isaac picks a tile** |
| **PICK-LANGUAGE** | — | Isaac names a tile → that map is the product’s language. “다 별로” → one more sketch set with **new** languages; second “다 별로” → STOP and ask. | Isaac |
| **PREVIEW** | `cp scene-<tile>.json scene.json && npx tsx scripts/export-layered.ts --title <slug>-<v> --work-dir out/manual-runs/<slug> --preview` → stills (`01` §4 C) → `npx tsx scripts/qa-motion.ts <preview.mp4> --source out/manual-runs/<slug>/source.png --json out/manual-runs/<slug>/qa-<v>.json` | one 1632 preview. Case row (`01` §9.1) with `quote`/`axis`/`language-map`. Show Isaac **1 preview, max 2 side by side**. Never show internal failures. | agent |
| **QUOTE** | decode with §4 | exactly one of **DELTA** (amplitude / tempo / scale on the same map) · **NEW-LANGUAGE** (change the map, ≤1 language per round) · **STOP**. Budget after the pick: **≤3 previews per source**. Two misses of the same class → STOP (R-013). | Isaac quote is law |
| **PICK** | `npx tsx scripts/isaac-pick.ts --work-dir out/manual-runs/<slug> --quote "<verbatim>" [--preview <mp4>] [--audio "<Track> @m:ss"]` | `isaac-pick.json` + `psychedelic-gate.json` with `humanOverride`. **This is the full-render permit.** Never hand-edit the gate JSON. `gate:psychedelic` is optional diagnostics, not a bar. | Isaac (“풀렌더 / 최종 / 이걸로”) |
| **FULL** | `npx tsx scripts/export-layered.ts --title <slug>-final --work-dir out/manual-runs/<slug> --full-res --gate-report out/manual-runs/<slug>/psychedelic-gate.json` → `qa-motion` on the final | silent MP4 path handed to Isaac as **silent**. 20 s · 30 fps · 1632×2912 · H.264. | script |
| **AUDIO** | `01` §7.3 mux, `-ss` = the start Isaac named | `…-final-with-<track>.mp4`. **Only** when a track **and** start exist (`isaac-pick.json.audio`). Never guess a start; measure the drop if Isaac gave a rough time (R-059). | Isaac |
| **CLOSE** | `npx tsx scripts/close-lock.ts --slug <slug> [--audio "<Track> @m:ss"] [--plates "node scripts/locks/<x>.mjs && …"] [--final <mp4>]` | `sources/approved/` + `recipes/locks/<slug>.{json,gate.json}` + `manifest.json` entry. **Default after every full**, not on request. Then `01` §1 finals table + §9 row. Print `git add` list; commit only if Isaac asks. | script |

A final is **closed** when `rebuild-closed-lock --slug` reproduces it on another machine — not when an MP4 exists in `out/` (r343–r346 were “final” with no lock pack; fix that when they are next touched).

---

## 3. Ceiling contract — compose languages, do not tune knobs

### 3.1 Language set (all are **source-pixel in-place** — R-038 legal · none is spin — R-060 legal)

| ID | Language | Knobs | Status |
|----|----------|-------|--------|
| **L1** | Travel — pixels ride a custom field (halo / fall / beam) | `sourceFlowAdvection` + `flow-*.png` (`prepare` writes them) | Isaac ✓ r325 · r342 |
| **L2** | Counterflow — alternating in/out ring bands (8 → 24) | `flow-halo-counter` band count | Isaac ✓ r346 “링이 안팎으로 흐르는건 맘에 들어” |
| **L3** | Chroma river — phase chroma rotation | `sourcePrism.surfaceCycles / phaseFlowPx / chromaCycles` | default (r221 / r139) |
| **L4** | Interference — two luma waves at incommensurate speeds + phase warp | `glowWave` : `glowWave2` speeds in a non-integer ratio · `phaseWarpAmount` | built, never shipped |
| **L5** | Texture emergence — dense-edge prism on flat / dark regions | r139 knobs + `colorMotionMask.floor 1` on the hold layer (**now the default hold**) | Isaac ✓ r346 v11 |
| **L6** | Vection — portal pull + micro camera drift | `multipassFeedback.zoom 1.003–1.010` · `camDrift radius ≤0.004, integer cycles` | built, never shipped · **needs Isaac yes** |
| **L7** | Pattern formation — luminance-only reaction-diffusion on field/ground masks | `reactionDiffusionAmount` + `feedbackMask` | built, never shipped · **needs Isaac yes** (R-038 edge) |
| **L8** | Mid-scale material — dissolve / spectral / chroma flow / tangent microflow | `sourceMaterialDissolve` · `sourceSpectralFlow` · `sourceChromaFlow` · `tangentMicroflow` | built, never shipped |
| **L9** | Region colorCycle — integer cycle on **non-skin** masks only (halo / field / sky) | `colorCycle.speed 12–20` on a masked source layer | killed on *portrait body* (R-018) · **needs Isaac yes** for re-entry by region |
| **L10** | Macro arc — 1–2 cycles / 20 s envelope on carrier amplitude | `breath` or glow-strength envelope, integer cycles | small, new |

### 3.2 Composition minimums (self-check before any preview — refuse to present if unmet)

1. **Region map** declared: 3–5 regions (hero · figure · field · ground · sky). Hero from `hero.json`; figure from the hold plate; rest from hue/value classes already in `session-plates`.
2. **No region has zero languages.** (“사람 형태가 너무 정적이야” is a region with 0.)
3. Hero ≥ 2 languages (L1 + one more). Frame ≥ 3 distinct languages.
4. Scales: at least two of macro (≥200 px bands) · mid (30–80 px) · micro (≤12 px). **Micro never dominates** — that is what Isaac calls 노이즈.
5. Tempos: ≥2 incommensurate (e.g. 3 vs 5 cycles / 20 s). Optional L10.
6. Face core: L3 low or L5 only. No L1/L6/L7 across a face (identity, R-001).
7. Write the map in the case row: `language-map: hero=L1+L2 · figure=L5 · field=L3+L4 · sky=L4`.

Killed axes (`01` §5) stay killed **in the region class and source type where they died**. Re-entry in a different region class, by source-pixel mask, is one experiment after a one-line Isaac yes — log it as re-entry.

---

## 4. Isaac quote → axis (decode before touching anything)

| Isaac says | Means | Do (one axis) | Never |
|-----------|-------|---------------|-------|
| 약해 · 더 세게 · 아직 약해 | amplitude low | glow strength ↑ · band count ↑ · add one language | speed ↑ (r344 v2 → “너무 스피디해”) |
| 스피디해 · 너무 빨라 | tempo high | cycles ↓ | amplitude ↓ |
| 노이즈 · 자글자글 · 뭉게져 | micro scale dominates | `surfaceCycles` ↓ **and** band width ↑ (move energy to mid/macro) | global damping (r346 v6 → “하나도 싸이키델릭하지않아”) |
| 정적이야 · 멈춰있어 · 스티커 | that region has 0 languages | give it L5 first, then L1 | raise hold alpha |
| 창의적으로 · 새로운거 · 다른 프리셋 · 고도화 | **language map change** | add/replace ≥1 language; new sketch set if unsure | any knob delta |
| 패턴 다 똑같 | same language everywhere | per-region different languages | amplitude |
| 이질적 · 오버레이 · 덮은거 | R-038 violation | remove it | soften it |
| 꿀렁 · 멜트 · 흐물 | too much phase flow | `phaseFlowPx` ↓ first (R-063) | kill prism · cosmos |
| 빙글빙글 · 시계방향 · 회전 | R-060 spin (or `mp` too high on concentric art) | remove; `multipassFeedback.strength ≤ 0.04` on rings | — |
| 구려 · 별로 (on one thing) | kill **that language in that region class** | keep the rest | discard the whole map |
| 다 별로 · 다 구려 | wrong language set | new sketch set with **unused** languages | knob tour |
| X만 (사각형만 · 사람만 · 무릎만) | surgical | change only X, keep every other byte | “while I’m here” fixes |
| 맘에든다 · 이게 젤 나아 · 오 좋다 · 보류 | pick or hold | `isaac-pick.ts` only when 풀렌더/최종/이걸로 also present | full render on “좋다” alone |
| 풀렌더 · 풀버전 · 최종 · 플렌더 · ㅇㅋ 합격 | permit | `isaac-pick.ts --quote` → full | edit gate JSON by hand |
| `<Track> @m:ss` | audio | mux with that `-ss` | guessing a start · muxing without it |
| 알아서 다듬어 · 알아서 최종본 | keep the picked map; polish = **defects only** (seam, wall, olive) | no language change · no denoise sweep | reading it as “reduce everything” (r346 v6) |

Two quotes of the same class in a row on the same map = STOP and ask with one preview and one question.

---

## 5. Hard bans (global — scripts enforce the first four)

- GLSL only — no img2video · no foreign textures · no overlays · in-place source pixels (R-038)
- No spin (R-060): never `phase-angular`, `rotate ≠ 0`, kaleidoscope, polarTwist, rotateSpeed. Custom `phase-halo/fall/beam` is travel.
- No rectangle hold (`nx`/`ny` walls). Hold = silhouette / ellipses / color, feathered.
- Scaffold-only r221 on halo / pour / beam = FAIL (session-grade).
- Animate, don’t repaint (R-001). No audio until a track **and** start are named (R-043 / R-059). No full without `isaac-pick.ts`.
- Never re-tune a closed lock without a new Isaac defect. Never commit MP4 / WAV / `out/**` / `sources/incoming/`.

---

## 6. Rebuild a closed final

```bash
npx tsx scripts/rebuild-closed-lock.ts --slug <manifest slug>          # verify shas → scaffold → plates → cp lock → verify
npx tsx scripts/rebuild-closed-lock.ts --slug <manifest slug> --full   # only when Isaac asked 풀렌더 on that slug
```

Detail: `02` §3. Skipping `manifest.plates` on r325 / r342 = wrong movie.

---

## 7. Knowledge lifetime — where a new lesson goes

| Lesson type | Goes to | Never |
|-------------|---------|-------|
| A defect a script can see (wall, spin, frozen hero, size) | a test + guard in `scripts/lib/*` (`session-grade`, `hold-walls`, `qa-motion-core`) | a new R-number |
| A taste Isaac stated | one row in **§4** | prose in `01` §0 |
| A type / recipe fact | one cell in `01` §3 | a new golden per source |
| A killed axis | `01` §5 row **with (axis · region class · source type)** | a global ban |
| Everything else | `01` §9 case row (append-only, on demand) | reading it all next session |

R-numbers are **frozen at R-064**. The dictionary, the tests, and the ledger replace them.

---

## 8. Paths and conflicts

```
docs/video-os/00-INDEX.md        ← this page (law + loop + dictionary)
docs/video-os/04-QUALITY-CONTRACT.md   ← floor detail (hero tree, hold, checklist)
docs/video-os/01-CREATE-OS.md    ← type tree (§3) · killed axes (§5) · commands detail · LEDGER (§9)
docs/video-os/02-REPRO-LOCKS.md  ← closed rebuild + lock pack
docs/video-os/03-INSTAGRAM-REELS.md    ← reel edit log
docs/video-os/05-HALLUCINATION-METHOD.md ← why (evidence), not what
docs/video-os/OS-V2-HANDOVER-2026-09-02.md ← what changed on 2026-09-02 and why (history, not law)
scripts/prepare-new-source.ts · export-layered.ts (--sketch/--preview/--full-res) · sketch-grid.ts · isaac-pick.ts · close-lock.ts · rebuild-closed-lock.ts
recipes/golden/*.json  · recipes/locks/manifest.json · sources/approved/*
out/**  ← local only
```

| Conflict | Winner |
|----------|--------|
| what to do before Isaac can judge | `04` |
| loop, budget, ceiling, quote decoding | **this page** |
| type tree, killed axes, cases | `01` |
| rebuild / lock / what to commit | `02` + `manifest.json` |
| reel cuts | `03` (loop look still `01`/this page) |
| anything vs `archive/` or chat memory | this folder |

*v2 2026-09-02: two contracts, sketch grid, hero override object, textured hold default, pick + close-lock scripts, quote dictionary. Prior: SSOT + session-grade 2026-08-18.*
