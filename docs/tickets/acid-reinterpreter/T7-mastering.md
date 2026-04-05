# T7: Step 5 — Mixing & Mastering

**Size**: M
**Depends**: T6
**Milestone**: M3
**AC**: AC-7.1 ~ AC-7.6

## Goal
개별 stem (bass_303, riff_303, drums_909) → 믹스 → 마스터 → master.wav.

## Implementation: `scripts/lib/acid/master.py`

### CLI
```
uv run --with pedalboard,soundfile,numpy,pyloudnorm python scripts/lib/acid/master.py \
  --bass render/bass_303.wav \
  --riff render/riff_303.wav \
  --drums render/drums_909.wav \
  --interpretation interpretation.json \
  --out master.wav \
  --sample-rate 44100
```

### 믹싱
1. 3 stem 로드 (soundfile)
2. 길이 정규화 (가장 긴 stem 기준, 짧은 stem은 zero-pad)
3. 레벨 밸런싱:
   - drums_909: 0dB (기준)
   - bass_303: -2dB
   - riff_303: -4dB
4. FX 적용 (interpretation.json의 fx 파라미터):
   - pedalboard.Reverb(room_size=fx.reverb_send)
   - pedalboard.Delay(delay_seconds=fx.delay_time, mix=fx.delay_send)
   - bass_303/riff_303에만 reverb/delay 적용, drums는 dry
5. 합산 → mix

### 마스터링
1. pedalboard 체인:
   - HighpassFilter(30Hz) — DC offset 제거
   - PeakFilter(60Hz, gain=+2dB) — kick body
   - Compressor(threshold=-12dB, ratio=3, attack=10ms, release=100ms)
   - Limiter(threshold=-1dB)
2. pyloudnorm → -14 LUFS 노멀라이제이션
3. peak > 0.98 → 0.95로 스케일

### QC
- LUFS: -16 ~ -12 범위
- peak: < -0.3dBFS
- clipping: 0
- 스테레오 확인
- QC 결과 → `qc.json` (Zod qcSchema 준수)
- QC 실패 → warning + master.wav는 생성 (사용자 판단)

### 출력
- `master.wav` (44.1kHz, 16bit, stereo)
- `qc.json`

## TDD Spec
- `scripts/lib/acid/master.test.ts`
  - test: "mixes 3 stems to stereo" — 3 테스트 WAV → mix 길이 = max(3 stems)
  - test: "applies level balancing" — drums > bass > riff in final mix
  - test: "normalizes to -14 LUFS" — 출력 LUFS ∈ [-15, -13]
  - test: "produces valid qc.json" — Zod qcSchema 검증 통과
  - test: "warns on QC failure but still outputs" — LUFS 범위 초과 → warning + 파일 존재
  - test: "output is 16bit stereo WAV" — subtype=PCM_16, channels=2
