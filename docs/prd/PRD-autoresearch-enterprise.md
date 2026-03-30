# PRD: Autoresearch Enterprise v1 — Loop Correctness First

**Version**: 1.0
**Author**: Codex
**Date**: 2026-03-29
**Status**: Draft — Re-approval Required
**Supersedes**: v0.2 (withdrawn)
**Size**: XL

**Canonical Reference Asset**
- Path: `/Users/isaac/projects/video-art/source.mp4`
- Current metadata: 1080x1080, 30fps, 10s, ~16MB
- This asset is the single fixed reference for autoresearch until a new PRD explicitly changes it.

**Current Repository Baseline (2026-03-29)**
- `npm test`: 3 failed, 2485 passed, 15 skipped
- `scripts/research/pipeline-runner.ts` already exists and already applies research-mode export caps
- `scripts/research/pipeline-runner.test.ts` already exists
- Recent local research-mode sample: pipeline stage completed in ~64s on the canonical asset
- Current calibration artifact exists, but the loop contract is not yet trustworthy enough for unattended operation

---

## 1. Problem Statement

### 1.1 Background
Autoresearch is supposed to be a self-improving loop:

1. Start from a fixed reference and fixed evaluation contract.
2. Change only the research configuration.
3. Run the full pipeline.
4. Evaluate.
5. Keep or discard automatically.
6. Repeat without human cleanup.

The repository no longer matches the assumptions in the previous enterprise PRD. The remaining work is not "finish the pipeline-runner" but "make the loop itself trustworthy and autonomous."

### 1.2 Actual Problems To Solve
1. **The prior PRD baseline is stale.**
   The repo is no longer in a "47 failing tests, no pipeline-runner tests, no research export caps" state.
2. **The evaluation contract is not yet loop-safe.**
   Calibration, gate semantics, and baseline comparison can drift apart.
3. **Autonomous run hygiene is under-specified.**
   Clean-tree enforcement, generated artifacts, local inputs, and local secrets are not fully encoded as loop invariants.
4. **The canonical reference asset is not first-class in the PRD.**
   Without an explicit reference contract, recalibration and experiment logs are not reproducible.
5. **There are still concrete correctness defects in the repo.**
   Current known failures are concentrated, but they must be driven to zero from the live repo state, not from an outdated baseline.

### 1.3 Why This Blocks a Perfect Self-Improvement Loop
- A loop is not "production ready" if its baseline and gate contract can disagree.
- A loop is not autonomous if it can dirty its own working tree and fail on the next run.
- A loop is not reproducible if the reference asset can drift silently.
- A loop is not trustworthy if the PRD is written against an old repository snapshot.

---

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: Re-baseline the PRD against the live repository state, not against historical failure counts.
- [ ] G2: Make the evaluation contract loop-safe:
  calibration, baseline, gate semantics, and keep/discard must stay consistent.
- [ ] G3: Encode the canonical reference asset as a hard invariant.
- [ ] G4: Make the loop self-hygienic:
  two consecutive unattended `research:run` executions must succeed without manual cleanup, stash, or file deletion.
- [ ] G5: Drive the current repository from 3 failing tests to 0 failing tests.
- [ ] G6: Prove the loop end-to-end on the canonical reference:
  `prepare -> calibrate --runs 3 -> run -> run` with no manual intervention between the two `run` steps.
- [ ] G7: Treat performance as a measured regression budget, not as an assumed greenfield optimization problem.

### 2.2 Non-Goals
- NG1: Bayesian optimization, grid search, or other new search strategies
- NG2: Multi-reference evaluation
- NG3: CI/CD pipeline design
- NG4: New metrics beyond what is required to make the current loop contract correct
- NG5: Productizing a UI; this remains a local CLI workflow

---

## 3. User Stories & Acceptance Criteria

### US-1: Canonical Reference Contract
**As a** researcher, **I want** the reference asset to be fixed and machine-verifiable, **so that** calibration and results are reproducible.

**Acceptance Criteria**
- [ ] AC-1.1: The canonical reference is `/Users/isaac/projects/video-art/source.mp4`.
- [ ] AC-1.2: `prepare` records reference metadata in `.cache/research/reference/metadata.json` including width, height, fps, duration, sourcePath, extractedAt, and a deterministic fingerprint or checksum.
- [ ] AC-1.3: The PRD, `program.md`, and runtime metadata all agree that there is exactly one reference asset for this phase.
- [ ] AC-1.4: The loop validates the reference asset before calibration/run:
  path exists, metadata matches expected shape, and cache is derived from the same asset.
