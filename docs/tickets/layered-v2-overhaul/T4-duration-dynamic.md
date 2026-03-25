# T4: duration 동적화 (main.ts, export-layered.ts, validate-loop.ts)

**PRD Ref**: PRD-layered-v2-psychedelic-overhaul > US-5
**Priority**: P0
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective

main.ts, export-layered.ts, validate-loop.ts에서 하드코딩된 duration 20초와 VALID_PERIODS를 scene.json 기반 동적 값으로 전환한다.

## 2. Acceptance Criteria
- [ ] AC-1: main.ts의 LOOP_DUR이 layered 모드에서 scene.json duration 기반
- [ ] AC-2: export-layered.ts의 DURATION이 public/scene.json에서 동적 로드
- [ ] AC-3: validate-loop.ts의 LOOP_DURATION이 public/scene.json에서 동적 로드
- [ ] AC-4: validate-loop.ts의 validPeriods가 scene-schema.ts의 `getValidPeriods()` 사용 (DRY)
- [ ] AC-5: export-layered.ts가 `sceneSchema` import하여 scene.json 파싱
- [ ] AC-6: duration=10, 60fps 기준 600프레임 캡처 확인. FPS=60은 export 품질용 하드코딩 유지 (scene.json fps는 preview 참조용)
- [ ] AC-7: parallax 주기가 duration 변경에 자동 적응 (`parallaxT = time × TAU / duration` 수식이 동적 duration 참조 확인)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `validate-loop reads duration from scene.json` | Integration | duration=10 scene.json | 600프레임 검증 |
| 2 | `validate-loop uses dynamic valid periods` | Integration | period=4 → 거부 | 에러 |

셰이더/캡처 스크립트는 e2e 수준이므로 수동 검증.

### 3.2 Test File Location
- 기존 `scripts/validate-loop.ts` 내 검증 로직 (별도 테스트 파일 없음, 스크립트 자체가 검증 도구)

### 3.3 Mock/Setup Required
- `public/scene.json` 필요 (pipeline:layers로 생성)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `src/main.ts` | Modify | LOOP_DUR을 init() 내부에서 sceneConfig.duration으로 동적 할당 |
| `scripts/export-layered.ts` | Modify | sceneSchema import, public/scene.json 파싱, DURATION 동적화 |
| `scripts/validate-loop.ts` | Modify | scene.json 기반 LOOP_DURATION + getValidPeriods import |

### 4.2 Implementation Steps (Green Phase)
1. **main.ts**: LOOP_DUR을 모듈 최상위에서 제거하고 init() 스코프로 이동
   ```typescript
   async function init() {
     const sketch = await loadSketch();
     // layered 모드에서 duration을 scene.json에서 가져옴
     const loopDur = IS_LAYERED
       ? (sketch as LayeredSketch).sceneConfig.duration
       : 8.0;
     // TYPING_SPEED도 loopDur 확정 후 계산
     const typingSpeed = TYPING_TEXT.length / (loopDur - 1.5);
     // 이후 loopDur, typingSpeed를 클로저에서 참조
   }
   ```
   - 모듈 최상위 `const LOOP_DUR` 완전 제거 → race condition 원천 차단
   - `updateTyping()` 내부에서 `loopDur` 클로저 참조

2. **export-layered.ts**:
   - `import { sceneSchema } from "../src/lib/scene-schema.js"` 추가
   - main()에서 `public/scene.json` 읽기 + 파싱
   - `const DURATION = config.duration`
   - `const TOTAL_FRAMES = FPS * DURATION`
   - 기존 상수 `const DURATION = 20` 제거

3. **validate-loop.ts**:
   - `import { getValidPeriods } from "../src/lib/scene-schema.js"` 추가
   - `const validPeriods = getValidPeriods(config.duration)` (기존 하드코딩 제거)
   - `const LOOP_DURATION = config.duration`
   - `const TOTAL_FRAMES = LOOP_DURATION * FPS`

## 5. Edge Cases
- EC-1: public/scene.json 미존재 시 → 명확한 에러 메시지 ("Run pipeline:layers first")
- EC-2: scene.json의 duration이 매우 클 때 → schema에서 max(60) 제한 (T1에서 처리)

## 6. Review Checklist
- [ ] 하드코딩된 20이 3곳 모두 제거됨
- [ ] DRY: VALID_PERIODS가 scene-schema.ts 단일 소스
- [ ] export:layered 실행 시 600프레임(10초 × 60fps) 캡처
