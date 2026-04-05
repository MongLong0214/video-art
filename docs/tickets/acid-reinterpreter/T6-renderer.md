# T6: Step 4 — 303/909 Rendering (pedalboard + JC-303)

**Size**: L
**Depends**: T5
**Milestone**: M3
**AC**: AC-5.1 ~ AC-5.5, AC-6.1 ~ AC-6.5

## Goal
interpretation.json → pedalboard로 303 MIDI 렌더 + 909 샘플 배치 → 개별 stem WAV.

## Implementation: `scripts/lib/acid/render.py`

### CLI
```
uv run --with pedalboard,soundfile,numpy python scripts/lib/acid/render.py \
  --interpretation interpretation.json \
  --samples-dir audio/samples/909 \
  --jc303-path ~/Library/Audio/Plug-Ins/VST3/jc303.vst3 \
  --out-dir render/ \
  --sample-rate 44100 \
  --duration 20
```

### 303 렌더링 (bass_303 + riff_303)
1. JC-303 VST3 로드 (pedalboard.load_plugin)
2. interpretation.json의 트랙 이벤트 순회
3. 각 이벤트 → MIDI message 변환:
   - note_on(note_midi, velocity) at event.time
   - note_off at event.time + event.duration
   - CC messages for cutoff, resonance, envMod, decay, waveform
   - accent: velocity > 100
   - slide: 짧은 note_off→note_on 간격 (legato)
4. pedalboard로 MIDI → WAV 렌더
5. 트랙별 개별 출력: `render/bass_303.wav`, `render/riff_303.wav`

### 909 렌더링 (drums)
1. 909 샘플 로드 (soundfile)
2. interpretation.json의 kick/hat/snare 패턴 → 타임라인 배치
3. velocity 적용 (샘플 amplitude 스케일)
4. hat: open_pattern 위치에서 hat-open.wav 사용
5. 모든 드럼 트랙 합산 → `render/drums_909.wav`
6. pedalboard 내장 이펙트: HighpassFilter(30Hz) + Compressor(threshold=-10, ratio=4)

### 에러 처리
- JC-303 미설치 → "JC-303 VST3 not found at {path}. Install: https://github.com/midilab/jc303/releases" + exit 1
- 909 샘플 누락 → "Missing 909 sample: {name}.wav" + exit 1
- 렌더 결과 무음(RMS < -60dBFS) → warning

## TDD Spec
- `scripts/lib/acid/render.test.ts`
  - test: "errors when JC-303 not found" — 잘못된 경로 → 명확한 에러 메시지
  - test: "errors when 909 samples missing" — 빈 디렉토리 → 에러
  - test: "renders 909 drums from pattern" — mock interpretation → drums_909.wav 생성 + size > 0
  - test: "renders bass_303 and riff_303" — JC-303 가용 시 → 두 파일 생성 (PoC 통과 전제)
  - test: "applies velocity to 909 hits" — velocity 0.5 vs 1.0 → RMS 차이 존재
  - test: "warns on silent output" — 빈 이벤트 → warning
