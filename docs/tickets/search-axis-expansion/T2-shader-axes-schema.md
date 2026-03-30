# T2: Shader Axes — Schema + Config (Phase B prep)

**PRD Ref**: PRD-search-axis-expansion > US-2
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

5개 셰이더 파라미터(satBlendLow, satBlendHigh, satInjectionMul, glowPulseFloor, lumExponent)를 research-config.ts 스키마 + scene-schema.ts + scene-generator.ts에 추가. 셰이더/렌더러 수정은 T3에서 진행.

## 2. Acceptance Criteria

- [ ] AC-1: research-config.ts에 5개 파라미터 Zod 스키마 + getDefaultConfig 추가
- [ ] AC-2: Zod refinement: `satBlendLow < satBlendHigh`
- [ ] AC-3: scene-schema.ts animationSchema에 5개 필드 추가 (`.default()` 포함)
- [ ] AC-4: scene-generator.ts SceneMultipliers에 5개 추가 + scene.json animation에 기록
- [ ] AC-5: default config에서 scene.json animation 값이 기존 하드코딩 값과 동일
- [ ] AC-6: non-default 값에서 scene.json 값이 변함

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `satBlendLow/High defaults` | Unit | getDefaultConfig() → satBlendLow=0.1, satBlendHigh=0.4 | exact |
| 2 | `satBlendLow >= satBlendHigh rejected` | Unit | parse({satBlendLow:0.5, satBlendHigh:0.3}) | Zod error |
| 3 | `satBlendLow=satBlendHigh rejected` | Unit | parse({satBlendLow:0.3, satBlendHigh:0.3}) | Zod error |
| 4 | `satInjectionMul default` | Unit | getDefaultConfig() → 0.35 | exact |
| 5 | `glowPulseFloor default` | Unit | getDefaultConfig() → 0.0 | exact |
| 6 | `lumExponent default` | Unit | getDefaultConfig() → 1.0 | exact |
| 7 | `scene.json includes shader params` | Integration | generateSceneJson with satBlendLow=0.2 → scene animation.satBlendLow=0.2 | 0.2 |
| 8 | `default scene.json shader params match hardcoded` | Integration | default config → satBlendLow=0.1, satBlendHigh=0.4, satInjectionMul=0.35, glowPulseFloor=0.0, lumExponent=1.0 | exact |
| 9 | `legacy config without shader fields parses with defaults` | Unit | ResearchConfigSchema.parse({}) → satBlendLow=0.1, glowPulseFloor=0.0, lumExponent=1.0 | schema defaults |

### 3.2 Test File Location

- `scripts/research/research-config.test.ts`
- `scripts/lib/scene-generator.test.ts`

### 3.3 Mock/Setup Required

- Vitest: pure function 테스트. mock 불필요.

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/research-config.ts` | Modify | 5개 스키마 + refinement + defaults |
| `src/lib/scene-schema.ts` | Modify | animationSchema에 5개 필드 추가 |
| `scripts/lib/scene-generator.ts` | Modify | SceneMultipliers 확장 + scene.json에 기록 |

### 4.2 Implementation Steps (Green Phase)

1. research-config.ts: Zod 스키마에 satBlendLow(0.01~0.5, default 0.1), satBlendHigh(0.1~0.8, default 0.4), satInjectionMul(0.1~1.0, default 0.35), glowPulseFloor(0.0~0.9, default 0.0), lumExponent(0.5~3.0, default 1.0) 추가. **getDefaultConfig()에는 추가하지 않음** — Zod schema default가 적용되어 G2 보장. getDefaultConfig()는 promoted baseline이므로 새 파라미터는 schema default에만 의존
2. research-config.ts: `.refine(c => c.satBlendLow < c.satBlendHigh)` 추가 (기존 refinement chain 뒤에 추가)
3. scene-schema.ts: animationSchema에 5개 `.default()` 필드 추가
4. scene-generator.ts: SceneMultipliers 확장 + extraction (config?.xxx ?? default) + animation 객체에 포함

### 4.3 Refactor Phase

- 없음

## 5. Edge Cases

- EC-1: satBlendLow=0.49, satBlendHigh=0.50 — passes refinement, steep smoothstep (E11)
- EC-2: near-equal boundary values — valid but degenerate

## 6. Review Checklist

- [ ] Red → FAILED
- [ ] Green → PASSED
- [ ] Refactor → PASSED 유지
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
