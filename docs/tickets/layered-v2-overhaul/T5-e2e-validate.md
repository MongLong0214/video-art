# T5: E2E 검증 + README 업데이트

**PRD Ref**: PRD-layered-v2-psychedelic-overhaul > US-5, US-6
**Priority**: P1
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T1, T2, T3, T4

---

## 1. Objective

전체 layered 파이프라인 E2E 실행으로 새 셰이더 + 스키마 + 프리셋이 통합 동작하는지 검증하고, README.md를 최종 업데이트한다.

## 2. Acceptance Criteria
- [ ] AC-1: `npm run pipeline <img> -- --title e2e-test` 성공 (10초 mp4 출력)
- [ ] AC-2: `npm run pipeline:validate` → RMSE < 2.0 (seamless loop)
- [ ] AC-3: 출력 mp4의 채도 측정: mean_sat > 0.60
- [ ] AC-4: 출력 mp4의 hue shift 속도: > 80°/s
- [ ] AC-5: README.md의 layered 섹션이 변경사항 반영 (duration 10, HSV, 60fps, period [1,2,5,10])

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `pipeline e2e` | E2E | 이미지 → mp4 전체 흐름 | mp4 파일 생성, 10초 |
| 2 | `validate-loop` | Integration | frame[0] vs frame[600] | RMSE < 2.0 |
| 3 | `visual saturation` | Manual | 프레임 HSV S 측정 | > 0.60 |
| 4 | `visual hue speed` | Manual | 연속 프레임 hue diff | > 80°/s |

### 3.2 Test File Location
- E2E: `npm run pipeline` CLI 실행
- Manual: Python 분석 스크립트 (일회용)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `README.md` | Modify | layered 모드 설명 업데이트 |

### 4.2 Implementation Steps
1. `npm run pipeline:layers <이미지>` 실행 → scene.json 재생성 확인 (새 프리셋 적용)
2. `npm run dev` → `/?mode=layered` 미리보기 → 강렬한 색순환 시각 확인
3. `npm run pipeline:validate` → RMSE 측정
4. `npm run export:layered -- --title e2e-test` → mp4 생성
5. 출력 mp4에서 프레임 추출 → HSV 채도 + hue speed 측정
6. source.mp4와 나란히 비교
7. README.md 업데이트:
   - Seamless Loop 섹션: period [1,2,5,10], duration 10
   - GLSL Effects: HSL → HSV
   - Export Pipeline: 600프레임 (10초 × 60fps)
   - scene.json Reference: duration 10, fps 60, 새 필드

## 5. Edge Cases
- EC-1: validate-loop RMSE > 2.0 → 디버깅 순서: T2(셰이더 로직) → T3(uniform 전달/기본값) → T4(duration 정합성) → T1(period 약수 검증)

## 6. Review Checklist
- [ ] pipeline e2e 성공
- [ ] RMSE < 2.0
- [ ] 시각적 임팩트가 source.mp4 수준
- [ ] README.md 정합성 확인
