# T2: SuperDirt boot.scd + Phase A SynthDef 등록

**PRD Ref**: PRD-audio-v2-live > US-2
**Priority**: P0 (Blocker)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
SuperDirt Quark 부팅 스크립트를 작성하고, Phase A의 9종 SynthDef + Dirt-Samples + 커스텀 샘플을 SuperDirt에 등록한다.

## 2. Acceptance Criteria
- [ ] AC-1: `SuperDirt.start` 에러 0. orbit 0-7 (8채널) 활성화 (PRD AC-2.1)
- [ ] AC-2: Dirt-Samples 기본 샘플팩 로드 — 808 킥/스네어/하이햇 등 (PRD AC-2.2)
- [ ] AC-3: Phase A SynthDef 9종(kick, bass, hat, clap, supersaw, pad, lead, arp_pluck, riser) SuperDirt 등록. Tidal에서 `d1 $ s "kick"` 호출 가능 (PRD AC-2.3)
- [ ] AC-4: 커스텀 샘플 디렉토리 `audio/samples/` 로드. path traversal 방지: realpath 정규화 + `audio/samples/` 하위만 허용 (PRD AC-2.4)
- [ ] AC-5: boot.scd 실행 시 SynthDef 로드 완료 메시지 출력 (9/9 loaded)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `validateSamplePath allows audio/samples subdir` | Unit | `audio/samples/kicks/kick01.wav` 허용 | true |
| 2 | `validateSamplePath blocks traversal` | Unit | `audio/samples/../../etc/passwd` 차단 | false |
| 3 | `validateSamplePath blocks absolute path` | Unit | `/etc/passwd` 차단 | false |
| 4 | `validateSamplePath blocks symlink escape` | Unit | 심볼릭 링크로 samples/ 외부 가리키는 경로 차단 | false |
| 5 | `generateBootConfig includes all 9 synthdefs` | Unit | 설정 생성 시 9종 SynthDef 이름 포함 | config contains all 9 names |
| 6 | `generateBootConfig sets 8 orbits` | Unit | numOrbits = 8 | config.numOrbits === 8 |
| 7 | `SuperDirt boot no errors` | Integration | sclang boot.scd 실행 -> 에러 0 | exit code 0 + "ready" 메시지 |
| 8 | `Phase A SynthDef registered` | Integration | boot 후 SynthDef 9종 쿼리 | 9/9 found |
| 9 | `Dirt-Samples loaded` | Integration | boot 후 기본 샘플(bd, sd, hh) 존재 확인 | sclang 쿼리 found |
| 10 | `boot stdout shows 9/9 loaded` | Integration | boot.scd stdout에 "9/9 loaded" 메시지 포함 | stdout match |
| 11 | `boot with empty samples dir` | Integration | audio/samples/ 비어있는 상태로 boot.scd 실행 | exit code 0, no error |

### 3.2 Test File Location
- `scripts/lib/superdirt-utils.test.ts` (신규)
- `audio/sc/test-superdirt-boot.scd` (신규, SC 통합 테스트)

### 3.3 Mock/Setup Required
- Vitest: `vi.mock('node:fs')` — realpath 모킹 (path traversal 테스트)
- SC 통합: sclang 설치 필요 (T1 선행)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/superdirt/boot.scd` | Create | SuperDirt.start + SynthDef 등록 + 샘플 로드 |
| `scripts/lib/superdirt-utils.ts` | Create | validateSamplePath, generateBootConfig 유틸 |
| `scripts/lib/superdirt-utils.test.ts` | Create | 위 유틸 vitest 테스트 |
| `audio/sc/test-superdirt-boot.scd` | Create | SC 통합 테스트 |
| `audio/samples/.gitkeep` | Create | 커스텀 샘플 디렉토리 placeholder |

### 4.2 Implementation Steps (Green Phase)
1. `scripts/lib/superdirt-utils.ts` 작성 — validateSamplePath (realpath + 화이트리스트), generateBootConfig
2. `audio/sc/superdirt/boot.scd` 작성:
   - `SuperDirt.start` (numOrbits: 8)
   - Dirt-Samples 자동 로드
   - Phase A SynthDef 9종을 SuperDirt SynthDef으로 래핑/등록
   - `audio/samples/` 커스텀 샘플 디렉토리 추가
   - 로드 완료 메시지 (n/9 loaded)
3. `audio/samples/.gitkeep` 생성
4. SC 통합 테스트 작성

### 4.3 Refactor Phase
- SynthDef 등록 로직을 함수로 추출 (boot.scd 내)

## 5. Edge Cases
- EC-1: audio/samples/ 비어있을 때 에러 없이 부팅 (PRD E9)
- EC-2: SynthDef 이름 충돌 (Dirt-Samples 기본 이름과 Phase A 이름)
- EC-3: SuperDirt Quark 버전 비호환 시 명확한 에러 메시지

## 6. Review Checklist
- [ ] Red: 테스트 실행 -> FAILED 확인됨
- [ ] Green: 테스트 실행 -> PASSED 확인됨
- [ ] Refactor: 테스트 실행 -> PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
- [ ] path traversal 방지 동작 확인
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
