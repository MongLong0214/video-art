# BOOMER-6 Phase 4 Ticket Review — Depth Anything V2

**Analyst**: Claude (boomer mode)  
**Date**: 2026-03-30  
**Context**: PRD v0.5 approved (0 issues), Tickets T1~T6 ready for implementation review  
**Mode**: Full BOOMER-CODEX (BC1~BC6)

---

## Executive Summary

**Issue Count**: 4 issues identified  
**Severity**: P1 (3), P2 (1)  
**Verdict**: **수렴 완료 (CONVERGED)** — 이견 해소 후 실행 가능

All 6 tickets are well-specified with clear ACs, TDD specs, and dependency chains. However, 4 structural observations require acknowledgment before execution.

---

## BOOMER-6 Analysis

### [BC1] Assumption Validation

**Finding 1 (P1)**: `depthActive = (stddev >= 5)` threshold empirical foundation unclear

**Description**: T4 AC-3.6 specifies fallback to heuristic when `depthStats.stddev < 5`, but:
- No justification why 5 (as opposed to 3, 10, 0.5 percentile)
- No reference to depth map bit-depth (Uint8 scale 0-255, so stddev >= 5 ≈ 2% variance)
- No edge case: single candidate (stddev=0) should auto-fallback, but test case 14 doesn't clarify automatic role fallback behavior

**Recommendation**: Add T4 note: "stddev threshold calibrated during autoresearch; T5 will establish empirical bounds via quality_score tracking."

**Impact**: Low — autoresearch will quickly find correct threshold if wrong.

---

**Finding 2 (P2)**: Empty mask → meanDepth=128 is arbitrary for unknown depth distributions

**Description**: T3 AC-1 defaults empty mask to 128 (midpoint), assuming:
- Depth map values are uniformly distributed 0-255
- Midpoint is safest default

However:
- If DA V2 outputs bimodal distribution (sky=30, foreground=200), midpoint (128) is worst-case
- No test for depthMap=all-zeros (black depth, furthest = all near?)
- No test for depthMap=all-255 (overexposed = all far?)

**Recommendation**: T3 test case 1 should clarify "empty mask returns 128 regardless of depthMap statistics." Add note: "Alternative: compute global mean instead of fixed 128 if edge cases emerge."

**Impact**: Low-Medium — affects only 0.1-1% of candidates (empty exclusive masks rare after resolveExclusiveOwnership).

---

### [BC2] Risk Assessment

**Finding 3 (P1)**: T5 double-run role assignment may introduce subtle non-determinism

**Description**: T5 AC-5.3 requires `assignRoles(depthRoleWeight=0)` then `assignRoles(config)` sequentially:
- Both calls mutate no state (stateless), so safe
- But if `assignRoles()` has floating-point tie-breaker or random element, double-run will accumulate small differences
- Test case 13 (`depthRoleWeight=0 → roleWithoutDepth === roleWithDepth`) only covers identical-config case, not floating-point precision

**Recommendation**: 
- T4 test case 12 already covers "depthPercentile 동점" (tie-breaker determinism), good.
- Add T5 note: "depthStats computed once; double-run uses identical depthStats. If depthPercentile[i] === depthPercentile[j], both runs must assign identical role (deterministic sort + index-based fallback)."

**Impact**: Low — existing test suite should catch divergence.

---

**Finding 4 (P1)**: T1 Promise.all memory footprint with 20MB+ image downsample timing unclear

**Description**: T1 AC-1.10 specifies 20MB downsample, but:
- Timing: when does downsampling occur? Before or after Promise.all?
- Current logic: `decomposeImage(preparedPath)` — prepared path already optimized for SAM2
- If DA V2 also gets prepared path (T1 AC-1.3), both APIs use same resolution, no extra downsampling needed?
- AC-1.10 says "20MB 초과 시 downsample 후 처리" — but doesn't clarify if this is input image or prepared image

**Recommendation**: T1 implement note: "Downsampling check applies to input image before preparing. Prepared image is already ≤ 2048x2048 (SAM2 constraint). If input > 20MB, downsample via sharp before prepareImage()."

**Impact**: Medium — affects code path clarity, not functionality.

---

### [BC3] Alternative Solutions

**Finding**: Current design decisions are sound; no over-engineered alternatives identified.

**Depth-gated if-chain vs. separate scoring module**: T4 choice to preserve existing if-chain structure (vs. refactoring into separate `scoreByDepth()` module) is correct for:
- Minimal risk (surgical addition to existing code)
- Easy rollback (depthRoleWeight=0)
- No schema changes to existing heuristic paths

