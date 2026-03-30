# T1: Effect Composer Axes (Phase A)

**PRD Ref**: PRD-search-axis-expansion > US-1
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective

bloom radius/threshold, CA modulationOffset 3개 하드코딩 상수를 research-config.ts에서 제어 가능하게 배선.

## 2. Acceptance Criteria

- [ ] AC-1: `bloomRadiusMul` (0.1~3.0, default 1.0) 스키마 추가 + `effects.bloom.radius = Math.min(0.4 * mul, 1.0)` 적용
- [ ] AC-2: `bloomThresholdMul` (0.1~3.0, default 1.0) 스키마 추가 + `effects.bloom.threshold = 0.7 * mul` 적용
- [ ] AC-3: `caModulationOffsetMul` (0.1~3.0, default 1.0) 스키마 추가 + `modulationOffset = 0.3 * mul` 적용
- [ ] AC-4: scene-schema.ts chromaticAberration에 `modulationOffset` 필드 추가
- [ ] AC-5: effect-composer.ts에서 `modulationOffset`을 scene.json에서 읽도록 수정 (하드코딩 제거)
- [ ] AC-6: default 값(1.0)에서 기존 scene.json과 identical
- [ ] AC-7: non-default 값에서 scene.json 출력이 변함 (effectiveness)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `bloomRadiusMul applies to scene effects` | Unit | config에 bloomRadiusMul=2.0 → scene.json bloom.radius = 0.4*2=0.8 | 0.8 |
| 2 | `bloomRadiusMul clamps at 1.0` | Unit | bloomRadiusMul=3.0 → radius = min(1.2, 1.0) = 1.0 | 1.0 |
| 3 | `bloomThresholdMul applies` | Unit | bloomThresholdMul=0.5 → threshold = 0.35 | 0.35 |
| 4 | `caModulationOffsetMul applies` | Unit | caModulationOffsetMul=2.0 → modulationOffset = 0.6 | 0.6 |
| 5 | `default config produces identical scene.json` | Integration | default config → bloom/CA values match current hardcoded | exact match |
| 6 | `schema validates bloomRadiusMul range` | Unit | bloomRadiusMul=0.0 → parse fail | Zod error |
| 7 | `schema validates caModulationOffsetMul range` | Unit | caModulationOffsetMul=4.0 → parse fail | Zod error |
| 8 | `effect-composer reads modulationOffset from scene.json` | Integration | scene.json CA modulationOffset=0.6 → BloomEffect receives 0.6 | 0.6 |
| 9 | `legacy config without new fields parses with defaults` | Unit | ResearchConfigSchema.parse({}) → bloomRadiusMul=1.0, bloomThresholdMul=1.0, caModulationOffsetMul=1.0 | schema defaults |

### 3.2 Test File Location

- `scripts/lib/scene-generator.test.ts` (기존 파일에 추가)
- `scripts/research/research-config.test.ts` (기존 파일에 추가)

### 3.3 Mock/Setup Required

- Vitest: 기존 테스트 패턴 따름. mock 불필요 (pure function 테스트)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/research-config.ts` | Modify | Zod 스키마에 3개 파라미터 추가 + getDefaultConfig에 default 추가 |
| `scripts/lib/scene-generator.ts` | Modify | SceneMultipliers 인터페이스 + effects 적용 로직 |
| `src/lib/scene-schema.ts` | Modify | effectsSchema chromaticAberration에 modulationOffset 추가 |
| `src/lib/effect-composer.ts` | Modify | line 37-38 하드코딩 → scene.json에서 읽기 |

### 4.2 Implementation Steps (Green Phase)

1. research-config.ts: Zod 스키마에 `bloomRadiusMul`, `bloomThresholdMul`, `caModulationOffsetMul` 추가
2. research-config.ts: **getDefaultConfig()에는 추가하지 않음** — Zod schema default(1.0)가 적용됨. getDefaultConfig()는 promoted baseline이므로 새 파라미터는 schema default에만 의존
3. scene-schema.ts: `chromaticAberrationSchema`에 `modulationOffset: z.number().default(0.3)` 추가
4. scene-generator.ts: `SceneMultipliers` 인터페이스에 3개 필드 추가 + extraction + effects 적용
5. scene-generator.ts: bloom.radius에 `Math.min(0.4 * mul, 1.0)` 클램프
6. effect-composer.ts: `modulationOffset: 0.3` → `effects.chromaticAberration.modulationOffset` 읽기

### 4.3 Refactor Phase

- 없음 (직선적 배선)

## 5. Edge Cases

- EC-1: bloomRadiusMul=3.0 → radius=1.2 → Math.min(1.2, 1.0) = 1.0 (E10)
- EC-2: bloomThresholdMul=3.0 → threshold=2.1 → bloom 비활성화 (E3)

## 6. Review Checklist

- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] Phase A 완료 후 `npm run research:run` 1회 성공 확인
