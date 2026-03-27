# PRD: Layer Decomposition Overhaul

**Subtitle**: A/B Evaluation of `Qwen-Only` vs `Qwen+ZoeDepth`

**Version**: 1.3
**Author**: Codex + Isaac
**Date**: 2026-03-26
**Status**: Approved
**Size**: XL

---

## 1. Problem Statement

### 1.1 Background

현재 layered 비디오 파이프라인의 가장 큰 병목은 색 엔진보다 `레이어 분해 품질`이다.

현재 구조:

```text
input image
-> validateAndPrepare()
-> qwen/qwen-image-layered
-> cjwbw/zoedepth
-> hybrid merge
-> coverage sort
-> scene.json generation
-> layered shader render
```

코드 기준 진입점:

- `scripts/pipeline-layers.ts`
- `scripts/lib/image-decompose.ts`
- `scripts/lib/scene-generator.ts`

실제 산출물 분석 결과, 핵심 문제는 "레이어 수가 적다"가 아니라 "레이어가 서로 독립적이지 않다"는 점이다.

관측된 현상:

- 첫 몇 장의 레이어가 이미 화면 대부분을 덮는다.
- 뒤 레이어들은 새로운 시각 정보를 추가하기보다 앞 레이어 픽셀을 중복 복사한다.
- 결과적으로 parallax, wave, hue cycle을 강화해도 깊이감보다 중복 흔들림과 중복 변색이 커진다.
- 같은 타이틀의 결과물이라도 어떤 입력과 어떤 파라미터로 생성되었는지 추적이 어렵다.

### 1.2 Verified External Model Usage

이 PRD는 두 개의 외부 모델을 대상으로 검토한다.

#### A. `qwen/qwen-image-layered`

공식 Replicate README 기준으로 확인된 사실:

- 단일 이미지를 여러 개의 `RGBA` 레이어로 분해한다.
- 일반적인 권장 범위는 `3~4 layers`이다.
- 복잡한 장면은 `6~8 layers`까지 사용할 수 있다.
- 더 세밀한 제어가 필요하면 `특정 레이어를 다시 분해`할 수 있다.

현재 로컬 구현 호출 형태:

```ts
replicate.run("qwen/qwen-image-layered", {
  input: {
    image: dataUri,
    num_layers: numLayers,
    go_fast: false,
    disable_safety_checker: true,
    output_format: "png",
    output_quality: 100,
  },
})
```

#### B. `cjwbw/zoedepth`

현재 파이프라인은 `Qwen` 외에 `ZoeDepth`를 함께 사용한다.

- 역할: semantic segmentation이 아니라 `depth estimation`
- 현재 용도: 큰 semantic layer를 다시 depth zone으로 분할

### 1.3 Core Decision

이번 PRD는 `ZoeDepth를 계속 쓸지 말지`를 먼저 못박지 않는다.

대신 다음 두 variant를 둘 다 구현하고 비교한다.

- `Variant A`: `Qwen-Only`
- `Variant B`: `Qwen+ZoeDepth`

최종 production default는 A/B 비교 결과로 결정한다.

### 1.4 Core Problem Definition

현재 구조의 문제는 다음과 같다.

1. `Qwen output`을 후보 집합이 아니라 거의 최종 레이어처럼 취급한다.
2. 큰 마스크를 depth로 분할한 뒤 `exclusive resolve` 없이 그대로 누적한다.
3. z-order를 `coverage` 기준으로 정렬해 ordering이 틀어진다.
4. API 생성 레이어는 `dedupe / overlap resolve / cleanup` 없이 scene.json으로 바로 넘어간다.
5. 최종 레이어 수 제한이 없어 중복 레이어가 많아질수록 품질이 나빠진다.
6. `scene-generator.ts`는 레이어의 실제 역할이 아니라 `index`를 기준으로 preset을 배정한다.
7. archive에 decomposition provenance가 없어 산출물과 코드 상태를 정확히 다시 연결하기 어렵다.
8. `Qwen-only`로도 충분한지, `ZoeDepth`가 실제로 유의미한 개선을 주는지 아직 검증되지 않았다.

### 1.5 Impact of Not Solving

- 구조적 분리가 약해 모션 품질을 올려도 결과가 쉽게 탁해진다.
- 과한 색순환은 레이어 품질 부족을 가리는 대신 더 악화시킨다.
- 레이어 수가 늘수록 품질이 좋아지는 것이 아니라 오히려 중복이 늘어난다.
- 운영 복잡도가 품질 개선 없이 계속 증가할 수 있다.
- 결과물 재현성과 디버깅 가능성이 낮아진다.

---

## 2. Goals & Non-Goals

### 2.1 Goals

