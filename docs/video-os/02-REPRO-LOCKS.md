> **Canonical path:** `docs/video-os/02-REPRO-LOCKS.md` under `docs/video-os/`. Entry: `docs/video-os/00-INDEX.md`.
>
> Old root/docs paths are stubs. If this file and a legacy playbook disagree, **this file wins** (create OS) or **02-REPRO-LOCKS** (rebuild).

# Repro + Locks Playbook (Agent operating manual)

**READ THIS before any “다른 PC / pull 후 재현 / 최종 잠금 / sources·locks 수정” 작업.**

This document is the **only complete** procedure for multi-machine reproduction of closed psychedelic loop finals.  
If this file conflicts with chat memory or old notes: **follow this file + `docs/video-os/01-CREATE-OS.md`.**

Target reader: an agent with **no prior context**. Do not improvise. Do not skip verification steps.

---

## 0. One-sentence model

| Role | What | In git? |
|------|------|---------|
| **Source of truth (look)** | Original PNG + locked `scene.json` knobs | **Yes** |
| **Source of truth (full-render permit)** | Gate report matching scene sha256 | **Yes** |
| **Derived (rebuild anytime)** | phase/flow layers, work-dir, MP4 | **No** (`out/`) |
| **Local-only media** | Audio WAV / delivery MP4 copies | **No** |

```
git pull
  → sources/approved/*.png          (pixels)
  → recipes/locks/<slug>.json       (final knobs)
  → recipes/locks/<slug>.gate.json  (PASS or REJECT+Isaac override)
  → scaffold (regenerate layers from PNG)
  → cp lock → scene.json            (restore exact scene sha for gate)
  → export --full-res --gate-report
  → (optional) ffmpeg mux local WAV
```

**Never** commit MP4, WAV, or `out/**`.  
**Never** treat golden recipes alone as the closed final (locks have extra deltas).

---

## 1. Directory map (memorize)

```
sources/approved/
  r221-eye-mirror.png          # closed source pixels
  r242-hand-face.png
  r274-dual-abstract-beam.png  # silhouettes + third-eye beam (r274)

recipes/locks/
  README.md                    # short pointer → this playbook
  manifest.json                # machine-readable index (MUST stay in sync)
  <slug>.json                  # = locked scene.json (final knobs)
  <slug>.gate.json             # = psychedelic-gate.json at lock time

recipes/golden/
  *.json                       # START templates for NEW sources only
                               # NOT a substitute for locks

out/manual-runs/<slug>/        # LOCAL work dir (gitignored)
out/layered/<date>_<slug>_*/   # LOCAL render archives (gitignored)

docs/video-os/02-REPRO-LOCKS.md   # THIS file (full procedure)
docs/video-os/01-CREATE-OS.md         # aesthetic / gate / QA OS (still mandatory)
AGENTS.md                      # entrypoint pointers
```

### Naming rules (do not invent)

| Kind | Pattern | Example |
|------|---------|---------|
| Source file | `sources/approved/<short-descriptive>.png` | `r242-hand-face.png` |
| Lock scene | `recipes/locks/<slug>.json` | `r242-handface-phase-river-gatepass.json` |
| Lock gate | `recipes/locks/<slug>.gate.json` | same slug + `.gate.json` |
| Slug | `rNNN-<topic>-<variant>` matching original run | `r242-handface-phase-river-gatepass` |
| Work dir | `out/manual-runs/<slug>/` | always same as slug |

Slug in lock filename **must equal** work-dir slug and manifest `slug` field.

---

## 2. Absolute rules (violation = wrong product)

1. **MP4 is not the archive of record.** Do not git-add finals/previews. Rebuild from lock.
2. **Layers are not the archive of record.** Scaffold regenerates them from the PNG.
3. **Golden ≠ lock.** `recipes/golden/*` starts *new* experiments. Closed products use `recipes/locks/*`.
4. **Do not re-tune a closed lock** without Isaac saying there is a **new defect**. Prefer new slug `rNNN+1-…` for experiments.
5. **Full render requires gate** with either:
   - `status: "PASS"`, or
   - `status: "REJECT"` **and** `humanOverride.approvedBy: "isaac"`
