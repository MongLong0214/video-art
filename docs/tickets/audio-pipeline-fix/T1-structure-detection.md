# T1: Python 구조 감지 에너지 기반 정규화

**PRD Ref**: PRD-audio-pipeline-fix > US-1
**Priority**: P0 (Blocker)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
`analyze_track.py`의 `detect_structure()`를 에너지 기반 분할로 교체하여, 트랙 전체를 의미있는 섹션으로 분할한다.

## 2. Acceptance Criteria
- [ ] AC-1.1: `detect_structure()`가 트랙 전체 duration 기준 최소 4개 섹션 생성
- [ ] AC-1.2: 각 섹션 최소 5초 (duration < 30초는 최소 2초)
- [ ] AC-1.3: "outro" 섹션이 전체 duration의 50% 초과하지 않음
- [ ] AC-E1: energy_curve 모두 0이면 단일 "drop" 폴백
- [ ] AC-E3: duration < 30초면 최소 2섹션, 각 최소 2초

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `detect_structure returns >= 4 segments for normal track` | Unit | 335초 트랙의 에너지 커브 입력 | segments.length >= 4 |
| 2 | `each segment >= 5 seconds` | Unit | 모든 seg.end - seg.start >= 5 | True |
| 3 | `outro is <= 50% of duration` | Unit | outro seg duration / total <= 0.5 | True |
| 4 | `all-zero energy falls back to single drop` | Unit | 모두 0인 에너지 커브 | [{ label: "drop" }] |
| 5 | `short track (< 30s) produces >= 2 segments with min 2s each` | Unit | 20초 트랙 | segments >= 2, each >= 2s |
| 6 | `segments cover full duration without gaps` | Unit | seg[0].start == 0, seg[-1].end == duration | True |

### 3.2 Test File Location
- `audio/analyzer/test_structure.py` (pytest)

### 3.3 Mock/Setup Required
- numpy array로 합성 에너지 커브 생성 (intro=low, build=rising, drop=high, break=low, outro=declining)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/analyzer/analyze_track.py` | Modify | `detect_structure()` 에너지 기반 재작성 |
| `audio/analyzer/test_structure.py` | Create | pytest 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. `detect_structure(y_mono, sr)` 내부에서 기존 diff threshold 로직 제거
2. RMS 에너지 커브를 100-point로 정규화
3. 에너지 기반 5-구간 분할: avg 기준 threshold (< 0.4*max → intro/break, > 0.7*max → drop, 사이 → build/outro)
4. 인접 동일 라벨 병합
5. 최소 길이 검증: 5초 미만 섹션은 인접 섹션에 병합
6. outro 50% 상한: 초과 시 후반 분할 (break+outro)
7. 전체 duration 커버 보장 (gap/overlap 제거)

### 4.3 Refactor Phase
- 매직넘버 상수 추출 (MIN_SECTION_SEC, OUTRO_MAX_RATIO 등)

## 5. Edge Cases
- EC-1: 모든 에너지가 0 → 단일 "drop"
- EC-2: duration < 30초 → 최소 2초 섹션
- EC-3: 에너지가 전구간 균일 → 균등 4분할 (intro/build/drop/outro)
