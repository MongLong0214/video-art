# PRD: Audio System v2 — B-LIVE (Real-time Sound Design + Live Performance)

**Version**: 0.2
**Author**: Isaac (AI-assisted)
**Date**: 2026-03-26
**Status**: Draft
**Size**: XL
**Scope**: LIVE 모드만. PRODUCTION 파이프라인(OSC→NRT→스템→DAW)은 B-PROD PRD로 분리.

---

## 1. Problem Statement

### 1.1 Background
Phase A는 NRT 전용. scene.json 5개 파라미터로는 프로급 전자음악 불가. Isaac은 실시간으로 소리를 들으며 직접 작곡하고, 라이브 퍼포먼스도 하고 싶다.

### 1.2 Problem Definition
1. 이펙트 없음 → 아마추어 사운드
2. 실시간 피드백 없음 → 창작 흐름 단절
3. 라이브 퍼포먼스 불가

### 1.3 Impact of Not Solving
- 창작 속도 저하 (NRT 사이클 반복)
- 라이브 활동 불가
- 음질이 프로 수준에 못 미침

## 2. Goals & Non-Goals

### 2.1 Goals
- [ ] G1: SC FX Chain — SuperDirt 아키텍처 내에서 reverb/delay/comp/eq/saturator 제공. **SuperDirt orbit 기반 라우팅 사용 (커스텀 Bus 병렬 시스템 아님)**
- [ ] G2: SuperDirt + 샘플 통합 — Phase A SynthDef을 SuperDirt에 등록 + Dirt-Samples
- [ ] G3: TidalCycles 라이브 코딩 — 실시간 패턴 + 즉흥 연주
- [ ] G4: 라이브 퍼포먼스 셋업 — 노트북 1대, `npm run live:start` 원커맨드
- [ ] G5: 라이브 녹음 — 실시간 재생을 WAV로 동시 캡처

### 2.2 Non-Goals
- NG1: NRT 프로덕션 파이프라인 (B-PROD 범위)
- NG2: OSC 로그 → NRT 변환 (B-PROD 범위)
- NG3: DAW 스템 익스포트 (B-PROD 범위)
- NG4: 멀티 장르 프리셋 자동 전환 (B-PROD에서 콘텐츠로)
- NG5: GUI 컨트롤러/MIDI 매핑
- NG6: 멀티 플레이어

## 3. User Stories & Acceptance Criteria

### US-1: SuperDirt FX 통합
**As a** 프로듀서, **I want** SuperDirt의 이펙트 시스템에 커스텀 FX를 추가할 수 있기를, **so that** 프로덕션급 사운드를 실시간으로 얻을 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: SuperDirt 부팅 시 기본 FX(reverb, delay, leslie, phaser, tremolo 등) + 커스텀 FX(compressor, sidechain, saturator, eq) 로드. 에러 0
- [ ] AC-1.2: Tidal에서 `# room 0.5 # delay 0.3 # compress 0.7` 등으로 FX 파라미터 실시간 제어
- [ ] AC-1.3: 커스텀 FX SynthDef은 SuperDirt의 orbit 시스템과 통합 (병렬 Bus 아키텍처 아님). **OQ-1 해결**: SuperDirt `~dirt.addModule` API로 커스텀 FX 삽입
- [ ] AC-1.4: Sidechain — kick orbit의 amp를 다른 orbit의 compressor 트리거로 사용

### US-2: SuperDirt + Phase A SynthDef 등록
**As a** 프로듀서, **I want** Phase A의 9종 SynthDef를 Tidal에서 호출할 수 있기를, **so that** 커스텀 합성음과 샘플을 섞어 사용할 수 있다.

**Acceptance Criteria:**
- [ ] AC-2.1: SuperDirt Quarks 설치 + `SuperDirt.start` 에러 0
- [ ] AC-2.2: Dirt-Samples 기본 샘플팩 로드 (808 킥/스네어/하이햇 등)
- [ ] AC-2.3: Phase A SynthDef 9종을 SuperDirt SynthDef으로 등록. Tidal에서 `d1 $ s "kick" # drive 0.3`, `d2 $ s "supersaw" # cutoff 2000` 호출 가능
- [ ] AC-2.4: 커스텀 샘플 디렉토리 (`audio/samples/`) 추가 로드. 경로는 `audio/samples/` 하위만 허용 (path traversal 방지: realpath 정규화)

