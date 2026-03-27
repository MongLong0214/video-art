# T1: Dirt-Samples NRT 재생

**PRD Ref**: PRD-audio-v2-prod-v02 > US-1
**Size**: M (4-6h)
**Status**: Todo
**Depends On**: None

## AC
- [ ] AC-1: synth-stem-map.ts에 DIRT_SAMPLE_STEMS 매핑 + isSampleEvent() 추가
- [ ] AC-2: osc-to-nrt.ts — 샘플 이벤트를 sampleEvent 타입으로 변환 (skip 대신 매핑)
- [ ] AC-3: render-stems-nrt.scd — \nrtPlayBuf SynthDef + Buffer.read + b_allocRead Score 삽입
- [ ] AC-4: 샘플 경로 4단계 fallback
- [ ] AC-5: n % fileCount 래핑
- [ ] AC-6: 기존 321 테스트 regression 0

## TDD (10 tests)

| # | Test | Expected |
|---|------|----------|
| 1 | `isSampleEvent bd` | true |
| 2 | `isSampleEvent kick` | false (SynthDef) |
| 3 | `mapDirtSample bd → drums` | stem "drums" |
| 4 | `mapDirtSample unknown → null` | null |
| 5 | `convertToNrt with sample events` | sampleEvents included |
| 6 | `sample event skip count reduced` | fewer skips than v0.1 |
| 7 | `render-stems-nrt.scd has nrtPlayBuf` | contains "nrtPlayBuf" |
| 8 | `render-stems-nrt.scd has Buffer.read` | contains "Buffer.read" |
| 9 | `render-stems-nrt.scd has b_allocRead` | contains "b_allocRead" |
| 10 | `DIRT_SAMPLE_STEMS has bd,sd,hh,cp` | 4+ entries |

Test file: `scripts/lib/osc-to-nrt.test.ts` (추가) + `scripts/lib/e2e-integration.test.ts` (추가)
