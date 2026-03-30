# PRD: Depth Anything V2 — Foundation & Role Intelligence

**Version**: 0.5
**Author**: Isaac + Claude
**Date**: 2026-03-30
**Status**: Approved
**Size**: XL

---

## 1. Problem Statement

### 1.1 Background

layered-psychedelic 파이프라인이 SAM2로 이미지를 레이어로 분해하고 psychedelic 애니메이션을 적용하는 구조. 현재 quality_score 0.6078에서 포화 상태. 파이프라인에 두 가지 근본적 한계가 있음:

1. **깊이 정보 부재**: `LayerCandidate.meanDepth` 필드가 존재하지만 항상 기본값(128)으로 채워짐. 레이어 간 전후 관계가 bbox/coverage heuristic에만 의존하여 오분류 빈번.
2. **Luminance fallback의 비효율**: SAM2가 under-segment(3개 미만)할 때 밝기 기반 zone 분할이 발동되나, 의미론적 분리가 아닌 기계적 밝기 분할이라 depth/role과 무관한 레이어 생성.

### 1.2 Problem Definition

role assignment가 순수 기하학 heuristic(bbox 크기, centroid 위치, coverage)에만 의존. 이미지 중앙의 먼 산이 "subject"로, 가장자리의 실제 피사체가 "foreground-occluder"로 오분류되는 사례 빈번. depth 신호 없이는 **공간적 위치 ≠ 의미적 깊이** 문제를 해결할 수 없음.

### 1.3 Impact of Not Solving

- role 오분류 → 레이어별 애니메이션 프리셋 부적합 → 시각적 부자연스러움
- z-ordering tie-breaker가 항상 기본값(128) → 같은 role 내 전후 관계 무작위
- luminance fallback이 autoresearch 탐색 공간 5개 axis를 점유하며 무의미한 실험 생성
- 후속 상업화 기능(parallax, DOF, haze)의 전제 조건 미충족

### 1.4 Phased Approach

이 PRD는 **2단계 상업화 경로의 Phase 1 (Foundation)**:

```
Phase 1 (이 PRD):  DA V2 통합 + Luminance 제거 + Depth-보강 Role Assignment
    ↓ 검증 기준 충족 시
Phase 2 (후속 PRD): Depth 연동 Animation + Parallax + DOF + Haze + Feathering
```

**Phase 2 진입 전제 조건 (Exit Criteria):**
1. depth가 role assignment 품질을 안정적으로 올린다
2. meanDepth 분포가 이미지군 전반에서 일관적이다
3. false subject / false background가 눈에 띄게 줄었다
4. quality_score가 decomposition 단계에서 먼저 좋아졌다

Phase 2에서 수행할 항목:
- Depth 연동 애니메이션 (colorCycleSpeed, glowIntensity를 depth에 비례)
- Parallax 셰이더 (가까운 레이어가 더 많이 움직이는 2.5D 효과)
- Depth-of-Field blur (초점 외 레이어 블러)
- Atmospheric haze (먼 레이어 desaturation)
- Edge feathering (depth 경계 alpha softening)
- Autoresearch axis 확대 (animation/cinematic category)

---

## 2. Goals & Non-Goals

### 2.1 Goals

- [ ] G1: Depth Anything V2를 Replicate API로 통합, 모든 파이프라인 실행에서 depth map 생성
- [ ] G2: 각 LayerCandidate의 `meanDepth`를 실제 depth map 값으로 채움
- [ ] G3: Luminance fallback 전체 제거 (코드, config 5개 axis, 테스트, 문서)
- [ ] G4: Depth-보강 role assignment (heuristic + depth 복합 판정)
- [ ] G5: Role assignment용 autoresearch axes 3개 추가
- [ ] G6: 기존 테스트 전부 통과 + 새 기능 테스트 추가
- [ ] G7: `program.md` Parameter Reference 갱신
- [ ] G8: Phase 2 진입 판단을 위한 검증 데이터 수집 체계 마련

### 2.2 Non-Goals

