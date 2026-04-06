# T1: scene-schema.ts에 motion 필드 추가

**PRD Ref**: PRD-ai-motion-pipeline > US-4 (하위호환)
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective

scene-schema.ts의 layerSchema에 optional `motion` 필드를 추가하여 비디오 프레임 시퀀스 레이어를 지원. 기존 scene.json (motion 없음)의 파싱이 100% 동일하게 유지되어야 한다.

## 2. Acceptance Criteria

- [ ] AC-1: `motion` 필드가 있는 scene.json이 정상 파싱됨
- [ ] AC-2: `motion` 필드가 없는 기존 scene.json이 기존과 동일하게 파싱됨 (하위호환)
- [ ] AC-3: motion.enabled, framesDir, frameCount, fps, model, intensity 필드 검증
- [ ] AC-4: 기존 143개 테스트 전부 통과

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `parses scene with motion field` | Unit | motion 필드 포함 scene.json 파싱 | motion 객체 정상 반환 |
| 2 | `parses scene without motion field (v1 compat)` | Unit | 기존 scene.json (motion 없음) 파싱 | motion = undefined |
| 3 | `validates motion.framesDir as string` | Unit | framesDir 빈문자열 시 | Zod 검증 실패 |
| 4 | `validates motion.frameCount as positive int` | Unit | frameCount=0 또는 음수 | Zod 검증 실패 |
| 5 | `validates motion.intensity enum` | Unit | intensity="extreme" 잘못된 값 | Zod 검증 실패 |
| 6 | `motion enabled with duration=16 passes period check` | Unit | duration=16, period=8 | superRefine 통과 |

### 3.2 Test File Location

- `src/lib/__tests__/scene-schema.test.ts` (기존 파일에 추가)

### 3.3 Mock/Setup Required

- 없음. 순수 Zod 스키마 테스트.

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `src/lib/scene-schema.ts` | Modify | layerSchema에 motion optional 필드 추가 |

### 4.2 Implementation Steps (Green Phase)

1. `motionSchema` 정의 (enabled, framesDir, frameCount, fps, model, intensity)
2. `layerSchema`에 `motion: motionSchema.optional()` 추가
3. `MotionConfig` 타입 export

### 4.3 Refactor Phase

- 없음

## 5. Edge Cases

- EC-1: motion 필드 없는 기존 scene.json → undefined (E10)
- EC-2: motion.enabled=false → 프레임 시퀀스 미사용

## 6. Review Checklist

- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
