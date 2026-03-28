# T1: presetSchema + synth-stem-map + BufferAllocator

**PRD Ref**: PRD-track-analyzer-phase2 > US-10
**Priority**: P1
**Size**: L
**Status**: Todo
**Depends On**: None

---

## 1. Objective
Phase 2 신규 7종 SynthDef의 기반 인프라 구축: SYNTHDEF_PARAMS 16종 확장, presetSchema optional 필드, SYNTH_STEM_MAP 16종, normalizeParams 화이트리스트, BufferAllocator 클래스 (range partition 8-39/100-299/300-319).

## 2. Acceptance Criteria
- [ ] AC-1: SYNTHDEF_PARAMS에 7종 추가 (AC-10.1). 기존 9종 불변
- [ ] AC-2: presetSchema.synthParams에 7종 `.optional()` 추가 (AC-10.2). 기존 프리셋 JSON 로드 성공
- [ ] AC-3: SYNTH_STEM_MAP 16종 (AC-10.7-1). sample_player→동적 bus
- [ ] AC-4: SUPPORTED_SYNTHDEFS.size === 16 (AC-10.7-2)
- [ ] AC-5: normalizeParams 화이트리스트에 35개 신규 파라미터 추가 (AC-10.7-3)
- [ ] AC-6: mapSamplePlayerBus(hitType) 함수 (AC-10.7-4)
- [ ] AC-7: BufferAllocator — wavetable:8-39, samples:100-299, granular:300-319
- [ ] AC-8: allocateConsecutive(wavetable, 8) 성공. allocate(samples, label) 성공
- [ ] AC-9: 기존 E2E 테스트 assertion 업데이트 (`.toBe(9)` → `.toBe(16)`)
- [ ] AC-10: 기존 2781 테스트 regression 0

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `SYNTHDEF_PARAMS has 16 entries` | Unit | Object.keys count | 16 |
| 2 | `presetSchema accepts existing preset` | Unit | loadPreset('psytrance') | success, no error |
| 3 | `presetSchema accepts preset with acid_bass` | Unit | parse with acid_bass field | success |
| 4 | `presetSchema rejects unknown synthDef` | Unit | parse with unknown_synth | fail |
| 5 | `SYNTH_STEM_MAP has 16 entries` | Unit | Object.keys count | 16 |
| 6 | `SUPPORTED_SYNTHDEFS.size is 16` | Unit | Set size | 16 |
| 7 | `mapSamplePlayerBus kick→0, bass→2, fx→6` | Unit | Function call | correct bus |
| 8 | `normalizeParams passes new params` | Unit | acid_bass params | no warnings |
| 9 | `BufferAllocator wavetable range 8-39` | Unit | allocateConsecutive(wavetable, 8) | 8 |
| 10 | `BufferAllocator samples range 100-299` | Unit | allocate(samples, 'kick') | 100 |
| 11 | `BufferAllocator exhaustion throws` | Unit | Fill range then allocate | Error |
| 12 | `existing presets backward compatible` | Integration | Load all 5 genre presets | all pass |

### 3.2 Test File Location
- scripts/lib/genre-preset.test.ts, scripts/lib/synth-stem-map.test.ts, scripts/lib/buffer-allocator.test.ts (신규)

### 3.3 Mock/Setup Required
- 없음 (순수 로직)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/lib/genre-preset.ts | Modify | SYNTHDEF_PARAMS 7종 추가, presetSchema 확장 |
| scripts/lib/synth-stem-map.ts | Modify | SYNTH_STEM_MAP 7종, normalizeParams, mapSamplePlayerBus |
| scripts/lib/buffer-allocator.ts | Create | BufferAllocator 클래스 + BUFFER_RANGES |
| scripts/lib/buffer-allocator.test.ts | Create | BufferAllocator 단위 테스트 |
| scripts/lib/comprehensive-e2e.test.ts | Modify | assertion 9→16 |

### 4.2 Implementation Steps (Green Phase)
1. buffer-allocator.ts 생성: BUFFER_RANGES + allocate + allocateConsecutive
2. genre-preset.ts: SYNTHDEF_PARAMS에 7종 추가, presetSchema synthParams optional 확장
3. synth-stem-map.ts: SYNTH_STEM_MAP 7종, SUPPORTED_SYNTHDEFS 16, normalizeParams 화이트리스트, mapSamplePlayerBus
4. E2E assertion 업데이트
5. 전체 테스트 실행 — 기존 regression 0 확인

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- E9 (기존 프리셋 하위 호환), E15 (buffer index 충돌 방지), E16 (bufBase 범위 가드)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
