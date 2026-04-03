# BOOMER-CODEX REVIEW — 303-Only Reference Reinterpretation PRD

**Analyst**: Codex (boomer-codex 방식)  
**Date**: 2026-04-03  
**Context**: PRD v0.2 review before ticket decomposition  
**Mode**: Full BOOMER-CODEX (BC1~BC6)

---

[BOOMER-CODEX REVIEW] 레퍼런스 오디오를 303 sample only로 재해석하는 상업용 파이프라인 제안
대상 파일: `docs/prd/PRD-303-only-reference-reinterpretation.md`, `audio/samples/303/generate.py`, `audio/sc/synthdefs/sample_player.scd`, `scripts/lib/hybrid-render.ts`, `scripts/lib/sample-utils.ts`, `audio/analyzer/analyze_track.py`
분석 기준: BOOMER-CODEX

## 핵심 반론 TOP 3

1. **샘플 manifest 전환 범위가 과소추정됨** — [BC6]
   근거: PRD는 rich sample manifest를 전제로 하지만, 현재 런타임은 `type -> hit[]` 구조만 읽는다. [`scripts/lib/sample-utils.ts`](/Users/isaac/WebstormProjects/video-art/scripts/lib/sample-utils.ts#L25) [`scripts/lib/hybrid-render.ts`](/Users/isaac/WebstormProjects/video-art/scripts/lib/hybrid-render.ts#L15) PRD의 rich manifest 제안은 현재 소비자 코드와 직접 호환되지 않는다. [`docs/prd/PRD-303-only-reference-reinterpretation.md`](/Users/isaac/WebstormProjects/video-art/docs/prd/PRD-303-only-reference-reinterpretation.md#L189)
   영향: 🔴 높음

2. **현재 `sample_player`로는 상업 수준 303 phrase playback을 보장할 수 없음** — [BC1]
   근거: 현재 플레이어는 mono one-shot `PlayBuf` + 단순 ADSR만 지원하며 loop, crossfade sustain, glide semantics, legato chaining이 없다. [`audio/sc/synthdefs/sample_player.scd`](/Users/isaac/WebstormProjects/video-art/audio/sc/synthdefs/sample_player.scd#L1) PRD는 `sample_player or equivalent`를 전제로 하지만 commercial-grade 303-only renderer라면 재생 엔진 요구사항을 별도 명세해야 한다. [`docs/prd/PRD-303-only-reference-reinterpretation.md`](/Users/isaac/WebstormProjects/video-art/docs/prd/PRD-303-only-reference-reinterpretation.md#L276)
   영향: 🔴 높음

3. **분석기 안정화를 한 티켓으로 묶으면 실패 원인 분리가 불가능함** — [BC6]
   근거: 현재 분석기는 BPM prior 왜곡, pitch event flush bug, 구조 감지 휴리스틱 문제를 동시에 안고 있다. [`audio/analyzer/analyze_track.py`](/Users/isaac/WebstormProjects/video-art/audio/analyzer/analyze_track.py#L99) [`audio/analyzer/analyze_track.py`](/Users/isaac/WebstormProjects/video-art/audio/analyzer/analyze_track.py#L268) [`audio/analyzer/analyze_track.py`](/Users/isaac/WebstormProjects/video-art/audio/analyzer/analyze_track.py#L533) PRD 구현 순서의 T3는 BPM/pitch/structure/confidence를 한 번에 처리하도록 묶여 있어 regression 범위를 통제하기 어렵다. [`docs/prd/PRD-303-only-reference-reinterpretation.md`](/Users/isaac/WebstormProjects/video-art/docs/prd/PRD-303-only-reference-reinterpretation.md#L272)
   영향: 🔴 높음

## BOOMER-CODEX 상세 분석

### BC1. 가정 검증

| 가정 | 근거 | 반론 | 위험도 |
|------|------|------|--------|
| 기존 `sample_player`에 소규모 보강만 하면 303-only renderer 구현 가능 | PRD dependency가 `sample_player or equivalent`라고만 적시 | 현재 플레이어는 one-shot 중심이다. sustain, glide, crossfade, note chaining 요구가 별도 스펙으로 고정되지 않으면 구현 중 기능이 새어 나온다. | 높음 |
| sample manifest를 확장해도 기존 소비자 코드가 큰 비용 없이 따라온다 | PRD가 manifest generator를 T2 하나로 묶음 | 현재 `sample-utils`와 `hybrid-render`는 flat hit manifest 전용이다. migration adapter 없이는 기존 hybrid path를 즉시 깨뜨릴 가능성이 높다. | 높음 |
| analyzer를 하나의 안정화 작업으로 다뤄도 된다 | PRD가 T3 단일 step으로 정의 | BPM, pitch, structure는 실패 조건과 테스트 방식이 다르다. 분리하지 않으면 어느 지표가 regression인지 추적이 안 된다. | 높음 |
| 3-listener blind test만으로 commercial gate를 걸 수 있다 | PRD AC-5.4 | 청취 프로토콜, fixture set, pass/fail rubric이 없어 재현성이 약하다. | 중간 |

### BC2. 리스크 매트릭스

| 리스크 | 가능성 | 영향 | 완화 방법 |
|--------|--------|------|----------|
| manifest v2가 기존 hybrid/sample path를 깨뜨림 | 높음 | 높음 | manifest adapter 티켓 분리, dual-reader 기간 운영 |
| 플레이어 기능 부족으로 long phrase가 클릭/반복/부자연스러운 release를 유발 | 높음 | 높음 | playback engine 요구사항을 독립 티켓으로 승격 |
| analyzer regression이 다발성으로 발생하지만 한 티켓이라 원인 추적 불가 | 높음 | 높음 | BPM / pitch+structure / abstraction schema를 분리 |
| evaluator가 reinterpretation보다 cloning을 보상 | 중간 | 높음 | domain metric과 listening rubric을 함께 설계 |
| bank 확장으로 샘플 수가 급증해 운영이 어려워짐 | 중간 | 중간 | deterministic naming + manifest validation + loudness audit |

### BC3. 대안 접근법

- **대안 A: manifest migration first**
  - 장점: 런타임 계약을 먼저 고정해 이후 sample bank와 renderer 변경이 덜 흔들린다.
  - 단점: 소리 품질 개선보다 데이터 모델 작업이 먼저 온다.
  - 적합 조건: 기존 hybrid/sample tooling을 유지해야 할 때.

- **대안 B: playback engine first**
  - 장점: 실제 303-only renderer의 한계를 빨리 드러낸다.
  - 단점: sample bank 메타데이터가 없으면 테스트 입력이 부실하다.
  - 적합 조건: 상업 수준 phrase realism이 최우선일 때.

- **대안 C: analyzer split track**
  - 장점: BPM, pitch, structure를 독립 regression gate로 관리할 수 있다.
  - 단점: 티켓 수가 늘어난다.
  - 적합 조건: commercial-level QA를 원할 때. 현재는 이 접근이 맞다.

### BC4. 기술 부채

- **manifest dual-compat 미정의**: 기존 hybrid path와 신규 303 path가 같은 저장소를 공유하므로 schema migration debt가 즉시 발생한다.
- **player semantics 미정의**: glide/legato/crossfade 규칙이 티켓 전에 고정되지 않으면 후반에 renderer와 sample bank가 서로 어긋난다.
- **benchmark ownership 부재**: benchmark set 수집/라벨링/갱신 책임이 문서에 없다. commercial gate의 장기 운영 비용이 숨겨져 있다.

### BC5. 엣지 케이스

- dense polyphonic reference에서 principal line이 엉뚱한 register로 고정될 수 있음
- modulation이 잦은 레퍼런스에서 local transposition rule이 불명확함
- low-confidence pitch + high-density rhythm 조합에서 bass/riff 분리가 흔들릴 수 있음
- nearest-note fallback이 빈번할 때 sample purity는 만족해도 musical intelligibility가 급락할 수 있음
- 303-only top lane이 충분히 퍼커시브하지 않으면 전체 그루브가 bassline demo처럼 들릴 수 있음

### BC6. 범위 검토

- **부족함**: PRD 방향은 맞지만 migration, playback engine, commercial QA 운영이 별도 deliverable로 충분히 분리돼 있지 않다.
- **초과는 아님**: analyzer, renderer, evaluator, listening loop까지 포함한 범위는 commercial target에 필요하다.
- **판정**: 실행 자체를 미루라는 뜻은 아니고, 티켓 단위 재분해가 선행돼야 한다.

## Boomer-Codex 판정

**[PROCEED_WITH_CAUTION]** — 방향은 타당하지만 현재 PRD만 바로 실행하면 manifest migration, playback engine, analyzer regression 관리에서 높은 확률로 흔들린다. 실행 전 티켓 구조를 commercial-grade 운영 관점으로 재분해하는 것이 필요하다.