6. **Scene sha must match gate.** After every scaffold, **copy lock over `scene.json`** before full export (see §3.2 step 3).
7. **Isaac visual “맘에든다” ≠ skip gate.** Fix fail-code first (often `sourceColorClamp.maxDrift`). Override only if Isaac explicitly says override is OK (R-055).
8. **Audio only when Isaac gives a track.** Mux locally; do not commit WAV (R-043).
9. **One source blob per closed look.** If two filenames share the same sha256, keep **one** file and point manifest at it.
10. **manifest.json is mandatory.** Adding files without updating manifest = incomplete work.

---

## 3. Usage — rebuild a closed final on a new machine

### 3.1 Preconditions

```bash
cd /path/to/video-art
git pull
npm ci   # or npm i — once per machine / after dep changes
```

Required tools: Node, `npx`, `ffmpeg` (for stills/mux only).

Pick a closed entry from `recipes/locks/manifest.json` → field `approved[]`.

### 3.2 Rebuild procedure (copy-paste; do in order)

Replace `SLUG` and paths with the manifest entry. Example uses **r242**.

```bash
# --- variables (from manifest) ---
SLUG=r242-handface-phase-river-gatepass
SOURCE=sources/approved/r242-hand-face.png
LOCK=recipes/locks/${SLUG}.json
GATE=recipes/locks/${SLUG}.gate.json
WORKDIR=out/manual-runs/${SLUG}
EXPECTED_SOURCE_SHA=369496e278e699d5120350c940020c7f8e3ad871013d0113de04b7f9843a642c
EXPECTED_SCENE_SHA=6aac3671605a67c6e4115c75508615c3f20c0a273a3845fece259af3d68bac96
```

**Step 0 — verify blobs (do not skip)**

```bash
python3 - <<'PY'
import hashlib, sys
from pathlib import Path
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
source, exp_s = "sources/approved/r242-hand-face.png", "369496e278e699d5120350c940020c7f8e3ad871013d0113de04b7f9843a642c"
lock, exp_l = "recipes/locks/r242-handface-phase-river-gatepass.json", "6aac3671605a67c6e4115c75508615c3f20c0a273a3845fece259af3d68bac96"
assert Path(source).is_file(), source
assert Path(lock).is_file(), lock
assert sha(source)==exp_s, (sha(source), exp_s)
assert sha(lock)==exp_l, (sha(lock), exp_l)
print("source+lock sha OK")
PY
```

If assert fails: **STOP**. Corrupt clone or wrong file. Do not “fix” by re-encoding the PNG.

**Step 1 — scaffold (regenerate layers)**

```bash
npx tsx scripts/scaffold-layered-run.ts \
  --source "$SOURCE" \
  --slug "$SLUG" \
  --recipe "$LOCK" \
  --work-dir "$WORKDIR"
```

Expect: `$WORKDIR/layers/` populated, `$WORKDIR/source.png` present.

**Step 2 — pin locked scene (CRITICAL)**

Scaffold may rewrite fields (paths, width-scaled `phaseFlowPx`). Gate compares **bytes** of `scene.json` to `gate.scene.sha256`.

```bash
cp "$LOCK" "$WORKDIR/scene.json"
python3 - <<'PY'
import hashlib, json
from pathlib import Path
slug="r242-handface-phase-river-gatepass"
scene=Path(f"out/manual-runs/{slug}/scene.json")
gate=json.loads(Path(f"recipes/locks/{slug}.gate.json").read_text())
h=hashlib.sha256(scene.read_bytes()).hexdigest()
assert h==gate["scene"]["sha256"], (h, gate["scene"]["sha256"])
print("scene sha matches gate:", h[:16])
# permit check
ok = gate["status"]=="PASS" or (
  gate["status"]=="REJECT" and gate.get("humanOverride",{}).get("approvedBy")=="isaac"
)
assert ok, gate.get("status")
print("gate permit OK:", gate["status"], "override" if gate.get("humanOverride") else "")
PY
```

**Step 3 — full export**

