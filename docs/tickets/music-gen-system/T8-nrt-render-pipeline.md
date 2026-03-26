# T8: NRT 렌더 파이프라인

**PRD Ref**: PRD-music-gen-system > US-5
**Priority**: P1 (High)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T2, T3, T4, T7

---

## 1. Objective
SC NRT 스템 렌더 + seamless loop crossfade + ffmpeg 믹스다운. `npm run render:audio` 원커맨드.

## 2. Acceptance Criteria
- [ ] AC-1: SC NRT(`scsynth -N`) 스템 WAV 내보내기. 48kHz 32-bit float. randSeed_(42) 결정론적
- [ ] AC-2: ffmpeg 믹스다운 → -14 LUFS integrated, true peak ≤ -1 dBTP. 최종: WAV 48kHz 16-bit
- [ ] AC-3: Reverb tail 처리 — duration + 2s padding → loop-crossfade.sh seamless → exact trim. ffprobe 오차 ±1 sample
- [ ] AC-4: `npm run render:audio` — scene.json 읽기 → BPM 산출 → config 생성 → NRT → crossfade → mixdown
- [ ] AC-5: 렌더 전 디스크 공간 체크 (2x 여유). 실패 시 partial cleanup
- [ ] AC-6: PID lock file (`out/audio/.render.lock`). 동시 렌더 방지
- [ ] AC-7: 출력 WAV RMS > -60dBFS (무음 아님 검증)
- [ ] AC-8: 모든 외부 프로세스 호출은 `child_process.execFile` (array-form). `exec`/`spawn(shell:true)` 금지
- [ ] AC-9: SC NRT 스코어는 `TempoClock` 기반. NRT duration = scene.json duration ±1 sample

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `render-audio deps check` | Unit (vitest) | sclang/ffmpeg/sox which 체크 | 함수 동작 |
| 2 | `config generation` | Unit (vitest) | scene.json → config.scd 생성 | 올바른 SC 구문 |
| 3 | `NRT stem render` | Integration | scsynth -N → WAV | 파일 존재 + 포맷 |
| 4 | `loop crossfade` | Integration | sox crossfade → exact duration | ffprobe 검증 |
| 5 | `ffmpeg mixdown` | Integration | stems → master WAV | LUFS 검증 |
| 6 | `full pipeline` | Integration | render:audio E2E | exit 0 + master WAV |
| 7 | `disk space check` | Unit (vitest) | 부족 시 에러 | throw |
| 8 | `lock file` | Unit (vitest) | 이미 렌더 중 시 에러 | throw |
| 9 | `deterministic output` | Integration | 동일 입력 2회 → 동일 WAV | 바이트 일치 |

### 3.2 Test File Location
- `scripts/lib/render-audio.test.ts` (신규, vitest)
- `audio/sc/test-nrt.scd` (신규, SC NRT 테스트)
- `audio/render/test-crossfade.sh` (신규, shell)

### 3.3 Mock/Setup Required
- SC, ffmpeg, sox 설치
- T2 SynthDefs + T4 schema + T7 에너지 씬

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/render-audio.ts` | Create | 메인 오케스트레이터 |
| `scripts/lib/render-audio-utils.ts` | Create | deps check, config gen, disk check, lock |
| `scripts/lib/render-audio.test.ts` | Create | vitest 테스트 |
| `audio/sc/scores/render-nrt.scd` | Create | NRT 스코어 생성 + scsynth -N 실행 |
| `audio/render/loop-crossfade.sh` | Create | sox tail crossfade |
| `audio/sc/test-nrt.scd` | Create | NRT 테스트 |
| `package.json` | Modify | render:audio script |

### 4.2 Implementation Steps (Green Phase)
1. render-audio-utils.ts — checkDependencies(), generateConfig(), checkDiskSpace(), acquireLock()
2. render-nrt.scd — config 읽기 → SynthDef 로드 → SceneScore → OSCScore 생성 → scsynth -N 실행
3. loop-crossfade.sh — sox로 tail 2s + head 2s crossfade → trim to duration
4. render-audio.ts — 오케스트레이션: parse scene.json → calculateBpm → generateConfig → execFile sclang → execFile crossfade → execFile ffmpeg mixdown → verify output
5. ffmpeg mixdown: `ffmpeg -i stem1.wav -i stem2.wav ... -filter_complex amix -af loudnorm=I=-14:TP=-1 master.wav`
6. 출력 검증: ffprobe duration + volumedetect RMS

### 4.3 Refactor Phase
- render-audio-utils에서 공통 execFile wrapper 추출

## 5. Edge Cases
- EC-1: SC 미설치 → 명확한 에러 + setup 안내
- EC-2: NRT 크래시 → 재시도 1회 → 실패 시 에러 + partial cleanup
- EC-3: 디스크 부족 → 에러 + 필요 공간 안내
- EC-4: 동시 렌더 → lock file 에러
- EC-5: 무음 출력 → RMS 경고

## 6. Review Checklist
- [ ] Red → FAILED
- [ ] Green → PASSED
- [ ] Refactor → PASSED 유지
- [ ] AC 전부 충족
- [ ] 기존 테스트 깨지지 않음
