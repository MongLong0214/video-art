# T1: Dynamics Boost — 셰이더 수식 + 프리셋 고도화

**PRD Ref**: PRD-dynamics-boost > US-1, US-2, US-3
**Priority**: P0
**Size**: S
**Status**: Todo
**Depends On**: None

---

## 1. Objective

layer.frag의 luminanceKey 수식을 phase offset 방식으로 변경하여 seamless loop을 보장하고, scene-generator 프리셋을 source.mp4 수준 역동성으로 업그레이드한다.

## 2. Acceptance Criteria
- [ ] AC-1: luminanceKey를 hue shift rate 곱셈 → phase offset 덧셈으로 변경
- [ ] AC-2: scene-generator speed ≥ 10 (K×speed 정수 보장)
- [ ] AC-3: wave 프리셋 복원 (레이어별 차등 amplitude/frequency/period)
- [ ] AC-4: glow 프리셋 복원 (레이어별 차등 intensity/pulse/period)
- [ ] AC-5: 모든 period가 duration(10)의 약수
- [ ] AC-6: 기존 테스트 통과 + 새 프리셋 반영 테스트

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `should set colorCycle speed≥10` | Unit | 프리셋 speed | ≥ 10 |
| 2 | `should include wave preset` | Unit | wave 필드 존재 + period 약수 | wave defined, period ∈ validPeriods |
| 3 | `should include glow preset` | Unit | glow 필드 존재 + period 약수 | glow defined, period ∈ validPeriods |
| 4 | `K×speed is integer for all layers` | Unit | duration/period × speed | 정수 |

### 3.2 Test File Location
- `scripts/lib/scene-generator.test.ts` (기존 수정)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `src/shaders/layer.frag` | Modify (2줄) | lumFactor rate곱셈 → lumPhase 덧셈 |
| `scripts/lib/scene-generator.ts` | Modify | speed 13, wave/glow 프리셋 추가 |
| `scripts/lib/scene-generator.test.ts` | Modify | 새 프리셋 테스트 |

### 4.2 Implementation Steps (Green Phase)

**layer.frag** (line 74-75):
```glsl
// Before:
float lumFactor = uLuminanceKey > 0.001 ? pow(1.0 - lum, 1.0 + uLuminanceKey) : 1.0;
float hueShift = fract(time / uColorCyclePeriod * uColorCycleSpeed * lumFactor + uPhaseOffset / 360.0);

// After:
float lumPhase = uLuminanceKey > 0.001 ? pow(1.0 - lum, 1.0 + uLuminanceKey) : 0.0;
float hueShift = fract(time / uColorCyclePeriod * uColorCycleSpeed + lumPhase + uPhaseOffset / 360.0);
```

**scene-generator.ts** — generatePreset:
```typescript
return {
  colorCycle: { speed: 13.0, hueRange: 360, period, phaseOffset },
  wave: { amplitude: 3 - t * 2, frequency: 0.3 + t * 0.2, period },
  glow: { intensity: 0.2 + t * 0.3, pulse: 0.4 + t * 0.3, period },
  parallax: { depth: t * 0.5 },
  saturationBoost: 2.5,
  luminanceKey: +(0.4 + Math.sin(t * Math.PI) * 0.4).toFixed(2),
};
```

## 5. Review Checklist
- [ ] 셰이더 수식 변경 후 tsc PASS
- [ ] 테스트 전부 PASS
- [ ] E2E 파이프라인 실행 후 RMSE 측정
