# PRD: Video Blueprint v3 — Geometric Loop Analyzer + Code Generator

**Version**: 0.3
**Author**: Isaac (via Claude)
**Date**: 2026-03-25
**Status**: Approved
**Size**: XL (3-PR 분할 실행)

---

## 1. Problem Statement

### 1.1 Background

video-blueprint 스킬 v2는 기하학적 패턴(동심 둥근사각형 등)을 분석하여 blueprint.json으로 추출한다. 그러나 실제 psy.mov를 분석한 결과, 원본과 재현물 간 구조적 차이가 발생했다:

- 2개 독립 레이어(back: 개별 회전속도 burgundy rects / front: 줌 터널 gold+navy)를 1개 레이어로 뭉뚱그림
- 개별 도형의 독립 모션(도형마다 다른 회전속도) 감지 불가
- 줌/터널 효과(index-scroll 방식)를 단순 회전으로 오분류
- additive composition 모델 미감지 (alpha blend로 가정)
- depth-varying 속성(stroke width, opacity, glow decay, color gradient) 미감지
- 이펙트(glow, breathing, chromatic aberration, grain) 미감지
- 블루프린트에서 코드까지 수동 변환 필요

### 1.2 Problem Definition

**기하학적 루핑 영상**을 기계적으로 분해하여 blueprint.json으로 기술하고, 이를 렌더링 코드(GLSL shader + Three.js sketch)로 변환하는 엔드-투-엔드 파이프라인이 없다.

### 1.3 Impact of Not Solving

- 매번 수동으로 셰이더를 작성해야 하며, 원본과의 차이를 눈으로 비교하는 반복 작업 발생
- 새로운 비디오 아트를 재현하려면 시각적 해석에 의존 → 구조적 오류 70% 정확도에 머무름

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: 기하학적 루핑 영상을 입력하면 구조를 분해하여 machine-readable blueprint.json으로 출력. 정확도 = 레이어 분리 pass/fail AND 도형 수 오차 ≤10% AND 색상 ΔE2000 < 8 AND 모션 타입 정분류
- [ ] G2: blueprint.json에서 GLSL fragment shader + Three.js sketch를 hybrid 생성(뼈대 템플릿 + Claude 레이어 본문 작성), dev 서버에서 즉시 실행 가능
- [ ] G3: 원본 영상과 생성 영상의 구조적 동등성을 자동 검증 (윈도우 SSIM + 컨투어 매칭 + 팔레트 ΔE)
- [ ] G4: 독립 모션 레이어 분리, 개별 도형 추적, index-scroll 줌 감지, depth-varying 속성 감지, 이펙트 감지

### 2.2 Non-Goals
- NG1: 실시간 비디오 스트림 분석 (입력은 파일만)
- NG2: 오디오 분석 / 오디오-비주얼 동기화
- NG3: 원본과 픽셀-퍼펙트 동일 (구조적 동등성이 목표)
- NG4: non-looping 영상 지원
- NG5: 비기하학적 영상 (파티클, 3D 렌더, 실사) — v4 비전으로 분리
- NG6: 다중 비디오 소스 합성 (A.mov 구조 + B.mov 팔레트)

## 3. User Stories & Acceptance Criteria

### US-1: 색상 기반 레이어 분리
**As a** 비디오 아트 개발자, **I want** 영상의 시각적 요소를 색상별로 독립 레이어로 분리하여, **so that** 각 레이어의 모션 규칙을 개별적으로 기술할 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: psy.mov 입력 시 최소 2개 레이어(burgundy back / gold+navy front) 분리
- [ ] AC-1.2: 각 레이어의 도형 수, 색상, 모션 타입, blend_mode가 독립적으로 기록됨
- [ ] AC-1.3: CIELAB ΔE2000 ≤ 15 이내의 색상은 동일 그룹으로 병합