- NG1: evaluate.ts / metrics 변경 — READ-ONLY 유지
- NG2: run-once.ts / pipeline-runner.ts 등 autoresearch 루프 자체 로직 변경
- NG3: Depth 연동 애니메이션 (speed/glow를 depth에 비례) — Phase 2
- NG4: Parallax 셰이더 — Phase 2
- NG5: DOF blur / Atmospheric haze / Edge feathering — Phase 2
- NG6: Animation/cinematic autoresearch axes — Phase 2
- NG7: Depth Anything V3 지원 — V2로 시작, V3은 Replicate 등록 후 별도 전환
- NG8: 셰이더 수정 — 이 PRD에서는 shader/renderer 변경 없음
- NG9: scene-generator.ts의 role 프리셋 변경 — 기존 프리셋 유지, depth는 role 판정에만 사용

---

## 3. User Stories & Acceptance Criteria

### US-1: Depth Anything V2 통합

**As a** 파이프라인, **I want** 입력 이미지의 monocular depth map을 자동 생성, **so that** 각 레이어에 정확한 깊이 값을 할당할 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: `getDepthMap()` 함수가 Replicate API(`chenxwh/depth-anything-v2`)를 호출하여 depth map(grayscale PNG) 반환. `withRetry()` 래핑하여 SAM2와 동일한 재시도 정책 적용
- [ ] AC-1.2: SAM2 호출과 DA V2 호출이 `Promise.all`로 병렬 실행. 각 API는 독립적으로 data URI 구성 (기존 SAM2 패턴 유지, 공유 구조 불필요)
- [ ] AC-1.3: DA V2 input은 **preparedPath** (SAM2와 동일한 prepared 이미지) 사용. 원본이 아닌 prepared 이미지를 사용하여 SAM mask와 공간 정렬 보장
- [ ] AC-1.4: 각 candidate의 **exclusive mask** 영역에서 depth map 평균값 계산 → `meanDepth` 필드 채움. 계산 시점: pipeline-layers.ts의 **Step 6(resolveExclusiveOwnership) 이후, Step 7(assignRoles) 이전** (Step 6.5)
- [ ] AC-1.5: depth map 값 convention 정규화: 0=가장 멀리(background), 255=가장 가까이(foreground). DA V2(`chenxwh/depth-anything-v2`)는 disparity map 출력 (high=near)이므로 기본적으로 convention 일치. 구현 시 grayscale 변환 후 min/max 확인하여 문서화. manifest에 `depthConvention: "near-is-high"` 기록
- [ ] AC-1.6: DA V2 API 실패 시 graceful fallback — `meanDepth` 기본값(128) 유지, 파이프라인 중단 없이 진행. console에 warning 로그
- [ ] AC-1.7: decomposition-manifest.json에 DA V2 모델 정보 기록: `models.depthAnything: { model, version }`
- [ ] AC-1.8: depth map 원본을 archive 디렉토리에 `source/depth-map.png`로 저장
- [ ] AC-1.9: `DecomposeResult`에 `depthMap?: Buffer` 필드 추가하여 depth map buffer를 pipeline-layers.ts로 전달
- [ ] AC-1.10: 입력 이미지 크기 검증 — 20MB 초과 시 downsample 후 처리 (base64 data URI 메모리 안전성)

### US-2: Luminance Fallback 제거

**As a** 파이프라인, **I want** luminance fallback 전체를 제거, **so that** 무의미한 밝기 기반 레이어 생성을 방지하고 탐색 공간을 정리할 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: `image-decompose.ts`에서 `splitByLuminanceZones()`, `shouldRunLuminanceFallback()`, `buildResidualMask()` 함수 제거
- [ ] AC-2.2: `decomposeImage()` 내 luminance fallback 호출 분기 제거
- [ ] AC-2.3: `research-config.ts`에서 5개 axis 제거: `luminanceFallbackEnabled`, `luminanceFallbackMinSamLayers`, `luminanceFallbackZoneCount`, `luminanceFallbackResidualOnly`, `luminanceFallbackResidualCoverageMin`
- [ ] AC-2.4: `DecomposeOptions` interface에서 5개 luminance 옵션 제거
- [ ] AC-2.5: `FileSourceMeta.source`에서 `"luminance-split"` 제거 → `"sam2-segment"` 단일 값. `FileSourceMeta` type 자체를 단순화하거나 source 필드를 고정값으로 변경
- [ ] AC-2.6: `decomposition-manifest.ts`에서 `"luminance-fallback"` pass type 제거
- [ ] AC-2.7: `pipeline-layers.ts`에서 luminance config passthrough 제거
- [ ] AC-2.8: `program.md`에서 luminance 관련 문서 제거
- [ ] AC-2.9: 모든 관련 테스트 파일에서 luminance 참조 제거/갱신 (최소 6개 파일)
- [ ] AC-2.10: 전체 코드베이스에서 `luminance-split`, `luminanceFallback` 잔존 여부 2차 검증 패스

