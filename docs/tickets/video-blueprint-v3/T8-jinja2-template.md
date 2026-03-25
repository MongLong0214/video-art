# T8: Jinja2 셰이더 뼈대 템플릿

**PRD Ref**: PRD-video-blueprint-v3 > US-5 (Phase E Step 1)
**Priority**: P0 (Blocker)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

GLSL fragment shader의 결정론적 뼈대를 Jinja2 템플릿으로 생성하는 generate-shader.py의 기반을 구축한다. SDF 라이브러리, uniform 선언, main() 구조, utility 함수를 포함.

## 2. Acceptance Criteria
- [ ] AC-1: Jinja2 템플릿 파일 `.claude/skills/video-blueprint/templates/shader.frag.j2` 생성
- [ ] AC-2: 템플릿이 blueprint.json의 canvas, palette, effects를 읽어 uniform/define 블록 생성
- [ ] AC-3: SDF 함수 라이브러리 (sdRoundedBox, sdCircle, sdLine) 내장
- [ ] AC-4: rot(angle) 회전 행렬, hash/noise 유틸리티 내장
- [ ] AC-5: main() 뼈대: uv 계산, background color, `// --- LAYER BLOCKS ---` 플레이스홀더, effects 적용 순서
- [ ] AC-6: generate-shader.py가 blueprint.json → Jinja2 렌더 → .frag 파일 출력
- [ ] AC-7: 생성된 .frag가 GLSL 문법 유효 (vite-plugin-glsl 컴파일 통과)
- [ ] AC-8: `/threejs-shaders` 스킬의 best practices 반영 (precision, varying, uniform 규칙)
- [ ] AC-9: SKILL.md Dependencies 섹션에 jinja2 사전 기록 (PR2 실행자가 즉시 설치 가능하도록)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_template_renders_without_error` | Unit | 최소 blueprint → Jinja2 렌더 | 에러 없이 .frag 문자열 생성 |
| 2 | `test_uniforms_from_blueprint` | Unit | canvas 814x1308 → uResolution uniform | `uniform vec2 uResolution;` 포함 |
| 3 | `test_sdf_library_included` | Unit | 생성된 .frag에 sdRoundedBox 함수 존재 | 함수 정의 포함 |
| 4 | `test_palette_defines` | Unit | 5색 팔레트 → vec3 상수 5개 | `vec3 gold = vec3(...)` 포함 |
| 5 | `test_layer_placeholder_exists` | Unit | `// --- LAYER BLOCKS ---` 마커 존재 | 플레이스홀더 위치 확인 |
| 6 | `test_vite_glsl_compile` | Integration | 생성된 .frag를 vite build에 포함 | 빌드 에러 없음 |

### 3.2 Test File Location
- `.claude/skills/video-blueprint/scripts/tests/test_generate_shader.py` (pytest)
- Integration: `npx vite build` (기존 빌드 파이프라인)

### 3.3 Mock/Setup Required
- jinja2 템플릿 엔진
- 테스트용 최소 blueprint.json fixture

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.claude/skills/video-blueprint/templates/shader.frag.j2` | Create | GLSL 뼈대 템플릿 |
| `.claude/skills/video-blueprint/scripts/generate-shader.py` | Create | Jinja2 렌더러 |

### 4.2 Implementation Steps (Green Phase)
1. `/threejs-shaders` 스킬 읽어서 GLSL 패턴 확인
2. shader.frag.j2 작성: precision, uniforms, SDF lib, rot(), hash(), noise()
3. main() 뼈대: uv 계산, bg color, layer placeholder, effects placeholder
4. generate-shader.py: argparse + blueprint 로드 + Jinja2 렌더 + 파일 출력
5. 보안: 템플릿 삽입 시 숫자 타입 검증, 문자열 화이트리스트

## 5. Edge Cases
- EC-1: palette에 색상이 0개 → 빈 팔레트로 생성 (검은 배경만)
- EC-2: effects 섹션 없음 → 이펙트 코드 생략

## 6. Review Checklist
- [ ] Red → Green → Refactor 완료
- [ ] 생성된 .frag가 GLSL 문법 유효
- [ ] `/threejs-shaders` 스킬 패턴 준수
