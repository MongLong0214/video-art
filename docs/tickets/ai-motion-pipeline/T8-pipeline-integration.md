# T8: Pipeline 통합 — motion 전체 흐름 연결

**PRD Ref**: PRD-ai-motion-pipeline > US-1 (AC-1.1), US-4, §4.1 전체
**Priority**: P1 (High)
**Size**: L (4-8h)
**Status**: Todo
**Depends On**: T2, T3, T4, T5, T6, T7

---

## 1. Objective

pipeline-pro.ts와 publish.ts에 motion 전체 파이프라인을 통합. --motion 플래그 시 Step M1→M6 순차 실행, scene.json 업데이트, export-layered.ts와 연결.

## 2. Acceptance Criteria

- [ ] AC-1: `npm run publish input.png -- --title test --motion` 실행 시 end-to-end 완료 → mp4 출력
- [ ] AC-2: intermediate/ 디렉토리 자동 생성 → export 완료 후 자동 삭제
- [ ] AC-3: scene.json에 duration=16 (8초 i2v × ping-pong, PRD §4.1.1) + motion 필드 정상 반영. periods = getValidPeriods(16)
- [ ] AC-4: Python 미설치 시 설치 안내 + --skip-flow 자동 폴백 (E7)
- [ ] AC-5: 각 Step별 소요시간 + 비용 콘솔 출력
- [ ] AC-6: --motion 없이 기존 동작 100% 동일 (E10)
- [ ] AC-7: 기존 143 테스트 전부 통과
- [ ] AC-8: intensity별 avg flow magnitude 검증 — low: 2-5px, medium: 5-15px, high: 15-30px (PRD AC-2.2)
- [ ] AC-9: 각 레이어 프레임간 SSIM < 0.995 (모션 존재 증명) + 레이어 간 flow 상관 < 0.5 (독립 모션 증명, PRD AC-1.2)
- [ ] AC-10: wan-2.2와 veo-3.1 모두 동일 후처리 함수(flow+warp+pingpong+shader) 경유 (PRD AC-3.3)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `motion pipeline generates scene.json with motion field` | Integration | mock i2v + mock flow | scene.json motion 필드 존재 |
| 2 | `motion pipeline sets duration to 16` | Integration | mock 실행 | scene.json.duration=16 |
| 3 | `motion pipeline recalculates periods for 16` | Integration | period 검증 | getValidPeriods(16)의 약수만 사용 |
| 4 | `no-motion preserves original pipeline` | Integration | --motion 없음 | 기존 출력과 동일 |
| 5 | `python check fails gracefully` | Integration | python3 mock 실패 | 설치 안내 + skipFlow |
| 6 | `intermediate cleanup after export` | Integration | 완료 후 | intermediate/ 삭제됨 |
| 7 | `step timing is logged` | Integration | 콘솔 출력 | 각 step 시간 표시 |
| 8 | `intensity flow magnitude in range` | Integration | medium intensity mock | avg flow 5-15px |
| 9 | `layers have independent motion` | Integration | 2레이어 결과 | flow 상관 < 0.5 |
| 10 | `both models use same post-pipeline` | Unit | wan-2.2/veo-3.1 코드 경로 | 동일 함수 호출 |

### 3.2 Test File Location

- `scripts/__tests__/motion-pipeline.test.ts`

### 3.3 Mock/Setup Required

- Replicate API mock
- Python subprocess mock
- ffmpeg mock
- sharp mock
- 소형 테스트 이미지 (64×64)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/pipeline-pro.ts` | Modify | motion 분기 + Step M1-M6 호출 |
| `scripts/publish.ts` | Modify | motion 플래그 전달 |
| `scripts/lib/python-bridge.ts` | Create | Python 호출 브릿지 (§4.1.2) |
| `scripts/lib/check-deps.ts` | Modify | Python + torchvision 존재 검증 추가 |
| `scripts/export-layered.ts` | Modify | motion scene.json 지원 (프레임 시퀀스 경로 서빙) |

### 4.2 Implementation Steps (Green Phase)

1. python-bridge.ts 구현 (execFile, path 정규화, timeout)
2. check-deps.ts에 checkPython() 추가
3. pipeline-pro.ts에 motion 분기:
   - args.motion=true → Step M1-M6 순차 실행
   - M1: motion-i2v.ts 호출 (T6)
   - M2: ffmpeg 프레임 추출 (T6에서 구현)
   - M3: python-bridge로 extract_flow.py 호출 (T3)
   - M4: python-bridge로 warp_pixels.py 호출 (T4)
   - M5: pingpong.ts 호출 (T5)
   - M6: scene.json 업데이트 (duration=16, periods 재계산, motion 필드)
4. intermediate/ 자동 삭제 (export 완료 후)
5. publish.ts에서 motion 플래그 전달
6. export-layered.ts: _work/ 내 프레임 시퀀스 디렉토리를 Vite가 서빙하도록 설정
7. 각 Step 타이밍 로그

### 4.3 Refactor Phase

- Step 타이밍을 구조화된 JSON 로그로 통합

## 5. Edge Cases

- EC-1: Python 미설치 (E7) → 자동 skipFlow
- EC-2: 기존 실행 잔재 (E13) → intermediate/ 삭제 후 재생성
- EC-3: --motion + --duration 충돌 (E11)
- EC-4: Replicate 부분 실패 (E1) → all-or-nothing

## 6. Review Checklist

- [ ] Red/Green/Refactor 완료
- [ ] AC 전부 충족
- [ ] 기존 143 테스트 깨지지 않음
- [ ] end-to-end 수동 테스트 (mock 없이 실제 API 1회)