```bash
npx tsx scripts/export-layered.ts \
  --title "${SLUG}-final" \
  --work-dir "$WORKDIR" \
  --full-res \
  --gate-report "$GATE"
```

Output: `out/layered/<date>_${SLUG}-final_<hash>/${SLUG}-final.mp4`  
(Exact archive folder name is printed by the script.)

**Step 4 — optional QA on final**

```bash
FINAL=$(ls -d out/layered/*${SLUG}-final* | tail -1)
npx tsx scripts/qa-motion.ts \
  "$FINAL/${SLUG}-final.mp4" \
  --source "$WORKDIR/source.png" \
  --json "$WORKDIR/qa-final.json"
```

**Step 5 — optional audio (only if Isaac already approved a track)**

```bash
DIR=$(ls -d out/layered/*${SLUG}-final* | tail -1)
VIDEO="$DIR/${SLUG}-final.mp4"
AUDIO="/absolute/path/to/track.wav"   # NOT in git
OUT="$DIR/${SLUG}-final-with-audio.mp4"
ffmpeg -y -i "$VIDEO" -ss 0 -i "$AUDIO" \
  -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 320k -ar 48000 -ac 2 \
  -shortest "$OUT"
```

Track names for closed products are listed in `manifest.json` → `audio` (metadata only).

### 3.3 Preview-only rebuild (faster check)

Same as §3.2 through step 2, then:

```bash
npx tsx scripts/export-layered.ts \
  --title "$SLUG" \
  --work-dir "$WORKDIR" \
  --preview
```

No gate required for preview. Full still needs gate.

### 3.4 Second closed product (r221) — same pattern

```bash
SLUG=r221-eye-mirror-phase-advect-peak
SOURCE=sources/approved/r221-eye-mirror.png
# sourceSha 711863ff4fe5f096caa10823cca5198f6cfd2f6be6702205c35573c0e1437be8
# sceneSha  1204cde756434749f74eaf787d0aac6fb684c0f34965e585a11d1267201e2a91
# gate is REJECT + humanOverride — still valid for full export
```

Follow §3.2 with these variables. **Do not remove humanOverride** from the gate file.

---

## 4. Management — when / how to lock a new final

### 4.1 When you MUST create/update a lock pack

Create or refresh a lock **only when all are true**:

1. Isaac accepted the look (“맘에든다 / 이걸로 최종 / 풀렌더” 등), **and**
2. Gate is **PASS**, or Isaac explicitly allowed **humanOverride**, **and**
3. Full export succeeded (or Isaac asked to lock the scene even if full runs later), **and**
4. You will need the same product on another machine or after wiping `out/`.

Do **not** lock every preview experiment.

### 4.2 Close-out checklist (agent must complete every box)

Work from the successful local work dir, e.g. `out/manual-runs/<slug>/`.

```text
[ ] A. Confirm closed slug name (rNNN-…) with case ledger entry in docs/video-os/01-CREATE-OS.md
[ ] B. Gate file exists: out/manual-runs/<slug>/psychedelic-gate.json
[ ] C. Gate permit: status PASS OR (REJECT + humanOverride.approvedBy == "isaac")
[ ] D. scene sha in gate == sha256(out/manual-runs/<slug>/scene.json)
[ ] E. Copy source:
      cp out/manual-runs/<slug>/source.png sources/approved/<short-name>.png
[ ] F. Copy lock scene:
      cp out/manual-runs/<slug>/scene.json recipes/locks/<slug>.json
[ ] G. Copy gate:
      cp out/manual-runs/<slug>/psychedelic-gate.json recipes/locks/<slug>.gate.json
[ ] H. Compute shas and update recipes/locks/manifest.json (see §4.3)
[ ] I. Update docs/video-os/01-CREATE-OS.md approved finals table → git paths (not only out/layered)
[ ] J. Append/update CASE in §9 with lock paths + learning
[ ] K. git add only: sources/approved/<png> recipes/locks/* docs/video-os/01-CREATE-OS.md (+ AGENTS if needed)
[ ] L. git status: ensure NO out/**, NO *.mp4, NO *.wav staged
[ ] M. Commit + push (if Isaac asked to push)
```

