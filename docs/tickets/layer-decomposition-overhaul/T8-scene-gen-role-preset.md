# T8: Scene Generator Role-Based Preset

**PRD Ref**: PRD-layer-decomposition-overhaul > US-5, §5.12, AC-5.1~5.3
**Priority**: P1 (High)
**Size**: M
**Status**: Todo
**Depends On**: T5

---

## 1. Objective

scene-generator.ts를 index 기반에서 role 기반 preset 선택으로 전환. 각 역할에 맞는 animation 파라미터 부여.

## 2. Acceptance Criteria

- [ ] AC-1: retained layer metadata에 `role` 포함 (AC-5.1)
- [ ] AC-2: scene-generator가 role 기반으로 preset 선택 (AC-5.2)
- [ ] AC-3: index 기반 `generatePreset(index, total, duration)` 제거 (AC-5.3)
- [ ] AC-4: 6개 role 모두에 대한 preset 정의
- [ ] AC-5: scene.json에 role 필드 기록

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should assign slowest parallax to background-plate` | Unit | role=background-plate | parallax.depth 최대 |
| 2 | `should assign fastest hue to detail` | Unit | role=detail | colorCycle.speed 최대 |
| 3 | `should assign conservative saturation to fg-occluder` | Unit | role=foreground-occluder | saturationBoost < default |
| 4 | `should include midground preset` | Unit | role=midground | background와 subject 사이 값 |
| 5 | `should include role in scene.json layer` | Unit | generated scene | layer.role defined |
| 6 | `should not use index-based preset` | Unit | 호출 시그니처 | generatePreset(index,total) 없음 |
| 7 | `should generate valid scene for all roles` | Integration | 6개 role mock layers | sceneSchema.parse 성공 |

### 3.2 Test File Location
- `scripts/lib/scene-generator.test.ts` (기존 파일 수정)

### 3.3 Mock/Setup Required
- mock retained layers with roles

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/scene-generator.ts` | Major Modify | role-based preset map, index-based 제거 |

### 4.2 Implementation Steps (Green Phase)
1. `ROLE_PRESETS: Record<LayerRole, PresetConfig>` 정의
2. `generateSceneJson()`에서 layer.role → ROLE_PRESETS[role] 매핑
3. 기존 `generatePreset(index, total, duration)` 제거
4. scene.json layer에 `role` 필드 추가

### 4.3 Refactor Phase
- preset 값을 golden set 테스트 후 튜닝

## 5. Edge Cases
- EC-1: role이 undefined인 layer → "midground" fallback
- EC-2: 동일 role이 여러 layer에 → preset 동일, phaseOffset만 차등

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
