# T2: 퍼커션 SynthDefs (kick, bass, hat, clap)

**PRD Ref**: PRD-music-gen-system > US-1
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
테크노/트랜스 퍼커션 4종 SynthDef 작성. NRT 호환, headless 로드, 개별 테스트.

## 2. Acceptance Criteria
- [ ] AC-1: kick SynthDef — freq/amp/dur/pan + drive/click/decay 파라미터. 사인파 + pitch env + 선택적 distortion
- [ ] AC-2: bass SynthDef — freq/amp/dur/pan + cutoff/resonance/envAmount. 톱니파 + LP 필터 + amp env
- [ ] AC-3: hat SynthDef — freq/amp/dur/pan + openness/tone. 노이즈 + BP 필터 + 짧은 decay
- [ ] AC-4: clap SynthDef — freq/amp/dur/pan + spread/decay. 노이즈 버스트 + 짧은 reverb
- [ ] AC-5: `sclang -i none` 로드 시 4종 모두 에러 0
- [ ] AC-6: 각 SynthDef NRT 단독 렌더 → WAV RMS > -60dBFS

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `kick loads` | Integration | sclang 로드 에러 0 | exit 0 |
| 2 | `bass loads` | Integration | sclang 로드 에러 0 | exit 0 |
| 3 | `hat loads` | Integration | sclang 로드 에러 0 | exit 0 |
| 4 | `clap loads` | Integration | sclang 로드 에러 0 | exit 0 |
| 5 | `kick NRT render` | Integration | NRT → WAV 존재 + RMS > -60dBFS | WAV 파일 + 무음 아님 |
| 6 | `bass NRT render` | Integration | NRT → WAV 존재 + RMS > -60dBFS | WAV 파일 + 무음 아님 |

### 3.2 Test File Location
- `audio/sc/test-synthdefs.scd` (T1에서 생성한 스켈레톤 확장)

### 3.3 Mock/Setup Required
- SuperCollider 설치 필수
- T1의 startup.scd 로드 체인

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/synthdefs/kick.scd` | Create | Kick SynthDef |
| `audio/sc/synthdefs/bass.scd` | Create | Bass SynthDef |
| `audio/sc/synthdefs/hat.scd` | Create | Hi-hat SynthDef |
| `audio/sc/synthdefs/clap.scd` | Create | Clap SynthDef |
| `audio/sc/startup.scd` | Modify | SynthDef 로드 경로 추가 |
| `audio/sc/test-synthdefs.scd` | Modify | 4종 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)
1. kick.scd — SinOsc pitch envelope + optional overdrive + amp env
2. bass.scd — Saw + RLPF + amp env + cutoff envelope
3. hat.scd — WhiteNoise + BPF + short decay env
4. clap.scd — WhiteNoise burst + short FreeVerb + amp env
5. startup.scd에 4종 로드 추가
6. test-synthdefs.scd에 로드 + NRT 렌더 테스트

### 4.3 Refactor Phase
- SynthDef 공통 파라미터 (amp, dur, pan, out) 패턴 정리

## 5. Edge Cases
- EC-1: freq 범위 초과 (< 20Hz, > 20kHz) → clip
- EC-2: drive=0 → bypass (kick), cutoff < 20 → 무음 (bass)

## 6. Review Checklist
- [ ] Red: test-synthdefs.scd → FAILED
- [ ] Green: → PASSED
- [ ] Refactor: PASSED 유지
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
