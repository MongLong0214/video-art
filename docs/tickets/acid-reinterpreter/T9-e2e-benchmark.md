# T9: E2E Integration Test + Quality Benchmark

**Size**: M
**Depends**: T8
**Milestone**: M4, M5
**AC**: AC-1.1, AC-1.5, G1, G4

## Goal
Acperience 1 포함 실제 레퍼런스로 E2E 파이프라인 실행. 품질 벤치마크.

## Tasks

### E2E 스모크 테스트
- `npx tsx scripts/acid-reinterpreter.ts <acperience1.wav>` 실행
- 모든 중간 산출물 생성 확인
- master.wav 존재 + QC 통과
- 실행 시간 < 5분

### 품질 벤치마크 (M5)
3개 레퍼런스 트랙으로 실행:
1. Hardfloor - Acperience 1
2. (추가 선정 필요)
3. (추가 선정 필요)

각 트랙에 대해:
- BPM 정확도 확인
- Key 정확도 확인 (수동)
- 드럼 패턴 청취 평가 (kick/hat 위치 맞는지)
- 베이스라인 청취 평가 (피치/리듬 유사도)
- 전체 인상 (Isaac 청취 평가)

### 결과 기록
- `docs/tickets/acid-reinterpreter/BENCHMARK.md`에 결과 기록
- 각 트랙별: BPM(정확/오차), Key(정확/오차), QC(LUFS/peak/clip), 청취 메모

## TDD Spec
- `scripts/lib/acid/e2e.test.ts`
  - test: "E2E produces master.wav" — 실제 API 호출 (CI에서는 skip)
  - test: "master.wav passes QC" — qc.json parsed, passed=true
  - test: "execution time under 5 minutes" — timer 체크
  - test: "all intermediate artifacts exist" — stems/, analysis.json, interpretation.json, render/, qc.json
