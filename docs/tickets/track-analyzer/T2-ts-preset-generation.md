# T2: TS 프리셋/패턴/scene 생성 (track-analyzer.ts)

**PRD Ref**: PRD-track-analyzer v0.3 > US-3, US-4, US-5
**Priority**: P0 (Blocker)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
analysis.json(18종)을 읽어 프리셋 JSON + Tidal 패턴 초안 + scene-audio.json을 자동 생성.

## 2. Acceptance Criteria
- [ ] AC-1: analysis.json → preset.json (Zod presetSchema 통과)
- [ ] AC-2: 매핑 규칙: 룩업 테이블 + 전문가 규칙 (linear mapRange 금지)
- [ ] AC-3: fxDefaults 14개 전부 매핑:
  - compress, ratio, compAttack: dynamics.crest 룩업
  - compRelease: genre 기반 기본값 (techno=0.05, trance=0.1)
  - threshold: dynamics.rms_mean → dB 변환
  - saturate, drive(FX): spectral_contrast 룩업
  - loGain: freq_balance.low 룩업 (high→+3dB)
  - midGain: spectral_centroid 룩업
  - hiGain: spectral_centroid + rolloff 룩업
  - loFreq, hiFreq: spectral_centroid 기반 EQ crossover
  - sideGain, sideRelease: genre 기반 기본값
- [ ] AC-4: name 필드 = 파일명 sanitize 자동 생성
- [ ] AC-5: kick/hat onset → 16-step Tidal 패턴 문자열
- [ ] AC-6: 에너지 곡선 → 섹션 감지 → scene-audio.json (genre=부모장르 매핑). **preset 필드 = 생성된 프리셋 name 자동 설정** (PRD AC-5.4)
- [ ] AC-7: **레퍼런스 MFCC 계수 출력** (참조용). 거리 계산은 렌더 후 별도 검증
- [ ] AC-8: 출력: preset.json, patterns.tidal, scene-audio.json
- [ ] AC-9: **stemGroups 매핑** — presetSchema 필수 필드. 장르 기반 기본 그룹
- [ ] AC-10: **Danceability → energy 힌트** — score>2→scene energy=0.8+, score<1→energy=0.4-

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Expected |
|---|-----------|------|----------|
| 1 | `mapBpmToPreset correct range` | Unit | min/max/default |
| 2 | `mapFreqBalance to kick drive (lookup)` | Unit | low>85→drive≥0.8 |
| 3 | `mapFreqBalance to kick drive (medium)` | Unit | low 70-85→drive 0.5-0.7 |
| 4 | `mapFreqBalance to kick drive (low)` | Unit | low<70→drive≤0.4 |
| 5 | `mapBassType acid → high cutoff+res` | Unit | cutoff≥2000, res≥0.7 |
| 6 | `mapBassType sub → low cutoff` | Unit | cutoff≤500 |
| 7 | `mapDynamics high crest → low compress` | Unit | compress≤0.3 |
| 8 | `mapDynamics low crest → high compress` | Unit | compress≥0.7 |
| 9 | `mapSpectralContrast high → low saturate` | Unit | saturate≤0.3 |
| 10 | `generatePreset passes Zod` | Unit | presetSchema.parse OK |
| 11 | `generatePreset has name field` | Unit | sanitized filename |
| 12 | `generatePreset has 14 fxDefaults` | Unit | 14 keys |
| 13 | `generatePreset has stemGroups` | Unit | stemGroups object |
| 14 | `quantizeOnsets 16-step` | Unit | "x" and "~" pattern |
| 15 | `generateTidalPattern kick` | Unit | valid tidal pattern |
| 16 | `generateTidalPattern hat` | Unit | valid hat pattern |
| 17 | `detectSections from energy` | Unit | array with intro/drop/outro |
| 18 | `mapGenre psytrance → trance` | Unit | "trance" |
| 19 | `mapGenre melodic_techno → techno` | Unit | "techno" |
| 20 | `generateSceneAudio valid` | Unit | has genre, energy, bpm, preset |
| 21 | `no linear mapRange in source` | Unit | static check: NOT "mapRange" |
| 22 | `mapOnsetDensity to hat openness` | Unit | >8/s→≤0.05, <4/s→≥0.3 |
| 23 | `bass_profile.type maps correctly` | Unit | type → preset params |
| 24 | `mapDanceability to scene energy` | Unit | score>2→energy≥0.8, score<1→energy≤0.4 |
| 25 | `output includes patterns.tidal` | Unit | file path check |
| 26 | `output includes scene-audio.json` | Unit | file path check |
| 27 | `MFCC reference coefficients output` | Unit | analysis.mfcc.mean is number[] (13 elements) |

Test file: `scripts/lib/track-analyzer.test.ts`

## 4. Implementation Guide

### 4.1 Files
| File | Change Type |
|------|------------|
| `scripts/lib/track-analyzer.ts` | Create |
| `scripts/lib/track-analyzer.test.ts` | Modify (T1에서 Create됨, T2 TC 추가) |