### US-3: Depth-보강 Role Assignment

**As a** 파이프라인, **I want** depth 정보를 role assignment heuristic에 반영, **so that** 실제 깊이에 기반한 정확한 역할 분류를 할 수 있다.

**Acceptance Criteria:**
**Scoring Model: Depth-gated if-chain** — 기존 순차 if-chain 구조를 유지하되, depth percentile을 각 분기의 threshold 완화/강화에 사용. `depthRoleWeight`는 depth가 threshold에 미치는 영향 강도를 연속적으로 조절. 별도 scoring refactor 없음.

- [ ] AC-3.1: `assignRoles()`에서 기존 if-chain 구조 유지. 각 role 분기에서 `depthRoleWeight`(0.0~1.0)에 비례하여 depth percentile이 판정 threshold를 완화/강화
- [ ] AC-3.2: `depthRoleWeight=0`이면 기존 heuristic만 사용 (하위 호환). depth percentile 무시
- [ ] AC-3.3: subject 판정 보강: 기존 조건(중앙 + bbox < 50%) 유지. `depthRoleWeight > 0`이면 depth 상위 percentile(`depthForegroundThreshold` 이상)인 candidate의 centrality threshold를 완화 (depth가 가까운 물체는 중앙에서 약간 벗어나도 subject 가능). 구체적 완화 공식은 autoresearch에서 `depthRoleWeight` 탐색으로 결정 (구현 시 `centralityThreshold * (1 + depthRoleWeight * relaxFactor)` 형태, relaxFactor는 상수로 시작 후 필요 시 axis 추가)
- [ ] AC-3.4: background 판정 보강: 기존 조건(큰 bbox + coverage ≥ 15%) 유지. depth 하위 percentile(< `1 - depthBackgroundThreshold`)인 candidate의 bbox 크기 threshold를 완화 (depth가 먼 물체는 bbox가 약간 작아도 background 가능)
- [ ] AC-3.5: foreground-occluder 판정 보강: 기존 조건(가장자리 접촉) 유지. depth 상위 percentile인 candidate만 occluder로 판정 강화 (가장자리에 있지만 depth가 먼 물체는 occluder 아님)
- [ ] AC-3.6: depth 데이터 없을 때 자동 fallback — `depthStats.stddev < 5`이면 depth 분산 부족으로 판단, `depthRoleWeight`를 무시하고 기존 heuristic만 사용
- [ ] AC-3.7: `orderByRole()` depth tie-breaker가 실제 meanDepth 값으로 동작 확인 (기존 로직 활성화)
- [ ] AC-3.8: background-plate 판정은 depth 영향 없음 (가장 넓은 candidate = bg-plate 로직 유지). bg-plate는 기하학 기준이 가장 신뢰적

### US-4: Autoresearch Config Axes

**As a** autoresearch 루프, **I want** depth role assignment 관련 tunable 파라미터, **so that** depth 활용도를 자동 최적화할 수 있다.

**Acceptance Criteria:**
- [ ] AC-4.1: luminance 5개 axis 제거 (US-2에서 수행)
- [ ] AC-4.2: 아래 3개 depth axis 추가 to `research-config.ts`:

| Axis | Range | Default | Description |
|------|-------|---------|-------------|
| `depthRoleWeight` | 0.0~1.0 | 0.5 | depth vs heuristic 비중. 0=heuristic만, 1=depth 최대 반영 |
| `depthForegroundThreshold` | 0.1~0.4 | 0.3 | depth 상위 N을 foreground 후보로 판정하는 percentile. 0.3 = 상위 30% (conservative, 과소 판정 → 안전). autoresearch가 0.1~0.4에서 최적값 탐색 |
| `depthBackgroundThreshold` | 0.5~0.9 | 0.7 | depth 하위 (1-N)을 background 후보로 판정하는 percentile. 0.7 = 하위 30% (대칭적 구간). autoresearch가 0.5~0.9에서 최적값 탐색 |

