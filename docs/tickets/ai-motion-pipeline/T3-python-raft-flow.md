# T3: Python RAFT optical flow 추출 스크립트

**PRD Ref**: PRD-ai-motion-pipeline > US-1 (AC-1.2), §4.1.2, §4.1 Step M3
**Priority**: P1 (High)
**Size**: M (2-4h)
**Status**: Todo
**Depends On**: None

---

## 1. Objective

Python 스크립트 `scripts/motion/extract_flow.py`를 작성. 프레임 시퀀스 디렉토리를 입력받아 연속 프레임 쌍의 RAFT dense optical flow를 .npy로 출력. GPU/CPU 자동 감지.

## 2. Acceptance Criteria

- [ ] AC-1: `python3 scripts/motion/extract_flow.py <frames_dir> <output_dir>` 실행 시 flow .npy 파일 생성
- [ ] AC-2: 출력 .npy shape = (H, W, 2) (x,y flow 벡터)
- [ ] AC-3: GPU 사용 가능 시 CUDA, 불가 시 CPU 자동 감지 + 경고 메시지
- [ ] AC-4: 입력 프레임이 2개 미만이면 에러 메시지 + exit 1
- [ ] AC-5: stdout으로 JSON 메타데이터 출력 (frame_count, device, elapsed_sec)

## 3. TDD Spec (Red Phase)

### 3.1 Test Cases

| # | Test Name | Type | Description | Expected |
|---|-----------|------|-------------|----------|
| 1 | `outputs flow npy files` | Integration | 3프레임 입력 → 2개 flow .npy | .npy 파일 2개, shape (H,W,2) |
| 2 | `flow values are reasonable` | Integration | 동일 이미지 2장 | flow magnitude ≈ 0 |
| 3 | `errors on single frame` | Integration | 1프레임만 | exit code 1 |
| 4 | `outputs json metadata` | Integration | 정상 실행 | stdout JSON 파싱 가능 |
| 5 | `cpu fallback works` | Unit | CUDA_VISIBLE_DEVICES="" 강제 | device=cpu 메타데이터 |

### 3.2 Test File Location

- `scripts/motion/__tests__/extract_flow.test.ts` (Node에서 Python subprocess 호출 테스트)

### 3.3 Mock/Setup Required

- 테스트용 소형 이미지 (64×64 PNG) 3장 생성
- Python + torchvision 설치 필요. CI skip: `describe.skipIf(process.env.SKIP_PYTHON_TESTS)` 패턴
- RAFT 가중치: `weights=Raft_Large_Weights.DEFAULT` 사용 (pretrained=True는 deprecated)

## 4. Implementation Guide

### 4.1 Files to Modify

| File | Change Type | Description |
|------|------------|-------------|
| `scripts/motion/extract_flow.py` | Create | RAFT flow 추출 메인 스크립트 |
| `requirements-motion.txt` | Create | Python 의존성 (torch, torchvision, numpy, opencv-python, Pillow) |

### 4.2 Implementation Steps (Green Phase)

1. argparse로 frames_dir, output_dir ���싱
2. frames_dir에서 PNG 정렬 로드
3. torchvision.models.optical_flow.raft_large 로드 (pretrained)
4. GPU/CPU 자동 감지
5. 연속 프레임 쌍별 RAFT forward pass → flow tensor
6. flow를 numpy .npy로 저장 (flow_00001.npy, flow_00002.npy, ...)
7. stdout JSON 메타데이터 출력

### 4.3 Refactor Phase

- 배치 처리 (여러 프레임 쌍을 한번에) 성능 최적화

## 5. Edge Cases

- EC-1: GPU 없음 (E2) → CPU 자동 감지
- EC-2: 프레임 0개/1개 → 에러 + exit 1
- EC-3: 프레임 해상도 불일치 → 에러

## 6. Review Checklist

- [ ] Red/Green/Refactor 완료
- [ ] AC 전부 충족
- [ ] Python 스크립트가 독립 실행 가능
