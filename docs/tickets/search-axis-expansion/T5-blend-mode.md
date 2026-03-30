# T5: Blend Mode Axis (Phase C)

**PRD Ref**: PRD-search-axis-expansion > US-4
**Priority**: P2 (Medium)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T1, T3 (layered-psychedelic.ts 동시 수정 방지)

---

## 1. Objective

레이어 블렌딩 모드를 research-config.ts에서 선택 가능하게 추가. normal/add/multiply/screen 4가지.

## 2. Acceptance Criteria

- [ ] AC-1: `blendMode` (enum: 'normal'|'add'|'multiply'|'screen', default 'normal') 스키마 추가
- [ ] AC-2: scene-schema.ts layerSchema에 `blending` 필드 추가
- [ ] AC-3: scene-generator.ts에서 config.blendMode를 scene.json 각 layer에 기록
- [ ] AC-4: layered-psychedelic.ts에서 blending 필드를 Three.js material.blending에 매핑
- [ ] AC-5: 매핑: normal→NormalBlending, add→AdditiveBlending, multiply→MultiplyBlending, screen→CustomBlending+AddEquation+OneFactor+OneMinusSrcColorFactor
- [ ] AC-6: default 'normal'에서 기존 렌더링과 동일

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `blendMode default is normal` | Unit | getDefaultConfig().blendMode | 'normal' |
| 2 | `scene.json layers include blending field` | Unit | generateSceneJson with blendMode='add' → all layers have blending='add' | 'add' |
| 3 | `blendMode invalid value rejected` | Unit | parse({blendMode:'overlay'}) | Zod error |
| 4 | `blendMode normal maps to NormalBlending` | Unit | mapBlendMode('normal') === THREE.NormalBlending | true |
| 5 | `blendMode screen maps to CustomBlending` | Unit | mapBlendMode('screen') → {blending, blendEquation, blendSrc, blendDst} | CustomBlending config |
| 6 | `default blendMode produces identical render` | Integration | default config → no material.blending change from baseline | identical |

### 3.2 Test File Location

- `scripts/research/research-config.test.ts`
- `scripts/lib/scene-generator.test.ts`

### 3.3 Mock/Setup Required

- Vitest: THREE import mock for blending constant verification

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/research-config.ts` | Modify | blendMode enum 스키마 추가 |
| `src/lib/scene-schema.ts` | Modify | layerSchema에 blending 필드 추가 |
| `scripts/lib/scene-generator.ts` | Modify | config.blendMode → layer.blending 기록 |
| `src/sketches/layered-psychedelic.ts` | Modify | blending 필드 → Three.js material 설정 |

### 4.2 Implementation Steps (Green Phase)

1. research-config.ts: `blendMode: z.enum(['normal','add','multiply','screen']).default('normal')`
2. scene-schema.ts: layerSchema에 `blending: z.enum([...]).default('normal')`
3. scene-generator.ts: 각 layer 객체에 `blending: config?.blendMode ?? 'normal'`
4. layered-psychedelic.ts: `mapBlendMode` 헬퍼 함수 구현
5. layered-psychedelic.ts: ShaderMaterial 생성 시 `material.blending = mapBlendMode(layerConfig.blending)`
6. screen 모드: `material.blending = CustomBlending`, `material.blendEquation = AddEquation`, `material.blendSrc = OneFactor`, `material.blendDst = OneMinusSrcColorFactor`

### 4.3 Refactor Phase

- mapBlendMode를 별도 유틸로 추출 고려

## 5. Edge Cases

- EC-1: blendMode='add' + 높은 bloom → 과노출 (E5). 연구 루프가 자연 도태
- EC-2: blendMode='multiply' → 어두운 이미지에서 과도하게 어두워짐

## 6. Review Checklist

- [ ] Red → FAILED
- [ ] Green → PASSED
- [ ] Refactor → PASSED 유지
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] Phase C 완료 후 `npm run research:run` 1회 성공 확인
