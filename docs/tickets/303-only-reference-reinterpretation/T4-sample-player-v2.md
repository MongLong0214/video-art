# T4: commercial 303 sample player v2

**Size**: L | **Depends**: T1 | **PRD**: US-4

## Goal
현재 one-shot 위주의 `sample_player`를 303-only 재해석에 필요한 commercial-grade playback engine으로 확장하거나, 별도 `sample_player_303`를 만든다.

## Changes

### 1. `audio/sc/synthdefs/sample_player.scd` 또는 신규 `sample_player_303.scd`
- 필수 지원:
  - deterministic rate transposition
  - long note sustain handling
  - crossfade release
  - slide transition playback strategy
  - mono source → stereo safe output

### 2. playback semantics 문서화
- `legato`
- `slide`
- `accent`
- `loop_mode`
- `tail_strategy`

### 3. TS renderer 호출 규약 정의
- 이벤트 param contract 고정
- unsupported mode graceful fallback

## Acceptance Criteria
- [ ] AC-4.1: note transposition 품질이 deterministic하다.
- [ ] AC-4.2: long phrase에서 click/release artifact가 발생하지 않는다.
- [ ] AC-4.3: slide fallback semantics가 문서화된다.
- [ ] AC-4.4: renderer가 player v2 contract를 사용한다.
- [ ] AC-4.5: 기존 hybrid sample path와 충돌하지 않는다.

## Test
```bash
npx vitest run scripts/lib/*sample*.test.ts
```

