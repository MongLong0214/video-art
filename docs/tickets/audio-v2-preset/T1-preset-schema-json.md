# T1: 프리셋 스키마 + JSON 5종 + 로드/검증 유틸

**PRD Ref**: PRD-audio-v2-preset > US-1, US-4 (partial)
**Priority**: P0 (Blocker)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
5종 장르 프리셋 JSON 파일을 생성하고, Zod 스키마 검증 + 로드/merge 유틸을 구현한다.

## 2. Acceptance Criteria
- [ ] AC-1: 5종 프리셋 JSON 파일 (`audio/presets/genres/*.json`). 실제 SynthDef 파라미터 기반 (PRD AC-1.1)
- [ ] AC-2: 프리셋 Zod 스키마. 필수 필드 누락 시 에러 (PRD AC-1.2)
- [ ] AC-3: 프리셋 로드 시 SynthDef 기본값과 merge (프리셋 우선) (PRD AC-1.3)
- [ ] AC-4: BPM 범위 5종 정확 (PRD AC-1.4)
- [ ] AC-5: scene-schema.ts에 `preset` 옵셔널 필드 추가. 기존 `genre` enum 무변경 (PRD G5)
- [ ] AC-6: `audio/presets/user/.gitkeep` 유저 프리셋 디렉토리 생성
- [ ] AC-7: 프리셋 이름 검증: `/^[a-zA-Z0-9_-]+$/`
- [ ] AC-8: 프리셋 파일 크기 > 64KB 거부 (PRD E12)
- [ ] AC-9: 253 기존 테스트 regression 0

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `loadPreset hard_techno valid` | Unit | hard_techno.json 로드 + Zod 검증 | parsed preset object |
| 2 | `loadPreset all 5 genres valid` | Unit | 5종 전부 Zod 통과 | all 5 pass |
| 3 | `loadPreset missing field rejects` | Unit | bpm 필드 누락 JSON | ZodError |
| 4 | `loadPreset invalid synthParam rejects` | Unit | 존재하지 않는 SynthDef 이름 | ZodError |
| 5 | `mergeWithDefaults preserves preset` | Unit | preset kick.drive=0.8 + default kick.drive=0.5 | result.drive === 0.8 |
| 6 | `mergeWithDefaults fills missing` | Unit | preset에 kick.freq 없음 | default freq 유지 |
| 7 | `validatePresetName accepts valid` | Unit | "hard_techno" | true |
| 8 | `validatePresetName rejects special chars` | Unit | "../hack" | false |
| 9 | `presetSchema BPM ranges correct` | Unit | 5종 BPM min < max, default in range | all pass |
| 10 | `listPresets returns genres + user` | Unit | genres/ 5개 + user/ 0개 | 5 items |
| 11 | `rejectOversizePreset` | Unit | > 64KB 파일 | throws "file too large" |
| 12 | `sceneSchema preset field optional` | Unit | scene-schema에 preset 필드 | parse success with/without |
| 13 | `sceneSchema genre enum unchanged` | Unit | scene-schema genre enum 5종 유지 | regression check |
| 14 | `hard_techno kick params match SynthDef` | Unit | kick JSON keys ⊆ {drive,click,decay,freq,amp,dur,pan} | no unknown keys |
| 15 | `all 5 presets synthParams keys valid` | Unit | 9 SynthDef별 허용 키 검증 (openness=hat only 등) | no cross-contamination |
| 16 | `user/.gitkeep directory exists` | Unit | audio/presets/user/ 디렉토리 존재 | true |
| 17 | `BPM hard_techno 140-155 default 145` | Unit | 구체적 BPM 값 검증 | exact match |
| 18 | `mergeWithDefaults empty preset` | Unit | 빈 객체 {} → 전체 default 반환 | all defaults present |

### 3.2 Test File Location
- `scripts/lib/genre-preset.test.ts` (신규)

### 3.3 Mock/Setup Required
- Vitest: 실제 JSON 파일 로드 (mock 불필요)
- 프리셋 JSON 5종 필요 (구현에서 생성)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/genre-preset.ts` | Create | Zod 스키마, loadPreset, mergeWithDefaults, validatePresetName, listPresets |
| `scripts/lib/genre-preset.test.ts` | Create | vitest 테스트 |
| `audio/presets/genres/hard_techno.json` | Create | PRD Section 4.1 |
| `audio/presets/genres/melodic_techno.json` | Create | PRD Section 4.1 |
| `audio/presets/genres/industrial.json` | Create | PRD Section 4.1 |
| `audio/presets/genres/psytrance.json` | Create | PRD Section 4.1 |
| `audio/presets/genres/progressive_trance.json` | Create | PRD Section 4.1 |
| `audio/presets/user/.gitkeep` | Create | 유저 프리셋 디렉토리 |
| `src/lib/scene-schema.ts` | Modify | preset 옵셔널 필드 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `scripts/lib/genre-preset.ts` — Zod 스키마 정의 (synthParams 9종 + fxDefaults 13개 + bpm + stemGroups)
2. loadPreset(name) — JSON 로드 + 크기 체크 + Zod parse
3. mergeWithDefaults(preset, defaults) — 프리셋 값 우선 merge
4. validatePresetName(name) — regex `/^[a-zA-Z0-9_-]+$/`
5. listPresets(presetsDir) — genres/ + user/ 스캔
6. 5종 JSON 파일 생성 (PRD Section 4.1 데이터)
7. scene-schema.ts에 preset 필드 추가

## 5. Edge Cases
- EC-1: 프리셋 JSON 손상 → Zod 에러 (PRD E2)
- EC-2: 이름 특수문자 → regex 거부 (PRD E3)
- EC-3: 파일 > 64KB → 거부 (PRD E12)

## 6. Review Checklist
- [ ] Red → Green → Refactor 확인
- [ ] 5종 JSON이 실제 SynthDef 파라미터와 일치
- [ ] scene-schema.ts 기존 genre enum 무변경
- [ ] 253 기존 테스트 regression 0
