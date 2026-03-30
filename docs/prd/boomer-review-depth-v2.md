## BOOMER-6 PRD Review: Depth Anything V2 Foundation (v0.3)

**Reviewer**: boomer (Codex CLI)  
**Date**: 2026-03-30  
**Target**: PRD-depth-anything-v2.md v0.3 (XL, Phase 1/2 gating)

---

## 이견 수: 7건

### 이견 목록

#### 1. [O] Data URI Memory Overhead — AC-1.2 공유 전략 불충분

**상세**: AC-1.2 "data URI는 한 번만 생성하여 양쪽에 공유"은 설계상 경제적이나, 실제 구현에서:
- 기존 SAM2 `getSam2Masks()`가 이미 data URI를 **함수 내부에서 생성**하고 있음 (image-decompose.ts 현황)
- DA V2를 Promise.all로 추가하면 **data URI 생성을 이 시점까지 지연**해야 하는데, SAM2 호출 시그니처 변경 필요
- 20MB 제한(AC-1.10) 적용 시에도 두 호출 사이 비율이 다를 수 있음 (SAM2 요구사항 ≠ DA V2 요구사항)

**근거**: image-decompose.ts line 68의 `withRetry(async () => ...)` 블록이 데이터 준비를 내부화. shared data URI 패턴을 강제하려면 호출 구조를 upstream(pipeline-layers.ts)에서 전 처리해야 함.

**리스크**: AC-1.2 의도는 메모리 절감이지만, 구현 복잡도 대비 이득이 한정적 (각 data URI ~수MB 단위). 단순 패턴(각자 생성)이 오히려 가독성/버그 위험 감소.

**권장**: AC-1.2를 "각 호출이 독립적으로 data URI 생성 (중복 허용)"으로 완화. 메모리 오버헤드는 base64 인코딩 비용 ~1.3배 정도로 20MB 이미지 기준 ~26MB = 무시할 수준.

---

#### 2. [R] DA V2 모델 식별자 고정 위험 — AC-1.7 미래 유지보수 저해

**상세**: AC-1.7에서 manifest에 `models.depthAnything: { model, version }` 기록 → 하지만:
- Replicate API 모델 식별자(`chenxwh/depth-anything-v2`)가 하드코드된 상태
- V3/V4 출현 시 코드 검색-교체 필요 (중앙화된 설정 상수 부재)
- research-config.ts의 깊이 파라미터(3개)와 별도로 모델 버전을 관리해야 하는 불일치

**근거**: 기존 SAM2도 replicate-utils.ts에서 모델명을 string으로 하드코드. 확장성 부족.

**리스크**: Phase 2에서 V3 지원 추가 시(NG-7 제외 항목이지만 예상됨), 마이그레이션 경로가 모호. 현재 code-first 구조로는 manifest 버전 추적이 실질적 용도 불명확.

**권장**: research-config.ts에 `depthModelVersion` 파라미터 추가 (기본값 "v2") → pipeline-layers.ts에서 참조. 이렇게 하면 autoresearch 후속 모델 실험도 자동화 가능. AC-1.7은 이 값을 manifest에 자동 기록.

---

#### 3. [O] Depth Convention Normalization — AC-1.5 검증 부족

**상세**: AC-1.5 "convention 정규화: 0=far, 255=near"는 단방향 명시지만:
- DA V2 모델이 역순(0=near, 255=far)으로 출력할 가능성이 문서에서 명시되지 않음
- "만약 반대면 invert"는 휴리스틱이지, 자동 감지 로직 없음
- 테스트에서 참조 이미지 대조(AC-6.4 수동 검증)가 유일한 검증 → 자동화 불가

**근거**: Depth Anything 공식 모델은 disparity map 관례를 따르는데, 버전/구현체에 따라 편차 가능. "Replicate wrapper가 정규화했나"를 보장할 수 없음.

**리스크**: 
- 이미지 일부는 정규화됨, 일부는 미정규화 상태로 섞일 수 있음
- manifests depthConvention 기록이 형식일 뿐, 실제 이미지 데이터와 불일치 가능
- Phase 2에서 depth 연동 애니메이션(glow, speed 비례)이 반대 방향으로 작동하는 버그 유발

**권장**: 
1. DA V2 API 호출 전에 **참조 픽셀** 몇 개를 Replicate 웹 인터페이스로 확인하고 convention 기록
2. 테스트 코드에서 synthetic depth map (점진 그래디언트)로 convention 검증 → 자동화
3. AC-1.5 문구 수정: "만약 반대면" → "detect + auto-invert" 로직 포함

---

#### 4. [M] depthRoleWeight Interaction Complexity — AC-3 깊이 가중치 설계 과정 불명

