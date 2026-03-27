# T1: OSC 로깅 시스템

**PRD Ref**: PRD-audio-v2-prod > US-1
**Priority**: P0 (Blocker)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: None (B-LIVE 완료 기반)

---

## 1. Objective
라이브 세션 중 SuperDirt의 모든 `/dirt/play` OSC 이벤트를 JSONL 파일로 캡처하여, 사후 NRT 재현의 기반 데이터를 확보한다.

## 2. Acceptance Criteria
- [ ] AC-1: `npm run live:start --log` → boot.scd에 osc-logger.scd 조건부 로드. `/dirt/play` 메시지 JSONL 캡처 (PRD AC-1.1)
- [ ] AC-2: JSONL 포맷: `{ ts, s, n, orbit, gain, ... }` — 모든 키-값 쌍 raw 캡처 (PRD AC-1.2)
- [ ] AC-3: 10분 단위 파일 분할. `session_{YYYY-MM-DD}_{HH-MM}_part{N}.osclog` (PRD AC-1.3)
- [ ] AC-4: 라이브 오디오 레이턴시 영향 < 1ms (PRD AC-1.4)
- [ ] AC-5: `live:stop` 시 로그 finalize + 세션 메타데이터 기록 (PRD AC-1.5)
- [ ] AC-6: `--log` 미지정 시 OSC 로거 완전 비활성. B-LIVE 기존 동작 동일 (regression 0)
- [ ] AC-7: osc-logger.scd OSC 수신 127.0.0.1 전용. 0.0.0.0 금지
- [ ] AC-8: package.json에 `live:log` script 추가
- [ ] AC-9: .live.lock 기반 동시 로깅 세션 거부 (PRD E10)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `parseOscEvent valid JSONL` | Unit | JSONL 1줄 파싱 → 이벤트 객체 | parsed event with ts, s, n, params |
| 2 | `parseOscEvent malformed line` | Unit | 불완전 JSON 라인 | null + warning |
| 3 | `generateLogPath formats correctly` | Unit | 날짜+시간 기반 경로 생성 | `session_YYYY-MM-DD_HH-MM_part0.osclog` |
| 4 | `generateLogPath increments part` | Unit | part 번호 증가 | `_part1.osclog` |
| 5 | `shouldRotateFile after 10min` | Unit | 10분 경과 감지 | true |
| 6 | `shouldRotateFile before 10min` | Unit | 10분 미경과 | false |
| 7 | `generateSessionMetadata` | Unit | 이벤트 목록 → 메타데이터 | { bpm, duration, eventCount } |
| 8 | `generateSessionMetadata empty events` | Unit | 빈 이벤트 목록 | error "no events" |
| 9 | `osc-logger.scd loads without error` | Integration | sclang boot.scd --log 실행 | exit code 0 |
| 10 | `osc-logger.scd skipped without --log` | Integration | sclang boot.scd (no flag) | 로거 비활성 확인 |
| 11 | `validateFilePath allows out/ subdir` | Unit | `out/audio/session.osclog` 허용 | true |
| 12 | `validateFilePath blocks traversal` | Unit | `../../etc/passwd` 차단 | false |
| 13 | `concurrent logging rejected` | Unit | .live.lock 활성 시 --log 거부 | throws "already logging" |
| 14 | `file rotation preserves events` | Unit | 9분59초 + 10분00초 이벤트 → 각 파일 1개씩 | count per file correct |
| 15 | `writeOscEvent uses async buffer` | Unit | 파일 쓰기가 동기 writeFileSync 아닌 비동기 | writeFileSync 미호출 |
| 16 | `osc-logger.scd no 0.0.0.0 binding` | Unit | .scd 파일 내용에 "0.0.0.0" 없음 | static check pass |
| 17 | `package.json has live:log script` | Unit | scripts["live:log"] 존재 | key exists |

### 3.2 Test File Location
- `scripts/lib/osc-logger.test.ts` (신규)

### 3.3 Mock/Setup Required
- Vitest: `vi.mock('node:fs')` — 파일 쓰기 모킹
- Vitest: `vi.useFakeTimers()` — 10분 로테이션 타이머
- SC 통합: sclang 필요 (B-LIVE 선행)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/superdirt/osc-logger.scd` | Create | OSCFunc 로깅 로직 |
| `audio/sc/superdirt/boot.scd` | Modify | --log 플래그 시 osc-logger.scd 조건부 로드 |
| `scripts/lib/osc-logger.ts` | Create | JSONL 파서, 경로 생성, 로테이션, 메타데이터 |
| `scripts/lib/osc-logger.test.ts` | Create | vitest 테스트 |
| `scripts/lib/validate-file-path.ts` | Create | validateFilePath() 공유 유틸 |
| `scripts/live-start.ts` | Modify | --log 플래그 파싱 + boot.scd 인자 전달 |
| `scripts/live-stop.ts` | Modify | 로그 finalize + 메타데이터 기록 |
| `package.json` | Modify | live:log script 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `scripts/lib/validate-file-path.ts` — realpath + 허용 디렉토리 + 확장자 검증
2. `scripts/lib/osc-logger.ts` — parseOscEvent, generateLogPath, shouldRotateFile, generateSessionMetadata
3. `audio/sc/superdirt/osc-logger.scd` — OSCFunc 후킹 + JSONL 파일 쓰기 + 비동기 버퍼 (SC Routine)
4. `audio/sc/superdirt/boot.scd` 수정 — `~enableLogging` 변수로 조건부 로드
5. `scripts/live-start.ts` 수정 — `--log` argv 파싱 → boot config에 로깅 플래그 추가
6. `scripts/live-stop.ts` 수정 — 로그 finalize + 메타데이터 JSON 기록
7. `package.json` — `"live:log": "tsx scripts/live-start.ts --log"` 추가

### 4.3 Refactor Phase
- osc-logger.ts와 live-recording.ts의 disk check 로직 공유 유틸 추출

## 5. Edge Cases
- EC-1: 10분 분할 경계에서 이벤트 유실 → 버퍼 flush 후 파일 전환 (PRD E13)
- EC-2: SC 크래시 중 활성 로깅 → JSONL 스트리밍 특성상 기록 라인 유효. 메타데이터 유실 시 재생성 (PRD E14)
- EC-3: 빈 세션 (0 이벤트) → 명확한 에러 "no events found" (PRD E5)
- EC-4: 동시 live:start --log → .live.lock 기반 거부 (PRD E10)

## 6. Review Checklist
- [ ] Red: 테스트 실행 -> FAILED 확인됨
- [ ] Green: 테스트 실행 -> PASSED 확인됨
- [ ] Refactor: 테스트 실행 -> PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] B-LIVE 기존 동작 regression 0 (--log 미지정 시)
- [ ] OSC 바인딩 127.0.0.1 확인
- [ ] execFile-only 확인
- [ ] 기존 184 테스트 깨지지 않음
