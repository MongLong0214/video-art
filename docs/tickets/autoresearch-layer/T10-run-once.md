# T10: Run-Once Engine

**PRD Ref**: PRD-autoresearch-layer > US-3, §4.1.2
**Priority**: P0 (Blocker)
**Size**: L
**Status**: Todo
**Depends On**: T6, T7, T9

---

## 1. Objective

단일 실험 실행기 구현: research-config.ts 로드 → 파이프라인 실행 → 영상 생성 → evaluate → Hard Gate + δ_min 비교 → keep/discard → results.tsv 기록.

## 2. Acceptance Criteria

- [ ] AC-1: `tsx scripts/research/run-once.ts` 로 단일 실험 실행
- [ ] AC-2: research-config.ts 읽기 + Zod 검증
- [ ] AC-3: pipeline-layers.ts 실행 (config 주입) + export:layered 실행
- [ ] AC-4: evaluate.ts 호출 → EvalResult
- [ ] AC-5: calibration.json에서 δ_min + baseline_score 로드
- [ ] AC-6: KEEP = gate_pass && score > baseline + δ_min → git commit config
- [ ] AC-7: DISCARD = !gate_pass || score <= baseline + δ_min → git checkout restore config
- [ ] AC-8: results.tsv에 모든 컬럼 기록 (TSV append)
- [ ] AC-9: model_version 기록. baseline과 불일치 시 **즉시 abort** + "run calibrate to reset baseline" 안내 (warning이 아닌 hard fail)
- [ ] AC-10: stdout에 `[exp #{N}] quality: {score:.4f} ({status}) | Δ{delta:+.4f} | {elapsed}ms` 출력

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `loadBaseline` | Unit | calibration.json → { baseline_score, δ_min } | 올바른 파싱 |
| 2 | `keepDecision improved` | Unit | score=0.8 baseline=0.7 δ_min=0.01 | KEEP |
| 3 | `discardDecision noise` | Unit | score=0.71 baseline=0.7 δ_min=0.02 | DISCARD |
| 4 | `discardDecision gate fail` | Unit | gate_pass=false score=0.9 | DISCARD |
| 5 | `appendTsv format` | Unit | EvalResult → TSV line | tab-separated, all columns |
| 6 | `appendTsv creates header` | Unit | empty file → first append | header + data |
| 7 | `experimentCounter` | Unit | existing 5 rows → next exp | #6 |
| 8 | `gitCommitConfig` | Unit | mock execSync → git commit | commit message format |
| 9 | `gitRestoreConfig` | Unit | mock execSync → git checkout | correct file path |
| 10 | `runOnce integration` | Integration | mock pipeline + mock eval → full cycle | results.tsv row added |

### 3.2 Test File Location
- `scripts/research/run-once.test.ts`

### 3.3 Mock/Setup Required
- vi.mock() for child_process (execSync — pipeline/git)
- vi.mock() for evaluate module
- vi.mock() for fs (results.tsv)
- mock calibration.json

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/run-once.ts` | Create | 단일 실험 엔진 |
| `scripts/research/run-once.test.ts` | Create | 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. `loadCalibration()` → { baseline_score, δ_min, model_version }
2. `loadAndValidateConfig()` → ResearchConfig (Zod parse)
3. `runPipeline(config)` → { videoPath, manifestPath } (child_process spawn)
4. `evaluateResult(videoPath, manifestPath)` → EvalResult
5. `makeDecision(evalResult, baseline, δ_min)` → "keep" | "discard"
6. `gitCommit(message)` / `gitRestore(filePath)` — execSync wrapper
7. `appendTsv(filePath, evalResult, status, description)` — TSV line append
8. `formatOutput(expNum, evalResult, status, elapsed)` — console output
9. main() 통합: load → validate → run → evaluate → decide → git → log

## 5. Edge Cases
- EC-1: calibration.json 없음 → "run calibrate first" 에러
- EC-2: 파이프라인 crash → status="crash", git restore, 다음 실험 가능
- EC-3: results.tsv 없음 → 헤더 생성 후 append
- EC-4: model_version 불일치 → 경고 + results.tsv에 기록