- [ ] AC-1.5: If the reference asset changes, the system requires a fresh `prepare` and a fresh `calibrate` before any `research:run`.

### US-2: Evaluation Contract Correctness
**As a** developer, **I want** calibration, gate semantics, and keep/discard decisions to share one versioned contract, **so that** the loop never compares incompatible scores.

**Acceptance Criteria**
- [ ] AC-2.1: `calibration.json` stores:
  `modelVersion`, `evalSchemaVersion`, `gateThreshold`, and `referenceFingerprint`.
- [ ] AC-2.2: `baseline-config.json` stores the same contract fields as the calibration artifact.
- [ ] AC-2.3: `research:run` aborts before execution if any of the following mismatch:
  `modelVersion`, `evalSchemaVersion`, `gateThreshold`, or `referenceFingerprint`.
- [ ] AC-2.4: Calibration and run-once use the same score definition for baseline comparison.
  No allowed state exists where the stored baseline is positive but the same contract would force `qualityScore = 0` without an explicit incompatibility error.
- [ ] AC-2.5: If the baseline itself is incompatible with the current gate semantics, the loop must fail early with a recalibration message instead of silently discarding every run.
- [ ] AC-2.6: Any change to `evaluate.ts`, `metrics/*`, or gate threshold requires recalibration by contract, not by convention.
- [ ] AC-2.7: VMAF availability/fallback behavior is part of the evaluation contract and is treated as such in calibration and runtime validation.

### US-3: Autonomous Workspace Hygiene
**As a** researcher, **I want** the loop to avoid poisoning its own workspace, **so that** repeated unattended runs continue to work.

**Acceptance Criteria**
- [ ] AC-3.1: Research runs execute in a dedicated autoresearch branch or isolated worktree, not on top of arbitrary user dirt.
- [ ] AC-3.2: Generated prepared input artifacts are written under an ignored cache path, not into the project root.
- [ ] AC-3.3: `resolveInputImagePath()` does not become ambiguous because of loop-generated files.
- [ ] AC-3.4: The loop has a preflight check for required local state:
  `.env` or `REPLICATE_API_TOKEN`, `source.mp4`, input image, prepared reference cache, and calibration artifact.
- [ ] AC-3.5: Two consecutive `npm run research:run` executions succeed without manual stash, manual delete, or manual branch repair.
- [ ] AC-3.6: The branch/tag behavior is deterministic. The loop must not silently jump to a surprising branch name without recording that decision.

### US-4: Live Repository Correctness
**As a** developer, **I want** the remaining repository defects fixed from the current live baseline, **so that** the PRD tracks real work instead of historical work.

**Acceptance Criteria**
- [ ] AC-4.1: `npm test` reports 0 failed tests.
- [ ] AC-4.2: The current `scene-generator.test.ts` seamless-loop failure is fixed.
- [ ] AC-4.3: The current `config-integration.comprehensive.test.ts` expectations are reconciled with the live `ResearchConfigSchema`.
- [ ] AC-4.4: Existing passing `pipeline-runner` behavior is preserved; the PRD must not reopen already-shipped functionality without evidence.
- [ ] AC-4.5: Any reopened work item must cite a current failing test, current runtime defect, or current contract violation.

### US-5: End-to-End Proof of Autonomy
**As a** researcher, **I want** a full unattended proof run, **so that** the loop is demonstrated rather than assumed.

**Acceptance Criteria**
- [ ] AC-5.1: `npm run research:prepare -- source.mp4` succeeds against the canonical reference.
- [ ] AC-5.2: `npm run research:calibrate -- --runs 3` succeeds 3/3 and writes the full versioned contract artifact.
- [ ] AC-5.3: The first `npm run research:run` completes without manual cleanup.
- [ ] AC-5.4: The second `npm run research:run` also completes without manual cleanup and without workspace ambiguity.
- [ ] AC-5.5: `results.tsv` clearly records run number, status, elapsed time, and the contract version used for the decision.
- [ ] AC-5.6: If the loop is not safe to continue autonomously, the system fails with an explicit reason before entering the forever-loop phase.

