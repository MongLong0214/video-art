# PRD: Spectral Quality — Metric Rescaling + Mid-Range Synthesis

**Version**: 0.2
**Author**: Isaac
**Date**: 2026-03-29
**Status**: Approved
**Size**: M

---

## 1. Problem Statement

### 1.1 Background
calibrate.py의 spectral convergence 메트릭은 `1 - ||S_ref - S_synth||_fro / ||S_ref||_fro` 공식을 사용. 이 메트릭은 같은 소스의 변형(코덱 비교 등)용으로 설계되어, 완전 합성 vs 실제 오디오 비교 시 diff norm이 ref norm을 초과하여 0점이 됨.

실측: sc ratio = 1.0065 → score = max(0, 1-1.0065)*100 = 0.0

동시에 합성 출력의 mid-range(250Hz-4kHz) 에너지가 레퍼런스의 55%에 불과하여 스펙트럼 품질 자체도 낮음.

### 1.2 Problem Definition
1. spectral convergence 메트릭이 합성 시나리오에서 항상 0점 — 개선 추적 불가
2. render-analysis.ts의 mid-range 이벤트(리드, 아프, 패드)가 부족 — 스펙트럼 밸런스 편향

### 1.3 Impact of Not Solving
calibration score에 spectral이 20% 가중치인데 항상 0점이면 total_score 상한이 80점. 개선해도 점수가 반영 안 됨.

## 2. Goals & Non-Goals

### 2.1 Goals
- [x] G1: spectral 메트릭을 합성 시나리오에서 0-100 연속 분포로 리스케일
- [x] G2: mid-range 합성 이벤트 보강으로 mid band ratio 0.55 → 0.75+ 달성

### 2.2 Non-Goals
- NG1: 다른 4개 메트릭(mfcc, envelope, attacks, chroma) 변경 안 함
- NG2: SynthDef(.scd) 자체 수정 안 함 — 기존 SynthDef 파라미터 활용만
- NG3: 가중치(weights) 변경 안 함

## 3. User Stories & Acceptance Criteria

### US-1: Spectral Metric Rescaling
**As a** developer, **I want** spectral convergence가 합성 vs 실제 비교에서 의미있는 0-100 값을 반환, **so that** 합성 품질 개선을 추적할 수 있다.

**Acceptance Criteria:**
- [ ] AC-1.1: spectral score를 3-band mean-spectral-distance(MSD)로 교체
  - 밴드: low(0-250Hz), mid(250-4kHz), hi(4kHz+)
  - 밴드 가중치: low=0.3, mid=0.4, hi=0.3 (mid 강조)
  - 공식: per-band `1 - mean(|log(S_ref+eps) - log(S_synth+eps)|) / max_lsd`
  - max_lsd = 20 (정규화 상수, log-spectral 20dB 차이 = 0점)
  - 결과: 0-100 연속값
- [ ] AC-1.2: 기존 테스트 total_score ±10 이내 허용. 테스트 임계값 재산정 가능
- [ ] AC-1.3: 실제 데이터(void-acid-carousel)에서 spectral > 0

### US-2: Mid-Range Synthesis Enhancement
**As a** developer, **I want** render-analysis.ts가 mid-range(250Hz-4kHz) 이벤트를 충분히 생성, **so that** 스펙트럼 밸런스가 레퍼런스에 근접한다.

**Acceptance Criteria:**
- [ ] AC-2.1: fm_lead 이벤트를 drop/build 구간에 추가 (8th note 패턴, 분석 기반 freq)
- [ ] AC-2.2: arp_pluck 이벤트를 drop 구간에 추가 (16th note, scale-based)
- [ ] AC-2.3: pad amp을 section별로 +50% 증가 — sectionOverrides(n_set)도 동비율 갱신
- [ ] AC-2.4: dry-run 검증: fm_lead + arp_pluck 이벤트 존재 + 총 이벤트 수 증가 확인
- [ ] AC-2.5: SynthDef 파일(fm_lead.scd, arp_pluck.scd) 존재 확인 선행

## 4. Technical Design

### 4.1 Architecture Overview
변경 없음. 기존 파이프라인 내 파라미터/공식 조정.

### 4.2 Key Technical Decisions

| Decision | Options | Chosen | Rationale |
|----------|---------|--------|-----------|
| Spectral metric | (A) Frobenius rescale (B) log-spectral distance (C) band-weighted MSD | **C** | band-weighted로 low/mid/hi 차이를 독립 측정. 합성 시나리오에서 부분 매칭 가능 |
| Mid-range 보강 | (A) 기존 패드만 amp 증가 (B) fm_lead+arp 추가 (C) 둘 다 | **C** | 패드는 지속음, 리드/아프는 어택+멜로디로 스펙트럼 다양성 |

## 5. Edge Cases & Error Handling

| # | Scenario | Expected Behavior | Severity |
|---|----------|-------------------|----------|
| E1 | 동일 오디오 비교 (ref==synth) | spectral = 100 | High |
| E2 | 완전 무관 오디오 비교 | spectral > 0 (0점 금지) | High |
| E3 | 무음 입력 | 기존 silence guard 동작 유지 | Medium |
| E4 | pitch_contour 없을 때 fm_lead | key-based fallback scale 사용 | Medium |
| E5 | sectionOverrides n_set vs pad amp 불일치 | 동비율 갱신으로 방지 | High |

## 8. Testing Strategy

### 8.1 Unit Tests (Python)
- spectral score: identical → ~100, orthogonal → >0 but low, same-genre → mid-range
- total_score regression: 기존 fixture 기준 ±10 이내

### 8.2 Unit Tests (TS)
- dry-run E2E: fm_lead, arp_pluck 이벤트 존재 확인
- event count 증가 확인
- sectionOverrides pad amp 동기화 확인

---
N/A: Section 6, 7, 9, 10, 11, 12
