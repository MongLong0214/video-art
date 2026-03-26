# T9: generate-shader.py (hybrid 레이어 본문)

**PRD Ref**: PRD-video-blueprint-v3 > US-5 (Phase E Step 2)
**Priority**: P0 (Blocker)
**Size**: L (4-8h)
**Status**: Done
**Depends On**: T8

---

## 1. Objective

T8의 Jinja2 뼈대에 레이어별 for-loop 본문을 삽입하여 완전한 GLSL fragment shader를 생성한다. Claude가 blueprint.json을 읽고 레이어 본문을 작성하는 hybrid 방식의 가이드와 레퍼런스 패턴을 정의한다.

## 2. Acceptance Criteria
- [ ] AC-1: blueprint의 각 layer → GLSL for-loop 블록으로 변환하는 레퍼런스 패턴 문서화
- [ ] AC-2: per_instance_animation (linear speed) → `angle = -lt * PI * (fi + base) / dur` 패턴
- [ ] AC-3: index-scroll zoom → `pow(base, fi + fract(lt * cycles / dur))` 패턴
- [ ] AC-4: additive blending → `col +=` 패턴
- [ ] AC-5: depth_attenuation → `mix(near, far, ratio)` 패턴
- [ ] AC-6: stroke_depth → `mix(near_w, far_w, ratio)` 패턴
- [ ] AC-7: paired_shapes → 동일 loop 내 2개 SDF (gold frame + navy frame)
- [ ] AC-8: glow → `exp(-abs(d) * mix(decay_near, decay_far, ratio)) * amplitude` 패턴
- [ ] AC-9: SKILL.md에 Claude가 레이어 본문 작성 시 참조할 패턴 가이드 포함
- [ ] AC-10: shader-patterns.md에 참조 파일 위치 인덱스 포함

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_back_layer_rotation_pattern` | Unit | per_instance linear rotation → GLSL | `halfTurns = fb + 1.0` 패턴 |
| 2 | `test_front_layer_zoom_pattern` | Unit | index_scroll zoom → GLSL | `pow(0.82, idx)` 패턴 |
| 3 | `test_additive_blend_output` | Unit | blend_mode: additive → col += | `col +=` 사용 |
| 4 | `test_depth_attenuation_output` | Unit | near:0.7, far:0.15 → mix | `mix(0.7, 0.15, ratio)` |
| 5 | `test_paired_shapes_two_sdf` | Unit | paired_shapes 2개 → 2 SDF in loop | gold SDF + navy SDF |
| 6 | `test_full_psy_shader_compiles` | Integration | psy.mov blueprint → full .frag | vite build 통과 |
| 7 | `test_full_psy_shader_renders` | Integration | .frag + sketch → canvas 렌더링 | 빈 화면 아님 |

### 3.2 Test File Location
- `.claude/skills/video-blueprint/scripts/tests/test_generate_shader.py`

### 3.3 Mock/Setup Required
- T8 산출물 (Jinja2 뼈대)
- psy.mov blueprint.json (v3 스키마)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.claude/skills/video-blueprint/scripts/generate-shader.py` | Modify | 레이어 본문 생성 로직 추가 |
| `.claude/skills/video-blueprint/references/shader-patterns.md` | Create | Claude 레이어 작성 패턴 가이드 |

### 4.2 Implementation Steps (Green Phase)
1. `/threejs-shaders` 스킬 로드하여 GLSL 패턴 확인
2. shader-patterns.md 작성: 각 motion_type별 GLSL 코드 패턴
3. shader-patterns.md에 각 motion_type별 GLSL 코드 패턴 문서화 (Claude가 Phase E Step 2에서 참조)
4. generate-shader.py는 뼈대만 출력하고 `// --- LAYER: {id} ---` 플레이스홀더를 삽입. Claude가 이 플레이스홀더를 실제 GLSL로 교체.
5. psy.mov blueprint로 full shader 생성 → 컴파일 테스트

### 4.3 Refactor Phase
- 레이어 패턴을 Jinja2 sub-template으로 분리 (modular include)

## 5. Edge Cases
- EC-1: (E7) 미지원 shape → 가장 가까운 SDF 사용 + 주석 경고
- EC-2: 레이어 5개 초과 → 수동 조정 경고 (Risks에 명시된 임계점)

## 6. Review Checklist
- [ ] Red → Green → Refactor 완료
- [ ] psy.mov blueprint → .frag 생성 → vite build 통과
- [ ] 생성된 셰이더가 브라우저에서 렌더링됨
- [ ] `/threejs-shaders` 스킬 패턴 준수