### US-6: Performance as Regression Guard
**As a** researcher, **I want** stage timings recorded and bounded, **so that** the loop remains practical without optimizing the wrong thing.

**Acceptance Criteria**
- [ ] AC-6.1: The loop records stage-level timing for decomposition, export, and evaluation.
- [ ] AC-6.2: The PRD uses measured current runtime, not inherited historical numbers, as the baseline.
- [ ] AC-6.3: Full run time on the canonical reference is tracked as a regression budget.
  Initial target: no worse than current measured behavior by more than 20%.
- [ ] AC-6.4: Stretch target: median full-run time of 3 consecutive runs <= 180s.
- [ ] AC-6.5: Performance work is not allowed to bypass or weaken correctness invariants.

---

## 4. Technical Design

### 4.1 Architecture Overview

```
Canonical Reference Contract
  source.mp4
    -> prepare
    -> reference metadata + keyframes

Evaluation Contract
  evaluate.ts + metrics/* + gateThreshold
    -> evalSchemaVersion
    -> calibration.json
    -> baseline-config.json

Autonomous Execution Contract
  isolated autoresearch branch/worktree
    -> preflight
    -> pipeline-runner
    -> evaluate
    -> keep/discard
    -> repeat

Observability Contract
  results.tsv
  crash-count.json
  calibration.json
  console/stage timings
```

### 4.2 Data Model Changes

| Artifact | New / Required Fields | Why |
|----------|------------------------|-----|
| `.cache/research/reference/metadata.json` | canonical source path, width, height, fps, duration, checksum/fingerprint | reference reproducibility |
| `.cache/research/calibration.json` | `evalSchemaVersion`, `gateThreshold`, `referenceFingerprint` | detect incompatible calibration |
| `.cache/research/baseline-config.json` | same contract fields as calibration | prevent stale baseline promotion |
| `results.tsv` | contract version or schema id column | forensic traceability |

### 4.3 API / CLI Design
N/A — local CLI workflow.

### 4.4 Key Technical Decisions

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| Reference asset | single canonical `source.mp4` | reproducibility first |
| Loop gating | versioned evaluation contract | avoid stale baseline comparisons |
| Workspace model | isolated autoresearch workspace | avoid user dirt and self-generated dirt |
| Prepared input location | ignored cache path, not repo root | prevent self-poisoning |
| VMAF handling | part of evaluation contract | affects gate/calibration semantics |
| Performance policy | regression guard after correctness | current PRD was optimizing stale assumptions |

### 4.5 Implementation Order

```
Phase 0: Contract correctness
  US-1 Reference contract
  US-2 Evaluation contract
  US-3 Workspace hygiene

Phase 1: Current repo correctness
  US-4 Remaining failing tests

Phase 2: Proof
  US-5 End-to-end autonomous proof

Phase 3: Optimization
  US-6 Performance regression guard / stretch goal
```

---

## 5. Edge Cases & Error Handling

| # | Scenario | Required Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | Reference file missing or replaced | hard-fail before calibration/run with explicit reference contract error | P0 |
| E2 | Reference cache derived from different source | hard-fail and require `research:prepare` | P0 |
| E3 | Calibration artifact exists but eval schema changed | hard-fail and require recalibration | P0 |
| E4 | Baseline artifact exists but contract differs from calibration | hard-fail and require re-promotion/recalibration | P0 |
| E5 | Run workspace is dirty before execution | refuse run unless using isolated research workspace policy | P1 |
| E6 | Generated prepared image pollutes repo root | impossible by design; artifact must live in ignored cache | P0 |
| E7 | Missing Replicate token / `.env` | fail during preflight with one actionable message | P1 |
| E8 | Chrome missing | fail during preflight/export with install guidance | P1 |
| E9 | ffmpeg missing | fail during preflight/evaluate with install guidance | P1 |
| E10 | libvmaf availability changed since calibration | invalidate contract or explicitly mark fallback mode in schema | P1 |
| E11 | 5 consecutive crashes | halt loop with recent error summary | P1 |
| E12 | SIGINT during research mode | restore config + restore scene patch + exit cleanly | P1 |
| E13 | Unexpected branch/tag transition | log the chosen branch/tag and keep behavior deterministic | P2 |

