# T8: deterministic 303 arranger + render-303 CLI

**Size**: L | **Depends**: T2, T3, T4, T7 | **PRD**: US-3, US-4

## Goal
`render-303` 엔트리 포인트를 만들어 303-only sample source만으로 arrangement를 컴파일하고 렌더한다.

## Changes

### 1. 신규 CLI
- `scripts/render-303.ts`
- 입력: reference abstraction 또는 analysis dir
- 출력: `master.wav`, optional stems, IR artifact

### 2. source purity audit
- render artifact에 사용된 source 목록 기록
- `audio/samples/303` 외 경로 사용 시 fail

### 3. deterministic arranger
- bass/riff/top/fx lane scheduling
- RR selection + seed control

## Acceptance Criteria
- [ ] AC-8.1: `render-303` CLI가 동작한다.
- [ ] AC-8.2: output은 303 sample bank만 사용한다.
- [ ] AC-8.3: optional stems가 역할별로 생성된다.
- [ ] AC-8.4: 동일 seed에서 bit-stable 또는 event-stable 결과를 낸다.
- [ ] AC-8.5: source purity audit artifact가 남는다.

## Test
```bash
npx tsx scripts/render-303.ts --help
npx vitest run scripts/lib/render-303.test.ts
```

