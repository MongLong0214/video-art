# Pipeline Status: Track Analyzer

**PRD**: docs/prd/PRD-track-analyzer.md (v0.3 — 하이브리드 3중 엔진)
**Size**: XL
**Current Phase**: 7 (완료)

## Tickets

| Ticket | Title | Size | Status | Tests | Depends |
|--------|-------|------|--------|-------|---------|
| T1 | 하이브리드 Python 분석 엔진 (librosa+essentia) | L | **Done** | 21 | None |
| T2 | TS 프리셋/패턴 생성 | M | **Done** | 28 | T1 |
| T3 | demucs 소스 분리 | M | **Done** | 7 | T1 |
| T4 | CLI + E2E | M | **Done** | 8 | T1,T2,T3 |

## Dependency Graph

```
T1 (Hybrid engine) ─┬─ T2 (TS preset gen)
                     ├─ T3 (demucs stems)
                     └─────────────────── T4 (CLI + E2E)
```

## Review History

| Phase | Round | Verdict | P0 | P1 | P2 | Notes |
|-------|-------|---------|----|----|-----|-------|
| 2 (v0.1) | 1 | HAS ISSUE | 0 | 12 | 6 | BPM, Key, Kick, Section, Bass, Genre, Security |
| 2 (v0.1) | 2 | ALL PASS | 0 | 0 | 0 | v0.2: HPSS, tempogram, lookup, 17 metrics |
| 4 (v0.2) | 1 | HAS ISSUE | 0 | 12 | 11 | Krumhansl, bass threshold, fxDefaults, MFCC, lock |
| 4 (v0.2) | 2 | HAS ISSUE | 0 | 5 | 10 | P1:5 P2:10 (boomer 수렴 완료) |
| 4 (v0.2) | 3 | ALL PASS | 0 | 0 | 0 | v0.3 수정: 70 tests spec |
| **1→** | **역행** | - | - | - | - | **v0.3: essentia+madmom 하이브리드 재구성. 76 tests spec** |
| 2 (v0.3) | 1 | HAS ISSUE | 0 | 4 | 8 | 이중로딩, EBU R128, mapRange 모순, 충돌해소 |
| 2 (v0.3) | 2 | ALL PASS | 0 | 0 | 0 | P1 4건 수정 확인. PRD Approved |
| 4 (v0.3) | 1 | HAS ISSUE | 0 | 0 | 4 | 버전핀, MFCC test, fixture fallback |
| 4 (v0.3) | 2 | ALL PASS | 0 | 0 | 0 | P2 4건 수정 확인. 77 tests spec |
| 6 (v0.3) | 1 | ALL PASS | 0 | 0 | 0 | P2 4건 수정 (demucs flag, acid bass, OR assert, MFCC). 64 tests PASS |
