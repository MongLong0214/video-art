# T2: Mid-Range Synthesis Enhancement

**PRD Ref**: PRD-spectral-quality > US-2
**Priority**: P1
**Size**: S
**Status**: Todo
**Depends On**: None

---

## 1. Objective
render-analysis.ts에 fm_lead + arp_pluck 이벤트 추가 + pad amp 증가. Mid-range 에너지 보강.

## 2. Acceptance Criteria
- [ ] AC-2.1: fm_lead — drop/build에 8th note, analysis freq 기반
- [ ] AC-2.2: arp_pluck — drop에 16th note, scale-based
- [ ] AC-2.3: pad amp +50% — sectionOverrides(n_set)도 동비율 갱신
- [ ] AC-2.4: dry-run 검증: fm_lead + arp_pluck 존재 + 이벤트 수 증가
- [ ] AC-2.5: SynthDef 파일(fm_lead.scd, arp_pluck.scd) 존재 확인

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `fm_lead events in drop` | E2E | dry-run → .scd contains fm_lead | fm_lead present |
| 2 | `arp_pluck events in drop` | E2E | dry-run → .scd contains arp_pluck | arp_pluck present |
| 3 | `pad amp increased` | E2E | dry-run → pad amp > 0.2 in drop | amp > old values |
| 4 | `event count increased` | E2E | dry-run → events > baseline(313) | events > 313 |
| 5 | `sectionOverrides pad synced` | Unit | check n_set pad values | amp matches +50% |

### 3.2 Test File Location
- scripts/lib/render-dryrun-e2e.test.ts (기존 파일에 추가)

### 3.3 Mock/Setup Required
- 기존 ANALYSIS_FIXTURE 사용

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| scripts/render-analysis.ts | Modify | fm_lead + arp_pluck 이벤트 블록 + pad amp 조정 |
| scripts/lib/render-dryrun-e2e.test.ts | Modify | 새 테스트 추가 |

### 4.2 Implementation Steps (Green Phase)
1. SynthDef 파일 확인 (fm_lead.scd, arp_pluck.scd)
2. fm_lead 이벤트 블록 추가 (drop/build, 8th note, centroid 기반 freq)
3. arp_pluck 이벤트 블록 추가 (drop, 16th note, scale 기반)
4. pad amp 값 ×1.5 + sectionOverrides 동비율 갱신

## 5. Edge Cases
- E4 (no pitch_contour → key-based scale), E5 (n_set sync)
