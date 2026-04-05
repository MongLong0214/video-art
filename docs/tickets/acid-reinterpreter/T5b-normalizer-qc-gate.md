# T5b: Deterministic Normalizer + Analysis QC Gate

**Size**: M
**Depends**: T4 (schemas), T5 (interpret)
**Milestone**: M2
**AC**: AC-4.7, AC-4.8

## Goal
LLM 출력을 음악적으로 유효하게 교정하는 normalizer + LLM 진입 전 분석 품질 검증 gate.

## Implementation

### `scripts/lib/acid/normalizer.ts`

LLM이 생성한 raw_interpretation.json → 교정된 interpretation.json:

1. **BPM grid quantize**: 모든 event.time을 nearest 32nd note에 스냅
   - `quantized = Math.round(time / gridSize) * gridSize`
   - gridSize = 60 / bpm / 8 (32nd note)
2. **Scale clamp**: note_midi를 감지된 key의 스케일 노트로 clamp
   - Gm이면 [G, A, Bb, C, D, Eb, F] → ±1 semitone 내 가장 가까운 스케일 노트
3. **Range clamp**: cutoff [100, 5000], resonance [0, 1], velocity [0, 1], envMod [0, 1], decay [0.01, 2.0]
4. **Density validation**: drop 구간에서 events/bar < 4이면 warning
5. **909 pattern length**: kick/hat/snare pattern 길이가 duration에 맞는지 검증. 부족하면 반복 패딩

### Analysis QC gate (analyze.py 내 또는 별도 모듈)

Step 3 진입 전 analysis.json 검증:
- drums stem RMS > -50dBFS
- bass stem RMS > -50dBFS
- BPM confidence > 0.7
- bass voiced frame coverage > 20% (CREPE confidence 0.8+ 프레임 비율)
- drum onset count > 1 per bar (BPM 기준)

결과: `analysis_qc` 필드를 analysis.json에 추가:
```json
{ "passed": true, "degraded": false, "warnings": [] }
```
- 전부 통과 → Step 3 정상 진행
- 일부 미달 → degraded mode (warning + 해당 데이터 빈 값)
- drums 전체 실패 (RMS < -50 AND onset 0) → abort

## TDD Spec
- `scripts/lib/acid/normalizer.test.ts`
  - test: "quantizes event times to 32nd grid" — 126 BPM, time=0.123 → nearest grid
  - test: "clamps notes to Gm scale" — midi=44 (Ab) → 43 (G) or 46 (Bb)
  - test: "clamps cutoff to valid range" — cutoff=99999 → 5000, cutoff=-1 → 100
  - test: "clamps velocity to [0,1]" — velocity=1.5 → 1.0
  - test: "warns on low density in drop section" — 2 events/bar in drop → warning
  - test: "pads short 909 patterns" — 8-step pattern for 20s → repeated to fill
  - test: "passes through valid interpretation unchanged" — 유효 데이터 → 동일 출력

- `scripts/lib/acid/analysis-qc.test.ts`
  - test: "passes when all criteria met" — 정상 analysis → passed=true
  - test: "degrades on low bass coverage" — bass 10% → degraded + warning
  - test: "degrades on low BPM confidence" — confidence 0.5 → degraded + warning
  - test: "aborts on silent drums stem" — RMS < -50 AND 0 onsets → abort
  - test: "passes with marginal values" — 경계값 (exactly 0.7, exactly 20%) → pass