### US-3: TidalCycles 설치 + 연결
**As a** 라이브 코더, **I want** TidalCycles가 SuperDirt와 연결되어 코드 입력 즉시 소리가 나기를, **so that** 실시간으로 음악을 만들 수 있다.

**Acceptance Criteria:**
- [ ] AC-3.1: GHCup + GHC + cabal 설치. **`brew install ghcup` 우선, curl 사용 시 SHA256 체크섬 검증**
- [ ] AC-3.2: `cabal install tidal` 성공. GHC 버전 pinning (최소 9.4, 권장 9.6). `import Sound.Tidal.Context` 에러 0
- [ ] AC-3.3: Tidal → SuperDirt OSC 통신 (127.0.0.1:57120). `d1 $ s "bd"` 소리 재생 확인. **OSC 바인딩 127.0.0.1 강제 (0.0.0.0 금지)**
- [ ] AC-3.4: VS Code `tidalvscode` 확장 설치. Ctrl+Enter로 코드 블록 실행
- [ ] AC-3.5: 커스텀 SynthDef Tidal 호출: `d1 $ s "supersaw" # n "0 4 7" # cutoff 2000`

### US-4: 라이브 퍼포먼스 부팅/종료
**As a** 퍼포머, **I want** 원커맨드로 전체 라이브 스택을 부팅/종료할 수 있기를, **so that** 공연 전 복잡한 설정이 필요 없다.

**Acceptance Criteria:**
- [ ] AC-4.1: `npm run live:start` → SC 서버 부팅 + SuperDirt 시작 + Tidal 에디터 안내. 에러 시 명확한 진단
- [ ] AC-4.2: `npm run live:stop` → SIGTERM → 3초 대기 → SIGKILL. 녹음 중이면 `/quit` OSC 선행. 좀비 0
- [ ] AC-4.3: 오디오 레이턴시 < 20ms (SC blockSize 64)
- [ ] AC-4.4: CPU < 50% (4패턴 + FX, MacBook Pro M1 기준)
- [ ] AC-4.5: **크래시 복구** — scsynth 크래시 시 자동 재시작 + SuperDirt 재부팅. 오디오 중단 < 10초
- [ ] AC-4.6: **메모리 안정성** — 60분+ 세션에서 메모리 증가율 < 10MB/분. SC 메모리 > 1.5GB 시 경고

### US-5: 라이브 녹음
**As a** 퍼포머, **I want** 실시간 재생을 WAV로 녹음할 수 있기를, **so that** 공연 후 결과물을 보존할 수 있다.

**Acceptance Criteria:**
- [ ] AC-5.1: `npm run live:record` → SC `s.record` 시작. 출력: `out/audio/{date}_{title}/live-recording.wav` (48kHz 32-bit float)
- [ ] AC-5.2: 녹음 중 디스크 부족 시 녹음 중단 + 기존 파일 보호
- [ ] AC-5.3: `npm run live:stop` 시 녹음 자동 종료 + 파일 finalize

## 4. Technical Design

### 4.1 Architecture (LIVE MODE)

```
VS Code (tidalvscode)
    │ Haskell eval
TidalCycles (GHCi)
    │ OSC 127.0.0.1:57120
SuperDirt (SC Quark)
    ├── Dirt-Samples (808, etc.)
    ├── Custom SynthDefs (Phase A 9종)
    ├── Custom FX Modules (comp/sidechain/sat/eq)
    │   └── via ~dirt.addModule (SuperDirt API)
    └── orbit 0-7 (8채널 독립 라우팅)
         │
    SC Master Bus → Audio Output
                  → SC s.record (녹음)
```

### 4.2 FX 통합 전략 (P0 해결)

**결정: SuperDirt 내부 FX 시스템 사용. 커스텀 Bus 병렬 아키텍처 폐기.**

SuperDirt는 `~dirt.addModule`로 커스텀 FX를 orbit 체인에 삽입:
```supercollider
~dirt.addModule('customCompressor', { |dirtEvent|
    dirtEvent.sendSynth('customCompressor',
        [\compress, ~compress, \threshold, ~threshold])
});
~dirt.orderModules(['customCompressor', 'superdirt_reverb', 'superdirt_delay']);
```

