# T2: Depth Animation (scene-generator)

**PRD Ref**: PRD-depth-cinematic-effects > US-1 (AC-1.1 ~ AC-1.6)
**Priority**: P0 (Blocker)
**Size**: M (3-4h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

scene-generator.ts에서 depth 기반 animation modulation 구현. depthNorm 계산, colorCycleSpeed/glow depth 비례 변조, stddev 가드, effects pass-through.

## 2. Acceptance Criteria

- [ ] AC-1: `depthNorm = (meanDepth ?? 128) / 255` per-layer 계산 (scene-generator.ts 내부)
- [ ] AC-2: `colorCycleSpeed *= 1.0 + depthSpeedInfluence * depthNorm` — depthSpeedInfluence는 config에서 읽음. quantizeLoopSpeed() 이전에 적용
- [ ] AC-3: `glow.intensity *= 1.0 + depthGlowInfluence * depthNorm` — depthGlowInfluence는 config에서 읽음
- [ ] AC-4: meanDepth 없는 레이어 → depthNorm = 128/255 ≈ 0.502
- [ ] AC-5: default=0에서 기존 출력과 동일 (speed *= 1.0, glow *= 1.0)
- [ ] AC-6: depth 분산 가드 — layers의 meanDepth stddev < 5이면 depthSpeedInfluence, depthGlowInfluence, depthParallaxScale, hazeIntensity, featherRadius 전부 강제 0
- [ ] AC-7: scene.json effects에 parallax.scale, haze.intensity, feather.radius 기록 (config에서 읽음)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `depth speed modulation: meanDepth=255 depthSpeedInfluence=1 → speed ≈ 2x base` | Integration | generateSceneJson with layer meanDepth=255, depthSpeedInfluence=1 | output layer colorCycle.speed ≈ 2x default speed (quantize 후 가장 가까운 loop-divisor) |
| 2 | `depth speed modulation: meanDepth=0 depthSpeedInfluence=1 → speed ≈ 1x base` | Integration | far layer (meanDepth=0) → depthNorm≈0, speed unchanged | output speed ≈ default |
| 3 | `depth speed modulation: meanDepth undefined → speed as if depthNorm=0.502` | Integration | layer without meanDepth, depthSpeedInfluence=1 | speed between 1x and 2x (fallback 128/255) |
| 4 | `depth speed modulation: depthSpeedInfluence=0 (default)` | Integration | default config → output speed | speed identical to baseline (no depth influence) |
| 5 | `depth glow modulation: depthGlowInfluence=1, meanDepth=128` | Integration | layer meanDepth=128 | output glow.intensity ≈ 1.5x default |
| 6 | `depth glow modulation: depthGlowInfluence=0 (default)` | Integration | default config | glow.intensity identical to baseline |
| 7 | `stddev guard: all layers same depth → cinematic axes forced 0` | Integration | 5 layers meanDepth=[128,128,129,128,128] stddev<5 | all 5 cinematic axes = 0 in output |
| 8 | `stddev guard: diverse depth → cinematic axes preserved` | Integration | layers meanDepth=[50,100,150,200,250] stddev>5 | cinematic axes preserved from config |
| 9 | `stddev guard: layers without meanDepth excluded from calculation` | Unit | 3 layers: [100, undefined, 200] → only [100, 200] for stddev | stddev calculated from valid only |
| 10 | `effects pass-through: parallax/haze/feather in scene.json` | Integration | config has depthParallaxScale=0.05 | scene.json effects.parallax.scale === 0.05 |
| 11 | `effects pass-through: default config → effects all 0` | Integration | default config | all effects = 0 |
| 12 | `default config produces identical scene.json` | Integration | generateSceneJson with default config | no diff from baseline (depth axes all 0) |
| 13 | `depth modulation applied before quantizeLoopSpeed` | Integration | depthSpeedInfluence=1, meanDepth=255 → colorCycle.speed는 quantize 결과(loop divisor)이면서 base보다 큼 | speed > baseline speed, speed is valid loop divisor |
| 14 | `stddev guard: single layer → cinematic axes forced 0` | Integration | 1 layer only → stddev undefined → cinematicActive=false | all 5 cinematic axes = 0 in output |
| 15 | `stddev guard: all layers without meanDepth → cinematic axes forced 0` | Integration | 3 layers all meanDepth=undefined → depthValues empty | all 5 cinematic axes = 0 in output |
| 16 | `glow modulation: layer with glow undefined → no error` | Integration | custom layer config without glow, depthGlowInfluence=1 | no TypeError, speed modulation still applied |

### 3.2 Test File Location

- `scripts/lib/scene-generator.test.ts` (append to existing)

### 3.3 Mock/Setup Required

- Vitest: existing test fixtures (RetainedLayer[] with meanDepth)
- 기존 mockLayers에 `meanDepth?: number` 필드 추가 필요 (RetainedLayer 타입에 이미 Phase 1에서 존재 — 테스트 fixture에 값 추가)
- 모든 테스트는 `generateSceneJson()` 반환값(SceneConfig)의 observable output으로 검증 — 내부 변수(depthNorm) 직접 접근 불가
- Test #13 quantize 순서 검증: output speed가 loop divisor이면서 동시에 base보다 큰지 확인 (vi.spyOn 미사용)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/scene-generator.ts` | Modify | SceneMultipliers에 5개 cinematic 필드 추가, depthNorm 계산, speed/glow modulation, stddev 가드, effects pass-through |
| `scripts/lib/scene-generator.test.ts` | Modify | depth animation + stddev guard + effects 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)