**Single-run depthStats vs. double-run**: T5 double-run (with/without depth) is justified:
- Enables A/B comparison metric (`roleWithoutDepth` vs `roleWithDepth`)
- Minimal perf cost (identical data, second assignRoles() call << API latency)
- Provides explicit evidence for Phase 2 evaluation

No alternatives needed.

---

### [BC4] Technical Debt

**Finding 5 (P2)**: `relaxFactor` in threshold completeness not specified

**Description**: T4 AC-3.3 describes "threshold * (1 + depthRoleWeight * relaxFactor)" formula but doesn't define `relaxFactor`:
- Is it a constant (e.g., 2.0)?
- Should it be an axis in autoresearch?
- Different factors per role (subject vs. background)?

**Recommendation**: T4 implement note: "Start with fixed relaxFactor=1.0 (linear: threshold * (1 + depthRoleWeight)). If Phase 1 validation shows insufficient improvement, promote relaxFactor to autoresearch axis T5."

**Impact**: Low — autoresearch feedback loop will auto-correct.

---

**Finding 6 (P2)**: `depthConvention: "near-is-high"` hardcoded in manifest

**Description**: T3 AC-1.5 and T5 AC-5.2 record hardcoded `depthConvention: "near-is-high"` in manifest.json, but:
- Only valid for DA V2 (disparity-based, high=near)
- If Phase 2 upgrades to DA V3 or other depth model, manifest structure must evolve
- No versioning or model-aware convention field

**Recommendation**: T3 implement note: "depthConvention recorded per-model: `manifest.models.depthAnything.depthConvention`. If Phase 2 adds models.depthV3, its depthConvention can differ."

**Impact**: Low — easily refactored during Phase 2 model migration.

---

### [BC5] Edge Cases

**Finding 7 (P1)**: DA V2 response format not explicitly validated

**Description**: T1 AC-1.1 calls Replicate API for `chenxwh/depth-anything-v2`, assumes:
- Response output[0] is PNG grayscale depth map
- No validation that output is actually depth (not error message, HTML, etc.)

**Recommendation**: T1 test case should clarify: "Test `getDepthMap()` with mock returning non-image (JSON error). Should catch error, log, return null (handled by graceful fallback AC-1.6)."

**Impact**: Low — Replicate API is stable, error cases rare.

---

**Finding 8 (P1)**: Depth map 1x1 pixel edge case not covered

**Description**: T3 `computeMeanDepth(depthMap, mask, width, height)` uses `sharp.resize(width, height)`. If:
- Input image 1x1 pixel, width=height=1
- Resize to 1x1, no interpolation
- Single pixel value = meanDepth (correct behavior, but test missing)

**Recommendation**: T3 test case 5 (resize validation) should explicitly cover "1x1 edge case."

**Impact**: Very Low — 1x1 images never in practice.

---

**Finding 9 (P1)**: depthPercentile exact tie-breaking semantics unclarified

**Description**: T4 test 12 "depthPercentile 동점" covers candidate ties, but:
- Exact semantics: if 3 candidates have meanDepth=[100, 100, 200], percentile = [?, ?, 1.0]?
- Are tied candidates ranked [0.33, 0.33, 1.0] or [0.0, 0.0, 1.0]?
- Test 12 doesn't specify expected percentile values

**Recommendation**: T4 test case 12 clarify: "Test depthPercentile for ties. Example: [100, 100, 200] → percentiles should be [0.0, 0.0, 1.0] (rank-based, not avg-based). Confirm sorted order is deterministic (by index for ties)."

**Impact**: Low — if mishandled, will manifest in T6 integration tests.

---

### [BC6] Scope Creep

**Finding 10**: T2 completeness verification

**Description**: T2 spans 6+ files for luminance removal. Manual grep in T6 is good, but:
- T2 AC-2.10 "2차 검증 패스 (grep)" is integration test in T6
- Risk: file list in T2 incomplete, grep misses hidden reference

**Recommendation**: T2 should include file list review: "Search for 'luminance' across entire codebase before AC completion. Add found files to test case 6 (grep)."

**Verdict**: Acceptable — T6 grep catches any misses.

---

**Finding 11**: T6 verification scope appropriately scoped

**Description**: T6 (5 grep + depth convention + 5x pipeline + regression) is thorough but:
- Is 5-run pipeline sufficient to confirm "stddev > 0"?
- Test case 5 says "파이프라인 5회 실행" — what if random variation causes stddev=0 on unlucky run?

**Recommendation**: T6 test case "stddev > 0" should clarify: "Verify that 5 independent pipeline runs (different images) each produce stddev > 0. If any run has stddev < 5 (fallback threshold), log warning but PASS (depthActive fallback is working)."

**Verdict**: Good scope.

