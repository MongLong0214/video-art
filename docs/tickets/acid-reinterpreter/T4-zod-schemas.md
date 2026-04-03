# T4: Zod Schemas — analysis + interpretation + QC

**Size**: S
**Depends**: T1 (스키마는 PRD에 확정됨 — T3과 병렬 가능)
**Milestone**: M2
**AC**: AC-3.7, AC-4.3, AC-7.5

## Goal
파이프라인 단계 간 JSON 계약을 Zod 스키마로 정의. TS/Python 양쪽에서 검증.

## Implementation: `scripts/lib/acid/schemas.ts`

### 스키마 3종

#### analysisSchema
- PRD §4.5 analysis.json 구조 그대로
- bpm, key, duration, selected_range, drums, bass, other, energy_curve, spectral_centroid_curve, structure, warnings

#### interpretationSchema
- PRD US-4 AC-4.3 구조 그대로
- bpm, key, duration, tracks (bass_303, riff_303, kick_909, hat_909, snare_909), fx, energy_curve

#### qcSchema
- LUFS, peak_dbfs, clipping_count, stereo_width, duration, passed, warnings

### 유틸
- `validateAnalysis(data: unknown): AnalysisResult`
- `validateInterpretation(data: unknown): InterpretationResult`
- `validateQC(data: unknown): QCResult`
- 각각 Zod parse + 타입 추론 export

## TDD Spec
- `scripts/lib/acid/schemas.test.ts`
  - test: "validates correct analysis.json" — 유효 데이터 → 통과
  - test: "rejects analysis with missing bpm" — bpm 없음 → ZodError
  - test: "validates correct interpretation.json" — 유효 데이터 → 통과
  - test: "rejects interpretation with invalid track events" — 빈 events → ZodError
  - test: "validates QC result" — passed=true/false 모두 정상 파싱
  - test: "type inference works" — AnalysisResult 타입이 올바른 shape