### US-2: 개별 도형 모션 추적
**As a** 비디오 아트 개발자, **I want** 동일 레이어 내 각 도형의 모션을 개별 추적하여, **so that** "각 도형이 다른 속도로 회전"하는 패턴을 감지할 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: psy.mov back layer의 10개 burgundy rect가 각각 다른 회전속도임을 감지
- [ ] AC-2.2: 도형별 rotation_deg_per_sec가 blueprint에 per_instance_animation으로 기록됨
- [ ] AC-2.3: 균일 속도 vs 가변 속도(linear/geometric progression) 자동 분류

### US-3: Index-Scroll 줌/터널 효과 감지
**As a** 비디오 아트 개발자, **I want** index-scroll 방식의 터널 패턴을 감지하여, **so that** zoom_inward 모션 타입으로 정확히 기술할 수 있다.

**Acceptance Criteria:**
- [ ] AC-3.1: psy.mov front layer의 gold+navy가 zoom_inward (method: index_scroll)로 분류됨
- [ ] AC-3.2: index_offset_formula, cycles_per_loop, base_exponent, total_instances가 기록됨
- [ ] AC-3.3: 순수 회전 vs index-scroll 줌 vs 회전+줌(spiral) 정확 분류

### US-4: Depth-Varying 속성 + 이펙트 감지
**As a** 비디오 아트 개발자, **I want** depth에 따라 변하는 속성과 후처리 이펙트를 감지하여, **so that** blueprint에 정확한 파라미터가 포함된다.

**Acceptance Criteria:**
- [ ] AC-4.1: depth-varying stroke width 감지 (near: 0.013, far: 0.003 수준 정밀도)
- [ ] AC-4.2: depth-varying opacity/brightness 감지 (near: 1.0, far: 0.12 수준)
- [ ] AC-4.3: depth-varying glow decay 감지 (decay range + amplitude)
- [ ] AC-4.4: depth-varying color gradient 감지 (near_color, far_color)
- [ ] AC-4.5: breathing 감지 시 amplitude + period 기록
- [ ] AC-4.6: chromatic aberration 감지 시 채널별 shift 기록
- [ ] AC-4.7: vignette 감지 시 start radius + darkening ratio 기록
- [ ] AC-4.8: grain 감지 시 intensity level 기록
- [ ] AC-4.9: 미지원 이펙트/shape 발견 시 경고 메시지 출력 + blueprint에 unknown_effects[] 기록

### US-5: Hybrid 코드 생성
**As a** 비디오 아트 개발자, **I want** blueprint.json을 입력하면 실행 가능한 GLSL shader + Three.js sketch 파일이 생성되어, **so that** 수동 코드 작성을 최소화할 수 있다.

**Acceptance Criteria:**
- [ ] AC-5.1: blueprint.json → `.frag` shader + `.ts` sketch 파일 생성 (hybrid: 뼈대 템플릿 + Claude 레이어 본문)
- [ ] AC-5.2: 생성된 코드가 `vite dev` + `?mode={name}`으로 즉시 실행 가능
- [ ] AC-5.3: blueprint의 모든 레이어, blend_mode(additive/alpha/multiply), depth_attenuation, per_instance_animation이 코드에 반영됨
- [ ] AC-5.4: 기존 main.ts의 모드 시스템과 호환 (Sketch 인터페이스: `{ scene, camera, update, resize, dispose }`)

### US-6: 원본-재현 자동 검증
**As a** 비디오 아트 개발자, **I want** 원본 영상과 재현 영상을 자동 비교하여, **so that** 구조적 일치도를 수치로 확인할 수 있다.

**Acceptance Criteria:**
- [ ] AC-6.1: 원본 프레임 vs 재현 프레임의 윈도우 SSIM 리포트 출력
- [ ] AC-6.2: 색상 팔레트 일치도 (각 색상별 ΔE2000) 리포트
- [ ] AC-6.3: 도형 수 / 도형 크기 / 모션 속도 일치도 리포트
- [ ] AC-6.4: 검증 캡처 시 uTime을 외부 주입 + gl.finish() 후 캡처로 프레임 정확도 보장

## 4. Technical Design

### 4.1 Architecture Overview