---

## 6. Security & Permissions

### 6.1 Authentication
- Replicate token is loaded from local environment or `.env`
- Token must never be written into artifacts or logs

### 6.2 Authorization
N/A

### 6.3 Data Protection
- `.env` gitignored
- `source.mp4`, `input.png`, `.cache/research/`, and generated research artifacts gitignored
- Research automation must not mutate unrelated user files

---

## 7. Performance & Monitoring

### 7.1 Baseline Policy
- Do not use inherited numbers from a previous PRD.
- Measure current live runtime on the canonical reference.
- Treat decomposition/export/evaluation separately.

### 7.2 Monitored Signals
- `results.tsv`: status, elapsed time, contract version
- `calibration.json`: baseline, sigma, deltaMin, contract version
- `crash-count.json`: consecutive failures
- console logs: stage entry/exit and actionable failure messages

### 7.3 Targets

| Metric | Current Policy | Target |
|--------|----------------|--------|
| Full run time | measured from live repo | <= current baseline + 20% regression budget |
| Stretch full run time | optional optimization goal | <= 180s median over 3 runs |
| Consecutive unattended runs | must be demonstrated | 2/2 success |
| Test failures | live repo baseline | 0 |

---

## 8. Testing Strategy

### 8.1 Unit Tests
- reference metadata validation
- eval schema version mismatch handling
- baseline/calibration contract mismatch handling
- prepared artifact path logic
- input resolution logic ignoring/generated artifacts
- scene-generator seamless-loop correction
- config integration expectations aligned to live schema

### 8.2 Integration Tests
- `prepare -> metadata validation`
- `calibrate -> versioned artifact generation`
- `run-once -> preflight -> pipeline -> evaluate -> keep/discard`
- two-run consecutive execution without manual cleanup

### 8.3 End-to-End Proof
- Canonical reference: `/Users/isaac/projects/video-art/source.mp4`
- `npm run research:prepare -- source.mp4`
- `npm run research:calibrate -- --runs 3`
- `npm run research:run`
- `npm run research:run`

The PRD is not considered satisfied until that sequence completes on the live repo without human cleanup between the two `run` commands.

---

## 9. Rollout Plan

### 9.1 Migration Strategy
- Withdraw v0.2 as an implementation source of truth
- Re-approve only this v1 document or its successor

### 9.2 Feature Flag
N/A

### 9.3 Rollback Plan
- Contract changes are local artifact/schema changes plus code changes
- Keep commits small and phase-aligned so individual regressions can be reverted cleanly

---

## 10. Dependencies & Risks

### 10.1 Dependencies
| Dependency | Status | Risk |
|-----------|--------|------|
| `source.mp4` canonical asset | available | without it, no reproducible loop |
| ffmpeg | required | prepare/evaluate blocked |
| Puppeteer + Chrome | required | export blocked |
| Replicate API token | required | decomposition blocked |
| libvmaf | optional but contract-sensitive | fallback mode must be explicit |

### 10.2 Risks
| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Old calibration reused against new metric semantics | High | High | schema versioning + hard-fail |
| Workspace self-poisoning via generated files | Medium | High | cache relocation + isolated workspace |
| Reference drift between docs and runtime | Medium | High | canonical reference invariant |
| PRD drift from live repo state | High | High | re-baseline before approval |
| Performance work regresses correctness | Medium | Medium | phase ordering: correctness first |

---

## 11. Success Metrics

| Metric | Success Condition |
|--------|-------------------|
| Reference reproducibility | reference asset path + metadata + cache all agree |
| Loop contract safety | incompatible calibration/baseline cannot silently run |
| Workspace autonomy | 2 consecutive unattended runs succeed |
| Repository correctness | `npm test` = 0 fail |
| E2E proof | `prepare -> calibrate(3) -> run -> run` succeeds |
| Observability | artifacts/logs show contract version and timings |

---

## 12. Open Questions

- OQ-1: Scalar hard gate를 유지할 것인가, 아니면 calibrated per-metric floor로 바꿀 것인가?
- OQ-2: `input.png`를 계속 독립 입력으로 둘 것인가, 아니면 canonical `source.mp4`에서 파생하는 입력 계약으로 통합할 것인가?

These questions must be resolved before the document can return to `Approved`.
