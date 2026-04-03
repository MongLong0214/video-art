# T1: 303 manifest v2 계약 고정 + migration adapter

**Size**: M | **Depends**: — | **PRD**: US-2, US-4

## Goal
현재 `type -> hit[]` 기반 sample manifest를 commercial 303 bank용 manifest v2로 확장하되, 기존 hybrid/sample 경로를 즉시 깨뜨리지 않도록 dual-compat adapter를 만든다.

## Changes

### 1. `audio/samples/303/manifest.schema.json` 또는 동등한 타입 계약 추가
- rich sample entry 스키마 정의:
  - `id`, `file`, `root_note`, `midi`, `waveform`, `articulation`
  - `role_tags`, `duration_ms`, `lufs`, `centroid_hz`
  - `slide`, `round_robin`, `source_bank_version`

### 2. `scripts/lib/sample-utils.ts` — v1/v2 dual-reader
- 기존 hybrid manifest(v1)와 303 bank manifest(v2)를 모두 파싱
- 런타임에 schema version 분기
- 기존 `resolveSampleRef()` 호출부 호환 유지

### 3. `scripts/lib/hybrid-render.ts` — adapter layer
- v1 manifest hit scheduling 유지
- v2 manifest는 role/query 기반 lookup에 필요한 helper만 우선 제공
- existing hybrid path는 behavior regression 없이 유지

## Acceptance Criteria
- [ ] AC-1.1: manifest v2 JSON schema 또는 동등한 타입 계약이 존재한다.
- [ ] AC-1.2: `sample-utils`가 v1/v2 둘 다 읽는다.
- [ ] AC-1.3: malformed manifest는 hard fail 또는 명시적 parse error를 반환한다.
- [ ] AC-1.4: 기존 hybrid-render tests가 통과한다.
- [ ] AC-1.5: v2 manifest reader unit test가 추가된다.

## Test
```bash
npx vitest run scripts/lib/sample-utils.test.ts
npx vitest run scripts/lib/hybrid-render.test.ts
```

