# T7: granular_pad SynthDef + Buffer 로드

**PRD Ref**: PRD-track-analyzer-phase2 > US-4
**Priority**: P2
**Size**: M
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
GrainBuf 기반 granular pad. mono→Pan2. Buffer는 demucs stem 또는 사전 로드. BufferAllocator granular range 연동.

## 2. Acceptance Criteria
- [ ] AC-1: granular_pad.scd — GrainBuf mono + Pan2 (AC-4.1)
- [ ] AC-2: 10개 파라미터 (AC-4.2)
- [ ] AC-3: density→Impulse.kr, posRand→TRand (AC-4.3)
- [ ] AC-4: rate scatter LFNoise1 (AC-4.4)
- [ ] AC-5: ADSR envelope (AC-4.5)
- [ ] AC-6: LeakDC.ar (AC-4.6)
- [ ] AC-7: NRT 호환, Buffer Score 내 할당 (AC-4.7)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `granular_pad params registered` | Unit | SYNTHDEF_PARAMS | 6 params |
| 2 | `granular_pad.scd compiles` | Integration | sclang | exit 0 |
| 3 | `granular_pad NRT with buffer` | Integration | Buffer load + render | WAV > 0 bytes |
| 4 | `granular_pad output is stereo (Pan2)` | Integration | channel check | 2 channels |

### 3.2 Test File Location
- scripts/lib/track-analyzer.test.ts

### 3.3 Mock/Setup Required
- sclang + test WAV fixture

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| audio/sc/synthdefs/granular_pad.scd | Create | GrainBuf mono+Pan2 |
| scripts/lib/track-analyzer.ts | Modify | mapGranular |

### 4.2 Implementation Steps (Green Phase)
1. granular_pad.scd (GrainBuf 1ch + Pan2)
2. mapGranular 매핑
3. NRT 테스트 (fixture WAV 필요)

### 4.3 Refactor Phase
- 코드 정리, 타입 강화 (Green 이후)

## 5. Edge Cases
- E4 (buffer 미로드 → pad 폴백)

## 6. Review Checklist
- [ ] Red: 테스트 실행 → FAILED 확인됨
- [ ] Green: 테스트 실행 → PASSED 확인됨
- [ ] Refactor: 테스트 실행 → PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
