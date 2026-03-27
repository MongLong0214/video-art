# T2: NRT Reverb/Delay SynthDef

**PRD Ref**: PRD-audio-v2-prod-v02 > US-2
**Size**: S (2-4h)
**Status**: Todo
**Depends On**: None

## AC
- [ ] AC-1: render-stems-nrt.scd — \nrtReverb + \nrtDelay SynthDef writeDefFile
- [ ] AC-2: stem-render.ts FX_CHAIN_ORDER에 "nrtReverb", "nrtDelay" 추가
- [ ] AC-3: synth-stem-map.ts FX_PARAMS에 room, size, dry, delaytime, delayfeedback 추가
- [ ] AC-4: reverb/delay 파라미터 없으면 해당 FX 노드 생략
- [ ] AC-5: 기존 321 테스트 regression 0

## TDD (8 tests)

| # | Test | Expected |
|---|------|----------|
| 1 | `FX_PARAMS includes room` | true |
| 2 | `FX_PARAMS includes delaytime` | true |
| 3 | `FX_CHAIN_ORDER has nrtReverb after eq` | correct order |
| 4 | `FX_CHAIN_ORDER has nrtDelay after reverb` | correct order |
| 5 | `generateNrtScoreEntries with room param` | nrtReverb node present |
| 6 | `generateNrtScoreEntries without room` | no nrtReverb node |
| 7 | `render-stems-nrt.scd has nrtReverb` | contains "nrtReverb" |
| 8 | `render-stems-nrt.scd has nrtDelay` | contains "nrtDelay" |

Test file: `scripts/lib/stem-render.test.ts` (추가) + `scripts/lib/e2e-integration.test.ts` (추가)