```
[Input: video.mov]
    ↓
Phase A: Frame Extraction + Loop Detection (extract-frames.py)
    ├── 24 evenly-spaced frames
    └── 3 high-temporal-resolution consecutive pairs (at 0s, 33%, 66%)
    ↓
Phase B: Computational Analysis
    ├── [parallel] analyze-colors.py → colors.json (CIELAB palette + ΔE2000 clustering)
    ├── [parallel] analyze-geometry.py → geometry.json (shapes)
    ├── [parallel] analyze-motion.py → motion.json (global motion)
    └── [after colors.json] analyze-layers.py → layers.json ★NEW (depends on colors.json)
    │     ├── 색상-마스크 레이어 분리
    │     ├── 개별 도형 추적 (contour centroid+area matching)
    │     ├── per-instance rotation speed measurement
    │     ├── index-scroll zoom detection
    │     ├── depth-varying property detection
    │     └── effect detection (glow, breathing, CA, grain, vignette)
    ↓
Phase C: Claude Visual Verification
    ├── Input: Phase B JSON 4개 + 원본 프레임 3장
    ├── Action: cross-validate script output vs visual, correct misclassifications
    └── Output: 수정된 layers.json 또는 검증 완료 확인
    ↓
Phase D: Blueprint Assembly → blueprint.json (v3 schema)
    ↓
Phase E: Code Generation ★NEW (hybrid)
    ├── 실행 주체: video-blueprint skill 실행 중 Claude가 직접 수행 (API 호출 아님)
    ├── Step 1: generate-shader.py가 Jinja2로 뼈대 생성 (uniforms, main 구조, SDF lib)
    ├── Step 2: Claude가 blueprint.json을 읽고 레이어 본문, 이펙트 조합, blend logic 작성
    ├── 비결정론성: 동일 blueprint → 구조 동일하나 변수명/순서 미세 차이 허용 (트레이드오프)
    ├── Output: {name}.frag + {name}.ts
    └── main.ts 패치 (동적 import 추가)
    ↓
Phase F: Verification ★NEW
    ├── Puppeteer: __startCapture(fps) → __captureFrame() per frame → canvas.screenshot
    ├── uTime 외부 주입 + deterministic clock
    ├── scikit-image structural_similarity (windowed SSIM)
    └── verification-report.json
```

### 4.2 Data Model Changes — Blueprint Schema v3

#### `layers[]` 확장

```jsonc
{
  "id": "layer_back",
  "type": "shape_group",
  "blend_mode": "additive",              // ★ additive | alpha | multiply
  "opacity": 1.0,
  "depth_attenuation": {                  // ★ depth-varying brightness
    "near": 0.7, "far": 0.15, "curve": "linear"
  },
  "elements": [{
    "id": "el_back_rects",
    "shape": "rounded_rect",
    "rendering_method": "sdf_stroke",     // ★ sdf_stroke | sdf_fill | sdf_stroke_fill
    "repetition": {
      "type": "concentric",
      "count": 10,
      "scale_step": 0.82,
      "rotation_step_deg": 0,
      "color_cycle": ["burg"],
      "color_gradient": {                 // ★ depth color interpolation
        "near": "burg", "far": "burg2"
      },
      "depth_fade": { "start_opacity": 0.7, "end_opacity": 0.15 },
      "stroke_depth": {                   // ★ depth-varying stroke
        "near_width_ratio": 0.013, "far_width_ratio": 0.003
      },
      "per_instance_animation": {         // ★ per-instance variable speed
        "property": "rotation_deg",
        "motion_type": "per_instance",    // per_instance | shared_phase
        "speed_formula": "linear",        // "linear" | "geometric" | "exponential"
        // linear:      speed = base + index * step
        // geometric:   speed = base * ratio^index
        // exponential: speed = base * exp(exponent * index)
        "base_speed_half_turns_per_loop": 1,
        "speed_step_per_instance": 1,     // linear: additive step
        "speed_ratio_per_instance": null,  // geometric: multiplicative ratio
        "speed_exponent": null             // exponential: exponent
      }
    },
    "stroke": { "color_id": "burg", "width_ratio": 0.013 },
    "glow": {                             // ★ per-layer glow
      "amplitude": 0.30,
      "decay_range": [60, 140],
      "depth_scaling": true
    }
  }]
}
```

