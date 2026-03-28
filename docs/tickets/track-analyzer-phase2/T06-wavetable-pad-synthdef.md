# T6: wavetable_pad SynthDef + NRT Buffer 파이프라인

**PRD Ref**: PRD-track-analyzer-phase2 > US-3
**Priority**: P2
**Size**: M
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
VOsc 8-buffer morphing pad + NRT Score wavetable buffer 할당 (b_alloc + b_gen sine1). BufferAllocator 연동.

## 2. Acceptance Criteria
- [ ] AC-1: wavetable_pad.scd — VOsc morphing + RLPF (AC-3.1)
- [ ] AC-2: 11개 파라미터 + bufBase (AC-3.2, AC-10.1)
- [ ] AC-3: 8개 연속 buffer sine1Msg (AC-3.3)
- [ ] AC-4: morph→bufpos 매핑 (AC-3.4)
- [ ] AC-5: 2-voice detune (AC-3.5)
- [ ] AC-6: generateWavetableCommands(bufBase) (AC-3.6)
- [ ] AC-7: NRT 호환 (AC-3.7)
- [ ] AC-8: bufBase default=8 (SC reserved 0-7 회피)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `wavetable_pad params registered` | Unit | SYNTHDEF_PARAMS | 7 params incl bufBase |
| 2 | `generateWavetableCommands returns 16 msgs` | Unit | bufBase=8 | 8 b_alloc + 8 b_gen |
| 3 | `wavetable commands time=0` | Unit | all msgs | time === 0 |
| 4 | `wavetable_pad.scd compiles` | Integration | sclang | exit 0 |
| 5 | `wavetable NRT render with buffers` | Integration | full pipeline | WAV > 0 bytes |
| 6 | `morph boundary 0 and 1` | Unit | morph=0, morph=1 | bufBase, bufBase+7 |

### 3.2 Test File Location
- scripts/lib/wavetable-utils.test.ts (신규), scripts/lib/track-analyzer.test.ts

### 3.3 Mock/Setup Required
- sclang

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/sc/synthdefs/wavetable_pad.scd | Create | VOsc morphing pad |
| scripts/lib/wavetable-utils.ts | Create | generateWavetableCommands |
| scripts/lib/track-analyzer.ts | Modify | mapWavetable |

### 4.2 Implementation Steps (Green Phase)
1. wavetable-utils.ts: generateWavetableCommands
2. wavetable_pad.scd (bufBase=8 default)
3. mapWavetable 매핑
4. NRT 통합 테스트

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- E3 (버퍼 할당 실패 → pad 폴백), E11 (morph 경계값), E16 (bufBase 범위), E21 (attack+release > dur)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
