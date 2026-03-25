# T10: generate-sketch.py + main.ts 패치

**PRD Ref**: PRD-video-blueprint-v3 > US-5 (AC-5.2, AC-5.4)
**Priority**: P1 (High)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T9

---

## 1. Objective

blueprint.json에서 Three.js sketch (.ts) 파일을 생성하고, main.ts에 해당 모드를 동적 import로 등록하여 `?mode={name}`으로 즉시 실행 가능하게 한다.

## 2. Acceptance Criteria
- [ ] AC-1: blueprint.json → `src/sketches/{name}.ts` 파일 생성
- [ ] AC-2: 생성된 sketch가 Sketch 인터페이스 준수 (`{ scene, camera, update, resize, dispose }`)
- [ ] AC-3: OrthographicCamera + PlaneGeometry(2,2) + ShaderMaterial 패턴
- [ ] AC-4: ShaderMaterial uniforms에 uTime, uResolution 바인딩
- [ ] AC-5: main.ts에 `IS_{NAME}` 분기 + 동적 import 패치 자동 삽입
- [ ] AC-6: blueprint의 canvas width/height/fps/loop_dur로 main.ts config 패치
- [ ] AC-7: toneMapping = NoToneMapping (blueprint 모드)
- [ ] AC-8: `vite dev` + `?mode={name}` → 렌더링 정상 동작

### EffectComposer 통합 (T11에서 병합)
- [ ] AC-9: effects.chromatic_aberration → ShaderPass (post.frag 패턴 참조)
- [ ] AC-10: effects.vignette → ShaderPass (radial darkening)
- [ ] AC-11: effects.grain → ShaderPass (hash-based looped noise)
- [ ] AC-12: effects 미정의 시 → RenderPass만 (EffectComposer 없이 직접 렌더)
- [ ] AC-13: 기존 effect-composer.ts 패턴과 일관성 유지
- [ ] AC-14: `/threejs-postprocessing` 스킬 best practices 반영

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_sketch_file_created` | Unit | blueprint → .ts 파일 존재 | 파일 생성됨 |
| 2 | `test_sketch_exports_interface` | Unit | 생성 코드에 scene, camera, update, resize, dispose | 5개 프로퍼티 존재 |
| 3 | `test_main_ts_patch_applied` | Unit | main.ts에 IS_{NAME} + import 추가 | 패턴 매칭 |
| 4 | `test_uniforms_bound` | Unit | uTime, uResolution uniform 존재 | ShaderMaterial uniforms 키 |
| 5 | `test_vite_dev_mode` | Integration | vite dev + ?mode={name} → canvas 존재 | Puppeteer canvas check |
| 6 | `test_tone_mapping_no` | Unit | toneMapping = NoToneMapping 설정 | NoToneMapping 포함 |
| 7 | `test_canvas_config_patch` | Unit | blueprint canvas width/height/fps → main.ts config | 값 일치 |
| 8 | `test_ca_pass_generated` | Unit | CA enabled → post shader에 aberration 코드 | chromatic shift 로직 포함 |
| 9 | `test_vignette_pass_generated` | Unit | vignette enabled → darkening 코드 | radial darkening 포함 |
| 10 | `test_no_effects_no_composer` | Unit | effects 없음 → 직접 렌더 | EffectComposer 미사용 |
| 11 | `test_effect_composer_consistency` | Unit | 생성 코드가 기존 effect-composer.ts 패턴과 일관 | 패턴 매칭 |
| 12 | `test_utime_external_control_interface` | Unit | uTime uniform이 외부 주입 가능한 인터페이스 | update(time) 시그니처 |

### 3.2 Test File Location
- `.claude/skills/video-blueprint/scripts/tests/test_generate_sketch.py`

### 3.3 Mock/Setup Required
- `/threejs-fundamentals`, `/threejs-materials`, `/threejs-geometry` 스킬 참조
- T9 산출물 (.frag 파일)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.claude/skills/video-blueprint/scripts/generate-sketch.py` | Create | Sketch 생성 + main.ts 패치 + post-processing 생성 로직 |
| `.claude/skills/video-blueprint/templates/sketch.ts.j2` | Create | Three.js sketch Jinja2 템플릿 |
| `.claude/skills/video-blueprint/templates/post-effects.frag.j2` | Create | post shader Jinja2 템플릿 (T11 병합) |

### 4.2 Implementation Steps (Green Phase)
1. `/threejs-fundamentals`, `/threejs-materials` 스킬 로드
2. sketch.ts.j2 작성: import, createShaderPlane, Sketch 인터페이스 구현
3. generate-sketch.py: blueprint → sketch 렌더 + main.ts AST-free 패치 (정규식 기반 삽입)
4. main.ts 패치: config 삼항연산자 확장 + loadSketch() 분기 추가
5. `/threejs-postprocessing` 스킬 로드 (T11 병합)
6. post-effects.frag.j2: CA + vignette + grain 조합 가능한 post shader 템플릿 (T11 병합)
7. generate-sketch.py: effects 섹션 읽어 EffectComposer + ShaderPass 코드 생성 (T11 병합)
8. main.ts 패치에 composer 렌더 분기 추가 (T11 병합)

### 4.3 Refactor Phase
- main.ts 패치를 별도 유틸 함수로 추출

## 5. Edge Cases
- EC-1: main.ts에 이미 해당 모드가 존재 → 중복 추가 방지
- EC-2: 생성된 sketch 파일명이 기존 파일과 충돌 → 경고
- EC-3: (T11) 미지원 이펙트 → TODO 주석 삽입
- EC-4: (T11) effects.glow.per_layer=true → post pass 아닌 셰이더 내장 (T9에서 처리)

## 6. Review Checklist
- [ ] Red → Green → Refactor 완료
- [ ] `vite dev` + `?mode={name}` 정상 동작
- [ ] `/threejs-fundamentals`, `/threejs-materials` 스킬 패턴 준수
- [ ] `/threejs-postprocessing` 스킬 패턴 준수 (T11 병합)
- [ ] 기존 effect-composer.ts와 일관성 (T11 병합)
