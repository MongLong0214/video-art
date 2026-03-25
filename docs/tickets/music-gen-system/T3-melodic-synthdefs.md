# T3: 멜로딕 SynthDefs (supersaw, pad, lead, arp_pluck, riser)

**PRD Ref**: PRD-music-gen-system > US-1
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
테크노/트랜스 멜로딕 5종 SynthDef 작성. NRT 호환, headless 로드, 개별 테스트.

## 2. Acceptance Criteria
- [ ] AC-1: supersaw — freq/amp/dur/pan + detune/mix/cutoff. 7-voice detuned saw + LP filter
- [ ] AC-2: pad — freq/amp/dur/pan + attack/release/filterEnv. 느린 attack + LP sweep
- [ ] AC-3: lead — freq/amp/dur/pan + vibrato/portamento/drive. 단일 saw/square + 모듈레이션
- [ ] AC-4: arp_pluck — freq/amp/dur/pan + decay/brightness. 짧은 pluck envelope
- [ ] AC-5: riser — freq/amp/dur/pan + sweepRange/noiseAmount. 상승 pitch + 노이즈 혼합
- [ ] AC-6: `sclang -i none` 로드 시 5종 모두 에러 0
- [ ] AC-7: 각 SynthDef NRT 단독 렌더 → WAV RMS > -60dBFS

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `supersaw loads` | Integration | sclang 로드 에러 0 | exit 0 |
| 2 | `pad loads` | Integration | sclang 로드 에러 0 | exit 0 |
| 3 | `lead loads` | Integration | sclang 로드 에러 0 | exit 0 |
| 4 | `arp_pluck loads` | Integration | sclang 로드 에러 0 | exit 0 |
| 5 | `riser loads` | Integration | sclang 로드 에러 0 | exit 0 |
| 6 | `supersaw NRT render` | Integration | NRT → WAV + RMS > -60dBFS | WAV + 무음 아님 |
| 7 | `riser NRT render` | Integration | NRT → WAV + RMS > -60dBFS | WAV + 무음 아님 |

### 3.2 Test File Location
- `audio/sc/test-synthdefs.scd` (T2와 공유, 확장)

### 3.3 Mock/Setup Required
- SuperCollider 설치, T1 구조

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/synthdefs/supersaw.scd` | Create | 7-voice detuned supersaw |
| `audio/sc/synthdefs/pad.scd` | Create | Ambient pad |
| `audio/sc/synthdefs/lead.scd` | Create | Mono lead |
| `audio/sc/synthdefs/arp_pluck.scd` | Create | Short pluck |
| `audio/sc/synthdefs/riser.scd` | Create | Rising sweep |
| `audio/sc/startup.scd` | Modify | 5종 로드 추가 |
| `audio/sc/test-synthdefs.scd` | Modify | 5종 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)
1. supersaw.scd — 7x Saw detuned + Mix + RLPF + amp env
2. pad.scd — Saw/Pulse mix + slow attack + LP sweep
3. lead.scd — Saw + vibrato (SinOsc modulation) + drive
4. arp_pluck.scd — Saw + fast decay env + brightness filter
5. riser.scd — XLine pitch sweep + WhiteNoise blend + amp ramp
6. startup.scd + test 확장

### 4.3 Refactor Phase
- N/A

## 5. Edge Cases
- EC-1: supersaw detune=0 → 단일 saw로 퇴화 (정상)
- EC-2: riser dur < 0.5s → 스윕이 너무 짧아 무의미할 수 있음 → 경고 로그

## 6. Review Checklist
- [ ] Red → FAILED
- [ ] Green → PASSED
- [ ] Refactor → PASSED 유지
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
