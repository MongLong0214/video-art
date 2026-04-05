# T3: 렌더링 이펙트 자동 활성화

**PRD Ref**: PRD-layer-pipeline-overhaul > US-6
**Priority**: P2 (Medium)
**Size**: M (2-4h)
**Status**: Done
**Depends On**: T2 (config 필드 필요)
**Wave**: 1

---

## 1. Objective

scene-generator가 depth 데이터 기반으로 parallax, haze, feather를 자동 계산하여 영상에 입체감과 대기 효과를 기본 적용한다.

## 2. Acceptance Criteria

- [ ] AC-1: parallax scale: depthNorm < 0.3 (far) → scale 0.02, depthNorm > 0.7 (near) → scale 0.005
- [ ] AC-2: haze intensity: depthNorm < 0.3 → intensity 0.3, depthNorm > 0.5 → intensity 0
- [ ] AC-3: feather radius: foreground-occluder role → radius 0.05, 나머지 → 0
- [ ] AC-4: config multiplier(depthParallaxScale, hazeIntensity, featherRadius)로 강도 조절 가능
- [ ] AC-5: 기존 scene.json 스키마 호환 (parallax/haze/feather는 이미 optional 필드)
- [ ] AC-6: depth 데이터 없는 레이어 → 이펙트 미적용 (graceful)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `generateSceneJson applies parallax by depth` | Unit | meanDepth=30 (far) 레이어 → parallax config 검사 | scale ~0.02 |
| 2 | `generateSceneJson applies haze for far layers` | Unit | meanDepth=20 레이어 → haze intensity > 0 | intensity ~0.3 |
| 3 | `generateSceneJson applies feather for occluder` | Unit | role=foreground-occluder → feather radius > 0 | radius ~0.05 |
| 4 | `generateSceneJson skips effects without depth` | Unit | meanDepth=undefined → parallax/haze = 0 | no effects |
| 5 | `config multiplier scales effects` | Unit | depthParallaxScale=0 config → parallax 0 | overridden to 0 |

### 3.2 Test File Location
- `scripts/lib/scene-generator.test.ts` (기존 파일에 추가)

### 3.3 Mock/Setup Required
- Vitest: RetainedLayer mock 객체 생성

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/scene-generator.ts` | Modify | depth-based parallax/haze/feather 자동 계산 로직 |
| `scripts/lib/scene-generator.test.ts` | Modify | 새 테스트 케이스 |

### 4.2 Implementation Steps (Green Phase)
1. `generateSceneJson`에서 각 레이어의 `meanDepth`를 `depthNorm` (0-1)으로 정규화
2. depthNorm 기반 parallax/haze/feather 값 계산 (AC 기준 범위)
3. config multiplier 적용: `finalValue = calculatedValue * configMultiplier`
4. scene.json의 effects 객체에 parallax/haze/feather 포함

## 5. Edge Cases
- EC-1: 모든 레이어 depth 동일 → 모두 같은 효과 (정상)
- EC-2: depth 데이터 없음 → 모든 cinematic 효과 0 (기존 동작 유지)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