#### `layers[]` — zoom layer (index-scroll)

```jsonc
{
  "id": "layer_front",
  "blend_mode": "additive",
  "elements": [{
    "id": "el_front_tunnel",
    "shape": "rounded_rect",
    "repetition": {
      "type": "concentric",
      "count": 22,
      "scale_step": 0.82,
      "paired_shapes": [                  // ★ paired shapes (replaces paired_colors)
        { "color_id": "gold", "height_factor": 0.78, "aspect_ratio": 0.58, "corner_radius_ratio": 0.40 },
        { "color_id": "navy", "height_factor": 0.65, "aspect_ratio": 0.58, "corner_radius_ratio": 0.40 }
      ],
      "per_instance_animation": {
        "property": "zoom_inward",
        "motion_type": "shared_phase",    // ★ all instances share same phase
        "method": "index_scroll",         // ★ index_scroll | scale_animate
        "cycles_per_loop": 4,
        "base_exponent": 0.82,
        "disappear_at_scale": 0.003
      },
      "stroke_depth": { "near_width_ratio": 0.009, "far_width_ratio": 0.0015 },
      "depth_fade": {
        "start_opacity": 1.0, "end_opacity": 0.12,
        "fade_in_instances": 1.5,
        "fade_out_scale": 0.02
      }
    }
  }]
}
```

#### `effects` 섹션

```jsonc
{
  "effects": {
    "glow": {
      "enabled": true,
      "per_layer": true,
      "note": "glow params are in each layer's elements[].glow"
    },
    "breathing": { "enabled": true, "amplitude": 0.012, "period_ratio": 0.5 },
    "chromatic_aberration": { "enabled": true, "max_shift_ratio": 0.006, "radial": true },
    "grain": { "enabled": true, "intensity": 0.02, "frame_rate": 24, "looped": true },
    "vignette": { "enabled": true, "start_radius": 0.7, "edge_color": "#111111", "opacity": 0.85, "method": "multiply" }
  }
}
```

#### v2 → v3 스키마 마이그레이션

| v2 필드 | v3 변경 | 호환성 |
|---------|---------|--------|
| `layers[].blend_mode` | 기존 유지 + "additive" 값 추가 | 하위 호환 |
| `layers[].elements[].stroke` | 기존 유지. `stroke_depth` 는 repetition 내 신규 | 하위 호환 |
| `motion.animations[].property: "rotation_deg"` | 기존 유지. `"zoom_inward"` 값 추가 | 하위 호환 |
| `constraints.style.glow: false` | 원본 특성 기술 유지. `effects.glow` 는 재현 파라미터 (역할 분리) | 비충돌 |
| 신규: `effects`, `depth_attenuation`, `per_instance_animation`, `paired_shapes`, `rendering_method`, `color_gradient`, `glow` (per-layer) | 모두 optional 필드 | 하위 호환 |

### 4.3 Script Interface

| Script | Input | Output | 신규/기존 |
|--------|-------|--------|----------|
| `extract-frames.py` | video file | meta.json + frames/ + hi-res pairs | 기존 확장 |
| `analyze-colors.py` | frames/ | colors.json (CIELAB ΔE2000) | 기존 확장 |
| `analyze-geometry.py` | frames/ | geometry.json | 기존 유지 |
| `analyze-motion.py` | frames/ | motion.json | 기존 유지 |
| `analyze-layers.py` | frames/ + colors.json | layers.json | ★ 신규 (PR1) |
| `validate-blueprint.py` | blueprint.json | PASS/FAIL | 기존 확장 (PR1) |
| `generate-shader.py` | blueprint.json | {name}.frag | ★ 신규 (PR2) |
| `generate-sketch.py` | blueprint.json | {name}.ts + main.ts patch | ★ 신규 (PR2) |
| `verify-output.py` | original frames/ + rendered frames/ | verification-report.json | ★ 신규 (PR3) |