### 4.3 manifest.json entry schema

Every `approved[]` item **must** include:

```json
{
  "slug": "r242-handface-phase-river-gatepass",
  "source": "sources/approved/r242-hand-face.png",
  "sourceSha256": "<64 hex of PNG bytes>",
  "lock": "recipes/locks/r242-handface-phase-river-gatepass.json",
  "sceneSha256": "<64 hex of lock JSON file bytes>",
  "gate": "recipes/locks/r242-handface-phase-river-gatepass.gate.json",
  "audio": "<track title + artist + start; or 'none'>",
  "scaffold": "<exact scaffold command>",
  "exportFull": "<exact full export command>",
  "notes": "<gate status, key knob deltas, warnings>"
}
```

**How to compute shas (required):**

```bash
python3 - <<'PY'
import hashlib
from pathlib import Path
for p in [
  "sources/approved/r242-hand-face.png",
  "recipes/locks/r242-handface-phase-river-gatepass.json",
]:
  print(p, hashlib.sha256(Path(p).read_bytes()).hexdigest())
PY
```

`sceneSha256` is hash of the **lock file on disk**, not of a prettified re-dump.  
After editing JSON in an editor, re-hash and update gate if scene bytes changed (see §5.2).

### 4.4 What never goes into the lock pack

| Do not commit | Why |
|---------------|-----|
| `*.mp4` | Large; rebuild |
| `*.wav` / audio stems | Copyright + size |
| `layers/*` | Regenerated by scaffold |
| `stills/*` | Regenerated |
| `out/**` | Entire tree gitignored |
| Random intermediate rNNN previews | Only closed products |

### 4.5 Relation to golden recipes

| Situation | Use |
|-----------|-----|
| Brand-new source, first experiment | `recipes/golden/<type>.json` via scaffold |
| Closed product re-render | `recipes/locks/<slug>.json` only |
| Promote a lock into a new golden | **Isaac must approve** — rare; usually locks stay separate |

Dense-pattern finals often start from golden r139 then diverge (e.g. clamp 0.26). Those deltas live in the **lock**, not by silently editing golden.

---

## 5. Maintenance

### 5.1 Healthy state checks (run after pull / before claiming repro works)

```bash
# 1) Every manifest entry files exist
python3 - <<'PY'
import json, hashlib
from pathlib import Path
m=json.loads(Path("recipes/locks/manifest.json").read_text())
for e in m["approved"]:
  for k in ("source","lock","gate"):
    p=Path(e[k]); assert p.is_file(), f"missing {k}: {p}"
  sh=hashlib.sha256(Path(e["source"]).read_bytes()).hexdigest()
  assert sh==e["sourceSha256"], (e["slug"], "source sha drift", sh, e["sourceSha256"])
  lh=hashlib.sha256(Path(e["lock"]).read_bytes()).hexdigest()
  assert lh==e["sceneSha256"], (e["slug"], "scene sha drift", lh, e["sceneSha256"])
  g=json.loads(Path(e["gate"]).read_text())
  assert g["scene"]["sha256"]==lh, (e["slug"], "gate scene sha != lock file")
  ok=g["status"]=="PASS" or (g["status"]=="REJECT" and g.get("humanOverride",{}).get("approvedBy")=="isaac")
  assert ok, (e["slug"], "gate not permitted", g["status"])
  print("OK", e["slug"], g["status"])
print("all locks healthy")
PY
```

If this fails: **fix before any full render.**

### 5.2 Changing a lock (only with Isaac + new defect)

If knobs must change on a **closed** product:

1. Get Isaac confirmation (new defect).
2. Edit work-dir `scene.json` (or start from lock), preview, QA, **re-run gate**.
3. On PASS (or new override): overwrite  
   `recipes/locks/<slug>.json` and  
   `recipes/locks/<slug>.gate.json`
4. Recompute `sceneSha256` in manifest (gate’s `scene.sha256` must match new lock bytes).
5. Update CASE ledger (“lock revised because …”).
6. Commit. Old MP4s in local `out/` are stale — re-export.

