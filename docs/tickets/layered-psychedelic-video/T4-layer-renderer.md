# T4: 멀티 레이어 Three.js 렌더러 (Step 3 — Core)

**Size**: L
**Priority**: P0
**Depends on**: T1 (구조), T3 (scene-schema.ts)
**AC**: AC4

## Description

scene.json을 읽어 레이어별 PlaneGeometry + ShaderMaterial 생성.
Per-layer 애니메이션 4종: 색순환, 웨이브, 글로우 pulse, 패럴랙스.
(AC6 전체 검증은 T5 완료 후)

## Tasks

1. `src/sketches/layered-psychedelic.ts` — `createLayeredPsychedelic(sceneConfig)`:
   - Sketch 인터페이스 준수 (scene, camera, update, resize, dispose)
   - 기존 `createPsychedelic`과 별도 공존
2. `src/lib/scene-loader.ts`:
   - fetch(`scene.json`) → Zod validation (scene-schema.ts) → config 객체
3. 레이어별 PlaneGeometry(2x2) + ShaderMaterial:
   - `uTexture`: 레이어 PNG (THREE.TextureLoader, sRGB)
   - `uTime`: normalized loop time `(elapsed % 20) / 20`
   - `uOpacity`: 레이어 opacity
   - `uColorCycle`: `{ speed, hueRange }`
   - `uWave`: `{ amplitude, frequency }`
   - `uGlow`: `{ intensity, pulse }`
   - `uParallax`: `{ depth }`
4. `src/shaders/layer.frag`:
   - 텍스처 샘플링 + alpha discard
   - HSL color cycling: `hue += uColorCycle.speed * sin(2π * uTime)`
   - UV wave distortion: `uv += uWave.amplitude * sin(uv * freq + 2π * uTime)`
   - Glow pulse: `brightness *= 1.0 + uGlow.intensity * sin(2π * uTime * uGlow.pulse)`
   - Parallax offset: `uv += uParallax.depth * autoOffset(uTime)`
5. `src/shaders/layer.vert`: 기본 vertex (position + uv)
6. OrthographicCamera(-1,1,1,-1,0,10) + 레이어 z-depth 배치
7. update(time): normalized time → uniform 업데이트
8. dispose(): 텍스처, geometry, material 해제

## Verification

### 자동 테스트 (vitest — scene-loader만)
- [ ] scene.json 로드 시 config 객체 반환 (mock fetch)
- [ ] 잘못된 scene.json 시 Zod 에러

### 스크립트 검증 (브라우저)
- [ ] 레이어 수만큼 PlaneGeometry mesh가 scene에 추가됨
- [ ] 각 mesh material에 uTexture, uTime, uColorCycle, uWave, uGlow, uParallax uniform 존재
- [ ] update(0) → uTime=0, update(10) → uTime=0.5
- [ ] resize(1080,1080) → camera 업데이트
- [ ] dispose() 후 scene.children 비어있음
- [ ] `npm run dev`에서 레이어 렌더링 육안 확인

## Files

- `src/sketches/layered-psychedelic.ts` (생성)
- `src/shaders/layer.vert` (생성)
- `src/shaders/layer.frag` (생성)
- `src/lib/scene-loader.ts` (생성)