### 4.4 Key Technical Decisions

| Decision | Options Considered | Chosen | Rationale |
|----------|-------------------|--------|-----------|
| 레이어 분리 방식 | (A) optical flow (B) 색상-마스크 (C) ML | **(B) 색상-마스크** + morphological erosion으로 AA 경계 제거 | geometric art는 색상=레이어. glow 영역은 border zone으로 분류→이펙트 감지 위임 |
| 줌 감지 | (A) 도형 스케일 변화 (B) index-scroll 패턴 매칭 | **(B) index-scroll** | 실제 셰이더는 `pow(base, fi + fract(t*c/dur))` 패턴. 스케일 애니메이션이 아님 |
| 코드 생성 | (A) 순수 Jinja2 (B) Claude 직접 작성 (C) **Hybrid** | **(C) Hybrid** | 뼈대(uniforms, main 구조, SDF lib)는 Jinja2 결정론적. 레이어 본문+이펙트 조합은 Claude가 blueprint 기반 작성. 조합 폭발 회피 |
| post-processing | (A) 셰이더 내장 (B) EffectComposer 분리 | **(B) EffectComposer** | 기존 layered 모드 패턴(effect-composer.ts)과 일치. CA/vignette/grain은 post pass |
| decord | (A) 기본 디코더 (B) optional 가속 | **(B) optional** | macOS ARM 빌드 불안정. ffmpeg subprocess가 기본. decord는 try/except 가속 |
| XL 분할 | (A) 단일 릴리스 (B) 3-PR 분할 | **(B) 3-PR** | PR1: 분석, PR2: 코드 생성, PR3: 검증. 각 PR에서 psy.mov 중간 검증 |
| 검증 렌더링 | (A) Puppeteer (B) offscreen headless-gl | **(A) Puppeteer** | 기존 __captureFrame API 활용. uTime 외부 주입 + gl.finish() 보장 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | 매우 어두운 영상 (대비 < 5%) | color tolerance 자동 조정 + 사용자 경고 | Medium |
| E2 | 도형이 겹쳐서 컨투어 병합 | morphological erosion 후 재시도 + 면적 기반 추정 + 경고 | High |
| E3 | 120fps 소스에서 연속 프레임 차이 극소 | temporal pair 간격 자동 조정 (2-4 프레임 스킵) | Medium |
| E4 | 비기하학적 영상 (실사, 파티클) | 기하학적 분석 실패 감지 → "비기하학적 입력: 미지원" 에러 + 종료 (NG5) | High |
| E5 | 색상 팔레트가 2색 이하 | 단일 레이어로 처리, 모션은 글로벌 분석 의존 | Low |
| E6 | 줌+회전 동시 발생 (spiral) | motion_type "spiral"로 분류, 줌/회전 파라미터 모두 기록 | Medium |
| E7 | 코드 생성 시 미지원 shape 타입 | 가장 가까운 SDF로 근사 + 주석 경고 + stderr | Medium |
| E8 | 생성 코드의 SSIM < 0.7 | 검증 FAIL + 불일치 상세 리포트 + 수동 조정 가이드 | High |
| E9 | non-looping 영상 입력 | loop_ssim < 0.8 감지 → 경고 + 전체 구간 사용 또는 종료 선택 | Medium |
| E10 | 4K+ 해상도 입력 | 분석 해상도 1080p 이하로 자동 다운스케일 + 원본 해상도 메타 보존 | Medium |
| E11 | ffmpeg 미설치 또는 버전 < 4.0 | 명확한 에러 메시지 + 설치 안내 | High |
| E12 | 코드 생성 시 미지원 이펙트 조합 | stderr 경고 + 생성 코드에 TODO 주석 삽입 | Medium |

## 6. Security & Permissions

