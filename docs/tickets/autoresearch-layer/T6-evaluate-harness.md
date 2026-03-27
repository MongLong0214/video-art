# T6: Evaluate Harness (Hard Gate + Secondary Ranking)

**PRD Ref**: PRD-autoresearch-layer > US-1, §4.5.7
**Priority**: P0 (Blocker)
**Size**: M
**Status**: Todo
**Depends On**: T2, T3, T4, T5

---

## 1. Objective

10개 메트릭을 통합하는 평가 harness 구현. Hard Gate + Secondary Ranking + clamp01 전 메트릭 적용. CLI로 단독 실행 가능.

## 2. Acceptance Criteria

- [ ] AC-1: `evaluate(refVideoPath, genVideoPath, manifestPath)` → EvalResult (10 metrics + gate + score)
- [ ] AC-2: Hard Gate: all metrics >= 0.15 → gate_pass=true
- [ ] AC-3: Secondary Ranking: 4-tier 가중합 (0.35/0.25/0.20/0.20)
- [ ] AC-4: gate 미통과 → quality_score=0, gate_pass=false
- [ ] AC-5: `npm run research:eval -- <video>` CLI 단독 실행
- [ ] AC-6: JSON 출력 (메트릭별 값 + gate + score + elapsed)
- [ ] AC-7: 모든 메트릭 호출 중 하나라도 에러 → 해당 메트릭=0 + warning (나머지 계속)
- [ ] AC-8: evaluate 내부에서 T1의 `normalizeFramePair()`를 호출하여 모든 프레임 쌍을 정규화한 후 메트릭 계산 (end-to-end contract)
- [ ] AC-9: VMAF 비교 시에도 ffmpeg scale filter로 해상도 정규화 적용 (T4와의 contract)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `hardGate all pass` | Unit | all metrics 0.5 | gate_pass=true |
| 2 | `hardGate one fail` | Unit | M3=0.10, rest 0.5 | gate_pass=false |
| 3 | `hardGate threshold boundary` | Unit | all exactly 0.15 | gate_pass=true |
| 4 | `compositeScore weights` | Unit | known metric values | exact weighted sum |
| 5 | `compositeScore when gate fail` | Unit | gate_pass=false | quality_score=0 |
| 6 | `evalResult shape` | Unit | mock metrics → EvalResult | all 10 fields + gate + score |
| 7 | `metric error fallback` | Unit | one metric throws → 0 + warning | rest still computed |
| 8 | `clamp01 applied` | Unit | metric returns -0.5 | result = 0.0 |
| 9 | `clamp01 applied upper` | Unit | metric returns 1.5 | result = 1.0 |
| 10 | `normalizeFramePair called` | Integration | diff resolution frames → evaluate | normalizeFramePair invoked before metrics |
| 11 | `vmaf scale filter` | Integration | diff resolution videos → VMAF | ffmpeg scale filter applied |
| 12 | `cli json output` | Unit | mock metrics → CLI | valid JSON with all fields |

### 3.2 Test File Location
- `scripts/research/evaluate.test.ts`

### 3.3 Mock/Setup Required
- vi.mock() for individual metric modules (각 metric 함수 mock)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/research/evaluate.ts` | Create | 통합 평가 harness |
| `scripts/research/evaluate.test.ts` | Create | 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. `clamp01(x)` 유틸
2. `EvalResult` 인터페이스 정의
3. 10개 metric 호출 + try/catch per metric + clamp01
4. `hardGate(metrics, threshold=0.15)` → boolean
5. `compositeScore(metrics, weights)` → number
6. `evaluate()` 통합 함수: frames 추출 → metrics → gate → score
7. CLI entry point: `npm run research:eval -- <video>`

## 5. Edge Cases
- EC-1: ref keyframes 캐시 없음 → "run prepare first" 에러
- EC-2: 생성 영상 0바이트 → crash 처리
- EC-3: 전체 메트릭 에러 → quality_score=0, gate_pass=false