**상세**: AC-3.1~3.5에서 depth-gated if-chain 구조는 기존 heuristic 유지 + depth로 threshold 완화를 표방하지만:
- "centralityThreshold를 depth percentile에 따라 완화 (depth가 가까운 물체는 중앙 판정 관대)"의 구체적 공식이 예시만 있고 상수 미정의
- 예: `effectiveThreshold = centralityThreshold * (1 + depthRoleWeight * 0.5)` — 0.5는 magic number, 근거 없음
- AC-3.4 background 판정 완화 방식이 AC-3.3과 다른 계산 방식 암시 (일관성 부재)
- depthRoleWeight 0.5를 default로 했을 때, 실제 role 변화 폭이 예측 불가

**근거**: layer-resolve.ts assignRoles() 기존 if-chain이 5단계(subject/occluder/foreground/background/bg-plate) 계층화되어 있는데, 각 분기에서 threshold 완화가 어떻게 적용될지 알고리즘 상세 부재.

**리스크**:
- autoresearch가 depthRoleWeight 0.0~1.0를 탐색할 때, 임계점(0.3, 0.7)에서 갑작스런 role 재분류 가능 → quality_score 진동
- depthRoleWeight 최적값이 이미지마다 큰 편차 가능성 높음
- "depth가 heuristic을 보강"한다는 설계 의도 vs "depth가 threshold를 왜곡"한다는 구현 사이 인식 차이

**권장**:
1. AC-3 상세 수정: 각 role별 threshold 완화 공식 **명시** (수학 기호 또는 pseudocode)
2. depthRoleWeight 범위를 0.0~0.5로 제한 (과도한 threshold 왜곡 방지)
3. Step 5에서 **파라미터 튜닝 실험** 추가: depthRoleWeight 3개 값(0, 0.3, 0.5) × depthForegroundThreshold 3개 값 → 조합 검증

---

#### 5. [B] Phase 1/2 Boundary 모호 — Exit Criteria가 정성적

**상세**: §1.4 "Phase 2 진입 전제 조건"은 P2-1~P2-4를 명시했으나:
- P2-1: "depth가 role assignment 품질을 안정적으로 올린다" — 정의 불명 ("안정적" = stddev < X? 불일치율 < Y%?)
- P2-2: "meanDepth 분포가 이미지군 전반에서 일관적이다" — "일관적" = stddev > 20 (AC-5.2)와 중복, 정량값 모호
- P2-3: "false subject/background 눈에 띄게 줄었다" — 수동 검증만, 자동 측정 불가
- P2-4: "quality_score 개선" — evaluate.ts 변경 금지(NG-1)이므로, decomposition 단계만 평가? 전체 pipeline 영향?

**근거**: §8 Success Metrics에서:
- "Role 오분류 감소 | false subject/background 50%+ 감소"는 수량화했지만
- 이를 Phase 2 진입 기준과 연결하는 매핑 부재
- depthRoleWeight=0 vs 0.5 비교(5장) ≠ 실제 30~50장 이미지 일관성 검증

**리스크**:
- "이것으로 충분한가?"를 Isaac이 판단할 때 기준 모호
- Phase 2 스코프 확대 가능성 (depth animation에는 안정성 기준 더 높아야 함)

**권장**:
1. Exit Criteria를 정량화: 
   - "depthRoleWeight > 0에서 role 변화율 < 10% (depthRoleWeight=0 대비)"
   - "false role 개수 50% 이상 감소 (5장 평균)"
   - "depthStats.stddev >= 25 (모든 테스트 이미지)" ← 현재 20에서 상향
2. Phase 2 진입 체크리스트를 manifest에 자동 기록 (P2-1~P2-4 각 채점)

---

#### 6. [R] Replicate Rate Limit 가정 약함 — AC-1.2 병렬화 미보장

**상세**: §7 "Replicate rate limit (API 2배 호출)" 리스크를 "sequential 호출이므로 rate limit 영향 제한적"으로 평가했으나:
- AC-1.2 "Promise.all로 병렬 실행"은 동시 호출 의도
- autoresearch에서 배치 이미지 처리 시 병렬도가 올라감 (pipeline-runner.ts async queue)
- Replicate 문서: rate limit 명시 없음 → 기존 SAM2만으로도 throttle 경험 있는지 불명

**근거**: replicate-utils.ts의 withRetry() 구현에서 exponential backoff는 있지만, concurrent request 수 제한은 없는 것으로 보임.

**리스크**:
- Promise.all([SAM2, DA V2]) × 10 이미지 병렬 = 20 동시 요청 → Replicate 429/503 가능성
- 실패 시 fallback(meanDepth=128)로 조용히 진행되므로, 데이터 품질 저하가 감지 안 될 수 있음
- Phase 2 depth animation에서 모든 이미지가 일관된 depth를 가정하는데, 일부만 fallback되면 시각적 artifact

**권장**:
1. withRetry()에 concurrent request 수 제한(max 2~3) 추가 (SAM2 + DA V2 각 1, 또는 직렬화)
2. AC-1.6 fallback 로그를 ERROR 수준으로 상향 (warning → error) → 감지 용이
3. manifest에 `depthApiFailureCount` 기록 → Phase 2 판단 시 고려

