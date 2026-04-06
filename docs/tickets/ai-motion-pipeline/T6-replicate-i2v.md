# T6: Replicate i2v API 호출 + 프레임 추출

**PRD Ref**: PRD-ai-motion-pipeline > US-1 (AC-1.1, AC-1.2), US-3, §4.1 Step M1-M2
**Priority**: P1 (High)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T1, T2

---

## 1. Objective

Replicate API를 통해 per-layer image-to-video 생성, ffmpeg로 프레임 추출, duration 정규화(target 8초). 모델별 매핑(wan-2.2/veo-3.1/seedance) + 프롬프트 자동생성.

## 2. Acceptance Criteria

- [ ] AC-1: layer PNG → Replicate i2v API → mp4 다운로드 → 로컬 저장
- [ ] AC-2: 모델 매핑: wan-2.2→wan-video/wan-2.2-i2v-fast, veo-3.1→google/veo-3.1, seedance→bytedance/seedance-1-pro
- [ ] AC-3: role 기반 프롬프트 자동생성 (background-plate → "subtle wind", subject → "subtle breathing")
- [ ] AC-4: ffmpeg로 mp4 → PNG 시퀀스 추출 (target 24fps)
- [ ] AC-5: duration 정규화: < 8초면 FILM 보간, > 8초면 trim
- [ ] AC-6: 양 레이어 프레임 수 동기화
- [ ] AC-7: 전경 RGBA → 검정배경 composite → RGB 전처리 (§4.1.3)
- [ ] AC-8: All-or-nothing: 한 레이어 실패 시 양쪽 motion 비활성화 + 폴백 (E1)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `maps wan-2.2 to correct replicate id` | Unit | 모델명 매핑 | wan-video/wan-2.2-i2v-fast |
| 2 | `maps veo-3.1 to correct replicate id` | Unit | 모델명 매핑 | google/veo-3.1 |
| 3 | `generates prompt for background-plate` | Unit | role=background-plate | "subtle wind" 포함 |
| 4 | `generates prompt for subject` | Unit | role=subject | "subtle breathing" 포함 |
| 5 | `flattens RGBA to RGB with black bg` | Unit | RGBA PNG 입력 | RGB PNG, 검정 배경 |
| 6 | `calls replicate with retry` | Integration | mock API | withRetry 3회 재시도 |
| 7 | `falls back on api failure` | Integration | mock API 실패 | motion=false + 경고 |
| 8 | `all-or-nothing on partial failure` | Integration | 1레이어 성공, 1실패 | 양쪽 모두 비활성화 |
| 9 | `FILM failure falls back to ffmpeg resample` | Integration | mock FILM 실패 | ffmpeg fps 리샘플링 적용 |
| 10 | `normalizes duration to 192 frames` | Integration | 5초 입력 | 보간 후 192프레임 |

### 3.2 Test File Location

- `scripts/lib/__tests__/motion-i2v.test.ts`

### 3.3 Mock/Setup Required

- Replicate API mock (vi.mock('replicate'))
- sharp mock for RGBA flatten
- ffmpeg mock (child_process)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/motion-i2v.ts` | Create | i2v 호출 + 프레임 추출 + 프롬프트 생성 |
| `scripts/lib/motion-models.ts` | Create | 모델 매핑 + 파라미터 설정 |

### 4.2 Implementation Steps (Green Phase)

1. 모델 매핑 정의 (CLI값 → Replicate ID + 모델별 파라미터)
2. role → 프롬프트 자동생성 함수
3. 전경 RGBA → RGB flatten (sharp)
4. Replicate API 호출 (withRetry 재활용)
5. mp4 다운로드 → 로컬 저장
6. ffmpeg 프레임 추출 (24fps PNG 시퀀스)
7. Duration 정규화:
   - > 8초: ffmpeg trim to 8초 (192프레임 @24fps)
   - < 8초: Replicate FILM (`google-research/frame-interpolation`) 호출 via withRetry
     - 키프레임 쌍별 보간 → target 192프레임 도달
     - FILM 실패 시 fallback: ffmpeg fps 리샘플링 (`-vf fps=24`)
   - = 8초: 변환 없음
8. 양 레이어 프레임 수 동기화 (짧은 쪽을 FILM/trim으로 맞춤)
9. All-or-nothing 에러 핸들링

> 모델 매핑 패턴은 기존 pipeline-pro.ts의 MODEL 상수 패턴 참조 (BRIA_MODEL, FLUX_FILL_MODEL 등)

## 5. Edge Cases

- EC-1: API 실패 (E1) → all-or-nothing 폴백
- EC-2: 해상도 불일치 (E3) → sharp 리사이즈
- EC-3: 전경 alpha (E9, §4.1.3)
- EC-4: 모델별 출력 duration 차이 (E12)

## 6. Review Checklist

- [ ] Red/Green/Refactor 완료
- [ ] AC 전부 충족
- [ ] withRetry 재활용 (replicate-utils.ts)
