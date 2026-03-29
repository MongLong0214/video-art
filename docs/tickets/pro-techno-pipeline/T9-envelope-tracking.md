# T9: 구조 인식 에너지 커브 추종

**Size**: M | **Depends**: T8 | **PRD**: v0.2

## Problem
합성 결과의 RMS envelope이 레퍼런스 first-30s의 에너지 프로파일과 불일치 (envelope=31.2).
원인: 모든 섹션에서 동일한 에너지 레벨로 이벤트 생성.

## Fix

### 1. render-analysis.ts — section별 에너지 스케일링
레퍼런스의 section별 평균 에너지를 추출하여 합성 이벤트 amp에 반영:
```ts
// Section energy from reference first 30s
const sectionEnergy: Record<string, number> = {};
for (const seg of segments) {
  const segEnergy = energyCurve
    .slice(segStartIdx, segEndIdx)
    .reduce((a, b) => a + b, 0) / count;
  sectionEnergy[seg.label] = segEnergy;
}
// In addEvent: amp *= sectionEnergy[getSectionAt(t)]
```

### 2. mix-pro.py — energy_curve 볼륨 오토메이션 강화
현재 synth/fx만 적용 → kick/bass에도 적용 (약하게):
```python
if vol_automation is not None and name == "kick":
    processed[name][:n] *= (0.7 + 0.3 * vol_automation[:n, np.newaxis])
```

## TDD Spec
- [ ] TC-9.1: section "intro"의 kick amp < section "drop"의 kick amp
- [ ] TC-9.2: energy_curve가 [0.2, 0.8, 0.5]이면 중간 구간 가장 큼
- [ ] TC-9.3: envelope score ≥ 40 (void-acid-carousel 기준)
- [ ] TC-9.4: 기존 mfcc/spectral regression 없음

## AC
- [ ] AC-9.1: section별 에너지 스케일링 적용
- [ ] AC-9.2: envelope score ≥ 40
- [ ] AC-9.3: total_score ≥ 72 (T8 이후 기준)