**Do not** edit only the lock JSON without regenerating gate. Export will fail sha check or ship an unapproved look.

### 5.3 Adding a third closed product

1. Finish pipeline under OS (`docs/video-os/01-CREATE-OS.md`) until closed.
2. Run §4.2 checklist with new slug + new source filename.
3. Append to `manifest.json` `approved` array.
4. Do not delete prior locks unless Isaac asks to retire them.

### 5.4 Retiring a lock

1. Isaac confirms retire.
2. Move files to `recipes/locks/_retired/` **or** delete + note in CASE ledger (prefer keep with `"status":"retired"` in manifest if you extend schema).
3. Remove from active `approved` list or mark retired.
4. Leave `sources/approved` PNG if other locks share it.

### 5.5 Source file hygiene

- Prefer **lossless** copy of the production PNG (no re-export through JPEG).
- Resolution for current products: typically **1632×2912**. Scaffold scales `phaseFlowPx` only if width differs a lot from 1632 — still **re-cp lock to scene** after scaffold.
- Renaming a source file: update manifest `source` path; sha unchanged if bytes unchanged.

### 5.6 Gate file hygiene

Minimum fields used by full-render guard:

```json
{
  "status": "PASS",
  "scene": { "sha256": "<64 hex matching lock file>" },
  "humanOverride": {
    "approvedBy": "isaac",
    "reason": "…",
    "at": "ISO-8601"
  }
}
```

`humanOverride` required only when `status` is `REJECT`.  
Extra fields (metrics, paths) may remain; do not strip if unsure.

**Portable note:** absolute paths inside gate JSON are historical. Guard only enforces `status` + `scene.sha256` vs current `scene.json` file.

### 5.7 Repo size discipline

| OK growth | Bad growth |
|-----------|------------|
| ~6–12 MB PNG per closed source | Committing finals (90MB+ each) |
| ~3–5 KB lock + gate per slug | Committing all experiment work-dirs |
| Occasional golden recipe | Duplicating same PNG under many names |

If clone size balloons: audit for accidental `out/` or video adds.

### 5.8 Version / doc pointers to keep in sync

When locks change, touch:

1. `recipes/locks/manifest.json`
2. `docs/video-os/01-CREATE-OS.md` §1 approved tables + §9 CASE
3. This playbook §9 inventory (table below)
4. Commit message: `chore(locks): …` or `docs(locks): …`

---

## 6. Failure modes (symptom → cause → fix)

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `gate report does not match the current scene.json` | Forgot `cp lock → scene.json` after scaffold | §3.2 step 2 |
| `gate did not pass … humanOverride required` | REJECT without override | Fix look/knobs + re-gate; or Isaac override only if allowed |
| `source not found` | Wrong path / not pulled | `git pull`; check `sources/approved` |
| Visual differs after rebuild | Wrong source (recompressed) / wrong lock / edited golden by mistake | Verify shas §3.2 step 0; use lock not golden |
| `phaseFlow` / motion feels off | Used golden instead of lock; or didn't pin scene | Use lock; re-cp scene |
| Gate REJECT `source-local-drift` | clamp too loose / sat too high | Single-axis: lower `sourceColorClamp.maxDrift` (often ≤0.26 for dense-pattern finals); re-preview; re-gate (R-056) |
| Agent commits MP4 | Ignored policy | `git reset`; unstage; never add `out/` |
| Two machines diverge | One used dirty local scene not lock | Always rebuild from lock + verify sha |
| Full export blocked after “lock only” edit | scene sha changed, gate stale | Re-run gate on a preview from that scene; replace `.gate.json` |

---

## 7. Agent decision tree

```
Is the task about a CLOSED product (r221, r242, …)?
├─ YES, re-export / other PC
│    → §3 rebuild. Do not invent knobs.
├─ YES, “fix a bug” on closed product
│    → Isaac defect? If no, STOP and ask.
│    → If yes, §5.2 revise lock (new gate mandatory).
└─ NO, new source / experiment
     → OUTPUT_GAP_ANALYSIS runbook + recipes/golden/*
     → When Isaac closes it → §4 lock checklist
```

