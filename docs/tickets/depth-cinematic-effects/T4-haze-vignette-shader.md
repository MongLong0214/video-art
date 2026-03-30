# T4: Atmospheric Haze + Edge Vignette (Fragment Shader + Renderer)

**PRD Ref**: PRD-depth-cinematic-effects > US-3 (AC-3.1 ~ AC-3.4) + US-4 (AC-4.1 ~ AC-4.5)
**Priority**: P1 (High)
**Size**: M (3-4h)
**Status**: Todo
**Depends On**: T1, T2, T3

---

## 1. Objective

layer.frag에 atmospheric haze (depth-based desaturation) + edge vignette (UV boundary alpha fade) 구현. layered-psychedelic.ts에서 uHazeIntensity, uDepthNorm, uFeatherRadius uniform 바인딩.

## 2. Acceptance Criteria

### Haze (US-3)
- [ ] AC-1: `uHazeIntensity` uniform 선언 (layer.frag)
- [ ] AC-2: `uDepthNorm` uniform 선언 (layer.frag — T3에서 이미 vert에 선언, frag에도 필요)
- [ ] AC-3: haze 공식: `hsv.y *= 1.0 - uHazeIntensity * (1.0 - uDepthNorm)` — saturationBoost 이후, hsv2rgb 이전에 적용
- [ ] AC-4: default=0에서 saturation 변화 없음

### Vignette (US-4)
- [ ] AC-5: `uFeatherRadius` uniform 선언 (layer.frag)
- [ ] AC-6: feather 공식 (guard 포함): `float d = min(min(vUv.x, 1.0-vUv.x), min(vUv.y, 1.0-vUv.y)); float feather = uFeatherRadius < 1e-4 ? 1.0 : smoothstep(0.0, uFeatherRadius, d); alpha *= feather;`
- [ ] AC-7: default=0에서 alpha 변화 없음 (guard가 1.0 반환)
- [ ] AC-8: 효과 범위 = UV 경계 = 캔버스 전체 가장자리

### Renderer
- [ ] AC-9: layered-psychedelic.ts에서 uHazeIntensity, uFeatherRadius uniform 바인딩
- [ ] AC-10: uDepthNorm은 T3에서 이미 바인딩 — 중복 바인딩 아닌지 확인

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `layer.frag declares uHazeIntensity uniform` | Unit | shader source grep | uniform found |
| 2 | `layer.frag declares uDepthNorm uniform` | Unit | shader source grep | uniform found |
| 3 | `layer.frag declares uFeatherRadius uniform` | Unit | shader source grep | uniform found |
| 4 | `layer.frag haze formula: hsv.y *= 1.0 - uHazeIntensity * (1.0 - uDepthNorm)` | Unit | shader source pattern match | formula present |
| 5 | `layer.frag haze applied after saturationBoost` | Unit | shader source: haze code after saturationBoost block | correct ordering |
| 6 | `layer.frag feather guard: uFeatherRadius < 1e-4 returns 1.0` | Unit | shader source pattern match | guard present |
| 7 | `layer.frag feather uses smoothstep(0.0, uFeatherRadius, d)` | Unit | shader source grep | smoothstep pattern found |
| 8 | `layer.frag feather uses min distance from UV edges` | Unit | shader source: min(min(vUv.x, 1.0-vUv.x), ...) | pattern found |
| 9 | `layer.frag feather multiplies alpha` | Unit | shader source: alpha *= feather or equivalent | present |
| 10 | `layered-psychedelic binds uHazeIntensity` | Unit | source grep | `uHazeIntensity: { value:` present |
| 11 | `layered-psychedelic binds uFeatherRadius` | Unit | source grep | `uFeatherRadius: { value:` present |
| 12 | `haze math: hazeIntensity=0 any depthNorm → satFactor=1.0` | Unit | JS-port: `1.0 - 0 * (1 - depthNorm) = 1.0` | satFactor === 1.0 |
| 13 | `haze math: hazeIntensity=1 depthNorm=0 → satFactor=0.0 (완전 탈색)` | Unit | JS-port: `1.0 - 1 * (1 - 0) = 0.0` | satFactor === 0.0 |
| 14 | `haze math: hazeIntensity=0.5 depthNorm=0.5 → satFactor=0.75` | Unit | JS-port: `1.0 - 0.5 * 0.5 = 0.75` | satFactor === 0.75 |
| 15 | `feather math: featherRadius=0 → feather=1.0 (guard)` | Unit | JS-port: `radius < 1e-4 ? 1.0 : ...` | feather === 1.0 |
| 16 | `feather math: featherRadius=0.1 d=0.05 → smoothstep(0, 0.1, 0.05)` | Unit | JS-port smoothstep | 0 < feather < 1 |
| 17 | `uDepthNorm uniform key appears exactly once in layered-psychedelic` | Unit | source grep count | exactly 1 occurrence of `uDepthNorm:` |

