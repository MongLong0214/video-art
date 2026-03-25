# T5: SC Pdef 테크노 패턴 엔진

**PRD Ref**: PRD-music-gen-system > US-2
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T2

---

## 1. Objective
SC Pdef 기반 테크노 패턴 3종 + 유클리드 리듬 + 확률 트리거 + 마이크로 변형. NRT 렌더 가능.

## 2. Acceptance Criteria
- [ ] AC-1: 유클리드 리듬 패턴 3종 — kick(Bjorklund(4,16)), hat(Bjorklund(7,16)), clap(Bjorklund(3,8))
- [ ] AC-2: 각 패턴에 Pwrand/Prand 확률 요소 최소 1개 포함
- [ ] AC-3: 2/4/8마디마다 hat density, clap 위치, filter cutoff 중 1개+ Pseg/Penv 변화
- [ ] AC-4: NRT 스코어 내 filter cutoff Pseg 오토메이션 동작
- [ ] AC-5: 8~32마디 길이 패턴 NRT 렌더 → WAV RMS > -60dBFS

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `bjorklund algorithm` | Unit (SC) | Bjorklund(4,16) | [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0] |
| 2 | `kick pattern loads` | Integration | sclang 로드 에러 0 | exit 0 |
| 3 | `hat pattern loads` | Integration | sclang 로드 에러 0 | exit 0 |
| 4 | `techno 16bar NRT` | Integration | 16마디 NRT 렌더 | WAV + RMS > -60dBFS |
| 5 | `filter automation` | Integration | cutoff Pseg 적용 NRT | WAV (spectral change) |

### 3.2 Test File Location
- `audio/sc/test-patterns.scd` (신규)

### 3.3 Mock/Setup Required
- T1 환경 + T2 퍼커션 SynthDefs

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/lib/bjorklund.scd` | Create | Bjorklund 알고리즘 SC 구현 |
| `audio/sc/patterns/techno-kick.scd` | Create | Kick Pdef |
| `audio/sc/patterns/techno-hat.scd` | Create | Hat Pdef + density variation |
| `audio/sc/patterns/techno-clap.scd` | Create | Clap Pdef + probability |
| `audio/sc/patterns/techno-master.scd` | Create | 전체 패턴 조합 + filter automation |
| `audio/sc/test-patterns.scd` | Create | 패턴 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. bjorklund.scd — SC에서 Bjorklund 알고리즘 구현 (배열 반환)
2. techno-kick.scd — Pdef(\kick, Pbind(\instrument, \kick, \dur, Pseq(bjorklund pattern)))
3. techno-hat.scd — Pdef(\hat, ...) + Pwrand density variation
4. techno-clap.scd — Pdef(\clap, ...) + Prand position shift
5. techno-master.scd — Ppar로 3종 결합 + filter Pseg macro
6. test-patterns.scd — 로드 + NRT 렌더 + 출력 검증

### 4.3 Refactor Phase
- 패턴 파라미터 외부화 (energy, density 등)

## 5. Edge Cases
- EC-1: Bjorklund(0, 16) → 빈 패턴 (무음) → 경고
- EC-2: probability 0 → 모든 트리거 무시 → 무음 → 경고

## 6. Review Checklist
- [ ] Red → FAILED
- [ ] Green → PASSED
- [ ] Refactor → PASSED 유지
- [ ] AC 전부 충족
