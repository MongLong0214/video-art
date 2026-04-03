# T6: pitch/structure abstraction hardening

**Size**: L | **Depends**: — | **PRD**: US-1, US-3

## Goal
principal voice note-event와 구조 abstraction을 분리해 안정화하고, reference abstraction의 핵심 신뢰도를 확보한다.

## Changes

### 1. `audio/analyzer/analyze_track.py`
- `pitch_to_note_events()` final note flush 수정
- slide detection semantics 정리
- structure detection에서 impossible order / duplicate label post-process 추가

### 2. abstraction output
- `roles.bass`
- `roles.riff`
- `macro.energy`
- `macro.density`

### 3. labeled fixture 추가
- sustained mono
- sparse ambient
- dense polyphonic excerpt
- build/drop 구조 fixture

## Acceptance Criteria
- [ ] AC-6.1: sustained final note가 note event로 보존된다.
- [ ] AC-6.2: synthetic mono pitch test에서 note-event F1 >= 0.90.
- [ ] AC-6.3: structure boundary mean error <= 1 bar on labeled benchmark.
- [ ] AC-6.4: impossible section order (`outro -> drop`) regression test가 추가된다.
- [ ] AC-6.5: low-confidence pitch는 warning과 함께 fallback 가능 상태로 표시된다.

## Test
```bash
uv run --with numpy --with librosa --with soundfile --with scipy --with pytest python -m pytest audio/analyzer/test_pitch_structure.py -q
```