- [x] G1: 최종 retained layer들이 서로 `실질적으로 독립`되도록 만든다.
- [x] G2: 각 픽셀이 기본적으로 하나의 주 레이어에만 귀속되도록 `exclusive ownership`를 도입한다.
- [x] G3: 최종 layer ordering을 `role + geometry + optional depth hint` 기준으로 정한다.
- [x] G4: 최종 layer count를 기본적으로 `5~8개` 수준으로 제한한다.
- [x] G5: `scene-generator.ts`가 `role-based preset`을 사용할 수 있게 한다.
- [x] G6: 모든 decomposition run에 대해 `provenance manifest`를 저장한다.
- [x] G7: `Qwen-Only`와 `Qwen+ZoeDepth` 두 경로를 모두 production 수준으로 구현한다.
- [ ] G8: 같은 golden set에서 두 경로를 비교해 production default를 결정한다.
- [x] G9: 외부 모델 사용 방식을 production-safe하게 문서화하고 버전 고정이 가능하도록 한다.

### 2.2 Non-Goals

- NG1: `qwen-image-layered`를 완전히 다른 segmentation 모델로 교체
- NG2: `ZoeDepth`를 지금 당장 폐기하거나 무조건 채택
- NG3: photoreal inpainting 완성형 시스템 구축
- NG4: `layer.frag` 전면 재설계
- NG5: source.mp4와 동일한 장면 재현
- NG6: audio pipeline 변경

---

## 3. User Stories & Acceptance Criteria

### US-1: 의미 있는 독립 레이어

**As a** 비디오 아티스트, **I want** 최종 레이어들이 서로 다른 시각 요소를 담당하도록, **so that** 각 레이어에 다른 모션을 줘도 구조가 무너지지 않는다.

**Acceptance Criteria**

- [x] AC-1.1: 최종 retained layer의 대다수는 `uniqueCoverage >= 2%`를 만족한다.
- [x] AC-1.2: `uniqueCoverage < 2%`인 레이어는 기본적으로 drop되며, role-critical일 때만 예외 허용한다.
- [x] AC-1.3: 두 후보의 `IoU > 0.85`이고 geometry가 유사하면 merge 또는 drop한다.
- [x] AC-1.4: retained 레이어 중 `uniqueCoverage < 2%`인 것이 0개이다 (role-critical 예외 제외).
- [x] AC-1.5: 최종 retained layer count가 **8개 이하**이다 (G4).

### US-2: 역할 기반 ordering

**As a** 비디오 아티스트, **I want** 레이어가 단순 coverage가 아니라 역할과 구조를 기준으로 배치되도록, **so that** downstream parallax와 occlusion이 자연스럽게 보인다.

**Acceptance Criteria**

- [x] AC-2.1: 최종 ordering은 coverage sort만으로 결정되지 않는다.
- [x] AC-2.2: `background plate`는 항상 가장 뒤 레이어로 배치된다.
- [x] AC-2.3: `foreground-occluder`는 가장 앞쪽 그룹에 배치된다.
- [x] AC-2.4: exclusive ownership 후 retained 레이어 간 pairwise pixel overlap이 **5% 이하**이다 (G2).

### US-3: Qwen의 올바른 사용

**As a** 개발자, **I want** `qwen-image-layered`를 coarse semantic decomposition 용도로 사용하도록, **so that** 불필요한 과분해와 중복 누적을 줄일 수 있다.

**Acceptance Criteria**

- [x] AC-3.1: 기본 decomposition은 `3~4 layers`를 우선 사용한다.
- [x] AC-3.2: 복잡한 이미지에서만 `6` 또는 `8` layer 모드로 상승한다.
- [x] AC-3.3: finer control이 필요할 때는 전체 이미지가 아니라 `선택된 레이어만 재분해`한다.
- [x] AC-3.4: base pass와 recursive pass 여부가 manifest에 기록된다.

### US-4: Variant A/B 비교 가능성

**As a** 개발자, **I want** `Qwen-Only`와 `Qwen+ZoeDepth`를 동일 조건에서 비교할 수 있도록, **so that** 감이 아니라 데이터로 production default를 선택할 수 있다.

**Acceptance Criteria**

- [x] AC-4.1: `pipelineVariant = "qwen-only"` 경로가 구현된다.
- [x] AC-4.2: `pipelineVariant = "qwen-zoedepth"` 경로가 구현된다.
- [x] AC-4.3: 두 경로가 같은 input contract, 같은 archive contract, 같은 scene-generator contract를 사용한다.
- [x] AC-4.4: 비교 결과가 report와 manifest에 기록된다.
- [x] AC-4.5: production mode에서 model version이 immutable SHA가 아니면 **hard fail**한다 (G9).
- [x] AC-4.6: `decomposition-manifest.json`에 exact model version string이 기록된다 (`latest` 불허).

### US-5: 역할 기반 animation preset

**As a** 비디오 아티스트, **I want** background/subject/detail/foreground가 서로 다른 preset을 받도록, **so that** 최종 모션이 의도적으로 보인다.

**Acceptance Criteria**

