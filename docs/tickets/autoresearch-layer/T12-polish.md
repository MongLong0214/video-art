# T12: Program.md + Report + Promote + Scripts

**PRD Ref**: PRD-autoresearch-layer > US-4/5/6, §9.4
**Priority**: P2
**Size**: M
**Status**: Todo
**Depends On**: T10, T11

---

## 1. Objective

에이전트 연구 지시서(program.md), 실험 이력 분석(report.ts), baseline 승격(promote.ts), package.json scripts 등록을 완성한다.

## 2. Acceptance Criteria

- [ ] AC-1: `scripts/research/program.md` — setup, experimentation loop, output format, logging, constraints, strategy guide
- [ ] AC-2: 각 파라미터의 유효 범위, 의미, 상호의존성 명시
- [ ] AC-3: 금지사항 명시 (evaluate.ts 수정, 외부 패키지, harness 조작)
- [ ] AC-4: simplicity criterion + exploration strategy guide
- [ ] AC-5: `report.ts` — results.tsv 파싱 → best/worst/mean/trend + top-5 config diff
- [ ] AC-6: `promote.ts` — best config → baseline-config.json + 이전 baseline 보존
- [ ] AC-7: package.json에 research:* scripts 6개 등록
- [ ] AC-8: .gitignore에 `.cache/research/`, `results.tsv` 추가

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `parseTsv valid` | Unit | TSV string → ExperimentRow[] | 올바른 파싱 |
| 2 | `parseTsv empty` | Unit | header only → [] | 빈 배열 |
| 3 | `computeReport stats` | Unit | 10 rows → best/worst/mean/trend | 정확한 통계 |
| 4 | `computeReport top5` | Unit | 20 rows → top 5 keeps | quality_score 순 |
| 5 | `promoteBaseline` | Unit | config + score → baseline-config.json | 파일 생성 |
| 6 | `promotePreservesHistory` | Unit | 기존 baseline 존재 → 이전 값 보존 | previous field |
| 7 | `programMd exists` | Unit | file read → non-empty | 내용 존재 |
| 8 | `programMd has sections` | Unit | parse headings | Setup, Experimentation, Constraints |

### 3.2 Test File Location
- `scripts/research/report.test.ts`
- `scripts/research/promote.test.ts`

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/program.md` | Create | 에이전트 연구 지시서 |
| `scripts/research/report.ts` | Create | TSV 분석 + 리포트 |
| `scripts/research/promote.ts` | Create | baseline 승격 |
| `package.json` | Modify | research:* scripts 추가 |
| `.gitignore` | Modify | cache + results 추가 |

### 4.2 Implementation Steps (Green Phase)
1. program.md 작성 (autoresearch 원본 program.md 구조 참조)
2. `parseTsv(content)` → ExperimentRow[]
3. `computeReport(rows)` → { best, worst, mean, trend, top5 }
4. report.ts CLI: `npm run research:report`
5. `promoteBaseline(configPath, score)` → baseline-config.json
6. promote.ts CLI: `npm run research:promote`
7. package.json scripts 등록
8. .gitignore 갱신

## 5. Edge Cases
- EC-1: results.tsv 0행 → "no experiments yet" 메시지
- EC-2: promote 시 calibration.json 없음 → 경고 (score만 기록)
- EC-3: results.tsv 손상 → 파싱 가능한 행만 처리 + 경고