```
Isaac said “맘에든다” + wants final
├─ Run gate on preview
├─ PASS → full export → §4 lock pack → commit sources+locks
└─ REJECT → fix fail-code (prefer single axis) → re-preview → re-gate
     └─ still REJECT and Isaac says “override OK / 그냥 이걸로”
          → humanOverride → full → lock (document override in CASE)
```

```
What to git-add after close?
├─ sources/approved/<png>
├─ recipes/locks/<slug>.json
├─ recipes/locks/<slug>.gate.json
├─ recipes/locks/manifest.json
├─ docs/video-os/01-CREATE-OS.md (CASE + approved table)
└─ NEVER out/**, mp4, wav, layers
```

---

## 8. Quick command cheat sheet

```bash
# Health
python3 -c "..."   # paste §5.1 script

# Rebuild r242 full
# (see §3.2)

# Scaffold only
npx tsx scripts/scaffold-layered-run.ts \
  --source sources/approved/<png> \
  --slug <slug> \
  --recipe recipes/locks/<slug>.json \
  --work-dir out/manual-runs/<slug>

# Pin scene
cp recipes/locks/<slug>.json out/manual-runs/<slug>/scene.json

# Full
npx tsx scripts/export-layered.ts \
  --title <slug>-final \
  --work-dir out/manual-runs/<slug> \
  --full-res \
  --gate-report recipes/locks/<slug>.gate.json

# Gate a preview (new work, not closed rebuild)
npm run gate:psychedelic -- \
  --candidate out/layered/*<slug>*/<slug>-preview.mp4 \
  --source out/manual-runs/<slug>/source.png \
  --reference "$REF1" --reference "$REF2" \
  --work-dir out/manual-runs/<slug> \
  --axis <axis> --primitive <primitive>
# REF1/REF2: see docs/video-os/01-CREATE-OS.md §2
```

---

## 9. Current inventory (update when locks change)

| Slug | Source file | Gate | Notes |
|------|-------------|------|-------|
| `r221-eye-mirror-phase-advect-peak` | `sources/approved/r221-eye-mirror.png` | REJECT + humanOverride | figure-vivid; audio: Getting That Feeling (local) |
| `r242-handface-phase-river-gatepass` | `sources/approved/r242-hand-face.png` | PASS | dense-pattern; clamp 0.26; audio: Eating Glue (local) |
| `r274-dual-abstract-a-beam-focus` | `sources/approved/r274-dual-abstract-beam.png` | PASS | beam-focus godRays+bloom+mask; audio: **Sapana @2:58** (local) |

TODO (not locked in git yet): woodblock r139, mushroom-hand r65 — local archives only.

Authoritative shas: always `recipes/locks/manifest.json`, not this table alone.

---

## 10. Definition of done

### Rebuild task

- [ ] §5.1 health script pass  
- [ ] scaffold + scene pin + sha match  
- [ ] full MP4 exists under `out/layered/`  
- [ ] (if requested) audio muxed with Isaac’s track  
- [ ] no accidental git commits of media  

### Lock/close task

- [ ] §4.2 checklist complete  
- [ ] manifest shas match files  
- [ ] gate permits full export  
- [ ] OUTPUT_GAP CASE + approved table updated  
- [ ] push only if Isaac asked  

### This documentation

- [ ] Agent can rebuild r242 from a clean clone using only this playbook + repo  
- [ ] Agent knows what never to commit  
- [ ] Agent knows closed vs experiment  

---

## 11. Related docs

| Doc | Use for |
|-----|---------|
| `docs/video-os/01-CREATE-OS.md` | Aesthetics, QA thresholds, gate refs, case ledger, type→recipe |
| `AGENTS.md` | Entry order + short rebuild snippet |
| `recipes/locks/README.md` | Short pointer |
| `recipes/golden/README.md` | New-source golden templates |
| `SESSION_HANDOFF_2026-07-15.md` | Historical session status (may lag locks) |

**Priority:** `docs/video-os/01-CREATE-OS.md` (how to make loops) + **this playbook** (how to store/rebuild closed ones).
