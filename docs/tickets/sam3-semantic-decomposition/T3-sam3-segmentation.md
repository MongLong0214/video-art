# T3: SAM3 Text-Prompted Segmentation

**PRD Ref**: PRD-sam3-semantic-decomposition > US-2 (AC-2.1~2.8)
**Priority**: P0 (Blocker)
**Size**: M (3-4h)
**Status**: Todo
**Depends On**: T1, T2

---

## 1. Objective

SAM3 per-prompt 호출로 원본 해상도 binary mask 생성 → RGBA 레이어 변환 + coverage/meanDepth 계산. computeMaskStats()로 LayerCandidate 필드 채움.

## 2. Acceptance Criteria

- [ ] AC-1: `getSam3Mask(replicate, dataUri, prompt, threshold)` → Buffer (mask PNG)
- [ ] AC-2: SAM3 호출: `{ image, prompt, threshold, mask_only: true, return_zip: false }`
- [ ] AC-3: 출력 URL `validateReplicateUrl()` 검증 후 fetch
- [ ] AC-4: fetch 후 sharp 디코드 실패 시 → skip + warn (try/catch)
- [ ] AC-5: `applyMaskToImage()` 재사용하여 RGBA 레이어 생성
- [ ] AC-6: `computeMaskStats()` + depthGray에서 bbox/centroid/coverage/**meanDepth**(0-255) 계산 → LayerCandidate 필드 채움
- [ ] AC-7: edgeDensity는 RGBA 레이어에서 sharp sobel로 계산, componentCount=1 고정
- [ ] AC-8: 빈 마스크 (coverage < minCoverage) → skip + warn
- [ ] AC-9: SAM3_MODEL + SAM3_VERSION 상수 관리
- [ ] AC-10: FileSourceMeta `{ source: "sam3-semantic", prompt }` 기록
- [ ] AC-11: `DecomposeResult`에 `candidates?: LayerCandidate[]` 필드 추가 → T7에서 extractCandidates 스킵 가능
- [ ] AC-12: 빈 마스크 meanDepth는 undefined (128 fallback은 renderer에서 처리)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `SAM3_MODEL constant defined` | Unit | import check | "mattsays/sam3-image" |
| 2 | `SAM3_VERSION constant defined` | Unit | import check | 64-char hash |
| 3 | `buildSam3Candidate: creates valid LayerCandidate from mask` | Unit | mock RGBA buffer → computeMaskStats → candidate | candidate has bbox, centroid, coverage, edgeDensity, componentCount=1 |
| 4 | `buildSam3Candidate: source is sam3-semantic` | Unit | check candidate.source | "sam3-semantic" |
| 5 | `buildSam3Candidate: prompt recorded in fileMeta` | Unit | check fileMeta.prompt | matches input prompt |
| 6 | `empty mask: coverage < minCoverage → skipped` | Unit | all-black mask | null returned |
| 7 | `full mask: coverage=100% → valid candidate` | Unit | all-white mask | coverage ≈ 1.0 |
| 8 | `getSam3Mask: invalid URL rejected by validateReplicateUrl` | Unit | mock non-replicate URL | throws/returns null |
| 9 | `getSam3Mask: non-image response → sharp decode fails → null` | Unit | mock HTML response buffer | returns null (try/catch) |

### 3.2 Test File Location

- `scripts/lib/image-decompose.test.ts` (append)

### 3.3 Mock/Setup Required

- Vitest: synthetic mask buffers (sharp-generated) for unit tests. No Replicate API mock needed (pure function tests for candidate building)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/image-decompose.ts` | Modify | SAM3_MODEL/VERSION + getSam3Mask() + buildSam3Candidate() |
| `scripts/lib/image-decompose.test.ts` | Modify | SAM3 candidate building tests |

### 4.2 Implementation Steps (Green Phase)

1. SAM3_MODEL, SAM3_VERSION 상수 추가
2. `getSam3Mask(replicate, dataUri, prompt, threshold)`: Replicate API 호출 → validateReplicateUrl → fetch → Buffer. try/catch 전체 감싸서 실패 시 null 반환
3. `buildSam3Candidate(maskBuffer, originalImage, depthGray, width, height, prompt, index, outputDir)`: applyMaskToImage → computeMaskStats → edgeDensity(sobel) → LayerCandidate 조립
4. SAM3 경로의 main loop: prompts.map → getSam3Mask → buildSam3Candidate → filter null

## 5. Edge Cases

- EC-1 (E2): SAM3 빈 마스크 → skip
- EC-2 (E11): SAM3 비이미지 응답 → sharp 실패 → skip
- EC-3 (E5): 100% coverage → background 처리 (T4에서)

## 6. Review Checklist

- [ ] Red → Green → Refactor
- [ ] AC 전부 충족
- [ ] validateReplicateUrl 호출 확인
- [ ] try/catch 방어 코드 확인
