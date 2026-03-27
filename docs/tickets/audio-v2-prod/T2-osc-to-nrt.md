# T2: OSC → NRT 변환기

**PRD Ref**: PRD-audio-v2-prod > US-2
**Priority**: P0 (Blocker)
**Size**: M (4-8h)
**Status**: Todo
**Depends On**: T1

---

## 1. Objective
.osclog JSONL 파일을 SC NRT Score 포맷으로 변환하여, 라이브 세션을 오프라인 렌더링할 수 있게 한다.

**T2/T3 경계**: T2 출력 .osc는 instrument `\s_new` 엔트리만 포함 (FX 파라미터는 instrument args에 내장). T3가 FX 노드 추출 + 삽입을 담당.

## 2. Acceptance Criteria
- [ ] AC-1: `npm run prod:convert <path_or_dir>` → .osclog → .osc 변환. 단일 파일 + 디렉토리(멀티파트 glob) 지원 (PRD AC-2.1)
- [ ] AC-2: SynthDef 매핑 — 커스텀 9종만 지원. Dirt-Samples skip + 경고 (PRD AC-2.2)
- [ ] AC-3: 타이밍 — session-relative 변환 (captured_ts - session_start_ts). OQ-1 A/B 테스트 (PRD AC-2.3)
- [ ] AC-4: FX 파라미터 보존 — compress/saturate/eq 파라미터 NRT Score 포함 (PRD AC-2.4)
- [ ] AC-5: 미매핑 이벤트 skip + 경고. 변환 중단 안 함 (PRD AC-2.5)
- [ ] AC-6: 변환 요약 — 총/성공/skip + skip>10% WARNING, >50% ERROR (PRD AC-2.6)
- [ ] AC-7: 파라미터 정규화 — gain↔amp 등 별칭 해석 (PRD AC-2.7)
- [ ] AC-8: 멀티파트 병합 — 파일명 순 정렬, ts offset 적용, 연속성 보장
- [ ] AC-9: CLI 입력 경로 validateFilePath() 검증 (.osclog 확장자 허용)
- [ ] AC-10: package.json에 `prod:convert` script 추가

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `mapSynthDef known kick` | Unit | s="kick" → SynthDef \kick | mapped |
| 2 | `mapSynthDef unknown 808` | Unit | s="808" → skip + warning | null + warning |
| 3 | `mapSynthDef all 9 custom` | Unit | 9종 전부 매핑 | all 9 mapped |
| 4 | `convertTimestamp session-relative` | Unit | absolute ts → session-relative | nrt_time = ts - start_ts |
| 5 | `convertTimestamp first event is 0` | Unit | 첫 이벤트 ts = 0.0 | nrt_time = 0.0 |
| 6 | `preserveFxParams compress` | Unit | compress, threshold → Score args | args contain compress values |
| 7 | `preserveFxParams saturate+eq` | Unit | saturate, loGain → Score args | all FX params included |
| 8 | `normalizeParams gain to amp` | Unit | { gain: 0.8 } → { amp: 0.8 } | normalized |
| 9 | `normalizeParams unknown preserved` | Unit | { customParam: 1 } → 보존 + 경고 | preserved with warning |
| 10 | `generateSummary counts` | Unit | 100 events, 80 mapped, 20 skip | { total:100, mapped:80, skipped:20 } |
| 11 | `generateSummary skip warning 15%` | Unit | skip 15% | WARNING level |
| 12 | `generateSummary skip error 60%` | Unit | skip 60% | throws ERROR |
| 13 | `mergeMultiPart 3 files` | Unit | 3 part 파일 → 연속 타임스탬프 | merged events with offsets |
| 14 | `mergeMultiPart sorted by filename` | Unit | 파일명 순 정렬 확인 | correct order |
| 15 | `convertToScore valid output` | Integration | .osclog → .osc 파일 생성 | valid SC Score format |
| 16 | `validateFilePath osclog extension` | Unit | .osclog 확장자 허용 | true |
| 17 | `validateFilePath rejects txt` | Unit | .txt 확장자 거부 | false |
| 18 | `directory input globs all osclog files` | Unit | 디렉토리 → .osclog 파일 glob + 정렬 | files in order |
| 19 | `package.json has prod:convert script` | Unit | scripts["prod:convert"] 존재 | key exists |

### 3.2 Test File Location
- `scripts/lib/osc-to-nrt.test.ts` (신규)

### 3.3 Mock/Setup Required
- Vitest: `vi.mock('node:fs')` — 파일 읽기/쓰기 모킹
- 테스트 fixture: `scripts/lib/__fixtures__/test-session.osclog` (샘플 JSONL)

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `scripts/lib/osc-to-nrt.ts` | Create | JSONL 파싱, SynthDef 매핑, 타이밍 변환, FX 보존, Score 생성 |
| `scripts/lib/osc-to-nrt.test.ts` | Create | vitest 테스트 |
| `scripts/lib/synth-stem-map.ts` | Create | SynthDef→스템 매핑 + 파라미터 별칭 config |
| `scripts/prod-convert.ts` | Create | CLI 엔트리포인트 |
| `package.json` | Modify | prod:convert script 추가 |

### 4.2 Implementation Steps (Green Phase)
1. `scripts/lib/synth-stem-map.ts` — 9종 SynthDef 매핑 + gain↔amp 별칭 테이블 + FX 파라미터 목록
2. `scripts/lib/osc-to-nrt.ts`:
   - `parseOscLog(path)` — JSONL 파싱 (손상 라인 skip)
   - `mergeMultiPart(dir)` — 파일명 순 정렬 + ts offset
   - `mapSynthDef(s)` — 커스텀 9종 매핑, 미매핑 skip
   - `normalizeParams(params)` — 별칭 해석
   - `convertToScore(events)` — SC Score 포맷 생성 ([\s_new, defName, nodeId, 0, 0, ...args])
   - `generateSummary(events, mapped, skipped)` — 요약 + threshold 검사
3. `scripts/prod-convert.ts` — CLI argv 파싱 + validateFilePath + convertToScore 호출
4. package.json script 추가

### 4.3 Refactor Phase
- SynthDef 매핑 테이블을 JSON config로 외부화 (B-PRESET 확장 준비)

## 5. Edge Cases
- EC-1: .osclog 파일 손상 (불완전 JSON 라인) → skip + 경고 (PRD E4)
- EC-2: 0개 이벤트 → 에러 "no events found" (PRD E5)
- EC-3: skip>50% → ERROR 중단 (PRD AC-2.6)
- EC-4: 멀티파트 간 타임스탬프 불연속 → offset 적용으로 해결

## 6. Review Checklist
- [ ] Red: 테스트 실행 -> FAILED 확인됨
- [ ] Green: 테스트 실행 -> PASSED 확인됨
- [ ] Refactor: 테스트 실행 -> PASSED 유지 확인됨
- [ ] AC 전부 충족
- [ ] execFile-only 확인
- [ ] 기존 184 테스트 깨지지 않음
