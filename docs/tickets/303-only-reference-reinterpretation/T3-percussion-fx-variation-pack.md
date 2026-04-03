# T3: 303 percussion/fx bank + variation 레이어

**Size**: M | **Depends**: T1 | **PRD**: US-2, US-3

## Goal
303-only 결과물이 단순 bassline demo처럼 들리지 않도록 click/chirp/noise/percussion/fx 레이어를 bank 차원에서 보강한다.

## Changes

### 1. `audio/samples/303/generate.py` — percussion/fx generator 확장
- `click`, `tick`, `chirp`, `hat_short`, `hat_open`, `zap`, `sweep`
- role tag를 `top`, `pseudo_hat`, `fx`로 구분

### 2. round robin / variation
- 반복성이 높은 articulation에 대해 RR variant 추가
- 최소 pseudo-hat/click 계열은 RR 2 이상

### 3. manifest tagging
- `role_tags`
- `transient_strength`
- `recommended_rate_range`

## Acceptance Criteria
- [ ] AC-3.1: pseudo percussion용 샘플 세트가 존재한다.
- [ ] AC-3.2: click/chirp/zap/sweep 계열이 role tag와 함께 manifest에 기록된다.
- [ ] AC-3.3: 반복성이 높은 카테고리에 RR variation이 존재한다.
- [ ] AC-3.4: renderer가 RR 선택에 필요한 메타데이터를 사용할 수 있다.

## Test
```bash
python3 audio/samples/303/generate.py
python3 - <<'PY'
import json
data=json.load(open('audio/samples/303/manifest.json'))
print('entries', len(data))
PY
```

