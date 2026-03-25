# T12: verify-output.py (SSIM + 구조 검증)

**PRD Ref**: PRD-video-blueprint-v3 > US-6
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T10

---

## 1. Objective

원본 영상 프레임과 생성 코드 렌더링 프레임을 자동 비교하여 구조적 일치도 리포트를 생성한다.

## 2. Acceptance Criteria
- [ ] AC-1: Puppeteer로 생성 코드 렌더링 → 프레임 캡처 (uTime 외부 주입 + deterministic clock). 캡처 시 `page.evaluate('gl.finish()')` 후 screenshot
- [ ] AC-2: scikit-image structural_similarity로 윈도우 SSIM 계산 (24프레임 평균)
- [ ] AC-3: 색상 팔레트 일치도: 원본 colors.json vs 재현 프레임의 k-means → ΔE2000 비교
- [ ] AC-4: 도형 수 일치도: 원본 geometry.json vs 재현 프레임 컨투어 수 비교
- [ ] AC-5: verification-report.json 출력 (ssim_mean, ssim_per_frame, palette_delta_e, shape_count_diff)
- [ ] AC-6: SSIM < 0.7 → FAIL verdict + 상세 불일치 영역 리포트

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_ssim_identical_frames` | Unit | 동일 이미지 → SSIM | 1.0 |
| 2 | `test_ssim_different_frames` | Unit | 전혀 다른 이미지 → SSIM | < 0.3 |
| 3 | `test_palette_delta_e_report` | Unit | 두 palette 비교 → ΔE2000 배열 | 정확한 거리 |
| 4 | `test_shape_count_comparison` | Unit | 원본 12개 vs 재현 12개 → diff=0 | match |
| 5 | `test_verification_report_structure` | Unit | report JSON에 필수 키 존재 | ssim_mean, verdict 등 |
| 6 | `test_fail_verdict_below_threshold` | Unit | SSIM 0.6 → verdict FAIL | verdict: "FAIL" |
| 7 | `test_puppeteer_capture_produces_frames` | Integration | Puppeteer 캡처 → 프레임 이미지 파일 생성 | 프레임 파일 존재 + 크기 > 0 |

### 3.2 Test File Location
- `.claude/skills/video-blueprint/scripts/tests/test_verify_output.py`

### 3.3 Mock/Setup Required
- scikit-image, colorspacious
- 테스트용 이미지 쌍 (PIL 생성)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.claude/skills/video-blueprint/scripts/verify-output.py` | Create | 검증 스크립트 |

### 4.2 Implementation Steps (Green Phase)
1. Puppeteer 프레임 캡처 로직 (기존 export-blueprint.ts 패턴 참조)
2. SSIM 계산: scikit-image structural_similarity (multichannel, win_size=11)
3. 팔레트 비교: 원본 colors.json + 재현 프레임 analyze-colors → ΔE2000
4. 도형 수 비교: 원본 geometry.json + 재현 프레임 analyze-geometry → count diff
5. verification-report.json 조립 + verdict 판정

## 5. Edge Cases
- EC-1: (E8) SSIM < 0.7 → 가장 낮은 SSIM 프레임의 diff 이미지 출력
- EC-2: Puppeteer 캡처 실패 → 수동 프레임 입력 폴백

## 6. Review Checklist
- [ ] Red → Green → Refactor 완료
- [ ] 동일 영상에서 SSIM ≈ 1.0 확인
- [ ] psy.mov 원본 vs 재현 리포트 생성 확인
