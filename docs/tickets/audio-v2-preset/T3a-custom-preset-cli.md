# T3a: 커스텀 프리셋 save/list CLI

**PRD Ref**: PRD-audio-v2-preset > US-3
**Priority**: P1 (High)
**Size**: S (2-4h)
**Status**: Todo
**Depends On**: T1
**Level 2**: preset:save 신규 파일 쓰기 — Isaac 승인

---

## 1. Objective
유저 커스텀 프리셋 저장/목록 CLI를 구현한다.

## 2. Acceptance Criteria
- [ ] AC-1: `npm run preset:save <name>` → 현재 활성 프리셋 복사 → `audio/presets/user/{name}.json`. 이름 regex + **디렉토리 validateFilePath** 검증 (realpathSync는 존재하는 디렉토리에만 적용)
- [ ] AC-2: `npm run preset:list` → 기본 5종 + 유저 프리셋 목록
- [ ] AC-3: 유저 프리셋 Tidal에서 호출 가능 (T2 SC ~loadPreset user/ fallback)
- [ ] AC-4: 기존 파일 존재 시 경고 + `--force` 필요
- [ ] AC-5: package.json에 `preset:save`, `preset:list` scripts 추가
- [ ] AC-6: execFile-only 정적 검증

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Expected |
|---|-----------|------|----------|
| 1 | `savePreset creates file` | Unit | file exists in user/ |
| 2 | `savePreset validates name regex` | Unit | "../hack" → throws |
| 3 | `savePreset validates directory path` | Unit | validateFilePath(userDir) passes |
| 4 | `savePreset rejects existing without force` | Unit | throws "already exists" |
| 5 | `savePreset overwrites with force` | Unit | success |
| 6 | `listPresets shows genres + user` | Unit | 5 + N items |
| 7 | `package.json has preset scripts` | Unit | keys exist |
| 8 | `no exec or spawn` | Unit | static check pass |

### 3.2 Test File Location
- `scripts/lib/genre-preset.test.ts` (T1 파일에 추가)

### 3.3 Mock/Setup Required
- Vitest: tmpDir 패턴 (기존 컨벤션)

## 4. Implementation Guide

### 4.1 Files
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/genre-preset.ts` | Modify | savePreset, listPresets 추가 |
| `scripts/preset-save.ts` | Create | CLI 엔트리 |
| `scripts/preset-list.ts` | Create | CLI 엔트리 |
| `package.json` | Modify | preset:save, preset:list |

### 4.2 Key: validateFilePath for new files
preset:save는 새 파일을 쓰므로 realpathSync 불가. 대신:
1. `validatePresetName(name)` — regex 검증
2. `validateFilePath(userPresetsDir, projectRoot, [])` — 디렉토리 존재 + 범위 검증
3. `path.join(userPresetsDir, name + ".json")` — 경로 구성
4. 파일 쓰기 (realpathSync 미사용)

## 5. Review Checklist
- [ ] TDD Red → Green → Refactor
- [ ] Level 2: Isaac 승인 (신규 파일 쓰기 경로)
- [ ] 기존 테스트 regression 0
