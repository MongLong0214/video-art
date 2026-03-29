# T4: 909 샘플팩 통합

**Size**: M | **Depends**: T1 | **PRD**: US-3

## Goal
CC0 909 드럼 샘플 사용 옵션. `--samples 909` 플래그로 합성/샘플/하이브리드 모드 선택.

## 샘플 디렉토리 구조
```
audio/samples/909/
  kick.wav       # TR-909 kick (44100Hz, mono/stereo)
  clap.wav       # TR-909 clap
  hat-closed.wav # Closed hi-hat
  hat-open.wav   # Open hi-hat
  ride.wav       # Ride cymbal
  snare.wav      # Snare (optional)
```

## 909 샘플 소싱
무료 CC0/public domain 909 팩:
- Reverb.com Machine Drum Samples (CC0) — verified free
- Google Magenta percussion dataset
- 직접 합성 fallback: scsynth로 909-style SynthDef 렌더

> OQ-1 미해결: Isaac에게 최종 팩 선택 확인 필요

## Changes

### 1. `scripts/render-analysis.ts` — 모드 플래그
```
--mode synth     # SynthDef만 사용 (기본)
--mode samples   # 909 샘플만 (kick/hat/clap)
--mode hybrid    # 킥=샘플, 베이스/신디=SynthDef (권장)
```

### 2. `scripts/lib/synth-stem-map.ts` — 샘플 이벤트 라우팅
sample_player 이벤트에 `bufnum` 파라미터 + 올바른 버스 라우팅:
- kick 샘플 → bus 0 (kick stem)
- hat 샘플 → bus 4 (hat stem)
- clap 샘플 → bus 4 (hat stem)

### 3. NRT Score 생성 — Buffer.read 통합
```
samples 모드일 때:
1. Score 시작에 b_allocRead (버퍼 할당)
2. kick 이벤트 → nrtPlayBuf(bufnum=kick_buf, out=0)
3. hat 이벤트 → nrtPlayBuf(bufnum=hat_buf, out=4)
```

nrtPlayBuf SynthDef은 이미 render-stems-nrt.scd에 구현됨.

### 4. 하이브리드 모드 로직
```ts
if (mode === "hybrid") {
  // Drum hits → sample_player (909 samples)
  // Bass → acid_bass / bass SynthDef
  // Synth → supersaw / pad SynthDef
  // Kick: sample for body, layered_kick for sub layer
}
```

## Acceptance Criteria
- [ ] AC-4.1: audio/samples/909/ 에 최소 5개 샘플 (kick, clap, hat-closed, hat-open, ride)
- [ ] AC-4.2: `--mode samples` 시 드럼 = 909 샘플만 사용
- [ ] AC-4.3: `--mode hybrid` 시 킥=샘플+합성 레이어, 나머지 드럼=샘플
- [ ] AC-4.4: `--mode synth` (기본) 시 기존 동작 유지

## Test
```bash
# Samples mode
npx tsx scripts/render-analysis.ts out/analysis/void-acid-carousel --mode samples
soxi out/analysis/void-acid-carousel/stems/kick.wav  # should contain 909 kick

# Hybrid mode
npx tsx scripts/render-analysis.ts out/analysis/void-acid-carousel --mode hybrid

# Synth mode (default — regression)
npx tsx scripts/render-analysis.ts out/analysis/void-acid-carousel
```
