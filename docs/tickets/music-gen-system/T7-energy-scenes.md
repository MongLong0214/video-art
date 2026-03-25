# T7: 에너지 씬 시스템

**PRD Ref**: PRD-music-gen-system > US-4
**Priority**: P2 (Medium)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: T5, T6

---

## 1. Objective
곡 전체를 섹션 단위로 나누어 에너지 곡선을 자동화하는 SceneScore 시스템. 인트로→빌드업→드롭→브레이크→아웃트로.

## 2. Acceptance Criteria
- [ ] AC-1: SceneScore 포맷 — [{name, bars, layers: [...], energy: 0~1}] SC에서 파싱 가능
- [ ] AC-2: energy 값 → 레이어 on/off + openness/brightness/distortion 매크로 자동 매핑
- [ ] AC-3: 최소 1개 완성 곡 구조 (5 섹션, 32~64마디) NRT 렌더 성공
- [ ] AC-4: 테크노 SceneScore 프리셋 1개 + 트랜스 SceneScore 프리셋 1개

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases
| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `scenescore parse` | Unit (SC) | SceneScore JSON/dict 파싱 | 섹션 배열 |
| 2 | `energy to params` | Unit (SC) | energy 0.3 → low openness | 파라미터 매핑 정확 |
| 3 | `energy to params high` | Unit (SC) | energy 0.9 → high all | 파라미터 매핑 정확 |
| 4 | `techno scene NRT` | Integration | 5섹션 테크노 NRT | WAV + duration 일치 |
| 5 | `trance scene NRT` | Integration | 5섹션 트랜스 NRT | WAV + duration 일치 |

### 3.2 Test File Location
- `audio/sc/test-scenes.scd` (신규)

### 3.3 Mock/Setup Required
- T5 패턴 + T6 시퀀서

## 4. Implementation Guide

### 4.1 Files to Modify
| File | Change Type | Description |
|------|------------|-------------|
| `audio/sc/lib/scene-score.scd` | Create | SceneScore 파서 + energy 매핑 |
| `audio/sc/scenes/techno-default.scd` | Create | 테크노 5섹션 프리셋 |
| `audio/sc/scenes/trance-default.scd` | Create | 트랜스 5섹션 프리셋 |
| `audio/sc/test-scenes.scd` | Create | 씬 테스트 |

### 4.2 Implementation Steps (Green Phase)
1. scene-score.scd — SceneScore 딕셔너리 정의 + energy→파라미터 매핑 함수
2. techno-default.scd — intro(8bar,0.3) → build(8bar,0.6) → drop(16bar,0.9) → break(8bar,0.4) → outro(8bar,0.2)
3. trance-default.scd — intro(16bar,0.3) → build(8bar,0.7) → break(8bar,0.2) → main(16bar,1.0) → outro(16bar,0.3)
4. NRT 렌더 + 검증

### 4.3 Refactor Phase
- energy 매핑 커브 커스터마이제이션

## 5. Edge Cases
- EC-1: energy=0 → 모든 레이어 off → intro silence (정상)
- EC-2: 섹션 0개 → 에러

## 6. Review Checklist
- [ ] Red → FAILED
- [ ] Green → PASSED
- [ ] Refactor → PASSED 유지
- [ ] AC 전부 충족
