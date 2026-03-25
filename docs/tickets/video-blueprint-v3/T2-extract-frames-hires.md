# T2: extract-frames.py hi-res pairs

**PRD Ref**: PRD-video-blueprint-v3 > US-2 (개별 도형 모션 추적에 필요한 고시간해상도 프레임)
**Priority**: P2 (Medium)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective

extract-frames.py에 `--hi-res-pairs` 옵션을 추가하여, 루프 구간의 0%, 33%, 66% 지점에서 연속 프레임 쌍(1/fps 간격)을 추출한다. analyze-layers.py가 개별 도형의 미세 각도 변화를 정밀 측정하는 데 사용.

## 2. Acceptance Criteria
- [ ] AC-1: `--hi-res-pairs N` 옵션 추가 (기본값 3)
- [ ] AC-2: 루프 구간의 0%, 33%, 66% 지점에서 연속 2프레임씩 추출
- [ ] AC-3: hi-res 프레임은 `hires_pair_{N}_a.png`, `hires_pair_{N}_b.png` 형식으로 저장
- [ ] AC-4: meta.json에 `hi_res_pairs: [{ timestamp, paths: [a, b], interval_sec }]` 기록
- [ ] AC-5: 기존 24프레임 균등 추출 동작 변경 없음

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `test_hires_pairs_default_3` | Integration | 테스트 영상에서 --hi-res-pairs 3 실행 | 6개 hi-res 프레임 파일 생성 |
| 2 | `test_hires_pairs_in_meta` | Unit | meta.json에 hi_res_pairs 배열 존재 | 3개 항목, 각각 timestamp + paths |
| 3 | `test_hires_interval_matches_fps` | Unit | pair 간 interval_sec = 1/fps | 120fps → 0.00833s |
| 4 | `test_no_hires_when_disabled` | Integration | --hi-res-pairs 0 | hi-res 파일 없음, meta에 빈 배열 |

### 3.2 Test File Location
- `.claude/skills/video-blueprint/scripts/tests/test_extract_frames.py` (pytest)

### 3.3 Mock/Setup Required
- 테스트용 짧은 비디오 파일 (ffmpeg으로 생성하는 fixture)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `.claude/skills/video-blueprint/scripts/extract-frames.py` | Modify | --hi-res-pairs 옵션 + 추출 로직 |

### 4.2 Implementation Steps (Green Phase)
1. argparse에 `--hi-res-pairs` 인자 추가 (default=3)
2. effective_duration을 N등분하여 각 지점에서 연속 2프레임 추출
3. meta.json에 hi_res_pairs 배열 추가

## 5. Edge Cases
- EC-1: 영상이 너무 짧아 hi-res pair 구간이 겹침 → pair 수 자동 축소

## 6. Review Checklist
- [ ] Red → Green → Refactor 완료
- [ ] AC 전부 충족
- [ ] 기존 24프레임 추출 동작 변경 없음
