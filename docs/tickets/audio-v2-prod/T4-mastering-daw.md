# T4: 마스터링 + DAW 출력

**PRD Ref**: PRD-audio-v2-prod > US-4
**Priority**: P1 (High)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T3

---

## 1. Objective
스템을 자동 믹스다운 + 마스터링하고, DAW 임포트 가능한 형태(스템 WAV + 메타데이터 + 가이드)로 출력한다. `npm run render:prod` 원커맨드 전체 파이프라인 제공.

## 2. Acceptance Criteria
- [ ] AC-1: `npm run render:prod <osclog>` → 원커맨드: OSC 변환 → 스템 렌더 → 마스터링 (PRD AC-4.1)
- [ ] AC-2: 마스터링: 스템 믹스다운 → `loudnorm=I=-14:TP=-2:LRA=7` → 48kHz 16-bit PCM master.wav (PRD AC-4.2)
- [ ] AC-3: session-info.json — BPM, key, duration, stem 목록, 이벤트 요약 (PRD AC-4.3)
- [ ] AC-4: IMPORT-GUIDE.md — 스템 파일 목록 + BPM + DAW 임포트 순서 (PRD AC-4.4)
- [ ] AC-5: 출력 구조 (PRD AC-4.5):
```
out/audio/{date}_{title}/
├── stems/*.wav
├── master.wav
├── session-info.json
├── IMPORT-GUIDE.md
└── raw/ (osclog + nrt-score.osc)
```
- [ ] AC-6: Phase A `render:audio` regression 0 (PRD AC-4.6)
- [ ] AC-7: LUFS 검증: master.wav -14 +-0.5 LUFS, TP <= -2 dBTP (ffprobe 확인)
- [ ] AC-8: package.json에 `render:prod` script 추가
- [ ] AC-9: execFile-only 정적 검증 (prod-convert.ts, render-stems.ts, render-prod.ts, stem-render.ts)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `generateSessionInfo valid` | Unit | stems + events → session-info.json 내용 | { bpm, key, duration, stems, summary } |
| 2 | `generateSessionInfo missing key` | Unit | key 미지정 → null 허용 | { key: null } |
| 3 | `generateImportGuide lists stems` | Unit | stem 목록 → IMPORT-GUIDE.md 내용 | markdown with stem list + BPM |
| 4 | `masteringCommand correct args` | Unit | ffmpeg loudnorm 명령 생성 | contains I=-14:TP=-2:LRA=7 |
| 5 | `masteringCommand output format` | Unit | 48kHz 16-bit PCM 지정 | -ar 48000 -sample_fmt s16 |
| 6 | `renderProdPipeline runs all steps` | Unit | 전체 파이프라인 순서 실행 | convert → stems → master 순차 |
| 7 | `renderProdPipeline stops on convert error` | Unit | 변환 실패 시 중단 | throws, no stems/master |
| 8 | `outputStructure correct dirs` | Unit | 출력 디렉토리 구조 생성 | stems/, raw/ 디렉토리 존재 |
| 9 | `copyRawFiles preserves osclog` | Unit | raw/에 osclog + score 복사 | files exist |
| 10 | `verifyLoudness pass` | Unit | LUFS -14.2, TP -2.5 | pass |
| 11 | `verifyLoudness fail LUFS` | Unit | LUFS -10 | fail + error |
| 12 | `verifyLoudness fail TP` | Unit | TP -0.5 | fail + error |
| 13 | `no exec or spawn in prod scripts` | Unit | prod-convert.ts, render-stems.ts, render-prod.ts에 exec/spawn 0 | per-file static check |
| 14 | `render:audio regression` | Integration | 기존 render:audio 파이프라인 정상 (mock 비활성) | master.wav 생성 |
| 15 | `package.json has render:prod script` | Unit | scripts["render:prod"] 존재 | key exists |
| 16 | `pipeline warns on LUFS out of range` | Unit | LUFS -10 → 경고 + 파이프라인 계속 | warning emitted, no crash |

### 3.2 Test File Location
- `scripts/lib/prod-pipeline.test.ts` (신규)

### 3.3 Mock/Setup Required
- Vitest: `vi.mock('node:child_process')` — ffmpeg 모킹
- Vitest: `vi.mock('node:fs')` — 파일 시스템 모킹

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/prod-pipeline.ts` | Create | 전체 파이프라인 오케스트레이터 + 마스터링 + 메타데이터 |
| `scripts/lib/prod-pipeline.test.ts` | Create | vitest 테스트 |
| `scripts/render-prod.ts` | Create | CLI 엔트리포인트 (원커맨드) |
| `package.json` | Modify | render:prod script 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `scripts/lib/prod-pipeline.ts`:
   - `renderProdPipeline(osclogPath, options)` — 전체 순서: validate → convert → stems → master → metadata
   - `masterStems(stemPaths, outputPath)` — ffmpeg 스템 믹스 → loudnorm → 16-bit PCM
   - `verifyLoudness(masterPath)` — ffprobe LUFS/TP 검증
   - `generateSessionInfo(...)` — session-info.json 생성
   - `generateImportGuide(...)` — IMPORT-GUIDE.md 생성
   - `copyRawFiles(osclog, score, rawDir)` — raw/ 디렉토리에 원본 보존
2. `scripts/render-prod.ts` — CLI 엔트리 + validateFilePath + renderProdPipeline 호출
3. package.json script 추가

### 4.3 Refactor Phase
- 기존 render-audio.ts의 loudnorm 로직과 공유 유틸 추출

## 5. Edge Cases
- EC-1: 변환 단계 실패 → 이후 단계 미실행 + 에러 리포트
- EC-2: 마스터링 후 LUFS/TP 범위 벗어남 → 경고 + 재시도 없음 (사용자 DAW에서 조정)
- EC-3: raw/ 디렉토리 복사 실패 → 경고만 (치명적 아님)

## 6. Review Checklist
- [ ] Red: 테스트 실행 -> FAILED 확인됨
- [ ] Green: 테스트 실행 -> PASSED 확인됨
- [ ] Refactor: 테스트 실행 -> PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] render:audio regression 확인
- [ ] LUFS/TP 검증 통과
- [ ] execFile-only 확인
- [ ] 기존 184 테스트 깨지지 않음
