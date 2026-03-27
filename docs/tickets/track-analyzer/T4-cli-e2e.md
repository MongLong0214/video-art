# T4: CLI + E2E 테스트

**PRD Ref**: PRD-track-analyzer v0.3 > US-1 (AC-1.1), 전체
**Priority**: P1 (High)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T1, T2, T3

---

## 1. Objective
`npm run analyze:track` CLI 엔트리 + 전체 파이프라인 E2E 테스트.

## 2. Acceptance Criteria
- [ ] AC-1: `npm run analyze:track <file.wav>` → Python 분석 → TS 생성 → 전체 출력
- [ ] AC-2: validateFilePath (.wav/.flac/.mp3/.aiff 확장자 추가)
- [ ] AC-3: execFile array-form (hasExecOrSpawn 검증 대상)
- [ ] AC-4: Python/essentia/madmom/demucs 미설치 시 명확한 에러 + 설치 가이드
- [ ] AC-5: `.analyze.lock` 동시 실행 방지 + **stale lock 처리: timestamp >10min → 자동 제거** (PID 불필요)
- [ ] AC-6: package.json에 `analyze:track` script 추가
- [ ] AC-7: 출력 구조:
```
out/analysis/{filename}/
├── analysis.json
├── stems/ (demucs)
├── preset.json
├── patterns.tidal
└── scene-audio.json
```
- [ ] AC-8: 기존 테스트 regression 0
- [ ] AC-9: 분석 시간 측정 + 로깅. >60s (demucs 제외) 또는 >4min (포함) 시 WARNING
- [ ] AC-10: 프리셋 `out/analysis/{filename}/preset.json` + `audio/presets/generated/` 복사

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Expected |
|---|-----------|------|----------|
| 1 | `analyze-track.ts exists` | Unit | file exists |
| 2 | `analyze-track.ts uses execFile` | Unit | contains "execFile" |
| 3 | `analyze-track.ts no exec or spawn` | Unit | static check pass |
| 4 | `analyze-track.ts has ENOENT handling` | Unit | contains "ENOENT" |
| 5 | `analyze-track.ts has analyze.lock` | Unit | contains "analyze.lock" |
| 6 | `package.json has analyze:track` | Unit | key exists |
| 7 | `ALLOWED_EXTENSIONS has flac/mp3/aiff` | Unit | 3 new extensions |
| 8 | `full pipeline E2E` | Integration | analysis.json + preset.json exist (skipIf) |
| 9 | `generated preset passes Zod` | Integration | presetSchema.parse OK (skipIf) |
| 10 | `regression existing tests` | Integration | vitest stdout ≥ baseline count |
| 11 | `stale lock auto-cleanup` | Unit | >10min timestamp → removed |
| 12 | `performance logging` | Unit | contains timing output |
| 13 | `preset copied to audio/presets/generated/` | Integration | file exists (skipIf) |
| 14 | `E2E outputs patterns.tidal` | Integration | file exists (skipIf) |
| 15 | `E2E outputs scene-audio.json` | Integration | file exists (skipIf) |
| 16 | `corrupt audio file handling` | Unit | throws meaningful error |
| 17 | `extreme BPM clamping` | Unit | BPM clamped to 60-200 |
| 18 | `audioSchema genre enum compatibility` | Unit | generated genre ∈ enum |
| 19 | `CI fixture test-sine.wav exists` | Unit | file existence → skip if not |
| 20 | `danceability field in analysis` | Integration | score 0-3 (skipIf) |

Test file: `scripts/lib/track-analyzer.test.ts` (추가)

## 4. Implementation Guide

### 4.1 Files
| File | Change Type |
|------|------------|
| `scripts/analyze-track.ts` | Create |
| `scripts/lib/validate-file-path.ts` | Modify (+3 extensions) |
| `package.json` | Modify (analyze:track) |