- [ ] AC-4.3: `depthRoleWeight=0`에서 기존 동작과 동일 (하위 호환)
- [ ] AC-4.4: `program.md`에 새 axis 3개 문서화 (range, default, description, interdependencies)
- [ ] AC-4.5: `getDefaultConfig()`에 실험용 default 세트 포함: `depthRoleWeight=0.5`, `depthForegroundThreshold=0.3`, `depthBackgroundThreshold=0.7`

### US-5: Phase 2 검증 데이터 수집

**As a** 개발자, **I want** depth foundation의 효과를 정량적으로 측정, **so that** Phase 2 진입 여부를 데이터 기반으로 판단할 수 있다.

**Acceptance Criteria:**
- [ ] AC-5.1: decomposition-manifest.json에 per-layer `meanDepth` 기록 (이미 AC-1.4에서 candidate에 저장, manifest에도 반영)
- [ ] AC-5.2: manifest에 depth 분포 요약 통계 기록: `depthStats: { min, max, mean, stddev, count }`
- [ ] AC-5.3: manifest에 role assignment 변경 추적: `depthRoleWeight` 값 + 각 candidate의 `roleWithoutDepth`(heuristic만), `roleWithDepth`(depth 보강) 비교 데이터
- [ ] AC-5.4: scene.json에 per-layer `meanDepth` 기록. `layerSchema`(scene-schema.ts)에 `meanDepth: z.number().optional()` 필드 추가. `RetainedLayer` interface에도 `meanDepth?: number` 추가하여 pipeline 데이터 흐름 완성
- [ ] AC-5.5: 연속 5회 이상 파이프라인 실행에서 depth 분포가 이미지별로 구분 가능함을 확인 (stddev > 0)

---

## 4. Technical Architecture

### 4.1 System Overview

```
Input Image
    ├── SAM2 (Replicate) ──────┐
    └── DA V2 (Replicate) ─────┤  Promise.all (병렬)
                                ↓
              SAM masks + Depth Map
                    ↓
         applyMaskToImage() + computeMeanDepth()
                    ↓
         LayerCandidate[] (with meanDepth)
                    ↓
         Depth-보강 Role Assignment
                    ↓
         orderByRole() (depth tie-breaker 활성화)
                    ↓
         기존 Scene Generation (role 프리셋 그대로)
                    ↓
         scene.json (기존 구조 + per-layer meanDepth 추가)
```

### 4.2 Data Flow

**Depth Map Lifecycle:**
```
decomposeImage(preparedPath)
  → Promise.all([getSam2Masks(sharedDataUri), getDepthMap(sharedDataUri)])
  → DecomposeResult { files, coverages, method, fileMeta, depthMap?: Buffer }

pipeline-layers.ts:
  Step 3:   decomposeImage() → SAM masks + depthMap
  Step 4:   Convert SAM masks to candidates
  Step 5.5: Build mask cache
  Step 6:   resolveExclusiveOwnership → exclusiveMasks
  Step 6.5: computeMeanDepth(depthMap, exclusiveMasks) → candidate.meanDepth  ← NEW
  Step 7:   assignRoles (now has real meanDepth + depthRoleWeight)
  Step 8:   orderByRole (depth tie-breaker activated)
```

**Depth Map → meanDepth 계산 (Step 6.5):**
```
depth_map: Uint8Array[W×H] (grayscale 0-255, normalized: 0=far, 255=near)
    + exclusiveMask: Uint8Array[W×H] (binary 0/1, from Step 6 maskCache)
      maskCache는 pipeline-layers.ts buildMaskCache()에서 생성하는
      per-candidate Uint8Array. resolveExclusiveOwnership()에서 갱신됨.
    → sum(depth_map[i] * mask[i]) / count(mask[i] == 1)
    → candidate.meanDepth (0-255). mask 전체 0이면 기본값 128
```

**meanDepth → Role Assignment 보강 (depth-gated if-chain):**
```
candidates 전체에서 depth percentile 계산:
  depthPercentile[i] = rank(meanDepth[i]) / candidateCount

depthActive = (depthStats.stddev >= 5)  // depth 분산 충분한지 확인

subject 판정 (if-chain 분기 내):
  기존: isCentral AND bboxRatio < 0.5
  보강: depthActive AND depthRoleWeight > 0이면
        centralityThreshold를 depth percentile에 따라 완화
        (가까운 물체 = 중앙 판정 관대)

background 판정 (if-chain 분기 내):
  기존: largeBbox AND coverage >= 15%
  보강: depthActive AND depthRoleWeight > 0이면
        bbox 크기 threshold를 depth percentile에 따라 완화
        (먼 물체 = 배경 판정 관대)
```