1. SceneMultipliers interface에 추가:
   ```typescript
   depthSpeedInfluence: number;
   depthGlowInfluence: number;
   depthParallaxScale: number;
   hazeIntensity: number;
   featherRadius: number;
   ```
2. DEFAULT_MULTIPLIERS에 5개 = 0 추가
3. generateSceneJson() 내부에서 config → multipliers 매핑에 5개 추가
4. generateSceneJson() 내부 layers 매핑 전에 stddev 계산:
   ```typescript
   const depthValues = layers.map(l => l.meanDepth).filter((d): d is number => d != null);
   const mean = depthValues.reduce((a, b) => a + b, 0) / depthValues.length;
   const stddev = Math.sqrt(depthValues.reduce((s, v) => s + (v - mean) ** 2, 0) / depthValues.length);
   const cinematicActive = depthValues.length >= 2 && stddev >= 5;
   ```
5. cinematicActive가 false면 5개 cinematic multiplier를 0으로 오버라이드
6. getRolePreset() 시그니처에 `depthNorm: number` 파라미터 추가. colorCycle() 내부에서 depth modulation 적용 (quantizeLoopSpeed 이전):
   ```typescript
   const colorCycle = (baseSpeed: number, tier: number) => {
     const period = pickPeriod(tier);
     const depthModulatedSpeed = baseSpeed * mul.colorCycleSpeedMul * tempo * (1 + mul.depthSpeedInfluence * depthNorm);
     return {
       speed: quantizeLoopSpeed(depthModulatedSpeed, period, duration),
       period,
       phaseOffset,
     };
   };
   ```
   glow modulation은 quantize 불필요하므로 preset 반환 후 적용:
   ```typescript
   const preset = presets[role];
   if (preset.glow) {
     preset.glow.intensity *= 1 + mul.depthGlowInfluence * depthNorm;
   }
   ```
7. generateSceneJson() per-layer 매핑에서 depthNorm 계산 + getRolePreset 호출:
   ```typescript
   const depthNorm = (layer.meanDepth ?? 128) / 255;
   const preset = getRolePreset(role, index, total, mul, duration, depthNorm);
   ```
8. scene.json effects에 parallax/haze/feather 추가 (explicit literal, spread 미사용):
   ```typescript
   effects: {
     bloom: { strength: ..., radius: ..., threshold: ... },
     chromaticAberration: { offset: ..., modulationOffset: ... },
     parallax: { scale: mul.depthParallaxScale },
     haze: { intensity: mul.hazeIntensity },
     feather: { radius: mul.featherRadius },
   }
   ```
9. cinematicActive=false 시 console.warn 추가:
   ```typescript
   if (!cinematicActive) {
     console.warn(`[scene-generator] depth stddev ${stddev.toFixed(2)} < 5, cinematic axes zeroed`);
   }
   ```

### 4.3 Refactor Phase

- depthNorm 계산을 헬퍼 함수로 추출할지 검토 (inline이면 충분할 수 있음)
- stddev 계산 코드 간결화

## 5. Edge Cases

- EC-1 (E1): meanDepth 없는 레이어 → depthNorm = 0.502
- EC-2 (E7): stddev < 5 → cinematic axes 강제 0
- EC-3: 레이어 1개만 있을 때 stddev = 0 → cinematicActive = false
- EC-4: 모든 레이어에 meanDepth 없으면 depthValues 빈 배열 → cinematicActive = false

## 6. Review Checklist

- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] depth modulation이 quantizeLoopSpeed 이전에 적용됨
- [ ] stddev guard가 올바르게 동작
- [ ] default=0에서 기존 출력과 동일
