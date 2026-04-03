# T10: 303-domain evaluator + benchmark harness

**Size**: L | **Depends**: T7, T8 | **PRD**: US-5

## Goal
full-spectrum similarity 대신 303 reinterpretation에 맞는 evaluator와 benchmark harness를 만든다.

## Changes

### 1. evaluator 설계
- groove similarity
- contour preservation
- section shape alignment
- density / filter-motion alignment
- technical penalties

### 2. benchmark harness
- curated reference set
- labeled metadata
- repeatable scoring script

### 3. score report
- aggregate
- per-track breakdown
- regression diff

## Acceptance Criteria
- [ ] AC-10.1: evaluator가 303-domain metric을 출력한다.
- [ ] AC-10.2: benchmark harness가 CI 또는 로컬 one-command로 실행 가능하다.
- [ ] AC-10.3: per-track breakdown이 생성된다.
- [ ] AC-10.4: overall reinterpretation score >= 75를 gate로 둘 수 있다.

## Test
```bash
python3 audio/analyzer/calibrate.py --help
npx tsx scripts/research/calibrate.ts
```