Tidal에서:
```haskell
d1 $ s "kick" # compress 0.7 # threshold (-10)
```

이 방식으로 OQ-1(orbit↔FX 충돌) 완전 해소. SuperDirt가 라우팅 전담.

### 4.3 Phase A 코드 영향 (P0 해결)

**"100% 유지" 철회. 수정 필요 파일 명시:**

| 파일 | 변경 | 이유 |
|------|------|------|
| `src/lib/scene-schema.ts` | `duration` max 60 → 300 | 프로덕션 트랙 지원 (B-PROD 선행) |
| `src/lib/bpm-calculator.ts` | genre enum 확장 | 5장르 BPM 범위 추가 |
| `audio/sc/synthdefs/*.scd` | `\out` 파라미터 유지 (변경 없음) | SuperDirt가 자체 out 관리 |
| `audio/setup.sh` | GHCup/Tidal/SuperDirt 설치 추가 | v2 의존성 |
| Phase A 테스트 | regression 검증 | 106 vitest 유지 |

### 4.4 Key Technical Decisions

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| FX 아키텍처 | SuperDirt `addModule` | orbit 충돌 제거. SuperDirt가 라우팅 전담 |
| 라이브 코딩 | TidalCycles | 패턴 표현력 최고, SC 네이티브 |
| GHCup 설치 | `brew install ghcup` 우선 | curl\|sh 보안 리스크 회피 |
| OSC 바인딩 | 127.0.0.1 강제 | 공연장 네트워크 인젝션 방지 |
| 에디터 | VS Code tidalvscode | Isaac 기존 IDE |
| 크래시 복구 | SC 자동 재시작 + SuperDirt 재부팅 | 라이브 연속성 |

### 4.5 디렉토리 구조 (추가분)

```
audio/
├── sc/
│   ├── superdirt/           # (신규)
│   │   ├── boot.scd         # SuperDirt.start + 커스텀 SynthDef 등록 + FX 모듈
│   │   └── custom-fx.scd    # compressor, sidechain, saturator, eq FX SynthDefs
│   └── ...                  # (기존 유지)
├── tidal/                   # (신규)
│   ├── BootTidal.hs         # Tidal 부트 설정
│   └── sessions/            # 라이브 세션 .tidal 파일
├── samples/                 # (신규) 커스텀 샘플
│   └── README.md            # 샘플 추가 가이드
└── ...

scripts/
├── live-start.ts            # (신규)
├── live-stop.ts             # (신규)
└── ...
```

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | GHCup/cabal 설치 실패 | brew 우선 → 실패 시 curl + checksum 검증 → 수동 가이드 | P1 |
| E2 | SuperDirt Quark 서버 다운 | 재시도 3회 → 오프라인 설치 경로 | P1 |
| E3 | Tidal→SuperDirt OSC 연결 실패 | 포트 57120 점유 확인 + 재시작 | P1 |
| E4 | FX CPU 과부하 | CPU > 70% → 가장 무거운 FX bypass + 경고. CPU < 50% 5초 안정 시 fade-in 복원 | P2 |
| E5 | scsynth 크래시 (라이브 중) | 자동 재시작 + SuperDirt 재부팅. 중단 < 10초 | P1 |
| E6 | 메모리 누수 (장시간 세션) | 60분마다 SC 메모리 체크. > 1.5GB 경고 | P2 |
| E7 | 녹음 중 디스크 부족 | 녹음 중단 + 기존 WAV 보호 | P1 |
| E8 | SIGKILL 좀비 프로세스 | live:stop에서 SIGTERM → 3초 → SIGKILL. 녹음 시 `/quit` OSC 선행 | P1 |
| E9 | 커스텀 샘플 path traversal | realpath 정규화 + `audio/samples/` 하위만 허용 | P1 |

## 6. Security & Permissions
- OSC 127.0.0.1 강제 바인딩 (공연장 네트워크 보호)
- GHCup: `brew install ghcup` 우선. curl 시 SHA256 검증
- 커스텀 샘플: realpath + `audio/samples/` 하위 강제
- execFile array-form 정책 유지 (Phase A 계승)
- 신규 스크립트 전부 execFile 테스트 포함

## 7. Performance & Monitoring