- 모든 subprocess 호출은 `shell=False` + 리스트 인자 전달 필수
- 파일 경로는 `pathlib.Path.resolve()` 후 프로젝트 루트 하위 확인 (`starts_with`)
- 템플릿 삽입 시 숫자 필드는 타입 검증, 문자열 필드는 허용 문자셋(`[a-zA-Z0-9_#]`) 화이트리스트

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 10초 120fps 영상 분석 시간 | < 3분 | 전체 파이프라인 wall time |
| 프레임 추출 (24장 + 3 pairs) | < 30초 | ffmpeg 의존 |
| 색상 분석 (CIELAB) | < 60초 | k-means 24프레임 |
| 레이어 분석 | < 90초 | 색상-마스크 + 컨투어 매칭 |
| 코드 생성 (hybrid) | < 30초 | Jinja2 뼈대 + Claude 본문 |
| 검증 렌더링 (24프레임) | < 60초 | Puppeteer 캡처 |

## 8. Testing Strategy

### 8.1 Unit Tests (Python: pytest, TS: vitest)
- `analyze-layers.py`: color_mask 생성, shape 매칭, zoom 감지, depth-varying 감지
- `generate-shader.py`: 각 blueprint 요소 → GLSL 코드 변환
- `validate-blueprint.py`: v3 스키마 필드 검증
- `verify-output.py`: SSIM 계산, 컨투어 매칭, ΔE 리포트

### 8.2 Integration Tests
- **psy.mov E2E**: 입력 → layers.json → blueprint → 코드 → 렌더링 → SSIM 검증
- **단순 테스트 영상**: 단색 회전 사각형 1개 → 완벽 재현 확인

### 8.3 Edge Case Tests
- E1: 어두운 영상
- E2: 겹치는 도형
- E4: 비기하학적 입력 → graceful 거부 확인
- E9: non-looping 입력 → 경고 확인

## 9. Rollout Plan (3-PR 분할)

| PR | 범위 | 산출물 | 검증 |
|----|------|--------|------|
| **PR1** | 분석 파이프라인 | analyze-layers.py + **v3 스키마 완전 확정** (output-schema.md) + validate 수정 | psy.mov → layers.json 정확도 |
| **PR2** | 코드 생성 | generate-shader.py + generate-sketch.py + Jinja2 템플릿. **스키마 변경 금지 — PR1 스키마 소비만** | blueprint → 코드 → vite dev 실행 |
| **PR3** | 검증 | verify-output.py + SKILL.md 통합. **스키마 변경 금지** | 원본 vs 재현 SSIM 리포트 |

**PR 간 스키마 계약**: PR1에서 output-schema.md를 v3로 완전 확정. PR2/PR3은 이 스키마를 읽기 전용으로 사용. 스키마 변경 필요 시 PR1로 역행(새 커밋).

### 9.1 Migration Strategy
- v2 스크립트 유지 (하위 호환)
- v3 필드 모두 optional (v2 blueprint도 validate 통과)
- SKILL.md v3 워크플로우는 PR3에서 최종 교체

### 9.2 Rollback Plan
git revert per PR. 각 PR 독립적.

## 10. Dependencies & Risks

### 10.1 Dependencies

#### Python 분석 파이프라인

| Package | Version | 용도 | 카테고리 |
|---------|---------|------|----------|
| **numpy** | ≥1.24 | 배열 연산, 픽셀 조작 | Core |
| **Pillow** | ≥10.0 | 이미지 I/O, 리사이징 | Core |
| **opencv-python-headless** | ≥4.8 | 컨투어, Canny, distance transform, ORB, affine, optical flow, morphology | Core |
| **scikit-learn** | ≥1.3 | KMeans (CIELAB), DBSCAN 모션 그룹 | Core |
| **scipy** | ≥1.11 | `curve_fit` 모션 모델, `find_peaks` 주기성, `cdist` 거리 행렬, FFT | Core |
| **scikit-image** | ≥0.21 | `structural_similarity` SSIM, `match_template`, `rgb2lab`, `regionprops` | Core |
| **jinja2** | ≥3.1 | GLSL/TS 뼈대 템플릿 엔진 | Code Gen |
| **colorspacious** | ≥1.1 | CIELAB ΔE2000 지각 균일 색거리 | Accuracy |
| **decord** | ≥0.6 | 비디오 직접 디코딩 (optional, try/except) | Optional |