- [x] AC-5.1: 최종 layer metadata에 `role`이 포함된다.
- [x] AC-5.2: `scene-generator.ts`는 role 기반으로 preset을 선택한다.
- [x] AC-5.3: index 기반 preset assignment를 제거한다.

### US-6: 추적 가능성과 재현성

**As a** 개발자, **I want** 어떤 입력과 어떤 모델/파라미터로 결과가 생성되었는지 남기도록, **so that** 품질 문제를 다시 재현하고 비교할 수 있다.

**Acceptance Criteria**

- [x] AC-6.1: archive에 `decomposition-manifest.json`이 저장된다.
- [x] AC-6.2: manifest에는 source image, prepared image, model id, model version, pipeline variant, candidate stats, drop reasons, `unsafeFlag`, `productionMode`, requested/selected layer counts가 포함된다.
- [x] AC-6.3: source image와 prepared image가 archive에 함께 저장된다.
- [x] AC-6.4: 기존 scene.json (`role` 필드 없음)이 새 스키마에서 정상 파싱된다 (backward compat).

---

## 4. Production Constraints

### 4.1 External API Constraints

- Replicate 결과 URL은 일시적이므로 즉시 다운로드 후 로컬에 저장해야 한다.
- **결과 URL 검증**: fetch 전 `new URL(url).hostname`이 `*.replicate.delivery` 또는 `*.replicate.com`인지 확인. 불일치 시 skip + 경고.
- production rollout 전 `qwen-image-layered`는 immutable version pin을 사용해야 한다.
- `Variant B`를 실험할 때는 `zoedepth`도 immutable version pin을 사용해야 한다.
- **Production mode 정의**: `NODE_ENV=production` 또는 `--production` flag. production mode에서 unpinned model version → hard fail.
- **Retry policy**: max 3회, exponential backoff (1s, 3s, 9s), per-attempt timeout 30s, 총 timeout 100s. `Retry-After` 헤더 존재 시 우선 적용. 3회 실패 → diagnostic 포함 에러.
- **API call cap** (per variant):
  - Variant A: Qwen base 1회 + recursive 최대 3회 = **총 4회**
  - Variant B: Qwen base 1회 + ZoeDepth 1회 + recursive 최대 2회 = **총 4회**
  - Retry는 call cap에 포함하지 않는다 (retry는 동일 call의 재시도).
- 동일 입력 재실행 시 불필요한 비용을 줄이기 위해 cache key를 도입할 수 있어야 한다.
- **`disable_safety_checker` 정책**: configurable flag로 분리. 기본값 `false` (checker ON). CLI `--unsafe` flag로 opt-out. (OQ-4 해결)

### 4.2 Data Handling

- `REPLICATE_API_TOKEN`은 `.env`에서만 읽고 로그에 출력하지 않는다.
- 사용자가 제공한 이미지는 외부 모델 호출 시 Replicate로 전송된다는 점을 명시한다. (이 파이프라인은 로컬 CLI 도구이며, operator가 입력을 직접 선택하므로 별도 end-user consent flow는 불필요.)
- archive는 입력/중간 산출물/최종 산출물을 함께 저장해 forensic debugging이 가능해야 한다.

### 4.3 Backward Compatibility

- existing layered renderer는 계속 사용한다.
- `scene.json`에는 optional field만 추가한다.
- 기존 scene.json은 여전히 parse 가능해야 한다.

---

## 5. Technical Design

### 5.1 Variant Overview

이 PRD는 두 경로를 모두 구현한다.

**CLI interface**:

```bash
npm run pipeline:layers <input.png> --variant qwen-only      # Variant A (default)
npm run pipeline:layers <input.png> --variant qwen-zoedepth   # Variant B
npm run pipeline:layers <input.png> --layers 6                # explicit layer count override
npm run pipeline:layers <input.png> --unsafe                  # disable safety checker
```

기존 `--depth-only` 및 `--qwen-only` flag는 **deprecated** → `--variant`로 통합. 기존 `--depth-only` (pure depth-only mode)는 제거 (Variant B로 대체).

#### Variant A: `Qwen-Only`

```text
input image
-> validate / prepare
-> complexity scoring
-> qwen-image-layered (coarse candidates)
-> candidate extraction
   - RGBA decode
   - connected component split
   - bbox / centroid / edge density
-> selective recursive qwen on chosen candidates
-> dedupe
-> overlap resolve
-> exclusive ownership
-> role assignment
-> final ordered layers
-> scene.json generation
-> provenance manifest
```

#### Variant B: `Qwen+ZoeDepth`

```text
input image
-> validate / prepare
-> complexity scoring
-> qwen-image-layered (coarse candidates)
-> ZoeDepth full-image depth map
-> candidate extraction
   - RGBA decode
   - connected component split
   - bbox / centroid / edge density
   - meanDepth / depthStd / depth histogram
-> selective recursive qwen on chosen candidates
-> optional depth-assisted split on chosen candidates
-> dedupe
-> overlap resolve
-> exclusive ownership
-> role assignment
-> final ordered layers
-> scene.json generation
-> provenance manifest
```

