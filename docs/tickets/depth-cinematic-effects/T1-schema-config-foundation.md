# T1: Schema + Config Foundation

**PRD Ref**: PRD-depth-cinematic-effects > US-5 (AC-5.1, AC-5.5)
**Priority**: P0 (Blocker)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective

scene-schema.ts effectsSchema에 parallax/haze/feather 확장 + research-config.ts에 5개 depth cinematic axis 추가. 이후 모든 티켓의 기반.

## 2. Acceptance Criteria

- [ ] AC-1: scene-schema.ts effectsSchema에 parallax `{ scale: 0~0.1, default 0 }`, haze `{ intensity: 0~1, default 0 }`, feather `{ radius: 0~0.2, default 0 }` 추가
- [ ] AC-2: research-config.ts에 5개 axis 추가 — depthSpeedInfluence(0~2, d=0), depthGlowInfluence(0~2, d=0), depthParallaxScale(0~0.1, d=0), hazeIntensity(0~1, d=0), featherRadius(0~0.2, d=0)
- [ ] AC-3: getDefaultConfig()에 5개 axis default 값 추가
- [ ] AC-4: 기존 스키마 검증/기존 테스트 전부 통과
- [ ] AC-5: EffectsConfig 타입이 새 필드 포함
- [ ] AC-6: effectsSchema.parallax와 animationSchema.parallax(wave depth) 공존 파싱 정상 동작 확인 — 서로 다른 스키마 브랜치(effects vs layers[].animation)이므로 충돌 없음을 테스트로 검증

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `effectsSchema accepts parallax with valid scale` | Unit | `{ parallax: { scale: 0.05 } }` parse | PASS, value 0.05 |
| 2 | `effectsSchema rejects parallax scale > 0.1` | Unit | `{ parallax: { scale: 0.2 } }` parse | FAIL (validation error) |
| 3 | `effectsSchema defaults parallax to { scale: 0 }` | Unit | empty effects parse | parallax.scale === 0 |
| 4 | `effectsSchema accepts haze with valid intensity` | Unit | `{ haze: { intensity: 0.5 } }` parse | PASS |
| 5 | `effectsSchema rejects haze intensity > 1` | Unit | `{ haze: { intensity: 1.5 } }` parse | FAIL |
| 6 | `effectsSchema defaults haze to { intensity: 0 }` | Unit | empty parse | haze.intensity === 0 |
| 7 | `effectsSchema accepts feather with valid radius` | Unit | `{ feather: { radius: 0.1 } }` parse | PASS |
| 8 | `effectsSchema rejects feather radius > 0.2` | Unit | `{ feather: { radius: 0.3 } }` parse | FAIL |
| 9 | `effectsSchema defaults feather to { radius: 0 }` | Unit | empty parse | feather.radius === 0 |
| 10 | `ResearchConfigSchema accepts 5 new depth axes` | Unit | valid config with all 5 axes | PASS |
| 11 | `ResearchConfigSchema rejects depthSpeedInfluence > 2` | Unit | `{ depthSpeedInfluence: 3 }` | FAIL |
| 12 | `ResearchConfigSchema rejects depthParallaxScale > 0.1` | Unit | `{ depthParallaxScale: 0.2 }` | FAIL |
| 13 | `getDefaultConfig includes 5 depth axes at 0` | Unit | getDefaultConfig() | all 5 === 0 |
| 14 | `existing effects schema defaults unchanged` | Unit | empty parse | bloom/chromatic defaults same |
| 15 | `effectsSchema rejects parallax scale < 0` | Unit | `{ parallax: { scale: -0.01 } }` parse | FAIL (validation error) |
| 16 | `effectsSchema rejects haze intensity < 0` | Unit | `{ haze: { intensity: -0.01 } }` parse | FAIL (validation error) |
| 17 | `effectsSchema rejects feather radius < 0` | Unit | `{ feather: { radius: -0.01 } }` parse | FAIL (validation error) |
| 18 | `sceneSchema parses with both effectsSchema.parallax and animationSchema.parallax coexisting` | Integration | full scene with effects.parallax.scale + layers[].animation.parallax.depth | both fields parsed independently |

### 3.2 Test File Location

- `src/lib/scene-schema.test.ts` (append to existing)
- `scripts/research/research-config.test.ts` (new file)

### 3.3 Mock/Setup Required

- Vitest: `import { describe, it, expect } from "vitest"`
- Direct Zod schema imports — no mocking needed

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `src/lib/scene-schema.ts` | Modify | effectsSchema에 parallax/haze/feather z.object 추가 |
| `scripts/research/research-config.ts` | Modify | 5개 axis를 z.object에 추가 + getDefaultConfig() 갱신 |
| `src/lib/scene-schema.test.ts` | Modify | effectsSchema 새 필드 테스트 추가 |
| `scripts/research/research-config.test.ts` | Create | 5개 axis 스키마 검증 + default 테스트 |

### 4.2 Implementation Steps (Green Phase)

1. scene-schema.ts — effectsSchema z.object 내부에 parallax/haze/feather 추가:
   ```typescript
   parallax: z.object({
     scale: z.number().min(0).max(0.1).default(0),
   }).default({ scale: 0 }),
   haze: z.object({
     intensity: z.number().min(0).max(1).default(0),
   }).default({ intensity: 0 }),
   feather: z.object({
     radius: z.number().min(0).max(0.2).default(0),
   }).default({ radius: 0 }),
   ```
2. research-config.ts — z.object 내 "Shader Axes" 섹션 뒤에 "Depth Cinematic Axes" 섹션 추가
3. research-config.ts — getDefaultConfig() return에 5개 default 0 추가
4. SceneMultipliers interface에 대응 필드가 필요한지 확인 — PRD §4.2에 따르면 depthSpeedInfluence/depthGlowInfluence는 직접 config 값이지 multiplier가 아님. 단, depthParallaxScale/hazeIntensity/featherRadius는 effects로 직접 전달

### 4.3 Refactor Phase

- animationSchema.parallax({ depth })와 effectsSchema.parallax({ scale })가 서로 다른 스키마 브랜치(layers[].animation vs effects)에 존재 — 네이밍 동일하나 TypeScript/Zod 수준 충돌 없음. Test #18에서 공존 검증

## 5. Edge Cases

- EC-1: effectsSchema.parallax({ scale })와 animationSchema.parallax({ depth }) 동일 키명 — 서로 다른 스키마 브랜치이므로 충돌 없으나 Test #18에서 공존 파싱 반드시 검증
- EC-2: research-config 기존 refine 체인이 새 필드에 영향 없는지 확인

## 6. Review Checklist

- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