### 3.2 Test File Location

- `src/shaders/layer-frag.test.ts` (new — fragment shader source validation)
- `src/sketches/layered-psychedelic.test.ts` (extend from T3)

### 3.3 Mock/Setup Required

- Vitest: shader source를 `fs.readFileSync`로 로드하여 정규식 검증 (기존 vitest 환경에 vite-plugin-glsl 미설정 — `?raw` import 미사용)
  ```typescript
  import { readFileSync } from "fs";
  import { resolve } from "path";
  const fragSrc = readFileSync(resolve(__dirname, "../shaders/layer.frag"), "utf-8");
  ```
- JS-port haze/feather 공식 unit test: 순수 JS로 수학적 정확성 검증 (Three.js 의존 없음)
- layered-psychedelic.ts도 fs.readFileSync로 소스 문자열 로드 후 패턴 검증

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `src/shaders/layer.frag` | Modify | uHazeIntensity, uDepthNorm, uFeatherRadius uniform + haze + feather 로직 |
| `src/sketches/layered-psychedelic.ts` | Modify | uHazeIntensity, uFeatherRadius uniform 바인딩 |
| `src/shaders/layer-frag.test.ts` | Create | fragment shader uniform/formula 검증 |
| `src/sketches/layered-psychedelic.test.ts` | Modify | haze/feather uniform binding 검증 추가 |

### 4.2 Implementation Steps (Green Phase)

1. layer.frag uniform 추가 (line ~28, after uLoopDuration):
   ```glsl
   uniform float uHazeIntensity;
   uniform float uDepthNorm;
   uniform float uFeatherRadius;
   ```

2. layer.frag haze 로직 (saturationBoost 이후, hsv2rgb 이전 — PRD 기준 line 79 이후):
   ```glsl
   // Atmospheric haze: far layers lose saturation
   hsv.y *= 1.0 - uHazeIntensity * (1.0 - uDepthNorm);
   ```

3. layer.frag feather 로직 + alpha 최종 계산 (기존 `gl_FragColor = vec4(rgb, texColor.a * uOpacity)` 교체):
   ```glsl
   // Edge vignette: alpha fade at UV boundaries
   float d = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
   float feather = uFeatherRadius < 1e-4 ? 1.0 : smoothstep(0.0, uFeatherRadius, d);
   float alpha = texColor.a * uOpacity * feather;
   gl_FragColor = vec4(rgb, alpha);
   ```
   Note: 기존 line 90 `gl_FragColor = vec4(rgb, texColor.a * uOpacity)` → 위 코드로 교체. `alpha` 변수를 명시적으로 도입하여 feather 곱셈

4. layered-psychedelic.ts uniform 바인딩 추가:
   ```typescript
   uHazeIntensity: { value: config.effects?.haze?.intensity ?? 0 },
   uFeatherRadius: { value: config.effects?.feather?.radius ?? 0 },
   ```
   Note: uDepthNorm은 T3에서 이미 바인딩됨 (vertex/fragment 공유)

### 4.3 Refactor Phase

- haze/feather 코드 블록에 간결한 주석 배치
- gl_FragColor 최종 계산에서 feather 적용 위치 정리

## 5. Edge Cases

- EC-1 (E3): hazeIntensity=1.0 + 먼 레이어(depthNorm→0) → 완전 탈색. gate에서 자연 도태
- EC-2 (E4): featherRadius=0.2 → 레이어 80% 영역만 보임. gate에서 자연 도태
- EC-3: hazeIntensity=0 → `1.0 - 0 * x = 1.0` → hsv.y 변화 없음 (correct)
- EC-4: featherRadius=0 → guard가 1.0 반환 → alpha 변화 없음 (correct)
- EC-5: vUv가 parallax로 offset된 경우 feather 경계도 이동 → PRD §AC-5.3 interdependency 기술 (T5에서 문서화)

## 6. Review Checklist

- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] haze가 saturationBoost 이후에 적용됨
- [ ] feather guard가 uFeatherRadius=0에서 1.0 반환
- [ ] default=0에서 기존 출력과 동일
