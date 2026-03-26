# T4: TidalCycles 연결 + BootTidal.hs

**PRD Ref**: PRD-audio-v2-live > US-3
**Priority**: P1 (High)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T1, T2

---

## 1. Objective
TidalCycles를 SuperDirt와 연결하여, VS Code에서 코드 입력 즉시 소리가 나는 라이브 코딩 환경을 구성한다.

## 2. Acceptance Criteria
- [ ] AC-1: GHCup + GHC(9.6) + cabal 설치 검증 스크립트. `brew install ghcup` 우선 (PRD AC-3.1)
- [ ] AC-2: `cabal install tidal` 성공. `import Sound.Tidal.Context` 에러 0 (PRD AC-3.2)
- [ ] AC-3: Tidal -> SuperDirt OSC 통신 (127.0.0.1:57120). `d1 $ s "bd"` 소리 재생 (PRD AC-3.3). **OSC 바인딩 127.0.0.1 강제**
- [ ] AC-4: VS Code `tidalvscode` 확장 설치 가이드. Ctrl+Enter 코드 블록 실행 (PRD AC-3.4)
- [ ] AC-5: 커스텀 SynthDef Tidal 호출: `d1 $ s "supersaw" # n "0 4 7" # cutoff 2000` (PRD AC-3.5)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `generateBootTidal sets target 127.0.0.1` | Unit | BootTidal.hs 생성 시 OSC target 확인 | contains "127.0.0.1" |
| 2 | `generateBootTidal rejects 0.0.0.0` | Unit | OSC target에 0.0.0.0 거부 | throws/returns error |
| 3 | `generateBootTidal sets port 57120` | Unit | OSC 포트 확인 | contains "57120" |
| 4 | `generateBootTidal includes custom params` | Unit | 커스텀 FX 파라미터(compress, saturate 등) Tidal 등록 | contains param definitions |
| 5 | `validateGhcVersion accepts 9.6` | Unit | GHC 9.6.x 수용 | true |
| 6 | `validateGhcVersion rejects 9.2` | Unit | GHC 9.2.x 거부 (최소 9.4) | false |
| 7 | `BootTidal.hs OSC connection` | Integration | Tidal -> SuperDirt OSC 연결 | connection established |
| 8 | `extensions.json includes tidalvscode` | Unit | .vscode/extensions.json에 tidalvscode 포함 | file contains "tidalvscode" |
| 9 | `generateBootTidal includes SynthDef params` | Unit | cutoff, n 등 Phase A SynthDef 파라미터 pF/pI 정의 포함 | contains "cutoff", "n" defs |
| 10 | `generateBootTidal rejects localhost string` | Unit | "localhost" 입력 시 거부 (127.0.0.1만 허용) | throws/returns error |
| 11 | `generateBootTidal rejects non-loopback IP` | Unit | "127.0.0.2" 등 비-loopback IP 거부 | throws/returns error |

### 3.2 Test File Location
- `scripts/lib/tidal-utils.test.ts` (신규)
- `audio/tidal/test-connection.hs` (참고용 Haskell 스크립트)

### 3.3 Mock/Setup Required
- Vitest: 추가 모킹 불필요 (문자열/버전 검증)
- 통합 테스트: GHCup + SuperDirt 설치 필요 (T1, T2 선행)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/tidal/BootTidal.hs` | Create | Tidal 부트 설정 (OSC 127.0.0.1:57120 + 커스텀 파라미터) |
| `audio/tidal/sessions/.gitkeep` | Create | 라이브 세션 디렉토리 |
| `scripts/lib/tidal-utils.ts` | Create | generateBootTidal, validateGhcVersion |
| `scripts/lib/tidal-utils.test.ts` | Create | 위 유틸 vitest 테스트 |
| `.vscode/extensions.json` | Modify | tidalvscode 확장 추천 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `scripts/lib/tidal-utils.ts`:
   - `generateBootTidal()` — BootTidal.hs 내용 생성 (OSC target 127.0.0.1 강제)
   - `validateGhcVersion(version: string)` — 최소 9.4 검증
   - 커스텀 FX 파라미터(compress, saturate, loGain 등)를 Tidal에서 사용 가능하게 등록
2. `audio/tidal/BootTidal.hs` 생성:
   - `import Sound.Tidal.Context`
   - SuperDirt target 설정
   - `d1` ~ `d8` 패턴 슬롯 (orbit 0-7)
   - 커스텀 파라미터 정의 (`compress = pF "compress"` 등)
3. `.vscode/extensions.json`에 tidalvscode 추가
4. OSC 바인딩: 127.0.0.1 hardcode. 환경변수 오버라이드 금지. "localhost"/비-loopback IP 일괄 거부
4. 세션 디렉토리 생성

### 4.3 Refactor Phase
- BootTidal.hs 생성 로직을 설정 기반으로 선언형 변환 (파라미터 목록 -> Haskell 코드)

## 5. Edge Cases
- EC-1: Tidal -> SuperDirt OSC 연결 실패 시 포트 57120 점유 확인 + 재시작 안내 (PRD E3)
- EC-2: GHC 버전이 9.4 미만일 때 명확한 업그레이드 안내
- EC-3: BootTidal.hs 경로가 VS Code 워크스페이스 기준으로 정확한지 확인

## 6. Review Checklist
- [ ] Red: 테스트 실행 -> FAILED 확인됨
- [ ] Green: 테스트 실행 -> PASSED 확인됨
- [ ] Refactor: 테스트 실행 -> PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] OSC 바인딩 127.0.0.1 강제 확인 (0.0.0.0 거부)
- [ ] 기존 테스트 깨지지 않음
- [ ] 코드 스타일 준수
- [ ] 불필요한 변경 없음
