# 303-Only Listening Protocol

## Purpose

`render-303` 산출물을 commercial release-adjacent 수준으로 판정하기 위한 최소 청취 프로토콜이다.

## Panel

- 최소 3명
- 가능한 한 서로 다른 역할 포함:
  - producer / sound designer
  - mix engineer 또는 technically trained listener
  - target audience에 가까운 general music listener

## Fixtures

- 최소 3개 레퍼런스 세트
  - acid-friendly reference
  - non-acid dance reference
  - sparse / texture-heavy reference

## Blind Naming

- 파일명에서 내부 구현 정보 제거
- 예:
  - `sample-a.wav`
  - `sample-b.wav`
  - `sample-c.wav`

## Rubric

각 항목 1~5점:

- `groove_preserved`
  - 원본의 박/추진감이 유지되는가
- `acid_identity`
  - 결과물이 명확히 303/acid aesthetic을 갖는가
- `repetition_tolerance`
  - 반복 청취 시 패턴이 빨리 질리지 않는가
- `release_adjacent_quality`
  - 데모를 넘어서 공개 가능한 수준에 근접했는가

추가 Boolean:

- `usable`
  - 이 결과물을 계속 다듬을 가치가 있는가
- `release_adjacent`
  - 소폭 수정 후 공개 가능하다고 보는가

## Pass Criteria

- `usable` 비율 >= 70%
- `release_adjacent` 비율 >= 70%
- `release_adjacent_quality` 평균 >= 3.5 / 5

## JSON Format

```json
{
  "panel_size": 3,
  "entries": [
    {
      "listener": "L1",
      "groove_preserved": 4,
      "acid_identity": 5,
      "repetition_tolerance": 4,
      "release_adjacent_quality": 4,
      "usable": true,
      "release_adjacent": true,
      "notes": "Strong acid identity, minor harshness."
    }
  ]
}
```

