# T2: chromatic 303 bank 확장 + loudness 정규화

**Size**: L | **Depends**: T1 | **PRD**: US-2

## Goal
현재 Cm limited bank를 `C1~C5` 크로매틱 bank로 확장하고, 상업 수준 반복 사용을 위해 샘플별 loudness와 naming을 정규화한다.

## Changes

### 1. `audio/samples/303/generate.py` — chromatic generation
- 현재 `Cm scale` 고정 로직 제거 또는 옵션화
- 최소 `C1~C5`, 12 semitone 전체 지원
- saw/square 공통 생성
- articulation 최소 세트:
  - `normal`, `accent`, `long`, `stab`, `squelch`

### 2. 샘플 loudness / peak 정규화
- generated sample의 loudness 편차를 제어
- clipping/noise floor 검사
- deterministic file naming 규칙 고정

### 3. manifest generator와 연결
- 생성 후 manifest v2 자동 출력
- missing note/articulation report 생성

## Acceptance Criteria
- [ ] AC-2.1: chromatic note coverage가 `C1~C5` 전체에 대해 존재한다.
- [ ] AC-2.2: saw/square 모두 지원한다.
- [ ] AC-2.3: 각 note에 `normal`, `accent`, `long`, `stab`, `squelch`가 존재한다.
- [ ] AC-2.4: loudness outlier report가 생성된다.
- [ ] AC-2.5: generated manifest에 누락 note/articulation이 없다.

## Test
```bash
python3 audio/samples/303/generate.py
python3 -m pytest audio/samples/303 -q
```

