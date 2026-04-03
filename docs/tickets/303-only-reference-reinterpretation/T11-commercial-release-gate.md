# T11: commercial release gate + listening ops

**Size**: M | **Depends**: T9, T10 | **PRD**: US-5

## Goal
수치 지표와 청취 평가를 결합한 commercial-grade release gate를 만든다.

## Changes

### 1. listening protocol
- fixture selection
- blind naming
- rubric:
  - groove preserved
  - acid identity
  - repetition tolerance
  - release-adjacent quality

### 2. release checklist
- source purity pass
- technical QC pass
- benchmark score pass
- listening score pass

### 3. status/reporting
- `release-report.json` 또는 markdown report
- fail 이유 명시

## Acceptance Criteria
- [ ] AC-11.1: 3명 이상 청취 프로토콜 문서가 존재한다.
- [ ] AC-11.2: release checklist가 자동/수동 항목으로 분리된다.
- [ ] AC-11.3: pass/fail report artifact가 생성된다.
- [ ] AC-11.4: "usable / release-adjacent" 비율 >= 70%를 gate로 삼을 수 있다.

## Test
```bash
ls docs/tickets/303-only-reference-reinterpretation/
```

