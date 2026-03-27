# T3: render-stems-nrt.scd NRT 멀티스템 SC 스크립트

**PRD Ref**: PRD-audio-v2-sc-integration > US-3
**Priority**: P0 (Blocker)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: None (stem-render.ts 유틸 완료)

---

## 1. Objective
Score config JSON을 읽어 14종 SynthDef를 로드하고, NRT 멀티채널(8ch) WAV를 렌더하는 SC 스크립트를 작성한다.

## 2. Acceptance Criteria
- [ ] AC-1: `sclang render-stems-nrt.scd <config.json> <output.wav>` CLI (PRD AC-3.2)
- [ ] AC-2: config JSON parseJSON → Score 빌드 (PRD AC-3.1)
- [ ] AC-3: SynthDef 14종 writeDefFile (9 instr + 4 FX + nrt_sidechain_send) (PRD AC-3.1)
- [ ] AC-4: Score.recordNRT + ServerOptions(numOutputBusChannels=8, 48kHz) (PRD AC-3.4)
- [ ] AC-5: `\nrt_sidechain_send` SynthDef 인라인 정의 (PRD AC-3.5)
- [ ] AC-6: 에러 처리 — config 파싱 실패, 빈 entries → exit 1 (PRD AC-3.3)
- [ ] AC-7: thisProcess.argv로 CLI 인자 파싱

## 3. TDD Spec (Red Phase)

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `render-stems-nrt.scd exists` | Unit | 파일 존재 | true |
| 2 | `render-stems-nrt.scd has recordNRT` | Unit | NRT 렌더 코드 | contains "recordNRT" |
| 3 | `render-stems-nrt.scd has writeDefFile` | Unit | SynthDef 로딩 | contains "writeDefFile" |
| 4 | `render-stems-nrt.scd has nrt_sidechain_send` | Unit | sidechain SynthDef | contains "nrt_sidechain_send" |
| 5 | `render-stems-nrt.scd has numOutputBusChannels` | Unit | 8ch 설정 | contains "numOutputBusChannels" |
| 6 | `render-stems-nrt.scd has parseJSON` | Unit | JSON 파싱 | contains "parseJSON" |
| 7 | `render-stems-nrt.scd has argv` | Unit | CLI 인자 | contains "argv" |
| 8 | `render-stems-nrt.scd valid SC syntax` | Integration | sclang 파싱 에러 0 | exit 0 (skipIf) |
| 9 | `render-stems-nrt.scd has error exit` | Unit | 에러 시 exit 코드 | contains "exit" |

### 3.2 Test File Location
- `scripts/lib/e2e-integration.test.ts` (공유)

## 4. Implementation Guide

### 4.1 Files
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/scores/render-stems-nrt.scd` | Create | NRT 멀티스템 렌더 |

### 4.2 Implementation Steps
1. argv 파싱 (configPath, outputPath)
2. config JSON parseJSON + entries 추출
3. SynthDef 14종 로드 (synthdefs/*.scd + custom-fx.scd + nrt_sidechain_send 인라인)
4. Score 빌드 (entries → SC Score 배열)
5. Score.recordNRT (ServerOptions 8ch, 48kHz)