### 5.2 Shared Principle

두 variant 모두 공통으로 다음 원칙을 따른다.

- Qwen output은 최종 레이어가 아니라 `candidate set`이다.
- candidate는 반드시 connected component split을 거친다.
- 최종 layer는 `exclusive ownership`를 가진다.
- 의미 없는 중복 candidate는 drop한다.
- final layer count는 cap을 둔다.
- scene-generator는 role 기반으로 preset을 선택한다.

### 5.3 Complexity Scoring

`qwen-image-layered` layer count는 고정값이 아니라 입력 복잡도에 따라 결정한다.

**Rollout Phase 1 minimal heuristic** (초기값, golden set으로 튜닝 가능):

```ts
const edgeDensity = sobelEdgeRatio(preparedImage);  // 0~1
const colorEntropy = hsvHistogramEntropy(preparedImage);  // bits

if (edgeDensity < 0.10 && colorEntropy < 5.5) return 3;  // simple
if (edgeDensity > 0.20 || colorEntropy > 7.0) return 6;  // complex
return 4;  // medium (default)
```

- `--layers N` CLI override가 있으면 scoring을 건너뛰고 N을 직접 사용한다.
- explicit override가 없는 한 첫 pass에서 8은 사용하지 않는다.

이 단계의 목적은 `Qwen을 과분해 도구가 아니라 coarse semantic tool`로 쓰는 것이다.

### 5.4 Candidate Extraction

Qwen이 반환한 RGBA 이미지는 최종 레이어가 아니라 `candidate`다.

새 internal type:

```ts
interface LayerCandidate {
  id: string;
  source: "qwen-base" | "qwen-recursive" | "depth-split";
  filePath: string;  // 파일 경로 참조 (메모리 압박 방지, pixels: Buffer 대신)
  width: number;
  height: number;
  coverage: number;
  uniqueCoverage?: number;
  meanDepth?: number;
  depthStd?: number;
  bbox: { x: number; y: number; w: number; h: number };
  centroid: { x: number; y: number };
  edgeDensity: number;
  componentCount: number;
  role?: LayerRole;
  parentId?: string;
  droppedReason?: string;
}
```

각 Qwen RGBA output은 다음을 거친다.

1. alpha binarize (threshold > 128 → opaque)
2. connected component split
3. 너무 작은 component 제거 (< 0.5% coverage)
4. component별 stats 계산 (bbox, centroid, coverage, edgeDensity)

**Connected component split 구현**: 순수 JS BFS flood-fill on binarized alpha channel. 외부 dependency 없음 (~100 LOC). 4-connectivity. 성능 목표: < 2s on 2048x2048.

중요:

- Qwen 한 장이 여러 개의 떨어진 섬을 포함하면 하나의 최종 레이어로 유지하지 않는다.
- component split은 production quality에 필수다.

### 5.5 Variant A Details: `Qwen-Only`

Variant A는 기본적으로 semantic 정보와 geometry만으로 레이어를 정리한다.

핵심 포인트:

- recursive Qwen이 primary refinement 수단이다.
- ordering은 role + bbox + coverage + edge heuristics를 조합한다.
- depth는 사용하지 않는다.

장점:

- dependency 수가 적다.
- 운영 복잡도가 낮다.
- Qwen 공식 권장 사용법과 가장 가깝다.

리스크:

- ambiguous front/back 분리에서 한계가 있을 수 있다.

### 5.6 Variant B Details: `Qwen+ZoeDepth`

Variant B는 Qwen 기반 semantic candidate에 depth signal을 보조로 추가한다.

허용 용도:

- meanDepth 계산
- depthStd 계산
- candidate ordering의 tie-break
- depth histogram 분석
- front/back ambiguity 검출
- 선택된 candidate 내부의 selective depth split

금지:

- coverage만 크다고 blanket depth split
- semantic candidate를 무시하고 depth zone을 주 레이어로 채택

장점:

- 특정 장면에서 ordering ambiguity를 줄일 수 있다.

리스크:

- 운영 복잡도 증가
- noisy depth map이 오히려 품질을 악화시킬 수 있음
- 품질 개선이 없으면 dependency만 늘어날 수 있음

### 5.7 Selective Recursive Qwen

공식 README 방향대로 finer control이 필요할 때는 `특정 레이어만 다시 분해`한다.

recursive decomposition 트리거 예시:

- candidate coverage가 크고 내부 구조가 복잡함
- componentCount가 높음
- edge density가 높음
- subject와 background가 하나 layer 안에 같이 있다고 판단됨
- Variant B의 경우 depthStd가 높아 ambiguity가 큼

recursive decomposition 금지 조건:

