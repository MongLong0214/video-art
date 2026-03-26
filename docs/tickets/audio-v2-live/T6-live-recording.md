# T6: 라이브 녹음 (SC s.record)

**PRD Ref**: PRD-audio-v2-live > US-5
**Priority**: P1 (High)
**Size**: S (2-4h)
**Status**: Todo
**Depends On**: T5

---

## 1. Objective
실시간 재생을 WAV 파일로 녹음할 수 있게 하여, 라이브 퍼포먼스 결과물을 보존한다.

## 2. Acceptance Criteria
- [ ] AC-1: `npm run live:record` -> SC `s.record` 시작. 출력: `out/audio/{date}_{title}/live-recording.wav` (48kHz 32-bit float) (PRD AC-5.1)
- [ ] AC-2: 녹음 중 디스크 부족 시 녹음 중단 + 기존 파일 보호 (PRD AC-5.2)
- [ ] AC-3: `npm run live:stop` 시 녹음 자동 종료 + 파일 finalize (PRD AC-5.3)
- [ ] AC-4: 녹음 상태를 오케스트레이터에 통지 (live:stop 시 /quit OSC 선행용)
- [ ] AC-5: package.json에 `live:record` script 추가

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `generateRecordPath formats date correctly` | Unit | `out/audio/2026-03-26_untitled/live-recording.wav` | path format match |
| 2 | `generateRecordPath sanitizes title` | Unit | 특수문자 포함 제목 정리 | safe filename |
| 3 | `checkDiskSpace sufficient` | Unit | 사용 가능 공간 > 2x 추정치 | true |
| 4 | `checkDiskSpace insufficient` | Unit | 사용 가능 공간 < 2x 추정치 | false + warning |
| 5 | `recordingState starts` | Unit | record 호출 시 상태 전환 | state === "recording" |
| 6 | `recordingState stops on live:stop` | Unit | stop 호출 시 녹음 종료 | state === "stopped" + file finalized |
| 7 | `recordingState notifies orchestrator` | Unit | 녹음 상태를 오케스트레이터에 알림 | isRecording === true |
| 8 | `disk monitor stops recording on low space` | Unit | 디스크 감시 중 부족 감지 | recording stopped + file preserved |
| 9 | `startRecording sends correct format` | Unit | SC s.record OSC에 48kHz, WAV, float 포함 | params match spec |
| 10 | `package.json has live:record script` | Unit | package.json scripts에 live:record 존재 | key exists |
| 11 | `stopRecording removes zero-byte file` | Unit | stop 후 파일 크기 0이면 삭제 | unlinkSync called |

### 3.2 Test File Location
- `scripts/lib/live-recording.test.ts` (신규)

### 3.3 Mock/Setup Required
- Vitest: `vi.mock('node:child_process')` — SC 명령 모킹
- Vitest: `vi.mock('node:fs')` — 파일 시스템 모킹
- Vitest: disk space mock (df -k 출력 모킹)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/live-record.ts` | Create | 녹음 시작 엔트리포인트 |
| `scripts/lib/live-recording.ts` | Create | 녹음 로직 (경로 생성, 디스크 감시, 상태 관리) |
| `scripts/lib/live-recording.test.ts` | Create | vitest 테스트 |
| `scripts/lib/live-orchestrator.ts` | Modify | 녹음 상태 통합 (isRecording flag) |
| `package.json` | Modify | live:record script 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `scripts/lib/live-recording.ts`:
   - `generateRecordPath(title?: string)` — `out/audio/{YYYY-MM-DD}_{title}/live-recording.wav`
   - `checkDiskSpace(path: string)` — df 기반 2x 안전 마진 (기존 render-audio-utils 패턴 재활용)
   - `startRecording()` — SC `s.record` OSC 전송 (48kHz 32-bit float)
   - `stopRecording()` — SC `s.stopRecording` + 파일 finalize
   - `diskMonitor()` — 30초마다 `df -k` 기반 2x 안전 마진 체크. 부족 시: WAV 헤더 flush → s.stopRecording → 기존 파일 보존 (삭제 안 함). stdout 경고 출력
2. `scripts/live-record.ts` — 엔트리포인트
3. `scripts/lib/live-orchestrator.ts` 수정 — `isRecording` 상태 추가, stop() 시 참조
4. package.json에 `live:record` 추가

### 4.3 Refactor Phase
- 디스크 체크 로직을 render-audio-utils와 공유 유틸로 추출

## 5. Edge Cases
- EC-1: 녹음 중 디스크 부족 -> 녹음 중단 + 기존 WAV 보호 (PRD E7)
- EC-2: live:record 호출 시 라이브 스택 미실행 -> 명확한 에러
- EC-3: 녹음 파일 0 바이트 (즉시 stop) -> 빈 파일 정리

## 6. Review Checklist
- [ ] Red: 테스트 실행 -> FAILED 확인됨
- [ ] Green: 테스트 실행 -> PASSED 확인됨
- [ ] Refactor: 테스트 실행 -> PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 디스크 보호 동작 확인
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
