# T6: SC 트랜스 시퀀서

**PRD Ref**: PRD-music-gen-system > US-3
**Priority**: P1 (High)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T2, T3

---

## 1. Objective
SC Pbind/Routine 기반 트랜스 시퀀서 — 코드 진행 엔진 + 아르페지오 생성기 + 6레이어 매니저 + 매크로 오토메이션.

## 2. Acceptance Criteria
- [ ] AC-1: 코드 진행 엔진 — 지정 스케일(Am) 내 음만 사용하는 4~8코드 생성. 테스트: 모든 MIDI 노트 ∈ scale
- [ ] AC-2: 아르페지오 생성기 — direction(up/down/random), octave(1~3), gate 패턴
- [ ] AC-3: 레이어 매니저 — sub_bass / rolling_bass / arp / pad / lead / riser 6레이어 독립 Bus 라우팅, on/off
- [ ] AC-4: 매크로 오토메이션 — filter open, reverb size, stereo width를 Env/Pseg로 32마디 자동화
- [ ] AC-5: 32마디 트랜스 시퀀스 NRT 렌더 → WAV RMS > -60dBFS

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `chord gen Am scale` | Unit (SC) | Am 스케일 코드 4개 생성 | 모든 노트 ∈ [A,B,C,D,E,F,G] |
| 2 | `arp direction up` | Unit (SC) | up 방향 아르페지오 | ascending 순서 |
| 3 | `arp direction down` | Unit (SC) | down 방향 | descending 순서 |
| 4 | `layer bus routing` | Integration | 6 Bus 독립 출력 | 각 Bus에 시그널 존재 |
| 5 | `macro automation` | Integration | 32마디 filter Pseg | NRT 렌더 성공 |
| 6 | `trance 32bar NRT` | Integration | 전체 시퀀서 NRT | WAV + RMS > -60dBFS |

### 3.2 Test File Location
- `audio/sc/test-trance.scd` (신규)

### 3.3 Mock/Setup Required
- T1 환경 + T2 퍼커션 + T3 멜로딕 SynthDefs

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/lib/scales.scd` | Create | 스케일 정의 + 코드 생성 함수 |
| `audio/sc/lib/chords.scd` | Create | 코드 진행 엔진 |
| `audio/sc/lib/arp.scd` | Create | 아르페지오 생성기 |
| `audio/sc/patterns/trance-layers.scd` | Create | 6레이어 Pbind 조합 |
| `audio/sc/patterns/trance-macro.scd` | Create | 매크로 오토메이션 |
| `audio/sc/patterns/trance-master.scd` | Create | 전체 트랜스 시퀀서 |
| `audio/sc/test-trance.scd` | Create | 트랜스 시퀀서 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. scales.scd — Scale 정의 (major, minor, dorian 등) + 코드톤 추출
2. chords.scd — 스케일 내 diatonic chord 생성 (root→7th) + Pseq 진행
3. arp.scd — 코드 노트를 direction별로 시퀀싱 + octave span
4. trance-layers.scd — 6 Bus 라우팅 + 각 레이어 Pbind
5. trance-macro.scd — Pseg/Env 기반 filter/reverb/width automation
6. trance-master.scd — Ppar 결합 + 구조 (인트로→빌드→메인)
7. 테스트 작성 + NRT 검증

### 4.3 Refactor Phase
- scales/chords를 재사용 가능한 SC 클래스로

## 5. Edge Cases
- EC-1: 스케일 외 음 생성 시 → assert 실패 (스케일 필터 강제)
- EC-2: 레이어 전부 off → 무음 → 경고
- EC-3: octave span > 3 → clip to 3

## 6. Review Checklist
- [ ] Red → FAILED
- [ ] Green → PASSED
- [ ] Refactor → PASSED 유지
- [ ] AC 전부 충족