- 이미 unique coverage가 충분함
- 재분해 비용 대비 기대 이득이 작음
- small decorative layer

### 5.8 Dedupe

후보 레이어 간 유사도를 계산해 중복을 제거한다.

기본 규칙:

- `IoU > 0.85`
- bbox와 centroid 차이도 작음
- Variant B에서는 `|meanDepthA - meanDepthB| < epsilon`도 함께 본다

판정 결과:

- merge
- cleaner candidate만 retain
- one side drop

### 5.9 Exclusive Ownership

최종 확정 단계에서 각 픽셀의 주 소유 레이어를 하나로 정한다.

순서:

1. candidate를 role-adjusted order로 정렬한다.
2. Variant B에서는 depth를 tie-breaker로만 사용한다.
3. `claimed alpha`를 누적한다.
4. 새 candidate의 alpha에서 이미 앞 레이어가 소유한 부분을 제거한다.
5. 남은 unique coverage를 계산한다.
6. 의미 없는 candidate는 drop한다.

**Rollout Phase 1: binarized alpha** (soft alpha halo 방지):

```text
binary_alpha = candidate_alpha > 128 ? 1 : 0
exclusive_mask = binary_alpha AND NOT claimed_mask
claimed_mask = claimed_mask OR binary_alpha
uniqueCoverage = count(exclusive_mask) / totalPixels
```

각 픽셀은 정확히 하나의 레이어에 귀속된다 (argmax semantics). Rollout Phase 2에서 continuous alpha refinement를 검토할 수 있다.

retain rule:

- `uniqueCoverage >= 2%`
- 또는 role-critical 예외

drop rule:

- `uniqueCoverage < 2%`
- 또는 fully redundant

### 5.10 Background Plate

최후방에는 `background plate`를 반드시 둔다.

Tier A (Rollout Phase 1):

- 가장 넓고 연속적인 후면 candidate를 background plate로 사용
- foreground subtraction 이후 남는 hole은 원본 이미지 블렌딩으로 처리 (mild fill)
- hole이 50% 이상이면 원본 이미지의 **unclaimed pixels만** 추출하여 fallback background plate로 사용 + manifest에 경고 기록. fallback plate는 exclusive ownership 후 잔여 영역만 채우므로 AC-2.4 overlap 제약을 위반하지 않는다.

Tier B (Rollout Phase 2+):

- local inpaint or hole reconstruction

### 5.11 Role Assignment

최종 레이어에 역할을 부여한다.

```ts
type LayerRole =
  | "background-plate"
  | "background"
  | "midground"
  | "subject"
  | "detail"
  | "foreground-occluder";
```

초기 heuristic:

- 가장 넓고 연속적인 후면 영역 → background-plate
- 후면의 넓은 보조 영역 → background
- 중간 depth + 중간 coverage → midground
- 중앙 subject-like bbox → subject
- 작고 분리된 장식 → detail
- 화면 가장자리와 닿는 앞쪽 구조 → foreground-occluder

**Role priority ladder** (cap 초과 시 낮은 우선순위부터 drop):

```
background-plate > subject > foreground-occluder > background > midground > detail
```

### 5.12 Scene Generation Changes

`scene-generator.ts`는 index 기반 preset에서 role 기반 preset으로 전환한다.

예시:

- background-plate: 가장 느린 color cycle, 가장 큰 parallax, wave 약함
- background: 느린 color cycle, 중간 parallax
- midground: background와 subject 사이 보간값
- subject: 중간 parallax, 중간 wave
- detail: 빠른 hue, 작은 wave, 선택적 glow
- foreground-occluder: 큰 parallax, 보수적 saturation

중요:

- 이 PRD는 color engine 재설계 PRD가 아니다.
- 다만 decomposition 결과를 downstream motion에 올바르게 연결해야 하므로 role-based preset은 포함 범위다.

### 5.13 Provenance Manifest

**Archive integration**: `createRunContext()`를 사용 (기존 `createWorkDir()` 대신). 중간 산출물은 work dir (transient, auto-cleanup), 최종 산출물만 archive dir에 영구 저장.

추가 산출물 (archive dir):

```text
out/layered/{date}_{title}/
  source/
    original.<ext>
    prepared.png
  layers/
  scene.json
  decomposition-manifest.json
  <title>.mp4
```

manifest 예시 필드:

```json
{
  "runId": "...",
  "pipelineVariant": "qwen-only",
  "sourceImage": "...",
  "preparedImage": "...",
  "models": {
    "qwenImageLayered": {
      "model": "qwen/qwen-image-layered",
      "version": "...",
      "numLayersBase": 4
    },
    "zoeDepth": {
      "model": "cjwbw/zoedepth",
      "version": "6375723d..."
    }
  },
  "passes": [
    { "type": "qwen-base", "candidateCount": 4 },
    { "type": "qwen-recursive", "parentId": "..." },
    { "type": "depth-split", "parentId": "..." }
  ],
  "finalLayers": [
    {
      "id": "layer-0",
      "role": "background-plate",
      "coverage": 0.31,
      "uniqueCoverage": 0.31,
      "meanDepth": 0.92
    }
  ],
  "droppedCandidates": [
    { "id": "cand-7", "reason": "redundant-overlap" }
  ]
}
```

