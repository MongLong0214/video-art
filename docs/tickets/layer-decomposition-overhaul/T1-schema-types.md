# T1: Schema + Types

**PRD Ref**: PRD-layer-decomposition-overhaul > US-5, US-6, §5.4, §5.11, §6.2
**Priority**: P1 (High)
**Size**: S
**Status**: Todo
**Depends On**: None

---

## 1. Objective

LayerRole type, LayerCandidate interface, scene.json schema에 optional `role` 필드를 추가한다. 모든 후속 티켓의 기반.

## 2. Acceptance Criteria

- [ ] AC-1: `LayerRole` type이 6개 역할을 포함 (background-plate, background, midground, subject, detail, foreground-occluder)
- [ ] AC-2: `LayerCandidate` interface가 PRD §5.4 명세와 일치 (filePath 참조 방식)
- [ ] AC-3: scene.json layerSchema에 `role?: LayerRole` optional 필드 추가
- [ ] AC-4: 기존 scene.json (role 없음)이 새 스키마에서 정상 파싱 (AC-6.4)
- [ ] AC-5: 잘못된 role string은 Zod 검증에서 거부

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should accept valid LayerRole values` | Unit | 6개 역할 모두 파싱 성공 | PASS |
| 2 | `should reject invalid role string` | Unit | `"invalid-role"` → 거부 | Zod error |
| 3 | `should parse scene.json without role field` | Unit | 기존 scene.json (role 없음) | PASS, role=undefined |
| 4 | `should parse scene.json with role field` | Unit | role="subject" 포함 scene.json | PASS, role="subject" |

### 3.2 Test File Location
- `src/lib/scene-schema.test.ts` (기존 파일에 추가)

### 3.3 Mock/Setup Required
- 없음 (pure schema validation)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `src/lib/scene-schema.ts` | Modify | LayerRole enum + layerSchema에 role optional 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `LayerRole` type 정의 (z.enum)
2. `layerSchema`에 `role: layerRoleSchema.optional()` 추가
3. `LayerCandidate` interface를 별도 타입 파일 또는 scene-schema에 export

### 4.3 Refactor Phase
- 없음

## 5. Edge Cases
- EC-1: role 필드가 null인 경우 → optional이므로 undefined 처리
- EC-2: 빈 string role → Zod enum 거부

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