---

#### 7. [A] depthStats.stddev >= 5 Fallback 임계값 근거 부족

**상세**: AC-3.6 "depth 분산 부족으로 판단하면 `depthStats.stddev < 5`이면 depthRoleWeight 무시"는 좋은 안전장치지만:
- 왜 5? (AC-5.5에서 "stddev > 0" 최소화, §8 Success Metrics에서 "stddev > 20" 목표, AC-3.6은 "stddev < 5")
- 이 3개 수치가 불일치. 단계별 기준인가? (< 5 = 무시, 5~20 = 감소 weight, > 20 = full weight?)
- 0~255 스케일에서 stddev 5는 약 2%인데, 이것이 "분산 부족"을 판단하는 적절한 임계?

**근거**: 
- 사진의 depth map은 배경(같은 밝기) + 전경(다양한 깊이) 혼재 → natural stddev는 30~80 범위 예상
- stddev 5 이하는 "이미지가 단일 거리"를 의미 → role assignment 자체 의미 없음
- 하지만 AC-5.5 검증 기준 "stddev > 0"은 너무 느슨음

**리스크**:
- 만약 실제 이미지 stddev가 5~25 범위에 모여있으면, AC-3.6 fallback이 과도하게 발동 → depth 역할 축소
- autoresearch에서 depthRoleWeight 탐색이 의미 없어짐

**권장**:
1. 임계값 재검토: stddev < 15 (0~255 스케일 약 6% = "무의미한 분산"으로 재정의)
2. §8 Success Metrics 수정: 
   - "meanDepth 분포 | stddev > 30 (자연 이미지 기준값)"
   - AC-5.5: "stddev > 15 (모든 테스트 이미지)"
3. AC-3.6 문구: "depthStats.stddev < 15이면..." 로 일관성 확보

---

### 이견 없는 항목

- **US-1 아키텍처**: SAM2와 DA V2 호출 구조, Step 6.5 삽입점 명확 ✓
- **US-2 범위**: luminance 5개 함수/config 제거 명시적, 2차 검증 포함 ✓
- **Graceful Fallback**: DA V2 API 실패 시 meanDepth=128 유지 + warning 로그 설계 합리적 ✓
- **Non-Goals 명확**: Phase 2 항목(animation, parallax, DOF, haze) 분리 ✓
- **테스트 전략**: Unit/Integration/Regression/Validation 4가지 분류, 주요 케이스 커버 ✓
- **의존성**: Replicate DA V2 모델 이용 가능, sharp npm 기존 보유 ✓
- **하위 호환성**: depthRoleWeight=0에서 기존 동작 복제 설계 ✓
- **문서화**: program.md 갱신, AC별 명확한 검증 기준 포함 ✓

---

## 종합 평가

**이견 수**: 7건 (O: 3건, R: 2건, M: 1건, B: 1건, A: 1건)

**심각도 분포**:
- **Critical (구현 차단)**: 1건 (#3 convention auto-detect 부재) + 1건 (#4 threshold 공식 불명)
- **High (Phase 1 완성도)**: 2건 (#1 data URI 설계, #5 Phase 2 경계)
- **Medium (유지보수)**: 2건 (#2 모델 버전 고정, #6 rate limit)
- **Low (fine-tuning)**: 1건 (#7 stddev 임계값)

**권장 조치**:
1. 즉시 수정 (Phase 1 시작 전):
   - #3 DA V2 convention auto-detection 로직 추가 (테스트 포함)
   - #4 각 role별 depth threshold 공식 명시 + depthRoleWeight 범위 제한(0~0.5)
   - #5 Phase 2 exit criteria 정량화

2. 구현 중 진행:
   - #1 공유 data URI 복잡도 대비 이득 재평가 → 단순 패턴 권장
   - #2 research-config.ts에 depthModelVersion 추가
   - #6 withRetry() 동시 요청 제한 추가 + fallback 로그 ERROR로 상향

3. 파라미터 튜닝(Step 5):
   - #7 stddev 임계값 5 → 15로 상향, 일관성 확보

**최종 판정**: **PROCEED_WITH_CAUTION**

- 설계 의도(depth 보강 role assignment)는 합리적
- 구현 아키텍처(SAM2 병렬, Step 6.5 삽입)는 건전
- **但** 7건 이견 중 2건(#3, #4)이 구현 단계에서 중대 선택을 요구 → 발견 지점 조정 권장
- AC 검증 기준이 일부 모호 → 수정 후 재검토 권장
- Phase 2 경계가 정성적 → 정량 기준 명시 필수 (Isaac 최종 승인 시)

**다음 단계**: strategist와 협의하여 7건 이견 대응 계획(accept/reject/modify) 수립 후 Phase 1 시작.
