# T4: scene-schema audio 필드 + BPM 역산 알고리즘

**PRD Ref**: PRD-music-gen-system > US-6
**Priority**: P1 (High)
**Size**: S (< 2h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective
scene-schema.ts에 optional audio 블록 추가 + BPM 역산 알고리즘 구현 (vitest 테스트).

## 2. Acceptance Criteria
- [ ] AC-1: sceneSchema에 audio optional 필드 추가. key는 z.enum, preset은 z.string().regex(/^[a-zA-Z0-9_-]+$/)
- [ ] AC-2: 기존 scene.json (audio 없음) 파싱 정상 (하위 호환)
- [ ] AC-3: BPM 역산 함수 — `calculateBpm(duration, genre)` → { bpm, bars }. 소수점 BPM 지원
- [ ] AC-4: 기존 scene-schema.test.ts 통과 유지

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `audio field optional` | Unit | audio 없는 scene.json 파싱 | 성공 |
| 2 | `audio field valid` | Unit | 유효한 audio 객체 파싱 | 성공 |
| 3 | `audio key invalid` | Unit | key: "Xm#" → 파싱 거부 | ZodError |
| 4 | `audio preset injection` | Unit | preset: "; rm -rf /" → 파싱 거부 | ZodError |
| 5 | `calculateBpm 10s techno` | Unit | duration=10, genre=techno | bpm/bars 정수 마디 |
| 6 | `calculateBpm 7.3s trance` | Unit | duration=7.3, genre=trance | 소수점 BPM, exact match |
| 7 | `calculateBpm extreme` | Unit | duration=3, duration=60 | 유효한 결과 |
| 8 | `bpm * bars = duration` | Unit | 모든 결과에서 bars*4*60/bpm ≈ duration | ±0.001s |

### 3.2 Test File Location
- `src/lib/scene-schema.test.ts` (기존 파일 확장)
- `src/lib/bpm-calculator.test.ts` (신규)

### 3.3 Mock/Setup Required
- Vitest (기존 설정)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `src/lib/scene-schema.ts` | Modify | audio optional 필드 추가 |
| `src/lib/bpm-calculator.ts` | Create | BPM 역산 알고리즘 |
| `src/lib/scene-schema.test.ts` | Modify | audio 필드 테스트 추가 |
| `src/lib/bpm-calculator.test.ts` | Create | BPM 역산 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. scene-schema.ts에 audioSchema 추가 (key enum, preset regex, bpm optional)
2. sceneSchema에 audio optional 병합
3. bpm-calculator.ts — calculateBpm(duration, genre) 구현
4. 테스트 작성 + 실행

### 4.3 Refactor Phase
- AudioConfig 타입 export

## 5. Edge Cases
- EC-1: audio 필드 없는 기존 scene.json → 기본값 (하위 호환)
- EC-2: preset injection → regex 거부
- EC-3: 극단적 duration (3s, 60s) → 유효 BPM 범위 내 최적해

## 6. Review Checklist
- [ ] Red → FAILED
- [ ] Green → PASSED
- [ ] Refactor → PASSED 유지
- [ ] AC 전부 충족
- [ ] 기존 scene-schema.test.ts 통과 유지