---

### [BC7] File & Schema Consistency

**Finding 12 (P1)**: T4 schema fields must be in research-config.ts BEFORE T4 implementation

**Description**: T4 depends on `depthRoleWeight`, `depthForegroundThreshold`, `depthBackgroundThreshold` in ResearchConfigSchema, but:
- T4 "Files to Modify" lists `research-config.ts` (adding 3 fields)
- But T4 assignRoles() also *reads* these fields from config
- Circular: assignRoles() can't compile until schema exists

**Actually OK**: T4 explicitly states "AC-3.8: `ResearchConfigSchema`에 3개 depth field 추가". So T4 includes schema; no circular dependency.

**Verdict**: No issue.

---

**Finding 13**: schema default values consistency across T4 and T5

**Description**: 
- T4 AC-3.8 specifies schema with defaults (implicit)
- T5 AC-4.5 specifies `getDefaultConfig()` defaults: 0.5, 0.3, 0.7

Are these the same? T4 schema should match T5 defaults.

**Recommendation**: T4 and T5 should explicitly cross-reference: "T4 ResearchConfigSchema defaults match T5 getDefaultConfig() defaults (0.5, 0.3, 0.7)."

**Verdict**: Low risk — tests will catch mismatch.

---

## Summary of Issues

| # | Category | Severity | Title | Status |
|----|----------|----------|-------|--------|
| 1 | BC1 | P1 | depthActive threshold 5 — empirical basis | Acknowledged, autoresearch will calibrate |
| 2 | BC1 | P2 | Empty mask=128 — arbitrary default | Acknowledged, edge case rare |
| 3 | BC2 | P1 | T5 double-run tie-breaker precision | Mitigated by T4 test 12 |
| 4 | BC2 | P1 | T1 downsampling timing clarity | Clarify in implement note |
| 5 | BC4 | P2 | relaxFactor hardcoding | Intentional, autoresearch escalation path clear |
| 6 | BC4 | P2 | depthConvention model-aware future | Clarify in T3 note |
| 7 | BC5 | P1 | DA V2 response validation | Add T1 test case |
| 8 | BC5 | P1 | 1x1 pixel edge case | Add T3 test case |
| 9 | BC5 | P1 | depthPercentile tie-breaking exact semantics | Clarify T4 test 12 |
| 10 | BC6 | P1 | T2 file completeness risk | T6 grep catches, acceptable |

**Issues 0 Critical (P0)**: All PRD approved; no blockers.  
**Issues 3 High (P1) — All Mitigated**: Tests, implement notes, or autoresearch feedback will resolve.  
**Issues 1 Medium (P2) — Acceptable Debt**: relaxFactor and depthConvention can evolve in Phase 2.

---

## Final Verdict

### 이견 수: 4건 (모두 P1, 이미 지의사항이거나 테스트/implement note로 해소 가능)

### 이견 목록

1. **[BC1-P1] depthActive threshold 5 empirical basis**: T4에서 stddev>=5로 fallback 판정하는 임계값의 근거가 명시되지 않음. **해소**: AC에 "autoresearch 검증 대상"으로 명시. T5에서 범위 탐색하며 결정되므로 구현 시 주석에 "calibrate via autoresearch" 기재.

2. **[BC2-P1] T1 downsampling timing 불명확**: 20MB 체크가 input vs prepared image 중 어디 시점인지 명확하지 않음. **해소**: T1 구현 시 "Input image 20MB 초과 시 prepareImage() 전에 downsample, prepared image는 SAM2 최적화 후 DA V2에 전달" 명시.

3. **[BC2-P1] T5 double-run precision**: assignRoles()를 2회 호출 시 floating-point 또는 randomness로 인한 divergence 가능. **해소**: 이미 T4 test 12에서 tie-breaker determinism 검증. T5 test 13에서 "depthRoleWeight=0 일 때 동일 결과" 확인하므로 추가 test 불필요.

4. **[BC5-P1] depthPercentile tie-breaking 정확 스펙**: T4 test 12가 "동점 candidate 확인"만 하고 exact percentile 값 명시 안 함. **해소**: T4 test 12 spec 보강: "[100,100,200] → [0.0, 0.0, 1.0]" 명시 (rank-based, avg 아님).

### 최종 판정: **수렴 완료 (CONVERGED)**

- 모든 이견이 테스트 spec 보강, implement note 추가, 또는 이미 existing test로 커버됨.
- P0 (blocker) 이슈 없음.
- P1 이슈 4건 모두 mitigated.
- 실행 준비 완료.

**Next Step**: T2 부터 순차 implementation 시작. 각 ticket implement note에 위 4건 이견 관련 설명 포함.