---

## 6. File-Level Changes

### 6.1 Required Code Changes

**수정:**
```text
scripts/pipeline-layers.ts           — CLI 인터페이스 변경 (--variant, --layers, --unsafe)
scripts/lib/image-decompose.ts       — candidate model 도입, Qwen 호출 개선 (retry, version pin, safety flag)
scripts/lib/scene-generator.ts       — role 기반 preset 전환
scripts/lib/postprocess.ts           — alphaDilate 제거 (exclusive ownership과 충돌). removeNoiseIslands는 candidate extraction 전에만 실행
src/lib/scene-schema.ts              — LayerRole optional field 추가
src/lib/scene-schema.test.ts         — role field 파싱 + backward compat 테스트
scripts/lib/scene-generator.test.ts  — role 기반 preset 테스트
scripts/lib/image-layered.test.ts    — decomposition 관련 테스트 업데이트
README.md
```

**신규:**
```text
scripts/lib/candidate-extraction.ts  — BFS flood-fill CCA, candidate stats, RGBA decode
scripts/lib/layer-resolve.ts         — dedupe, exclusive ownership, role assignment
scripts/lib/complexity-scoring.ts    — edge density + entropy → layer count heuristic
scripts/lib/decomposition-manifest.ts — manifest 생성/검증
scripts/lib/candidate-extraction.test.ts
scripts/lib/layer-resolve.test.ts
scripts/lib/complexity-scoring.test.ts
```

**postprocess.ts 실행 순서 결정**: `alphaDilate`는 exclusive ownership의 binarized mask와 충돌하므로 **제거**. `removeNoiseIslands`는 candidate extraction의 alpha threshold 단계에서만 사용 (ownership 이전). ownership 이후에는 mask를 변형하지 않는다.

### 6.2 Schema Changes

`scene.json`에는 optional field만 추가한다.

예상 추가:

```ts
role?: LayerRole
```

기존 renderer compatibility를 위해 기존 필드는 유지한다.

---

## 7. Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | Qwen returns empty/near-empty layer | skip candidate, record in manifest | Low |
| E2 | Qwen returns mostly overlapping layers | dedupe + recursive refinement path | High |
| E3 | Variant B에서 depth map noise가 큼 | semantic-first fallback | Medium |
| E4 | all unique coverage values are too small | fallback to smaller retained set + background plate | High |
| E5 | recursive decomposition fails | keep parent candidate, continue pipeline | Medium |
| E6 | Replicate URL fetch fails | retry with backoff, then fail with diagnostic | High |
| E7 | model version is unpinned in production mode | hard fail before remote call | High |
| E8 | final layer count exceeds cap | retain top candidates by role priority ladder (§5.11), then uniqueCoverage | Medium |
| E9 | Sharp decode failure on Replicate RGBA output (corrupt/truncated) | skip candidate, record in manifest with reason | Medium |
| E10 | Replicate 429 rate limit | backoff + retry per §4.1 policy, then fail | High |
| E11 | Disk space exhaustion during archive write | check available space before write, fail early with diagnostic | Medium |
| E12 | CCA yields zero components (degenerate alpha) | skip candidate, record as "empty-alpha" | Low |
| E13 | Background plate has >50% holes after foreground subtraction | use original image as fallback background plate, warn in manifest | Medium |
| E14 | Recursive Qwen API call cap (4회) 도달 | stop recursion, proceed with current candidates | Low |

---

## 8. Testing Strategy

### 8.1 Unit Tests

- candidate extraction from RGBA
- connected component split
- bbox / centroid / coverage stats
- IoU dedupe
- exclusive ownership
- role assignment
- schema optional role parsing

### 8.2 Integration Tests

golden image set:

- simple portrait
- single subject with clean background
- busy collage
- current known failure image
- one highly occluded frame-like composition

검증 항목:

- retained layer count
- duplicate ratio
- unique coverage distribution
- background plate presence
- role assignment validity
- scene.json generation success
- archive manifest completeness
- variant A/B parity in archive structure

### 8.3 E2E Validation

1. `pipeline:layers` Variant A 실행
2. `pipeline:layers` Variant B 실행
3. `public/scene.json` generation success 확인
4. preview에서 layer isolation 육안 확인
5. `export:layered` 실행
6. archive provenance 확인
7. variant A/B compare report 생성

### 8.4 Manual Visual QA

