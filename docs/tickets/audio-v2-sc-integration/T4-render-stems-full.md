# T4: render-stems.ts 풀 구현

**PRD Ref**: PRD-audio-v2-sc-integration > US-4
**Priority**: P0 (Blocker)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T3

---

## 1. Objective
render-stems.ts stub을 풀 구현으로 교체: sclang 호출 → 8ch WAV → ffmpeg split → 4x2ch 스템.

## 2. Acceptance Criteria
- [ ] AC-1: .nrt.json → generateNrtScoreEntries → writeScoreConfig → sclang render-stems-nrt.scd (PRD AC-4.1)
- [ ] AC-2: ffmpeg 8ch→4x2ch split (buildSplitCommands 활용) (PRD AC-4.2)
- [ ] AC-3: 출력 `out/audio/{date}_{title}/stems/stem-*.wav` (PRD AC-4.3)
- [ ] AC-4: sclang/ffmpeg 미설치 시 에러 + 설치 안내 (PRD AC-4.4)
- [ ] AC-5: --title, --preset CLI 옵션 (PRD AC-4.5)
- [ ] AC-6: .render.lock 동시 실행 방지 (PRD AC-4.6)
- [ ] AC-7: execFile array-form만 사용 (PRD AC-4.7)

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `render-stems.ts no exec or spawn` | Unit | execFile-only 정적 검증 | pass |
| 2 | `render-stems.ts imports execFile` | Unit | child_process.execFile import | contains "execFile" |
| 3 | `render-stems.ts has render.lock` | Unit | lock 사용 | contains "checkRenderLock" |
| 4 | `render-stems.ts has sclang call` | Unit | sclang 실행 | contains "sclang" |
| 5 | `render-stems.ts has ffmpeg call` | Unit | ffmpeg 실행 | contains "ffmpeg" |
| 6 | `render-stems.ts has ENOENT handling` | Unit | 미설치 에러 처리 | contains "ENOENT" |
| 7 | `render-stems.ts has --title` | Unit | CLI 옵션 | contains "--title" |
| 8 | `render-stems.ts no TODO` | Unit | stub 완전 제거 | NOT contains "TODO" |
| 9 | `render-stems.ts has stems output path` | Unit | 출력 경로 패턴 | contains "stems" |
| 10 | `render-stems.ts has --preset` | Unit | preset CLI 옵션 | contains "--preset" |

### 3.2 Test File Location
- `scripts/lib/e2e-integration.test.ts` (공유)

## 4. Implementation Guide

### 4.1 Files
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/render-stems.ts` | Modify (rewrite) | stub → 풀 구현 |

### 4.2 Implementation Steps
1. .nrt.json 읽기 + 파싱
2. generateNrtScoreEntries → writeScoreConfig
3. execFile("sclang", [render-stems-nrt.scd, config, output])
4. execFile("ffmpeg", [...splitCommands]) 순차 실행
5. ENOENT 에러 처리 (sclang/ffmpeg)
6. .render.lock + finally cleanup