### 4.3 API Changes

**Replicate API 추가:**
- Model: `chenxwh/depth-anything-v2`
- Input: prepared 이미지 (base64 data URI, SAM2와 공유)
- Output: depth map (grayscale PNG URL)
- 비용: ~$0.0017/run
- 실험당 총 비용: ~$0.0034 (SAM2 + DA V2)
- Retry: `withRetry()` 래핑 (SAM2와 동일 정책)
- Rate limit: autoresearch 병렬 실행 시 Replicate rate limit 주의 (기존 SAM2와 동일 제약)

### 4.4 File Changes Summary

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/image-decompose.ts` | Major | DA V2 추가, luminance 함수 3개 + fallback 분기 제거 |
| `scripts/pipeline-layers.ts` | Major | depth map 수신, meanDepth 계산, luminance passthrough 제거 |
| `scripts/lib/layer-resolve.ts` | Moderate | assignRoles() depth 보강, 3개 config param 수신 |
| `src/lib/scene-schema.ts` | Moderate | `"luminance-split"` source 제거, `layerSchema`에 `meanDepth` optional 필드 추가 |
| `scripts/lib/decomposition-manifest.ts` | Minor | DA V2 모델 정보, `"luminance-fallback"` pass 제거, depthStats 추가 |
| `scripts/lib/scene-generator.ts` | Minor | scene.json에 per-layer meanDepth 기록 (프리셋 로직 변경 없음) |
| `scripts/research/research-config.ts` | Moderate | luminance 5개 제거 + depth 3개 추가 |
| `scripts/research/program.md` | Moderate | luminance 문서 제거 + depth axis 문서 추가 |
| Test files (6+) | Moderate | luminance 참조 제거 + depth 테스트 추가 |

**변경하지 않는 파일:**
| File | Reason |
|------|--------|
| `src/shaders/layer.frag` | Phase 2 (parallax/DOF/haze) |
| `src/sketches/layered-psychedelic.ts` | Phase 2 (새 uniform 바인딩) |
| `src/lib/effect-composer.ts` | Phase 2 (DOF post-processing) |
| `scripts/research/run-once.ts` | config 스키마 자동 반영 |
| `scripts/research/evaluate.ts` | 메트릭 변경 없음 |

---

## 5. Implementation Plan

### Step 1: DA V2 API 통합 (US-1: AC-1.1~1.3, 1.9~1.10)
- `getDepthMap()` 함수 구현 (withRetry 래핑)
- 공유 data URI 구성 + 입력 크기 검증 (20MB 제한)
- SAM2와 Promise.all 병렬 호출
- `DecomposeResult`에 `depthMap?: Buffer` 추가
- depth map resize + convention 정규화 + `depthConvention` manifest 기록

### Step 2: Luminance Fallback 제거 (US-2: AC-2.1~2.10)
- 함수 3개 제거 + fallback 분기 제거
- config 5개 axis 제거
- source type 정리
- 전체 코드베이스 잔존 검증

### Step 3: meanDepth 계산 (US-1: AC-1.4~1.8)
- pipeline-layers.ts Step 6.5에 `computeMeanDepth()` 삽입
- exclusive mask 영역에서 depth 평균 계산
- manifest에 DA V2 정보 + depth map 저장

### Step 4: Schema + Data Flow (US-5: AC-5.4)
- `layerSchema`에 `meanDepth: z.number().optional()` 추가
- `RetainedLayer`에 `meanDepth?: number` 추가
- scene-generator에서 scene.json per-layer meanDepth 기록

### Step 5: Depth-보강 Role Assignment (US-3: AC-3.1~3.8)
- assignRoles()의 기존 if-chain 내 depth-gated threshold 완화
- depthPercentile 계산 + depthActive 판정 (stddev >= 5)
- 3개 config param으로 depth 비중 조절
- fallback 로직 (depth 분산 부족 시 heuristic만)

### Step 6: Autoresearch Axes + 검증 데이터 (US-4, US-5 나머지)
- research-config.ts에 3개 axis 추가
- manifest에 depthStats + role 비교 데이터 (roleWithoutDepth vs roleWithDepth)
- program.md 갱신

### Step 7: 테스트 + 2차 검증
- 전체 테스트 스위트 통과
- luminance 잔존 grep 검증
- depth convention 검증 테스트 (참조 이미지 대조)
- 파이프라인 5회 실행 → depth 분포 확인

---

## 6. Testing Strategy

### 6.1 Unit Tests
- `getDepthMap()`: Replicate API mock → depth map buffer 반환 검증
- `getDepthMap()` 실패: API 에러 시 null 반환 + warning 로그 + withRetry 동작
- `getDepthMap()` RGB 출력: grayscale 변환 검증
- `computeMeanDepth()`: 알려진 depth map + mask 조합 → 정확한 평균값 (예: 전체 200 mask → mean=200)
- `computeMeanDepth()`: 빈 mask (coverage=0) → 기본값 128
- `computeMeanDepth()`: single candidate → depthPercentile = 1.0
- `assignRoles()` with `depthRoleWeight=0`: 기존 heuristic 결과와 동일
- `assignRoles()` with `depthRoleWeight=1`: depth percentile이 role 판정에 최대 반영
- `assignRoles()` depth fallback: stddev < 5 → heuristic만 사용 (depthRoleWeight 무시)
- `orderByRole()`: 실제 meanDepth 값으로 tie-breaker 동작 확인
- depth convention: 참조 이미지에서 convention 정규화 결과 검증
- 입력 크기 검증: 20MB 초과 이미지 처리 확인

### 6.2 Integration Tests
- 전체 파이프라인 (DA V2 mock) → manifest에 DA V2 정보 + depthStats 포함
- depth map + SAM mask → meanDepth → role assignment → scene.json 전체 흐름
- DA V2 실패 시 → pipeline 정상 완료 + meanDepth=128 + warning 로그

### 6.3 Regression Tests
- `depthRoleWeight=0`에서 기존 role assignment 결과 동일
- luminance 관련 코드 잔존 여부 codebase grep 검증
- 기존 테스트 전부 통과 (`vitest run`)

### 6.4 Validation (수동)
- 테스트 이미지 5장에서 파이프라인 실행
- depth 분포(min/max/stddev) 확인
- depthRoleWeight=0 vs 0.5에서 role assignment 차이 비교
- false subject / false background 감소 여부 확인

---

## 7. Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| DA V2 API 장애/지연 | Medium | graceful fallback: meanDepth=128, 파이프라인 계속 진행 (AC-1.6). withRetry() 적용 |
| DA V2 depth map 품질 저하 (하늘, 투명체) | Medium | depthRoleWeight로 heuristic 비중 조절. stddev < 5면 자동 fallback (AC-3.6) |
| 실험당 비용 증가 (~$0.0017 추가) | Low | 절대 금액 미미 ($0.0034/run). 연 1000회 실험 = $3.4 |
| Luminance 제거 후 SAM2 0개 mask | Low | `minRetainedLayers` + fallback bg-plate 합성 로직이 기존에 존재. 0개 mask 시 bg-plate만으로 1-layer 출력 |
| Depth map disparity convention 불일치 | Medium | manifest `depthConvention` 기록 + 참조 이미지 대조 검증 테스트 (AC-1.5) |
| Replicate rate limit (API 2배 호출) | Medium | Promise.all로 concurrent 호출. Replicate free tier 10 req/s 제한 내. autoresearch는 실험 간 sequential이므로 burst 없음 |
| depthRoleWeight 최적값을 찾기 어려움 | Low | autoresearch가 0.0~1.0 범위에서 자동 탐색 |
| meanDepth가 이미지군 전반에서 일관적이지 않음 | Medium | AC-5.2 depthStats로 분포 모니터링. Phase 2 진입 전 확인 |
| DA V2 출력이 grayscale 아닌 RGB | Low | grayscale 변환 강제 (sharp.grayscale()). 채널 수 검증 |
| Single candidate → depthPercentile 항상 1.0 | Low | candidate 1개면 depth 판정 의미 없음, heuristic fallback 자동 작동 |
| quality_score 인과 경로 | Info | better roles → better preset 매핑 → better visual metrics. evaluate.ts는 변경 없지만 간접 개선 기대 |

---

## 8. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pipeline 실행 성공률 | ≥ 99% (DA V2 fallback 포함) | 연속 20회 실행 무실패 |
| meanDepth 분포 | stddev > 20 (이미지별 구분 가능) | 5장 이미지 depthStats 확인 |
| Role 오분류 감소 | false subject/background 50%+ 감소 | depthRoleWeight=0 vs 0.5 비교 (5장) |
| 하위 호환성 | depthRoleWeight=0에서 기존 role 동일 | role assignment diff 검증 |
| Autoresearch quality_score | 0.6078 → 개선 (수치 미확정) | 50회 실험 후 best score |
| 테스트 통과 | 100% | `vitest run` 전체 통과 |
| Luminance 잔존 | 0건 | codebase grep 검증 |
| Phase 2 진입 판단 데이터 | depthStats + role 비교 5장 이상 | manifest 데이터 확인 |

---

## 9. Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| Replicate API (DA V2 모델) | External API | Available (`chenxwh/depth-anything-v2`) |
| SAM2 Replicate API | Existing | In use |
| `sharp` npm package | Existing | In use (depth map resize/processing) |

---

## 10. Phase 2 Roadmap (후속 PRD)

Phase 1 검증 완료 후, 아래 기능을 **별도 PRD**로 진행:

### 10.1 Phase 2 진입 조건 (모두 충족 시)

| # | 조건 | 정량 기준 | 측정 방법 |
|---|------|----------|----------|
| P2-1 | depth가 role assignment 품질을 안정적으로 올린다 | 5장 중 4장 이상에서 depthRoleWeight>0이 role 정확도 개선 | roleWithoutDepth vs roleWithDepth 비교 (manifest) |
| P2-2 | meanDepth 분포가 이미지군 전반에서 일관적이다 | 모든 테스트 이미지에서 depthStats.stddev ≥ 15 | manifest depthStats 확인 |
| P2-3 | false subject / false background가 줄었다 | false role 건수 ≥ 30% 감소 | 5장 수동 검증 + role 비교 데이터 |
| P2-4 | quality_score가 개선되었다 | best score > 0.6078 (현재 baseline) | autoresearch 50회 실험 후 best |

**stddev 임계값 정리 (progressive scale):**
- `stddev < 5`: AC-3.6 — depth 분산 부족, heuristic fallback 트리거. 사실상 단일 depth plane으로 role 구분 불가
- `5 ≤ stddev < 15`: Phase 1 활용 구간 — depth-gated role assignment 동작. z-ordering 개선에 충분하나 Phase 2 시각 효과(parallax 등)에는 부족
- `stddev ≥ 15`: P2-2 — Phase 2 진입 조건. 깊이 분포가 이미지별로 구분 가능하여 연속 depth 기반 animation에 적합
- `stddev > 0`: AC-5.5 — 기본 동작 확인 (depth map이 상수가 아님)

### 10.2 Phase 2 스코프

| Feature | Description | Autoresearch Axes |
|---------|-------------|-------------------|
| Depth 연동 Animation | speed/glow가 depth에 비례 | `depthSpeedInfluence`, `depthGlowInfluence` |
| Parallax 셰이더 | 가까운 레이어가 더 많이 움직임 (2.5D) | `depthParallaxScale` |
| DOF Blur | 초점 외 레이어 블러 | `dofIntensity`, `dofFocusDepth` |
| Atmospheric Haze | 먼 레이어 desaturation | `hazeIntensity` |
| Edge Feathering | depth 경계 alpha softening | `featherRadius` |

**Phase 2 총 추가 axes: 7개**

---

## 11. Glossary

| Term | Definition |
|------|-----------|
| DA V2 | Depth Anything V2 — monocular depth estimation model |
| meanDepth | 레이어 exclusive mask 영역의 depth map 평균값 (0-255) |
| depthNorm | meanDepth / 255. 0=far, 1=near |
| depthPercentile | candidate 집합 내 meanDepth 순위 비율 (0~1) |
| depthRoleWeight | depth vs heuristic 비중 조절 파라미터 (0=heuristic only) |
| Phase 2 | 후속 PRD: depth 연동 animation + cinematic 효과 |