- 레이어를 개별로 켰을 때 서로 다른 요소처럼 보이는가
- foreground와 background가 실제로 분리되어 보이는가
- parallax를 주었을 때 depth illusion이 생기는가
- detail layer가 decoration처럼 읽히는가
- Variant B가 Variant A보다 실제로 더 좋아 보이는가

---

## 9. Success Metrics

### 9.1 Decomposition Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Final retained layer count | 10~20+ | 5~8 | final layer count |
| Duplicate-heavy retained layers | 높음 | near zero | uniqueCoverage < 2% retained count |
| Mean unique coverage | 낮음 | 상승 | average uniqueCoverage |
| Overlap ratio | 높음 | 크게 감소 | pairwise IoU stats |
| Role completeness | 없음 | 100% | all retained layers have role |
| Provenance completeness | 없음 | 100% | manifest fields present |
| Variant report completeness | 없음 | 100% | A/B report fields present |

### 9.2 Downstream Quality Guardrails

이 PRD의 주 목적은 decomposition이지만, downstream 품질이 개선되지 않으면 의미가 없다.

guardrail:

- layer count 증가가 아니라 unique structure 증가로 품질이 좋아져야 한다
- scene-generator role-based preset이 실제 레이어 역할과 일치해야 한다
- preview에서 레이어 분리감이 baseline보다 좋아져야 한다

### 9.3 Variant Decision Metrics

두 variant는 다음 항목으로 비교한다.

| Metric | Better Direction | Why |
|--------|------------------|-----|
| mean unique coverage | higher | 독립 레이어 품질 |
| duplicate-heavy retained layers | lower | 중복 복사 억제 |
| retained layer count stability | more stable | 과분해 억제 |
| manual visual separation score | higher | 실제 layer usefulness |
| downstream motion readability | higher | 최종 렌더 기여도 |
| runtime cost | lower | production practicality |
| external dependency count | lower | 운영 복잡도 |

### 9.4 Production Selection Rule

- `Qwen-Only`가 품질 기준을 충족하면 기본값으로 채택한다.
- `Qwen+ZoeDepth`는 `Qwen-Only` 대비 의미 있는 품질 개선이 있을 때만 채택한다.
- 의미 있는 개선의 최소 조건:
  - golden set majority에서 manual visual separation score 개선
  - duplicate ratio 추가 감소
  - downstream motion readability 개선
  - 운영 복잡도 증가를 정당화할 만큼의 품질 차이

---

## 10. Rollout Plan

### Phase 1

- candidate model 도입
- connected component split
- dedupe
- exclusive ownership
- background plate
- provenance manifest
- Variant A (`qwen-only`) 구현

### Phase 2

- selective recursive Qwen
- role-based scene generation
- Variant B (`qwen-zoedepth`) 구현

### Phase 3

- cache / reuse by source hash
- improved background hole fill
- golden-set regression harness
- A/B comparison report and production default decision

---

## 11. Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| heuristic가 과도해 유효 레이어를 제거 | Medium | Medium | threshold tuning + golden set |
| recursive decomposition 비용 증가 | Medium | Low | selected-layer only |
| ZoeDepth가 품질 개선 없이 운영 복잡도만 늘림 | Medium | Medium | A/B compare 후 기본값 미채택 |
| depth map noise로 ordering error | Medium | Medium | semantic-first fallback |
| provenance/manifest 미완성으로 재현성 부족 | Low | High | phase 1 required |
| background plate hole artifacts | Medium | Medium | minimum viable fill + explicit limitation |

---

## 12. Open Questions

- [x] OQ-1: complexity score feature 조합 → **§5.3에서 Sobel edge density + HSV histogram entropy로 결정. Phase 1 초기값 명시.**
- [ ] OQ-2: role assignment heuristic을 어디까지 1차 구현에 포함할지
- [ ] OQ-3: background hole fill을 Sharp만으로 할지 별도 dependency를 둘지 (Phase 1: 원본 블렌딩)
- [x] OQ-4: `disable_safety_checker` 정책 → **§4.1에서 결정: configurable flag, 기본값 false (ON), --unsafe로 opt-out.**
- [ ] OQ-5: ZoeDepth variant를 유지할 만큼 품질 이득이 실제로 있는지 (A/B 결과로 결정)

---

## 13. Key Decisions Summary

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| Base Qwen layer count | 3~4 default, 6 for complex, 8 only explicit/rare | 공식 README 권장과 정합 |
| Fine decomposition | selected-layer recursive Qwen | 전체 이미지 재분해보다 효율적 |
| Depth usage | Variant B only | 기본 경로와 실험 경로를 분리 |
| Layer ordering | role-adjusted, optional depth tie-break | coverage는 depth가 아니다 |
| Final layer count | cap 8 | 그 이상은 중복 가능성이 높다 |
| Duplicate removal | required | 현재 품질 문제의 핵심 |
| Exclusive ownership | required | 각 픽셀의 주 소유 레이어를 정해야 한다 |
| Provenance manifest | required | 재현성과 디버깅에 필수 |
| Model versions | pin in production | drift 방지 |
| Production default | defer until A/B result | 먼저 비교 후 결정 |

