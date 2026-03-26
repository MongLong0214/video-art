# T5: live-start.ts / live-stop.ts 오케스트레이터

**PRD Ref**: PRD-audio-v2-live > US-4
**Priority**: P0 (Blocker)
**Size**: L (8-16h)
**Status**: Todo
**Depends On**: T2, T3, T4

---

## 1. Objective
`npm run live:start` 원커맨드로 SC 서버 + SuperDirt + Tidal 전체 스택을 부팅하고, `npm run live:stop`으로 안전하게 종료하는 오케스트레이터를 구현한다.

## 2. Acceptance Criteria
- [ ] AC-1: `npm run live:start` -> SC 서버 부팅 + SuperDirt 시작 + Tidal 에디터 안내. 에러 시 명확한 진단 (PRD AC-4.1)
- [ ] AC-2: `npm run live:stop` -> SIGTERM -> 3초 대기 -> SIGKILL. 녹음 중이면 `/quit` OSC 선행. 좀비 0 (PRD AC-4.2)
- [ ] AC-3: 오디오 레이턴시 < 20ms (SC blockSize 64) (PRD AC-4.3)
- [ ] AC-4: CPU < 50% (4패턴 + FX, MacBook Pro M1 기준) (PRD AC-4.4)
- [ ] AC-5: scsynth 크래시 시 자동 재시작 + SuperDirt 재부팅. 오디오 중단 < 10초 (PRD AC-4.5)
- [ ] AC-6: 60분+ 세션에서 메모리 증가율 < 10MB/분. SC 메모리 > 1.5GB 시 경고 (PRD AC-4.6)
- [ ] AC-7: 모든 child process는 `execFile` (array-form) 사용. shell spawn 금지
- [ ] AC-8: package.json에 `live:start`, `live:stop` scripts 추가

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `startSequence boots SC then SuperDirt` | Unit | 부팅 순서: sclang -> SuperDirt.start -> ready | ordered steps executed |
| 2 | `startSequence fails on SC boot error` | Unit | sclang 실행 실패 시 에러 리포트 | throws with diagnostic |
| 3 | `stopSequence sends SIGTERM first` | Unit | 종료 시 SIGTERM 선송신 | SIGTERM sent to all pids |
| 4 | `stopSequence escalates to SIGKILL after 3s` | Unit | 3초 후 미종료 프로세스 SIGKILL | SIGKILL after timeout |
| 5 | `stopSequence sends quit OSC if recording` | Unit | 녹음 상태일 때 /quit OSC 선송신 | OSC sent before SIGTERM |
| 6 | `stopSequence leaves no zombies` | Unit | 종료 후 관련 프로세스 0 | no child processes |
| 7 | `healthCheck detects crash and restarts` | Unit | scsynth pid 소멸 감지 -> 재시작 | restart triggered |
| 8 | `healthCheck warns on high memory` | Unit | 메모리 > 1.5GB -> 경고 | warning emitted |
| 9 | `healthCheck warns on high CPU` | Unit | CPU > 70% -> FX bypass | bypass signal sent |
| 10 | `uses execFile not exec` | Unit | 모든 프로세스 실행이 execFile | no exec/spawn(shell) calls |
| 11 | `boot config sets blockSize 64` | Unit | SC 부팅 설정 blockSize 확인 | blockSize === 64 |
| 12 | `concurrent start prevention` | Unit | 이미 실행 중일 때 재시작 방지 | throws "already running" |
| 13 | `package.json has live scripts` | Unit | package.json scripts에 live:start, live:stop 존재 | keys exist |
| 14 | `startSequence cleans stale lock` | Unit | .live.lock 존재 + PID 미존재 시 stale lock 제거 후 정상 시작 | lock cleaned + started |
| 15 | `startSequence throws on SC boot timeout` | Unit | sclang ready 없이 30초 경과 시 타임아웃 | throws timeout error |

### 3.2 Test File Location
- `scripts/lib/live-orchestrator.test.ts` (신규) — 부팅/종료/프로세스 관리 (#1-6, #12-14)
- `scripts/lib/live-health-monitor.test.ts` (신규) — healthCheck/crash/memory/CPU (#7-11, #15)

### 3.3 Mock/Setup Required
- Vitest: `vi.mock('node:child_process')` — execFile 모킹
- Vitest: `vi.useFakeTimers()` — 3초 타이머 검증
- Vitest: `vi.mock('node:os')` — CPU/메모리 모킹

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/live-start.ts` | Create | 라이브 스택 부팅 엔트리포인트 |
| `scripts/live-stop.ts` | Create | 라이브 스택 종료 엔트리포인트 |
| `scripts/lib/live-orchestrator.ts` | Create | 부팅/종료/헬스체크 핵심 로직 |
| `scripts/lib/live-orchestrator.test.ts` | Create | vitest 테스트 |
| `package.json` | Modify | live:start, live:stop scripts 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `scripts/lib/live-orchestrator.ts`:
   - `LiveOrchestrator` class:
     - `start()`: sclang(boot.scd) -> SuperDirt ready 대기 -> Tidal 안내 출력
     - `stop(isRecording: boolean)`: 녹음 시 OSC /quit -> SIGTERM -> 3s -> SIGKILL
     - `healthCheck()`: CPU/메모리/프로세스 감시 (setInterval)
     - `handleCrash()`: scsynth 재시작 + SuperDirt 재부팅
   - 모든 프로세스 실행: `child_process.execFile` (array-form)
   - PID 추적: Set<number> 으로 관리
   - Lock file: `.live.lock` (concurrent start 방지)
2. `scripts/live-start.ts`: LiveOrchestrator.start() 호출
3. `scripts/live-stop.ts`: LiveOrchestrator.stop() 호출
4. package.json scripts 추가

### 4.3 Refactor Phase
- 헬스체크 interval을 설정 가능하게 추출
- 부팅 단계별 상태를 enum으로 관리

## 5. Edge Cases
- EC-1: scsynth 크래시 -> 자동 재시작. 중단 < 10초 (PRD E5)
- EC-2: 메모리 누수 -> 60분마다 체크. > 1.5GB 경고 (PRD E6)
- EC-3: SIGKILL 좀비 방지 (PRD E8)
- EC-4: live:start 시 이전 세션 잔여 프로세스 클린업
- EC-5: SC 서버 부팅 타임아웃 (30초)

## 6. Review Checklist
- [ ] Red: 테스트 실행 -> FAILED 확인됨
- [ ] Green: 테스트 실행 -> PASSED 확인됨
- [ ] Refactor: 테스트 실행 -> PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] execFile 사용 강제 확인 (exec/spawn(shell) 0)
- [ ] SIGTERM -> SIGKILL 순서 확인
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
