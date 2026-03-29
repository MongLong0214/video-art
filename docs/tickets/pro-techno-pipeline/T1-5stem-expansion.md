# T1: 4→5 스템 확장 (kick/hat 분리)

**Size**: M | **Depends**: — | **PRD**: US-1

## Goal
기존 4스템(drums/bass/synth/fx)을 5스템(kick/bass/hat/synth/fx)으로 분리. kick과 hat/clap이 같은 drums 버스에 합쳐져 있어 개별 프로세싱 불가 → 분리.

## Changes

### 1. `scripts/lib/synth-stem-map.ts` — 버스 재할당

```
현재:
  kick → drums, bus 0     hat → drums, bus 0     clap → drums, bus 0
  bass → bass,  bus 2     synth → synth, bus 4   fx → fx, bus 6

변경:
  kick → kick, bus 0      layered_kick → kick, bus 0   sample_player(kick) → kick, bus 0
  bass → bass, bus 2      acid_bass → bass, bus 2
  hat → hat, bus 4        clap → hat, bus 4            sample_player(hat) → hat, bus 4
  synth → synth, bus 6    (supersaw,pad,lead,arp_pluck,fm_lead,wavetable_pad,granular_pad,squelch)
  fx → fx, bus 8          riser → fx, bus 8
```

- `DEFAULT_STEMS` 에서 `drums` 삭제, `kick`(bus 0) + `hat`(bus 4) 추가
- `synth` bus 4→6, `fx` bus 6→8
- `mapSamplePlayerBus()` 업데이트: hat→bus 4

### 2. `scripts/lib/stem-render.ts` — DEFAULT_STEMS 변경

```ts
export const DEFAULT_STEMS: StemConfig[] = [
  { name: "kick", bus: 0, channels: 2 },
  { name: "bass", bus: 2, channels: 2 },
  { name: "hat", bus: 4, channels: 2 },
  { name: "synth", bus: 6, channels: 2 },
  { name: "fx", bus: 8, channels: 2 },
];
```

- `buildSplitCommands()`: 10ch WAV → 5개 stereo WAV ffmpeg 추출
- outputChannels: 8→10

### 3. `audio/sc/scores/render-stems-nrt.scd` — 채널 수 변경

- `outputChannels` 기본값: `8` → `10`
- sclang NRT ServerOptions: `numOutputBusChannels_(10)`

### 4. `scripts/render-analysis.ts` — 이벤트 생성 시 새 버스 사용

- kick 이벤트: `out: 0` (변경 없음)
- hat 이벤트: `out: 4` (기존 0 → 4)
- synth 이벤트: `out: 6` (기존 4 → 6)
- fx 이벤트: `out: 8` (기존 6 → 8)

## Acceptance Criteria
- [ ] AC-1.1: 5개 스템 WAV 생성 (kick.wav, bass.wav, hat.wav, synth.wav, fx.wav)
- [ ] AC-1.2: kick.wav에 킥만, hat.wav에 햇/클랩만 포함 (크로스토크 없음)
- [ ] AC-1.3: 모든 스템 동일 SR(44100/48000), stereo, 동일 duration
- [ ] AC-1.4: 기존 analysis.json 기반 이벤트 생성 유지

## Test
```bash
# 기존 렌더 파이프라인 실행 후 스템 확인
npx tsx scripts/render-analysis.ts out/analysis/void-acid-carousel
ls -la out/analysis/void-acid-carousel/stems/
# → kick.wav bass.wav hat.wav synth.wav fx.wav (5개)
soxi out/analysis/void-acid-carousel/stems/*.wav
# → 모두 동일 SR/ch/duration
```