---

## Review History

### Round 1 (v1.1 → v1.2)

**Reviewers**: strategist + guardian + boomer (XL 3인 팀)

| # | Sev | Source | Issue | Resolution |
|---|-----|--------|-------|-----------|
| 1 | P1 | S+B | CCA 알고리즘/라이브러리 미지정 | §5.4: BFS flood-fill on alpha, zero deps 명시 |
| 2 | P1 | G | G2 exclusive ownership AC 없음 | AC-2.4 추가: pairwise overlap < 5% |
| 3 | P1 | G | G4 layer count cap AC 없음 | AC-1.5 추가: retained <= 8 |
| 4 | P1 | G | G9 version pin AC 없음 | AC-4.5/4.6 추가 |
| 5 | P1 | S | CLI variant 선택 미지정 | §5.1: --variant flag 명시 |
| 6 | P1 | S | §6.1 신규 파일 누락 | §6.1: 7개 신규 파일 + postprocess 실행 순서 명시 |
| 7 | P1 | B | postprocess.ts와 ownership 충돌 | §6.1: alphaDilate 제거, 실행 순서 결정 |
| 8 | P1 | S+B | claimed_alpha 소프트 알파 취약성 | §5.9: binarized alpha (threshold > 128) for Phase 1 |
| 9 | P1 | G | Retry/backoff 미명세 | §4.1: max 3회, exponential backoff 명시 |
| 10 | P1 | G+B | disable_safety_checker OQ 미해결 | §4.1: configurable flag, 기본 ON, --unsafe opt-out |
| 11 | P2 | S | Phase 용어 충돌 (§5.10 vs §10) | §5.10: Tier A/B로 변경 |
| 12 | P2 | S | Cap vs uniqueCoverage 우선순위 미정 | §5.11: role priority ladder 추가 |
| 13 | P2 | B | Complexity scoring golden set 없이 배포 | §5.3: Phase 1 minimal heuristic 초기값 명시 |
| 14 | P2 | B | LayerCandidate pixels: Buffer 메모리 압박 | §5.4: filePath 참조 방식으로 변경 |
| 15 | P2 | G | Backward compat AC 부재 | AC-6.4 추가 |
| 16 | P2 | S | midground preset 누락 | §5.12: midground 보간값 추가 |
| 17 | P2 | S | Archive + RunContext 통합 미명세 | §5.13: createRunContext() 명시 |
| 18 | P2 | G | 에러 시나리오 부족 | §7: E9-E14 6개 추가 |
| 19 | P2 | S | --depth-only deprecated 미명시 | §5.1: deprecated → --variant로 통합 명시 |
| 20 | P2 | B | Recursive Qwen API 비용 상한 없음 | §4.1: 총 4회 상한 명시 |

### Round 2 (v1.2 → v1.3)

**Reviewers**: strategist + guardian + boomer

| Reviewer | Verdict | Notes |
|----------|---------|-------|
| strategist | ALL PASS | P1 10건 전수 해결 확인. cross-reference 일관성 검증 통과 |
| guardian | ALL PASS | AC 5건 테스트 가능 확인. E9-E14 충분. P3 3건 (문서 정리, non-blocking) |
| boomer | HAS ISSUE → **RESOLVED** | P1 2건: retry timeout 모순 + Variant B API cap 불가 → v1.3에서 수정 |

Boomer P1 수정:
| # | Issue | Resolution |
|---|-------|-----------|
| 1 | Retry timeout 모순 (3×60s > 120s) | per-attempt 30s, 총 100s로 정합성 확보 |
| 2 | API call cap 4 Variant B 불가 | per-variant 예산 분리 (A: 1+3, B: 1+1+2) |

Boomer P2 수정:
| # | Issue | Resolution |
|---|-------|-----------|
| 3 | Fallback plate vs overlap AC 충돌 | unclaimed pixels만 추출, AC-2.4 위반 불가 명시 |
| 4 | --unsafe manifest 미기록 | AC-6.2에 unsafeFlag, productionMode 필드 추가 |

**PRD Status: v1.3 → Approved**

---

## Appendix A: Current Local Code References

- `scripts/lib/image-decompose.ts`
- `scripts/pipeline-layers.ts`
- `scripts/lib/postprocess.ts`
- `scripts/lib/scene-generator.ts`

## Appendix B: External Source Notes

- Replicate official model page for `qwen/qwen-image-layered` confirms:
  - RGBA layer decomposition
  - 3~4 layers recommended for most images
  - 6~8 layers for more complex scenes
  - recursive decomposition of a specific layer is a valid usage pattern
- Replicate official model page for `cjwbw/zoedepth` confirms:
  - depth estimation model
  - suitable as optional supporting depth signal, not semantic layer model
