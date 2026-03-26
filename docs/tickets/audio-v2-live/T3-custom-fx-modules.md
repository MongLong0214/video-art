# T3: 커스텀 FX 모듈 (compressor / sidechain / saturator / eq)

**PRD Ref**: PRD-audio-v2-live > US-1
**Priority**: P0 (Blocker)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T2
**Note**: OQ-2 sidechain PoC를 T2 병렬로 선행 (1-2h). 결과에 따라 AC-4 scope 결정

---

## 1. Objective
SuperDirt의 `~dirt.addModule` API로 커스텀 FX(compressor, sidechain, saturator, eq)를 orbit 체인에 삽입하여, Tidal에서 실시간 FX 파라미터 제어가 가능하게 한다.

## 2. Acceptance Criteria
- [ ] AC-1: SuperDirt 부팅 시 기본 FX + 커스텀 FX 4종 로드. 에러 0 (PRD AC-1.1)
- [ ] AC-2: Tidal에서 `# compress 0.7 # threshold (-10)` 등으로 FX 파라미터 실시간 제어 (PRD AC-1.2)
- [ ] AC-3: 커스텀 FX는 `~dirt.addModule` API로 SuperDirt orbit 체인에 통합 (PRD AC-1.3)
- [ ] AC-4: Sidechain — kick orbit의 amp를 다른 orbit의 compressor 트리거로 사용 (PRD AC-1.4). OQ-2 spike 결과 반영
- [ ] AC-5: `~dirt.orderModules`로 FX 순서 제어 가능

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `validateFxParams compressor range` | Unit | compress 0-1, threshold -60-0 범위 검증 | valid in range, reject outside |
| 2 | `validateFxParams saturator range` | Unit | saturate 0-1, drive 0-1 범위 검증 | valid in range, reject outside |
| 3 | `validateFxParams eq range` | Unit | loGain/midGain/hiGain -24-24 dB | valid in range, reject outside |
| 4 | `FX module order default` | Unit | 기본 순서: comp -> sat -> eq -> reverb -> delay | ordered array match |
| 5 | `custom-fx.scd loads without error` | Integration | sclang custom-fx.scd 실행 | exit code 0 |
| 6 | `FX modules registered in SuperDirt` | Integration | boot.scd + custom-fx.scd 후 모듈 확인 | 4 custom modules found |
| 7 | `compressor SynthDef compiles` | Integration | SynthDef 컴파일 성공 | no error |
| 8 | `sidechain cross-orbit signal` | Integration | kick orbit -> sidechain bus -> comp 트리거 | signal detected (OQ-2 spike) |
| 9 | `generateFxModuleConfig all 4 modules` | Unit | 4종 FX 모듈 addModule 설정 객체 생성 | config includes comp/sat/eq/sidechain |
| 10 | `getFxBypassOrder by CPU load` | Unit | CPU % 입력 시 가장 무거운 FX부터 bypass 순서 | ordered array match |

### 3.2 Test File Location
- `scripts/lib/fx-utils.test.ts` (신규)
- `audio/sc/test-custom-fx.scd` (신규, SC 통합 테스트)

### 3.3 Mock/Setup Required
- Vitest: 추가 모킹 불필요 (순수 파라미터 검증)
- SC 통합: SuperDirt 부팅 필요 (T2 선행)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/superdirt/custom-fx.scd` | Create | 4종 FX SynthDef + addModule 등록 |
| `audio/sc/superdirt/boot.scd` | Modify | custom-fx.scd 로드 + orderModules 추가 |
| `scripts/lib/fx-utils.ts` | Create | FX 파라미터 검증 유틸 |
| `scripts/lib/fx-utils.test.ts` | Create | FX 유틸 vitest 테스트 |
| `audio/sc/test-custom-fx.scd` | Create | SC 통합 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. `scripts/lib/fx-utils.ts` — FX 파라미터 범위 검증 함수
2. `audio/sc/superdirt/custom-fx.scd`:
   - `\customCompressor` SynthDef (compress, threshold, ratio, attack, release)
   - `\customSaturator` SynthDef (saturate, drive)
   - `\customEQ` SynthDef (loGain, midGain, hiGain, loFreq, hiFreq)
   - `\customSidechain` SynthDef (sideGain, sideRelease) — kick orbit 크로스 참조
   - 각 SynthDef을 `~dirt.addModule`로 등록
3. `boot.scd` 수정 — custom-fx.scd 로드 + `~dirt.orderModules` 호출
4. OQ-2 sidechain spike: `InBus.ar` 또는 `SharedIn`으로 cross-orbit 신호 전달 테스트

### 4.3 Refactor Phase
- FX SynthDef 파라미터를 SC Dictionary로 선언형 관리

## 5. Edge Cases
- EC-1: CPU > 70% 시 가장 무거운 FX bypass + 경고 (PRD E4). CPU < 50% 5초 안정 시 fade-in 복원
- EC-2: FX 파라미터 0 또는 극단값에서 무음/클리핑 방지
- EC-3: sidechain bus 미사용 시 (kick orbit 비활성) 정상 동작
- EC-4: OQ-2 spike 실패 시 fallback — AC-4(sidechain)를 B-PROD로 defer. 나머지 AC 영향 없음. Test #8 skip 처리
- EC-5: OQ-2 PoC 판정 기준 — `InBus.ar`/`SharedIn`으로 cross-orbit 신호 감지 성공 = 가능, 실패 = defer

## 6. Review Checklist
- [ ] Red: 테스트 실행 -> FAILED 확인됨
- [ ] Green: 테스트 실행 -> PASSED 확인됨
- [ ] Refactor: 테스트 실행 -> PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] OQ-2 sidechain spike 결과 기록
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
