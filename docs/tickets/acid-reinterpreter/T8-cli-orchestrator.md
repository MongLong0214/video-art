# T8: CLI Orchestrator — acid-reinterpreter.ts

**Size**: M
**Depends**: T2, T3, T5, T6, T7
**Milestone**: M4
**AC**: AC-1.1 ~ AC-1.8

## Goal
단일 CLI 명령으로 5단계 파이프라인을 순차 실행하는 오케스트레이터.

## Implementation: `scripts/acid-reinterpreter.ts`

### CLI
```
npx tsx scripts/acid-reinterpreter.ts <input.wav> [options]

Options:
  --start <seconds>     구간 시작 (기본: 자동)
  --duration <seconds>  구간 길이 (기본: 20)
  --out-dir <path>      출력 디렉토리 (기본: out/acid/{timestamp}/)
  --dry-run             분석+해석까지만 (렌더링 스킵)
  --resume              기존 산출물 재활용
  --jc303-path <path>   JC-303 VST3 경로 (기본: ~/Library/Audio/Plug-Ins/VST3/jc303.vst3)
```

### 로직
1. **입력 검증** (AC-1.7)
   - 파일 존재 확인
   - 확장자: .wav/.flac/.mp3만 허용
   - soundfile로 로드 시도 → 실패 시 "Invalid audio file"
   - 10초 미만 → "Audio too short (min 10s)"
   - RMS < -60dBFS → "Audio appears silent"
2. **출력 디렉토리** 생성
3. **Step 1: Separate** — `separate.ts` 호출 → stems/
   - `--resume` 시 stems/ 존재하면 스킵
4. **Step 2: Analyze** — Python subprocess 호출 → analysis.json
   - `--resume` 시 analysis.json 존재하면 스킵
   - `--start`/`--duration` 전달
5. **Step 3: Interpret** — `interpret.ts` 호출 → interpretation.json
   - `--resume` 시 interpretation.json 존재하면 스킵
6. **Step 4: Render** — Python subprocess 호출 → render/
   - `--dry-run` 시 여기서 종료
   - `--resume` 시 render/ 존재하면 스킵
7. **Step 5: Master** — Python subprocess 호출 → master.wav + qc.json
8. **결과 출력**: 파일 경로 + QC 요약

### 에러 처리
- 각 단계 실패 시 즉시 abort (부분 산출물 보존)
- Python subprocess: execFile, timeout 각 단계별 (§4.4 IPC 규약)
- 진행 상황 로그: `[1/5] Separating stems...`, `[2/5] Analyzing...` 등

## TDD Spec
- `scripts/acid-reinterpreter.test.ts`
  - test: "rejects non-audio file" — .txt 입력 → 에러
  - test: "rejects short audio" — 5초 WAV → "too short"
  - test: "rejects silent audio" — 무음 WAV → "appears silent"
  - test: "creates output directory" — 실행 후 out/acid/... 존재
  - test: "runs all 5 steps in order" — mock 각 단계, 호출 순서 검증
  - test: "dry-run stops after interpret" — --dry-run → render/master 미호출
  - test: "resume skips existing artifacts" — stems/ 존재 → separate 미호출
  - test: "preserves partial artifacts on failure" — Step 3 실패 → stems/ + analysis.json 보존