```bash
# Core
pip install numpy Pillow opencv-python-headless scikit-learn scipy scikit-image jinja2 colorspacious
# Optional (may fail on macOS ARM)
pip install decord
```

#### System: `ffmpeg` ≥4.0, `ffprobe`
#### Node.js: `puppeteer`, `sharp`, `three` (기존 deps)

### 10.2 Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| AA 경계에서 색상 마스크 부정확 | Medium | 도형 수 ±1-2 | morphological erosion + border zone → 이펙트 감지 위임 |
| minAreaRect 90° 모호성 | High | 회전속도 오류 | 연속 프레임 각도 연속성 검증 + curve_fit |
| Jinja2 템플릿 복잡도 임계 | Medium | 유지보수 불가 | modular include 구조 + 레이어 5개/이펙트 4개 초과 시 수동 경로 |
| decord macOS ARM 빌드 실패 | High | 성능 저하 | ffmpeg 기본, decord optional |
| SSIM 목표 미달 | Medium | 검증 무의미 | 단계적: PR1에서 0.70(구조), PR3에서 0.85(디테일) |
| Hybrid 코드 생성 비결정론성 | Medium | 동일 blueprint → 미세 차이 코드 | 구조 동일성만 보장. 변수명/순서 차이 허용. 검증은 SSIM 기반 (코드 diff 아님) |

## 11. Success Metrics

| Metric | Baseline (v2) | Target (v3) | Measurement |
|--------|--------------|-------------|-------------|
| 레이어 분리 | 0% (미지원) | pass/fail per test video | psy.mov: back/front 분리 여부 |
| 도형 수 정확도 | ±50% | |detected-actual|/actual ≤ 10% | 자동 비교 |
| 색상 정확도 | RGB ±30 | ΔE2000 < 8 per color | colorspacious 측정 |
| 모션 타입 분류 | 오분류 | 정분류율 100% (psy.mov 기준) | rotation/zoom/static 분류 |
| 최종 SSIM | 미측정 | PR1: 0.70+ → PR3: 0.85+ | scikit-image windowed SSIM |
| 수동 수정량 | 100% 수작성 | ≤ 10% diff | 생성 vs 최종 코드 비교 |

## 12. Skill Utilization Map

| Phase | 작업 | 활용 스킬 | 용도 |
|-------|------|----------|------|
| **Phase E: generate-shader** | SDF 함수, GLSL 패턴 | `/threejs-shaders` | SDF lib, uniform, varying, precision |
| **Phase E: generate-shader** | post 이펙트 코드 | `/threejs-postprocessing` | EffectComposer, ShaderPass, CA/bloom |
| **Phase E: generate-sketch** | ShaderMaterial | `/threejs-materials` | uniform 타입, depthWrite/depthTest |
| **Phase E: generate-sketch** | Scene/Camera/Renderer | `/threejs-fundamentals` | OrthographicCamera, colorSpace, toneMapping |
| **Phase E: generate-sketch** | PlaneGeometry | `/threejs-geometry` | 풀스크린 쿼드, frustumCulled |
| **Phase E: generate-sketch** | 애니메이션 루프 | `/threejs-animation` | rAF 패턴, 시간 기반 루프 |
| **Phase D: blueprint** | 분석 워크플로우 | `/video-blueprint` | v2 기반 확장 |

### 스킬 활용 원칙
1. 코드 생성 시 해당 스킬의 best practices 필수 참조
2. Jinja2 템플릿에 스킬 패턴 내장
3. Phase 5 직접 코딩 시에도 스킬 로드하여 프로젝트 규칙 준수

## 13. Open Questions

- [x] ~~OQ-1: 비기하학적 영상 폴백~~ → **v4로 분리** (NG5 추가)
- [x] ~~OQ-2: post-processing 분리~~ → **EffectComposer 분리** (§4.4 Decision)
- [ ] OQ-3: [NON-BLOCKING] 다중 비디오 소스 합성 — v4 비전

---
