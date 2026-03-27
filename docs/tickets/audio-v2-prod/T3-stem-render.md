# T3: 멀티 스템 NRT 렌더

**PRD Ref**: PRD-audio-v2-prod > US-3
**Priority**: P0 (Blocker)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T2

---

## 1. Objective
NRT Score를 악기별 스템(drums/bass/synth/fx)으로 분리 렌더하여 DAW 믹싱이 가능한 개별 WAV 파일을 생성한다.

## 2. Acceptance Criteria
- [ ] AC-1: `npm run render:stems <score.osc>` → 4스템 WAV 렌더 (PRD AC-3.1)
- [ ] AC-2: 각 스템 48kHz 32-bit float WAV, 동일 길이 패딩 (PRD AC-3.2)
- [ ] AC-3: SynthDef→Bus 라우팅 NRT 전용. 라이브 모드 영향 없음 (PRD AC-3.3)
- [ ] AC-4: 스템 합산 = 멀티채널 NRT 풀믹스 (위상 정합, RMS 차이 < -60dB) (PRD AC-3.4)
- [ ] AC-5: `--stems` 커스텀 스템 그룹 지정 가능 (PRD AC-3.5)
- [ ] AC-6: 출력: `out/audio/{date}_{title}/stems/stem-{name}.wav` (PRD AC-3.6)
- [ ] AC-7: NRT FX 재구성 — FX 4종(comp/sidechain/sat/eq)을 Score 내 노드로 삽입. addAfter 순서 보장
- [ ] AC-8: NRT sidechain — static bus(100) 할당. kick→write, 타 스템 comp→read (OQ-3 검증)
- [ ] AC-9: scsynth `-o 8` 멀티채널 출력 후 sox/ffmpeg로 2ch 스템 분리 (OQ-2 검증)
- [ ] AC-10: render-stems-nrt.scd에서 instrument 9종 + FX 4종 writeDefFile 로드
- [ ] AC-11: package.json에 `render:stems` script 추가
- [ ] AC-12: .render.lock 기반 동시 렌더 방지 (PRD E11)
- [ ] AC-13: CLI 입력 경로 validateFilePath() 검증 (.osc 확장자 허용)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `getStemBus kick returns drums bus` | Unit | kick → bus 0-1 | { bus: 0, channels: 2 } |
| 2 | `getStemBus supersaw returns synth bus` | Unit | supersaw → bus 4-5 | { bus: 4, channels: 2 } |
| 3 | `getStemBus all 9 mapped` | Unit | 9종 전부 매핑 | all have valid bus |
| 4 | `parseCustomStems valid input` | Unit | --stems "kick:kick bass:bass" | parsed groups |
| 5 | `parseCustomStems invalid format` | Unit | 잘못된 형식 | throws error |
| 6 | `generateNrtScore inserts FX nodes` | Unit | events + FX → Score with FX nodes | FX \s_new after instrument |
| 7 | `generateNrtScore FX order correct` | Unit | sidechain→comp→sat→eq 순서 | ordered node IDs |
| 8 | `generateNrtScore sidechain bus 100` | Unit | kick write bus 100, comp read bus 100 | correct bus routing |
| 9 | `splitMultiChannelWav 8ch to 4x2ch` | Unit | 8ch 파일 → 4 스템 split 명령 생성 | 4 sox/ffmpeg commands |
| 10 | `stemOutputPath formats correctly` | Unit | date+title → stems/ 경로 | correct path |
| 11 | `render-stems-nrt.scd loads SynthDefs` | Integration | sclang 실행 → 13종 writeDefFile | exit code 0 |
| 12 | `scsynth -o 8 NRT output` | Integration | scsynth 멀티채널 → 8ch WAV | ffprobe: ch=8, 48kHz, float |
| 13 | `stem sum phase coherence` | Integration | 4스템 sum vs 8ch downmix | RMS diff < -60dB |
| 14 | `sidechain NRT verification` | Integration | kick→bus100→comp | signal detected |
| 15 | `concurrent render rejected` | Unit | .render.lock 활성 시 거부 | throws "render in progress" |
| 16 | `disk space check before render` | Unit | 2x 안전 마진 확인 | true/false |
| 17 | `stem-router does not import live modules` | Unit | 소스에 live-orchestrator/health import 없음 | static check pass |
| 18 | `package.json has render:stems script` | Unit | scripts["render:stems"] 존재 | key exists |
| 19 | `validateFilePath osc extension` | Unit | .osc 확장자 허용 | true |

