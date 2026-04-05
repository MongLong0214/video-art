# T6: 6-stem 스플리터 + render-pro.ts 소비자 호환

**PRD Ref**: PRD-audio-pipeline-fix > US-4
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T3 (12ch 버스 할당)

---

## 1. Objective
인라인 스템 스플리터를 6-stem으로 업데이트하고, render-pro.ts 소비자 코드를 동시에 수정하여 호환성을 보장한다.

## 2. Acceptance Criteria
- [ ] AC-4.3: 인라인 스플리터가 `["kick","bass","hat","synth","pad","fx"]` 6개 스템 생성
- [ ] AC-4.4: `render-pro.ts:108` stemNames = `["kick","bass","hat","synth","pad","fx"]`
- [ ] AC-4.5: render-pro.ts 폴백 로직이 6-stem 기준 동작

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `stem splitter produces 6 stems` | Integration | 12ch WAV → 6 stem files | 6개 파일 존재 |
| 2 | `stem names are kick,bass,hat,synth,pad,fx` | Unit | stemNames 배열 | 6개 정확한 이름 |
| 3 | `render-pro stemNames matches 6-stem` | Unit | render-pro.ts 상수 | 동일 배열 |
| 4 | `stem splitter channel mapping: pad is ch 8-9` | Unit | 매핑 검증 | pad → channels[4] (idx 8-9) |

### 3.2 Test File Location
- `scripts/lib/render-analysis.test.ts` (추가)
- `scripts/render-pro.test.ts` (**Create** — 새 파일)

### 3.3 Mock/Setup Required
- 12ch numpy WAV 생성 (pytest 또는 vitest에서 python3 -c 호출)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/render-analysis.ts` | Modify | 인라인 Python 스플리터 6-stem으로 수정 |
| `scripts/render-pro.ts` | Modify | stemNames 6-stem + 폴백 로직 수정 |
| `scripts/lib/render-analysis.test.ts` | Modify | 스플리터 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)
1. render-analysis.ts 인라인 Python 코드 (line ~595):
   - `enumerate(["kick","bass","hat","synth","pad","fx"])` 로 변경
   - `audio.shape[1]` 검증: 12ch 기대, 아닌 경우 경고
2. render-pro.ts:108:
   - `const stemNames = ["kick", "bass", "hat", "synth", "pad", "fx"];`
3. render-pro.ts 폴백 로직 (line ~114-127):
   - missing stem 처리를 6개 기준으로

### 4.3 Refactor Phase
- stemNames 상수를 공유 모듈로 추출 (render-analysis.ts와 render-pro.ts 동기화)

## 5. Edge Cases
- EC-1: 기존 10ch WAV가 남아있을 때 → 스플리터가 채널 수 체크 후 5-stem 폴백 (테스트 케이스 #5 추가)

### 3.1 추가 테스트

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 5 | `10ch WAV falls back to 5 stems` | Integration | 기존 10ch WAV 입력 | 5개 stem 생성 + WARNING 로그 |
