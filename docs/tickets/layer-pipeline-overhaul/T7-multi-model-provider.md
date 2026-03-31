# T7: 멀티모델/멀티 API Provider 세그멘테이션

**PRD Ref**: PRD-layer-pipeline-overhaul > US-4
**Priority**: P1 (High)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T2 (config segmentationModel, apiProvider 필드)
**Wave**: 3

---

## 1. Objective

SAM3(Replicate) 외에 fal.ai SAM3/EVF-SAM, GroundingDINO+SAM2(Replicate)를 선택 가능하게 하고, provider별 URL validation + API 키 관리를 구현한다.

## 2. Acceptance Criteria

- [ ] AC-1: config `segmentationModel`: "sam3" | "grounded-sam2" | "evf-sam"
- [ ] AC-2: config `apiProvider`: "replicate" | "fal"
- [ ] AC-3: GroundingDINO+SAM2 경로: `adirik/grounding-dino` → bbox → `meta/sam-2` → mask
- [ ] AC-4: fal.ai 경로: `fal-ai/sam-3/image` 또는 `fal-ai/evf-sam`
- [ ] AC-5: 각 모델의 model ID + version hash를 상수로 관리
- [ ] AC-6: fallback: fal.ai SAM3 → Replicate SAM3 (provider별 timeout 5s)
- [ ] AC-7: `validateProviderUrl()`: provider별 trusted domain whitelist
- [ ] AC-8: FAL_KEY env var 관리 + maskToken 확장
- [ ] AC-9: mock API 테스트로 각 경로 + fallback 검증

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `validateProviderUrl accepts fal.run` | Unit | URL `https://queue.fal.run/...` → 통과 | no throw |
| 2 | `validateProviderUrl rejects unknown domain` | Unit | URL `https://evil.com/...` → throw | Error |
| 3 | `getToken returns FAL_KEY for fal provider` | Unit | env.FAL_KEY 설정 → getToken("fal") | FAL_KEY 값 |
| 4 | `getToken throws for missing FAL_KEY` | Unit | env.FAL_KEY 미설정 → throw | Error with message |
| 5 | `maskToken masks fal key prefix` | Unit | `fal_***` 형태 | masked string |
| 6 | `grounded-sam2 model calls GroundingDINO then SAM2` | Integration | mock API → 2개 순차 호출 확인 | bbox → mask 순서 |
| 7 | `fal sam3 model calls fal.ai endpoint` | Integration | mock → fal.ai URL 호출 | correct endpoint |
| 8 | `fallback from fal to replicate on failure` | Integration | fal mock 실패 → replicate mock 성공 | replicate 결과 반환 |

### 3.2 Test File Location
- `scripts/lib/replicate-utils.test.ts` (신규 생성 — 기존 파일 미존재)

Note: P2 boomer 피드백 반영 — provider-registry.ts 별도 파일 대신 replicate-utils.ts 확장으로 단순화. 2개 provider 규모에서 별도 registry는 과잉.

### 3.3 Mock/Setup Required
- Vitest: `vi.mock('replicate')`, fal.ai fetch mock
- env var mock: `vi.stubEnv('FAL_KEY', 'test_key')`

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/replicate-utils.ts` | Modify | getToken(provider), validateProviderUrl(url, provider), 모델 상수 추가 |
| `scripts/lib/replicate-utils.test.ts` | Create | URL validation, token, fallback 테스트 |
| `scripts/lib/image-decompose.ts` | Modify | decomposeImageSam3 내 model/provider 분기 |
| `scripts/lib/pipeline-cli.ts` | Modify | --model, --provider CLI 플래그 |

### 4.2 Implementation Steps (Green Phase)
1. `provider-registry.ts` 생성:
   - 모델 상수: GROUNDING_DINO_MODEL/VERSION, SAM2_MODEL/VERSION, FAL_SAM3_ENDPOINT, FAL_EVF_SAM_ENDPOINT
   - `getToken(provider: "replicate" | "fal")` → env var 조회
   - `validateProviderUrl(url, provider)` → domain whitelist 체크
   - `TRUSTED_DOMAINS` map: replicate → [".replicate.delivery", ".replicate.com"], fal → [".fal.run", ".fal.ai"]
2. `replicate-utils.ts` 에서 `validateReplicateUrl` → `validateProviderUrl("replicate")` 위임
3. `image-decompose.ts` 의 `decomposeImageSam3` 에 model/provider 분기:
   - sam3+replicate: 기존 경로
   - sam3+fal: fal.ai HTTP API 호출
   - evf-sam+fal: fal.ai EVF-SAM 호출
   - grounded-sam2+replicate: GroundingDINO → SAM2 순차 호출
4. fallback 구현: primary 실패 → secondary provider로 재시도
5. `pipeline-cli.ts` 에 --model, --provider 파싱

### 4.3 Refactor Phase
- 각 모델 경로를 strategy pattern으로 분리 가능 (향후)

## 5. Edge Cases
- EC-1: FAL_KEY 미설정 + provider=fal → 명확한 에러 메시지
- EC-2: GroundingDINO가 빈 bbox 반환 → SAM2 호출 건너뜀
- EC-3: 모든 provider 실패 → Error throw (E9 시나리오)
- EC-4: fal.ai rate limit → withRetry 공유

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