| Metric | Target | Measurement |
|--------|--------|-------------|
| 오디오 레이턴시 | < 20ms | SC blockSize 64 |
| CPU (4패턴+FX) | < 50% | SC `s.avgCPU` |
| 메모리 (SuperDirt) | < 2GB | SC + Activity Monitor |
| 메모리 증가율 | < 10MB/분 (60분+) | 주기적 체크 |
| 크래시 복구 | < 10초 | 자동 재시작 시간 |

## 8. Testing Strategy

### 8.1 Unit Tests (vitest)
- live-start/stop 프로세스 관리 로직
- Phase A regression (106 기존 테스트 유지)
- 신규 스크립트 execFile 사용 강제 테스트

### 8.2 Integration Tests (SC + shell)
- SuperDirt 부팅 + 커스텀 SynthDef 등록 → 에러 0
- 커스텀 FX 모듈 로드 → 에러 0
- Tidal → SuperDirt → FX → 출력 정상

### 8.3 Edge Case Tests
- CPU 과부하 FX bypass
- 장시간 세션 메모리 모니터링

## 9. Rollout Plan

| Step | 내용 | 추정 |
|------|------|------|
| B-1 | setup.sh v2 (GHCup + Tidal + SuperDirt 설치) | S (2-4h) |
| B-2 | SuperDirt boot.scd + Phase A SynthDef 등록 | M (4-8h) |
| B-3 | 커스텀 FX 모듈 (comp/sidechain/sat/eq) | M (4-8h) |
| B-4 | TidalCycles 연결 + BootTidal.hs | M (4-8h) |
| B-5 | live-start.ts / live-stop.ts 오케스트레이터 | M (4-8h) |
| B-6 | 라이브 녹음 (SC s.record) | S (2-4h) |

**총 추정: 20-40h 구현. 학습/디버깅 포함 30-50h.**

### 9.2 Rollback
1. `audio/sc/superdirt/`, `audio/tidal/`, `audio/samples/` 삭제
2. `scripts/live-start.ts`, `live-stop.ts` 삭제
3. package.json에서 live:* scripts 제거
4. `ghcup nuke` + `Quarks.uninstall("SuperDirt")`
5. Phase A 코드 변경분 revert (duration, genre enum)

## 10. Dependencies & Risks

| Risk | Prob | Impact | Mitigation |
|------|------|--------|------------|
| GHCup arm64 빌드 실패 | 낮음 | 높음 | `brew install ghcup` 우선, 공식 arm64 바이너리 |
| SuperDirt↔커스텀 FX 충돌 | **해결됨** | - | `addModule` API로 SuperDirt 내부 통합 |
| CPU 과부하 | 중간 | 중간 | FX bypass 자동화 |
| Phase A regression | 낮음 | 높음 | 106 vitest + SC 테스트 유지 |
| Tidal 버전 비호환 | 중간 | 중간 | GHC 9.6 + tidal 1.9.x 고정 |

## 11. Open Questions

- [x] ~~OQ-1: SuperDirt orbit↔커스텀 FX 충돌~~ → **해결: `addModule` API 사용**
- [x] ~~OQ-2: `addModule`로 sidechain (cross-orbit) 구현 가능 여부~~ → **해결: `In.ar` + `~sidechainBus` (dedicated audio bus)로 cross-orbit 신호 전달 성공. T3에서 구현 완료**
- [ ] OQ-3: Ableton Live Lite 트랙 수 제한 → B-PROD 범위로 이관

---

## Changelog
### v0.2 (2026-03-26) — Phase 2 리뷰 반영
- PRD 분리: B-LIVE / B-PROD (boomer RECONSIDER 반영)
- [P0 fix] SuperDirt `addModule` 아키텍처로 전환 (커스텀 Bus 폐기)
- [P0 fix] Phase A "100% 유지" 철회. 수정 파일 명시
- [P1 fix] GHCup: brew 우선 + SHA256 검증
- [P1 fix] OSC 127.0.0.1 강제 바인딩
- [P1 fix] 크래시 복구 AC-4.5 추가
- [P1 fix] 메모리 안정성 AC-4.6 추가
- [P1 fix] SIGTERM→SIGKILL 정책 명시
- [P1 fix] 커스텀 샘플 path traversal 방지
- [P1 fix] 신규 스크립트 execFile 테스트 계획
- [P2 fix] FX bypass 복원 정책 (fade-in)
- OQ-1 해결, OQ-3 B-PROD로 이관