### 3.2 Test File Location
- `scripts/lib/stem-render.test.ts` (신규)

### 3.3 Mock/Setup Required
- Vitest: `vi.mock('node:child_process')` — scsynth/sox 모킹
- SC 통합: scsynth + sclang 필요 (TC-11~14: mock 비활성화, 실제 실행)
- 테스트 fixture: beforeAll에서 tmp에 동적 생성 (test-score.osc 샘플)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/scores/render-stems-nrt.scd` | Create | 멀티 Bus NRT Score 실행 + SynthDef 로딩 |
| `scripts/lib/stem-router.ts` | Create | SynthDef→Bus 매핑, 커스텀 그룹 파싱 |
| `scripts/lib/stem-render.ts` | Create | NRT Score 생성 (FX 노드 삽입), scsynth 실행, WAV split |
| `scripts/lib/stem-render.test.ts` | Create | vitest 테스트 |
| `scripts/render-stems.ts` | Create | CLI 엔트리포인트 |
| `package.json` | Modify | render:stems script 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `scripts/lib/stem-router.ts`:
   - synth-stem-map (T2에서 생성) 활용
   - `getStemBus(synthDef)` → bus number
   - `parseCustomStems(arg)` → 커스텀 그룹
2. `scripts/lib/stem-render.ts`:
   - `generateNrtScore(oscScore, stemMap)` → FX 노드 삽입 + Bus 라우팅 + 노드 순서 보장
   - `executeScsynthNrt(scorePath, outputPath, channels=8)` → execFile 실행
   - `splitMultiChannelWav(inputPath, stemConfig)` → sox/ffmpeg로 2ch 스템 분리
3. `audio/sc/scores/render-stems-nrt.scd` — instrument 9종 + FX 4종 writeDefFile + Score 로드 + scsynth -N 실행
4. `scripts/render-stems.ts` — CLI 엔트리 + validateFilePath + stemRender 호출
5. package.json script 추가

### 4.3 Refactor Phase
- NRT Score 생성 로직을 선언형 config로 변환 (SynthDef 목록 + FX 체인 정의)

## 5. Edge Cases
- EC-1: 스템 렌더 중 디스크 부족 → 중단 + 기존 파일 보호 (PRD E3)
- EC-2: scsynth NRT 크래시 → exit code 체크 + 에러 리포트 (PRD E6)
- EC-3: sidechain bus 100 미사용 시 (kick 없는 세션) → 정상 동작 (빈 sidechain)
- EC-4: 동시 렌더 → .render.lock 거부 (PRD E11)
- EC-5: OQ-2 spike 실패 (sox/ffmpeg split 불가) → fallback: 개별 scsynth 실행 per stem (느리지만 확실)
- EC-6: OQ-3 spike 실패 (NRT sidechain 불가) → sidechain 비활성, sidechain 없이 렌더. v0.2에서 재검토

## 6. Review Checklist
- [ ] Red: 테스트 실행 -> FAILED 확인됨
- [ ] Green: 테스트 실행 -> PASSED 확인됨
- [ ] Refactor: 테스트 실행 -> PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] OQ-2 (sox vs ffmpeg split) 결과 기록
- [ ] OQ-3 (NRT sidechain) 결과 기록
- [ ] 위상 정합 < -60dB 확인
- [ ] execFile-only 확인
- [ ] 기존 184 테스트 깨지지 않음
