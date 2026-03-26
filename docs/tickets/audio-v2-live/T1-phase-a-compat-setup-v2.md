# T1: Phase A 호환성 변경 + setup.sh v2

**PRD Ref**: PRD-audio-v2-live > US-2, US-3, Section 4.3
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
Phase A 스키마를 B-LIVE 요구사항에 맞게 확장하고, setup.sh에 GHCup/TidalCycles/SuperDirt 설치 검증을 추가한다.

## 2. Acceptance Criteria
- [ ] AC-1: `scene-schema.ts` duration max 60 -> 300 변경. 기존 테스트 PASS + 신규 범위 테스트
- [ ] AC-2: `bpm-calculator.ts` genre enum 5종 확장 (techno, trance, house, dnb, ambient). 각 장르별 BPM 범위 테스트
- [ ] AC-3: `setup.sh` v2 — GHCup 설치 확인 (`ghcup --version`)
- [ ] AC-4: `setup.sh` v2 — GHC 버전 확인 (최소 9.4, 권장 9.6)
- [ ] AC-5: `setup.sh` v2 — cabal 설치 + tidal 패키지 확인
- [ ] AC-6: `setup.sh` v2 — SuperDirt Quark 설치 확인 (sclang 쿼리)
- [ ] AC-7: Phase A 기존 테스트 106개 전부 PASS (regression 0)
- [ ] AC-8: `setup.sh` v2 — curl fallback 시 GHCup installer SHA256 체크섬 검증. 불일치 시 설치 중단 + 에러

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `duration 300 accepts` | Unit | audioSchema duration 300 유효 | parse success |
| 2 | `duration 301 rejects` | Unit | audioSchema duration 301 이상 거부 | ZodError |
| 3 | `duration 0.5 still valid` | Unit | 기존 최소값 유지 확인 | parse success |
| 4 | `genre house BPM range` | Unit | house 장르 BPM 120-130 | calculateBPM returns BPM in range |
| 5 | `genre dnb BPM range` | Unit | dnb 장르 BPM 160-180 | calculateBPM returns BPM in range |
| 6 | `genre ambient BPM range` | Unit | ambient 장르 BPM 60-90 | calculateBPM returns BPM in range |
| 7 | `genre techno unchanged` | Unit | 기존 techno 125-150 유지 | regression check |
| 8 | `genre trance unchanged` | Unit | 기존 trance 130-145 유지 | regression check |
| 9 | `setup deps check ghcup` | Integration | setup.sh --check 출력에 ghcup 포함 | stdout contains "ghcup" |
| 10 | `setup deps check tidal` | Integration | setup.sh --check 출력에 tidal 포함 | stdout contains "tidal" |
| 11 | `setup deps check ghc version` | Integration | GHC 최소 9.4 버전 파싱 검증 | stdout contains valid GHC version >= 9.4 |
| 12 | `setup deps check superdirt` | Integration | SuperDirt Quark 설치 확인 | stdout contains "superdirt" |
| 13 | `duration 300 auto bpm invariant` | Unit | duration 300에서 bars*4*60/bpm = 300 (+-0.001s) | invariant holds |
| 14 | `ambient BPM 60 bars positive` | Unit | ambient 장르 BPM(60)에서 bars > 0 | bars > 0 |

### 3.2 Test File Location
- `src/lib/scene-schema.test.ts` (기존 파일에 추가)
- `src/lib/bpm-calculator.test.ts` (기존 파일에 추가)

### 3.3 Mock/Setup Required
- Vitest: 기존 테스트 설정 그대로. 추가 모킹 불필요
- setup.sh 통합 테스트: `bash -c` 실행 (CI 환경에서는 skip 가능)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `src/lib/scene-schema.ts` | Modify | duration max 60 -> 300 |
| `src/lib/scene-schema.test.ts` | Modify | 새 duration 범위 테스트 추가 |
| `src/lib/bpm-calculator.ts` | Modify | GENRE_RANGES에 house/dnb/ambient 추가 |
| `src/lib/bpm-calculator.test.ts` | Modify | 3 장르 BPM 테스트 추가 |
| `audio/setup.sh` | Modify | GHCup/GHC/cabal/tidal/SuperDirt 체크 추가 |

### 4.2 Implementation Steps (Green Phase)
1. scene-schema.ts: `duration` max 값 300으로 변경
2. bpm-calculator.ts: `GENRE_RANGES` 객체에 house [120,130], dnb [160,180], ambient [60,90] 추가
3. scene-schema.ts: genre enum에 `house`, `dnb`, `ambient` 추가
4. setup.sh: GHCup/GHC 버전 체크 함수 추가 (`brew install ghcup` 우선 안내)
5. setup.sh: cabal + tidal 패키지 체크 추가
6. setup.sh: SuperDirt Quark 체크 추가 (sclang 쿼리)
7. setup.sh: curl fallback 경로에 SHA256 체크섬 검증 추가 (PRD Section 6 요구사항)

### 4.3 Refactor Phase
- BPM 장르 범위를 상수 객체로 분리 (이미 분리되어 있으면 skip)

## 5. Edge Cases
- EC-1: duration 정확히 300.0에서 bars 계산 정합성 (bars * 4 * 60 / bpm = 300 +/- 0.001s)
- EC-2: ambient 장르의 매우 낮은 BPM(60)에서 bars 수가 0이 되지 않는지 확인
- EC-3: GHCup 미설치 시 brew 안내 메시지 정확성

## 6. Review Checklist
- [ ] Red: 테스트 실행 -> FAILED 확인됨
- [ ] Green: 테스트 실행 -> PASSED 확인됨
- [ ] Refactor: 테스트 실행 -> PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음 (106개 regression)
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음