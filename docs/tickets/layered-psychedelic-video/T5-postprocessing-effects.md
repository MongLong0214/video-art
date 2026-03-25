# T5: 글로벌 포스트프로세싱 + 반짝임 (Step 3 — Effects)

**Size**: M
**Priority**: P0
**Depends on**: T4
**AC**: AC6

## Description

postprocessing npm 패키지로 Bloom, ChromaticAberration 글로벌 이펙트.
Sparkle은 custom Effect에서 procedural fragment shader로 생성.
AC6 (5가지 효과 모두 적용)은 이 티켓 완료 시 검증.

## Tasks

1. `postprocessing` 호환성 검증 (three 0.172):
   - import 성공 확인
   - 비호환 시 `three/addons/postprocessing/` 폴백 구현
2. `src/lib/effect-composer.ts`:
   - EffectComposer 셋업 (postprocessing 패키지)
   - RenderPass (scene, camera)
   - BloomEffect (strength, radius, threshold — scene.json effects)
   - ChromaticAberrationEffect (offset — scene.json effects)
3. Sparkle custom Effect (`src/shaders/sparkle.frag`):
   - deterministic hash → 위치/크기/밝기/색상
   - 24색 팔레트에서 샘플링 (uniform vec3 배열)
   - period = 4s (20의 약수), `fract(uTime * 5.0)` 기반
   - seamless loop 보장
4. `layered-psychedelic.ts` 수정: `renderer.render()` → `composer.render()`
5. scene.json effects 섹션 → EffectComposer 파라미터 매핑

## Color Palette (24색 — Sparkle + Glow)

```
#0E2329 #403E70 #65341B #CA7D6E #D8AE9C #A36E23
#DF8E2B #186785 #179ADA #6DCEE5 #6459C0 #B091EA
#968CA3 #20861A #42C82F #6FDE7C #C5D556 #C034BB
#BD1E17 #2EB495 #E4E5E2 #974A67 #6B886B #A8DDB2
```

## Verification

### 자동 테스트 (vitest)
- [ ] `postprocessing` import 에러 없음 (호환성)
- [ ] 팔레트 24색 배열 정의 확인

### 스크립트 검증 (브라우저)
- [ ] EffectComposer에 RenderPass, BloomEffect 등록
- [ ] scene.json bloom 값이 BloomEffect에 반영
- [ ] sparkle time=0과 time=4에서 동일 패턴 (period 4s)
- [ ] composer.render() 호출 정상
- [ ] **AC6 최종 검증**: 색순환 + 웨이브 + 글로우 + 반짝임 + 패럴랙스 5종 모두 육안 확인 + 각 효과 peak amplitude > 0

## Files

- `src/lib/effect-composer.ts` (생성)
- `src/shaders/sparkle.frag` (생성)
- `src/lib/palette.ts` (생성)
- `src/sketches/layered-psychedelic.ts` (수정)
