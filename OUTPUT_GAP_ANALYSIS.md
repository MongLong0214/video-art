# 마스터피스 도달 실패 — 전수 정밀 분석 & 완전 설계서

> **v5 (2026-07-03) — 구현 6라운드 실측 재진단판.** P1~P3 구현·검증 후 실전 라운드(r0~r7)의 실측으로
> 두 가지 중대 재진단이 추가됐다:
>
> **재진단 1 — 규칙 충돌: 유도 규칙이 승인된 법칙을 스스로 어겼다.** greenRisk(그린 위험) 규칙이
> finishedVivid(이미 완성된 비비드) 판정을 우선 override하여 paletteAmount 0.55~0.65의 **리페인트**를
> 지시했다. 이는 승인작으로 확립된 "animate, don't repaint" 법칙 위반이며, 결과적으로 **출력물이 소스
> 원본보다 열화**되는 역설을 실측했다 (bisect 프로브에서 원본 색 그대로의 프레임이 모든 처리본보다
> 아름다웠음). 그린을 잡으려 hue를 돌리고, hue를 돌리니 그린이 생기는 순환이었다. → **E-1-3 우선순위
> 재정렬**: 완성-비비드 소스는 보존+글로우파동 경로가 최우선, 회전 계열 규칙은 저채도 소스 전용.
>
> **재진단 2 — 마스터피스의 결정 프리미티브는 hue 파동이 아니라 "빛(휘도) 파동"이다.** 위상장을
> hueShift에 결합한 r-시리즈는 기둥 5(디졸브)만 충족했고 기둥 2·3·4(깊이·살아있는 디테일·발광 위계)에
> 도달 못했다. 지각과학(모션의 주 운반체 = 휘도, A-3-3)·실무(Alex Grey/CoSM = 원화 위 **빛** 프로젝션,
> A-2-0)·승인 법칙(리페인트 금지)이 모두 같은 답을 가리킨다: **색은 소스 그대로 두고, 위상장으로
> 글로우/휘도 파동을 구조에 태워 보내라.** hue를 안 돌리면 그린 문제는 정의상 소멸한다. → **D-3-6
> 글로우 파동** 신설, 이것이 완성-비비드 소스의 기본 경로다.
>
> **프로세스 재진단 — 벤치마크 과적합 금지.** 단일 소스(7연속 거부작)를 벤치마크로 6라운드 연속 결함
> 수정한 것은 오류였다. 모든 라운드는 **이질적 소스 2종 이상**에서 검증한다 (PART H 규칙 8).
> 테스트 렌더는 **프리뷰 모드**(저해상도·저fps)로 반복 속도를 우선한다 (D-9).
>
> ---
>
> **v4 (2026-07-03) — 독립 리서치 재검증판.** 이전 판의 외부 근거(.omo 리서치)를 배제하고,
> **지각과학(SIGGRAPH/시각심리 원전) · 무빙 비저너리 아트 실무 · 컬러 사이언스 · 루프 설계 실무**를
> 제로베이스로 직접 탐색해 재검증했다. 결과: 핵심 설계(위상장·위계·유도 시스템)는 독립 근거로 **더 강하게**
> 지지되며, 3가지가 **새로 추가**된다 — ① 파동의 휘도 프로파일 설계(모션 지각의 결정 변수),
> ② OKLab 색공간 hue 경로(머디의 지각적 근본 해결), ③ 선형광 블렌딩 감사(탁한 합성의 숨은 원인).
> 근거 원문 링크는 부록 I-8.
>
> 본 문서 = 세션 전체 이력(승인 8종 + 거부 40여 건 + 20여 렌더 배치) + 셰이더·파이프라인·인코딩 코드 실측 기반:
> ① 지향점의 정밀 정의 → ② 엔진 전수 해부 → ③ 격차의 수학적 규명 → ④ 해결 아키텍처(구현 코드 포함)
> → ⑤ **소스 불가지론적 자동 유도 시스템** → ⑥ 검증 프로토콜 → ⑦ 로드맵 → ⑧ 프로세스 계약.
>
> **한 줄 결론: 파라미터의 문제가 아니라 "모션 프리미티브"의 문제다. 엔진이 낼 수 있는 움직임의 종류
> (고정 픽셀 위 전역 색 순환)와 지향점이 요구하는 움직임(구조를 따라 여행하는 layered 빛)이 서로 다른 종류다.
> 튜닝은 이 간극을 못 넘는다. 셰이더에 위상장(phase field) 프리미티브를 추가하고, 밝음의 위계(hierarchy)를
> 마스크로 강제하고, 판정을 자동화해야 마스터피스 영역에 진입한다.**
>
> **v3 핵심 원칙 — 소스 불가지론(source-agnostic):** 원본은 무한히 다양하다. 따라서 이 설계의 어느 부분도
> 특정 소스(부처·피콕·우키요…)에 묶이지 않는다. 모든 마스크·위상장·팔레트·케이던스는
> **이미지를 측정(M 벡터)하고 측정값에서 유도(E-1 규칙)**한다. 소스명이 붙은 레시피는 시스템이 아니라
> 그 시스템이 특정 지점에서 내놓았어야 할 출력의 수동 발견본일 뿐이다 (PART E).

---

# PART A — 지향점의 정밀 정의: "마스터피스급"이란 정확히 무엇인가

## A-0. 근거의 삼각측량 — 지향점을 어떻게 객관적으로 정의했나

지향점 정의는 서로 독립인 세 갈래 증거의 **교집합**으로 도출한다 (단일 출처 의존 배제):

1. **Isaac 판정 데이터** (1차 근거, 가장 권위): 승인 8종 / 거부 40여 건의 전수 패턴 (A-4·A-5).
2. **지각과학 원전**: 인간 시각이 무엇을 "움직임"으로 등록하는가 — Motion Without Movement(SIGGRAPH 1991),
   Phase-Based Video Motion Processing(SIGGRAPH 2013), 4-스트로크/역-phi 모션, Rotating Snakes(주변시 드리프트) (A-3).
3. **무빙 비저너리 아트 실무**: 실제로 그림을 '살아있게' 만드는 프로들이 무엇을 움직이는가 —
   Alex Grey/CoSM의 프로젝션 매핑, Android Jones의 레이어드 실시간 합성, MilkDrop 계보, VJ 루프 설계 원칙 (A-2).

세 갈래가 같은 결론에 수렴한다: **마스터피스 = 밝은 사이키델릭 색이 아니라, 정지 구조 위에서
"층화된(layered)·국소적(local)·위계적(hierarchical) 빛의 운동"이 일어나는 것.** 아래 5기둥이 그 분해다.

## A-1. 5기둥 — 각 기둥의 정의·함의·측정 프록시

각 기둥을 (a) 정의, (b) 20초 루프에서의 함의, (c) 위반 시 증상, (d) 측정 프록시로 분해한다.
(기둥 자체는 Isaac 판정 데이터에서 역산된 것이며, 기둥별 과학·실무 근거를 병기한다.)

### 기둥 1. 안정된 성상 (Stable sacred/entity focus)

- **정의**: 피사체(부처·가네샤·눈)는 "의식의 닻(consciousness anchor)". 실루엣 스케일에서 항상 읽혀야 하고,
  전역 리컬러의 대상이 아니라 **존재감**(눈·오라·에지·반사광·내부 발광)으로 강화되는 대상.
- **루프 함의**: 피사체의 형태·명암 구조·고유 색 정체성은 20초 내내 유지. 색이 흘러도 "그 존재"가 흔들리면 안 됨.
- **위반 증상**: "타이다이 필터 포스터"(가네샤 7연속 거부), 피사체 실루엣 블랙아웃(prism 프리셋), 매트 어둡힘.
- **측정 프록시**: 피사체 영역 평균 명도·대비가 전 프레임에서 소스 대비 ±25% 이내 / 에지 선명도 유지율.

### 기둥 2. 하이퍼스페이스 공간감 (Chamber / portal / impossible depth)

- **정의**: 화면이 평면 포스터가 아니라 **깊이를 가진 공간(챔버·포탈)**으로 읽히는 것 — 소스가 이미 가진
  아치·링·장식·그림자를 암시적 깊이로 승격. 외부 패턴을 붙여넣는 게 아니라(금지) 소스-네이티브 요소를
  공간으로 읽히게 만드는 것. (실무 근거: Alex Grey/CoSM 무빙 작업도 회화 자체는 두고 빛·색 연출로
  공간감을 만든다 — A-2-0.)
- **루프 함의**: 배경/후광/링이 피사체와 **다른 시간 리듬**으로 살아 움직여 깊이의 층이 분리돼 보여야 함.
- **위반 증상**: 배경과 피사체가 같은 위상으로 lockstep 순환 → 평평한 "한 장의 필터".
- **측정 프록시**: 레이어 간 색 위상차(항상 ≥60°) / 배경-피사체 명도 분리(위계) 유지.

### 기둥 3. 살아있는 고주파 디테일 (High-frequency ordered detail that feels ALIVE)

- **정의**: nested·대칭·반(半)생물적 미세 디테일 — 마이크로글리프, 에지 심머, 주얼 패싯, 살아있는 질감.
  "decorative"(장식적)가 아니라 "alive"(지각이 실시간 재보정되는 느낌).
- **루프 함의**: **미세 스케일에서도 무언가가 항상 미세하게 움직여야** 한다 — 단 이동(drift)이 아니라
  제자리에서의 심머/크롤/맥동. 이것이 현 엔진에 가장 결핍된 능력이다 (→ PART C).
- **위반 증상**: "너무 정적" (preserve 계열 반복 지적), 반대로 스페클 노이즈(질서 없는 고주파).
- **측정 프록시**: 서브초 프레임 diff에서 "정지 영역 비율" < 10% / 스페클 지수(인접 픽셀 hue 분산) 임계 이하.

### 기둥 4. 주얼톤 luminous + 깊은 네거티브 스페이스 (Jewel light over deep dark)

- **정의**: 베이스는 딥 인디고·바이올렛·니어블랙·다크틸. 빛은 시안·에메랄드·마젠타·바이올렛·골드·간헐 화이트.
  **"내부에서 발광하는(luminous from within)"** 느낌 — 포스터화·데이글로 금지. 원칙 한 문장:
  **화면을 균일하게 채도화하지 말라 — 위계를 지켜라.** (발광의 지각은 밝은 것과 어두운 것의 *대비*에서
  나온다: 스테인드글라스가 빛나 보이는 이유는 납선의 어둠이다. Isaac 판정 데이터의 딥블랙 법칙과 일치.)
- **루프 함의**: 가장 쨍한 색은 **후광·장식·윤곽·고주파 라인워크에만** 집중. 어둠은 어둠으로 남는다.
  (eye2 세션의 "딥블랙은 결함이 아니라 핵심" 교훈과 정확히 일치 — 이미 데이터로 검증된 기둥.)
- **위반 증상**: v6 dayglo 전면 노랑/그린, buddha-fast 가르시, 균일 satBoost의 "everything colorful"(명시 거부).
- **측정 프록시**: 밝기 상위 5% 픽셀의 마스크 집중도(ornament/edge에 ≥70%) / 하위 20% 어둠 보존율.

### 기둥 5. 부드러운 변성 전환 (Smooth metamorphic transitions)

- **정의**: 색이 끊기지 않고 계속 녹아 넘어감. 급격한 hue 점프·밝기 펄스·루프 심(seam) 금지.
- **루프 함의**: (duration/period)×speed 정수 조건 + 밝기 변조 요소(godRays·aura·glowPulse·feedback 콜드스타트) 통제.
- **위반 증상**: strobe(eye2 초기), 피드백 콜드스타트 루프 심(문서화됨), godRays/aura 잔존 깜빡임.
- **측정 프록시**: 프레임 간 평균 휘도 변화 < 0.02 / frame599↔0 diff ≤ 인접 baseline×1.5.

### 모션에 대한 결정 명제 (5기둥의 종합 — 지각과학으로 재정식화)

인간의 모션 지각은 **국소 위상/휘도 그라디언트의 시간 변화**에 반응하는 모션 검출기(motion-energy detector)가
담당한다 (A-3 상세). 여기서 두 개의 결정 명제가 나온다:

> **명제 1.** 화면 전체가 같은 위상으로 동시에 색이 변하면(전역 lockstep) 모션 검출기가 반응할
> **공간 그라디언트가 없다** → "움직임"이 아니라 "필터 변화"로 지각된다. 이것이 현 엔진의 유일한 모션이다.
>
> **명제 2.** 색/휘도 변화에 **공간적 위상 그라디언트**를 주면 — 픽셀이 1도 안 움직여도 — 시각계는
> 진짜 연속 운동으로 등록한다. 이는 이론이 아니라 35년 전 증명된 사실이다 (Motion Without Movement,
> Freeman·Adelson·Heeger, SIGGRAPH 1991: 고정 위치 패턴의 국소 위상만 연속 변화 → 연속 운동 지각).

**명제 1이 모든 "필터 포스터" 거부의 지각적 원인이고, 명제 2가 해결책(위상장, D-3)의 과학적 보증이다.
이것이 본 문서의 출발점이다.**

## A-2. 무빙 비저너리 아트 실무 검증 + 정적 거장들의 화면 언어 → 파이프라인 번역

### A-2-0. 결정적 실무 사실 (독립 검증) — 프로들은 그림을 이렇게 움직인다

1. **Alex Grey / CoSM의 실제 무빙 작업**: 그의 회화를 움직이는 공식 작업들은 풀 애니메이션이 아니라
   **원본 2D 회화 위에 프로젝션 매핑 + 오디오 반응 컬러 그레이딩/CG 어댑테이션을 얹는 방식**이다
   — 즉 "정지 구조 위의 색·빛 연출"이 이 장르의 실무 표준. **우리 파이프라인의 접근 방향 자체는 옳았다.**
2. **Android Jones의 실제 무빙 작업**: 파티클 시스템 + 실시간 레이어드 합성(VJ 도구화한 Particle Illusion)
   — 프레임별 리페인트가 아니라 **파라미터화된 층들의 실시간 중첩**.
3. **장르의 2대 모션 프리미티브** (무빙 사이키델릭 애니메이션 전반): **breathing**(형태의 유기적 맥동)과
   **morphing**(연속 변형), 보조로 트레일·엣지 드리프트·**정지 구조 위 컬러 사이클링**.
   → 우리 제약(C2 기하 금지)상 breathing/morphing은 기하가 아닌 **색 위상**으로 구현해야 하고(D-3·D-4),
   컬러 사이클링은 이미 보유 — 문제는 그것이 "전역"이라는 점뿐(명제 1).
4. **MilkDrop 계보의 교훈**: 그 "살아있음"의 심장은 피드백 워프 메시(이전 프레임을 매 프레임 왜곡 재샘플).
   우리에겐 기하 워프가 금지 → **피드백은 트레일 전용으로 절제**하고, 살아있음은 위상 파동으로 대체 (같은
   지각 효과, 다른 합법 수단).
5. **VJ 루프 설계 실무**: 반복감 회피의 제1기법 = **서로 다른 주기의 층을 겹쳐 결합 주기를 LCM으로 늘리기**
   — D-7 서로소 케이던스 설계와 정확히 일치 (독립 검증됨). 그 외: 첫/끝 프레임 매칭(우리의 정수 사이클),
   정적 구간 금지.

### A-2-1. Alex Grey — 해부학적 투명성 + 라인워크 발광 (정적 언어의 번역)

- **화면 언어**: 인체를 반투명하게 겹치고(해부·에너지체 층), **에너지 라인워크가 몸을 관통해 흐르는 정적 암시**.
- **번역**: ① 소스의 라인워크/에지에서 **에지-밴드 마스크 레이어** 추출 → 고속 케이던스 배정.
  ② **위상장(D-3)**: 에지 거리장 기반 — 색 파동이 라인워크를 타고 기어가는 "line crawling".
- **금지 회피**: 라인은 소스 자기 것(생성 아님), 픽셀 이동 없음(색 위상만 이동).

### A-2-2. Android Jones — 다층 레이어드 빛 (실무 검증됨)

- **화면 언어**: 다층 스크린/애드 블렌딩, 층별 다른 밀도·색·투명도의 실시간 중첩 (위 A-2-0-2 검증).
- **번역**: 옵티컬 마스크 스택(D-2)의 다층화(6~9층) + 층별 blend·opacity·케이던스 차등.
- **주의**: 실측 교훈 — screen/add 남발 = 중앙 백화. **add/screen은 저알파(≤0.15)로만**, 코어는 normal.

### Amanda Sage — 라이트-래티스 (빛의 격자)

- **기법**: 인물 주변·내부에 가느다란 빛의 그물이 뻗어나감. 격자가 "연결된 의식"을 시각화.
- **번역**: 에지 마스크 + 하이라이트 마스크의 교집합 레이어에 화이트/골드 스파크(v8의 white-spark가 원형).
  위상장 radial로 이 스파크들이 초점에서 **순차 점화**되듯 위상차를 갖게 함.

### Luke Brown — 주얼/오팔 표면

- **기법**: 표면이 보석·오팔·자개처럼 각도에 따라 색이 미끄러짐(iridescence).
- **번역**: 이미 검증된 holo-iridescent(가이드 §5-G) + 오일슬릭 팔레트. 위상장 luminance-smooth 기반이면
  명암을 따라 색이 미끄러져 **자개 효과가 실제로 흐른다**.

### Alex Aliume — "painting under painting" (그림 속 숨은 그림)

- **기법**: 같은 그림이 조명에 따라 다른 그림으로 변신(UV/일반광/암흑). 숨겨진 레이어가 드러남.
- **번역**: **레이어별 팔레트를 아예 다르게** + 느린 상호 크로스디졸브(케이던스 차) → 20초 안에서
  "다른 그림이 배어나오는" 순간들이 주기적으로 발생. (D-7 케이던스 설계의 비트 주파수 개념.)

### Harry Pack — 구획화된 다층 공간 (compartmental space)

- **기법**: 화면이 명확한 구획(챔버·프레임·창)으로 나뉘고 각 구획이 다른 세계.
- **번역**: 마스크 스택이 곧 구획. 구획별 팔레트·속도 차등이 "compartmental" 읽힘을 만든다.

### Mars-1 — 볼록한 깊이장 (convex depth fields)

- **기법**: 배경이 평면이 아니라 볼록하게 부풀어 오르는 공간감.
- **번역**: 위상장 radial(초점 중심)의 파동 방사가 배경을 "부풀어 보이게" 하는 유사-깊이 착시.
  (실제 기하 왜곡 없이 — 색 위상 그라디언트만으로 깊이 단서 제공.)

### Carey Thompson — "들어갈 수 있는 그림" (enterable image)

- **기법**: 포탈 구조 — 시선이 화면 안쪽으로 빨려 들어가는 구성.
- **번역**: radial 위상장의 **방향**(안→밖 vs 밖→안)이 이를 결정: 위상이 중심에서 바깥으로 증가하면
  파동이 중심에서 방사(emanation), 반대면 중심으로 수렴(빨려듦). 파라미터 부호 하나로 양방향 지원.

## A-3. 지각과학 — 왜 "색 위상"이 진짜 모션으로 읽히는가 (독립 원전 4계보)

위상장 설계(D-3)의 과학적 토대. 전부 본 세션에서 직접 확인한 1차 문헌이다 (링크: 부록 I-8).

### A-3-1. Motion Without Movement (Freeman·Adelson·Heeger, SIGGRAPH 1991)
고정 위치의 패턴에 방향성 필터 쌍(quadrature pair)을 적용하고 **국소 위상만 연속 변화**시키면
인간은 **연속적 운동**을 지각한다 — 픽셀 변위 0. **"색/위상만 움직여도 진짜 모션으로 읽힌다"의 원전 증명.**
위상장(D-3)은 이 원리의 이미지-구조 버전이다.

### A-3-2. Phase-Based Video Motion Processing (MIT CSAIL, SIGGRAPH 2013)
복소 steerable pyramid의 **위상 변화가 곧 모션**이며, 위상 조작만으로 모션을 증폭/생성할 수 있다
(옵티컬 플로우·픽셀 변위 없이). 현대 그래픽스에서 "위상 = 모션"의 표준 정식화.

### A-3-3. 4-스트로크 모션 / 역-phi (Anstis 계보)
모션 검출기는 **휘도 변화의 시공간 상관**에 반응한다. 결정적 함의 (설계 변수로 직결):
- **모션 지각의 주 운반체는 휘도(luminance)다** — 등휘도 색상만의 변화는 모션 신호가 약함.
- → **파동은 hue만이 아니라 휘도도 함께 실어야 강하게 "움직임"으로 읽힌다** (D-3-5 신규 설계 규칙).
- strobe와의 구분이 정확해짐: **국소 휘도 그라디언트가 이동**(파동, 전역 평균 일정) = 모션 /
  **전역 휘도가 진동**(평균 자체가 출렁) = strobe. QA 메트릭 1(lumFlicker=전역 평균 변화)이 정확히 이 경계를 감시한다.

### A-3-4. Rotating Snakes / 주변시 드리프트 일루전 (Fraser-Wilcox 계보, Kitaoka)
**완전 정지 이미지**조차 비대칭 계단형 휘도 순서(black→dark→white→light 순환)가 있으면
연속 회전/드리프트로 지각된다. 함의 2가지:
1. **파동 밴드의 휘도 "순서"가 모션의 방향감과 강도를 결정한다** — 팔레트를 설계할 때 t 진행 방향으로
   휘도가 톱니형(sawtooth)으로 배열되면 모션 지각이 최대화된다 (D-3-5).
2. **청-황(blue-yellow) 색 대비가 이 모션 지각을 증폭**한다는 실측 연구 존재 — 주얼 팔레트의
   골드↔시안/인디고 축과 부합 (jewel-fire·night가 우연히 아니라 지각적으로 유리한 축).

### A-3-5. 장르 실무와의 합류
A-2-0의 breathing/morphing/컬러사이클링(실무)과 위 4계보(과학)가 같은 지점을 가리킨다:
**정지 구조 + 국소 위상·휘도의 질서 있는 순환 = 살아있는 그림.** 필요한 것은 전부 색 도메인 안에 있고
(기하 불필요 = C2·C3 통과), 우리에게 없는 것은 "국소 위상 그라디언트"라는 축 하나다.

## A-4. 승인작 8종 심층 해부 — 왜 그것만 성공했는가

| 승인작 | 소스 성격 | 결정 메커니즘 | 5기둥 충족 방식 |
|--------|-----------|---------------|-----------------|
| **lotus** (역대최고) | 컬러풀 + 뚜렷한 요소 + 장면 | 요소분리(연꽃 마스크) + K×S=4 코히런트 | 기둥1(연꽃=앵커) + 기둥4(요소별 색 위계) |
| **rainbuddha2** | 전면 흐르는 무지개 구조 | 3레이어 비동기 디졸브(6/8/4, 위상 0/120/240) | 기둥5(디졸브) + 기둥2(층 분리) + **소스가 기둥3 대납** |
| **peacock-b-fast** | 흐르는 이리데센트 잎 | 빠른 순환(14) + valueLift 밝힘 | **소스의 흐름 구조가 색 순환을 "이동하는 빛"으로 착시** |
| **peacock-a-dev2** | 레인보우 피콕 눈 | 순환 20 + 스월 피드백 | 위와 동일 + 피드백이 유사-파동 부여 |
| **eye2-holo** | 딥블랙 + 필리그리 마블 | 느린 디졸브(2/2.5/1.5) + 정지 마블 + 딥블랙 유지 | 기둥4 완벽(딥블랙 위계) + 기둥3(마블 디테일) |
| **hand-eye / mushroom** | 깊은 다크 + 굵은 형태 | prism K×S 88 (스페클이 어둠에 묻힘) | 기둥4(다크 네거티브) — 어둠이 스페클 결함 은폐 |
| **buddha-planet** | 다크 + 화려 | enterprise 강채도 | 위와 동일 |
| **f19 bright-body** | 밝은 바디 저대비 | K×S=6 + 강주입 + vLift 0.68 | 기둥1(피사체 밝힘) + 코히런트 색 |

### A-4-1. rainbuddha2-clean 심층 — "느린 디졸브 + 층 분리"의 원형

- 소스: 오렌지 부처 머리에서 무지개가 쏟아지는 **전면 흐름 구조** 스틸.
- 값: 3레이어(6/8/4 사이클, 위상 0/120/240), hueKey 1.2(저분산), paletteAmount 0.25(보존적),
  satInj 0, **CA 1.0**(강한 홀로 엣지), 웜 비네트 + sCurve.
- 성공 기제 3중주: ① 층별 다른 속도 → 배경·피사체·광선이 **서로 어긋나며** 디졸브 = 기둥 2의 최소 구현.
  ② paletteAmount 0.25 = 소스 색 정체성 유지(C5 준수) — hue가 흐르되 "그 그림"이 유지.
  ③ 소스의 방사형 무지개 스트림이 hue 회전을 **"쏟아지는 흐름의 연속"으로 착시**시킴 — 실제로는
  픽셀 고정 색 순환인데 시선이 스트림 구조를 따라가며 움직임을 지각. **위상장이 할 일을 소스가 대신 한 것.**
- 한계: 같은 레시피를 골드 마블 석상에 이식하자 즉시 실패(2026-07-01 실측) — 소스가 착시를 안 만들어주니
  "색 도는 석상 사진"이 그대로 노출. 레시피의 힘이 아니라 소스의 힘이었음이 교차 검증됨.

### A-4-2. peacock-b-fast 심층 — "빠른 흐름 + 밝힘"의 원형 (Isaac 최애)

- 소스: 다크 블루/틸 눈-잎사귀. 잎 내부가 이리데센트 그라데이션(=연속적 hue 지형).
- 값: 단일 레이어, speed 14, valueLift 0.22, satBoost 1.8, hueKey 1.3, palAmt 0.42(psf 0.6/pvf 0.32), 은은한 피드백.
- 성공 기제: 소스의 hue 지형이 연속적이라 huePhase 항(hsv.x×hueKey×hueSpeed)이 **우연히 평활한 위상장 역할**을
  수행 — 잎 안에서 위상이 매끄럽게 변해 색 밴드가 잎을 가로질러 **이동하는 것처럼** 보임. 이것이
  "색 흐름이 엄청 빨라야 돼"를 만족시키면서도 strobe로 안 읽힌 이유다 (전역 lockstep이 아니었으니까).
- **이 관찰이 위상장 설계(D-3)의 직접적 영감이다**: huePhase가 우연히 해준 것을 의도적·소스무관하게 만드는 것.

### A-4-3. eye2-holo-clean 심층 — "위계 + 질감"의 원형

- 소스: 딥블랙 배경 + 컬러풀 손-얼굴 + 자체 필리그리.
- 값: 느린 디졸브(2/2.5/1.5), 정지 fbm 마블(noiseSpeed 0 + domainWarp2), 오일슬릭 팔레트(amount 0.9),
  valueLift 배경 0 고정, feedback 0(심 방지).
- 성공 기제: **딥블랙을 안 건드린 것** — 13회의 "검정 없애기" 시도가 전부 실패한 후 도달한 결론.
  어둠이 위계(기둥 4)를 만들고, 마블이 디테일(기둥 3)을 만들고, 팔레트 0.9가 그린(C6)을 차단.
- 교훈의 일반화: valueLift는 subject 전용, void는 신성불가침 → D-6 위계 엔진의 "void satBoost 1.0 고정" 규칙.

### A-4-4. lotus 심층 — "요소 분리"의 원형 (역대최고)

- 값: K×S=4 코히런트 + satInj 0 + **연꽃 색 마스크 4번째 레이어**.
- 성공 기제: 요소(연꽃/부처/물)마다 다른 색 운명 — 이것이 "구획화된 공간"(Harry Pack)의 초보 구현.
  마스크 스택(D-2)은 lotus의 수동 1회성 분리를 자동·6층으로 확장하는 것.

**패턴 (결정적):** 승인작은 전부 다음 둘 중 하나다.
1. **소스가 흐르는 구조를 제공** → 전역 색 순환이 그 구조를 타고 "이동하는 빛"으로 **착시**됨 (rainbuddha2, peacock 계열).
2. **소스가 깊은 어둠을 제공** → 밝음의 위계가 공짜로 생기고 결함(스페클)이 은폐됨 (eye2, prism 계열).

즉 **성공은 엔진의 능력이 아니라 소스가 기둥 2·3·4를 대납한 경우다.** 엔진 스스로는 5기둥 중
기둥 5(디졸브)만 자력 달성 가능하다. 이것이 "소스 적합성이 8할" 법칙의 정체이자,
Isaac이 "이미지 핑계 금지"를 명령한 순간 엔진 업그레이드가 유일한 답이 된 이유다.

## A-5. 거부작 유형학 — 7가지 실패 모드 전수

40여 건의 거부를 7가지 모드로 분류. 각각 근본 원인이 다르며, 처방도 다르다.

### 모드 1: "타이다이 필터 포스터" (구조 정지 + 색만 순환)
- 사례: 가네샤 7연속, 마블 부처상 10연속, v5 (자체 로그: "still read as recolored source art").
- 원인: R1 (구조적 천장). 색이 아무리 예뻐도 구조가 정지 → 필터로 인식.
- 파라미터로 해결 불가. **위상장(D-3)만이 처방.**

### 모드 2: 머디 그린/올리브
- 사례: ukiyo 시리즈, 골드부처 전 배치, eye4, ukiyo3 배경.
- 원인: 자유 hue 회전이 그린 데드존(H≈70~165°) 통과 (수학은 B-4). 특히 블루(H≈220°)·골드(H≈45°)가
  회전 중 반드시 그린을 지남.
- 처방: 팔레트 경로 강제(paletteAmount↑) + **그린-세이프 D벡터 (D-5)** + 위상장으로 회전 자체를 국소화.

### 모드 3: 가르시 dayglo (위계 붕괴)
- 사례: v6 (전면 노랑/그린), buddha-fast, 파스텔 부처 recolor, "everything colorful" 계열.
- 원인: satBoost/satFloor의 **전 화면 균일 적용** → 기둥 4 위반.
- 처방: **마스크별 채도 예산 (D-6)** — 시스템이 위계를 강제.

### 모드 4: 무지개 스페클/클럼프
- 사례: busy 텍스처 + 높은 hueKey 전부, 매끈면 + satInjection.
- 원인: 위상 결합이 픽셀 단위 비평활 (수학은 B-3).
- 처방: hueKey 낮게(대증) + **평활 위상장으로 대체(근본)**.

### 모드 5: strobe / 깜빡임
- 사례: eye2 초기(14/10), godRays·aura 잔존 배치, 피드백 콜드스타트 심.
- 원인: 색 회전율 과다 / 밝기 변조 이펙트 / 프레임0 버퍼 콜드스타트.
- 처방: 검증된 통제법 존재(가이드 §0) + **QA 자동 검출(D-8)**로 재발 차단.

### 모드 6: "너무 정적"
- 사례: preserve 계열 반복 지적, ganesha-preserve("너무 약하다").
- 원인: 색 보존과 모션이 트레이드오프 관계에 갇힘 (제약 매듭 R3).
- 처방: 위상장 — **색을 보존하면서도 파동은 흐르게** (위상장은 색 자체를 안 바꾸고 변화의 타이밍만 국소화).

### 모드 7: "다 똑같아 보임" (변주 실패)
- 사례: 7종 매트릭스, v5 5종("차이가 작았다").
- 원인: 변주 축이 미묘하거나, 스틸로 안 보이는 모션 축이거나, 정수초 샘플 위상 함정.
- 처방: 프로세스 규칙 (PART H) — 축 극단화 + 서브초 리뷰 + 사전 선언.

## A-6. 거부 연대기 — 반복된 패턴의 시계열 증거

같은 구조적 실패가 세션을 바꿔가며 반복됐음을 시계열로 확인한다 (동일 원인 → 동일 결말의 재현성 증거):

| 시기 | 시도 | 결말 | 사후 확인된 모드 |
|------|------|------|------------------|
| 2026-06-18 | eye 시리즈 4종 (busy portrait) | 전부 거부 | 모드 4 (스페클) + 모드 1 |
| 2026-06-19 | cosmos2 / buddha-916 | 거부·"최악" | 모드 4 / 모드 2+1 (회색 hero) |
| 2026-06-22 | ukiyo 시리즈 (블루 목판화) | 접음 | 모드 2 (그린) — "모션=hue변형 딜레마" 명명 |
| 2026-06-22 | eye2 13회 "검정 없애기" | 전부 실패 → 딥블랙 복귀 | 모드 3 (위계 파괴 시도의 역설) |
| 2026-06-22 | eye2-holo-clean | ✅ 승인 | — (위계 보존 + 팔레트 경로) |
| 2026-06-23 | rainbuddha #13·#14 | ✅ 승인 | — (animate-don't-repaint 확립) |
| 2026-06-24 | Ganesha 7연속 | 전부 거부 ("장난하냐") | 모드 1 — "figure 중심 소스" 법칙 기록 |
| 2026-06-29 | peacock a/b | ✅✅ 승인 (최애) | — (소스가 위상장 대납, A-4-2) |
| 2026-06-29 | eyeleaf/buddha-fast/matrix 7종/dramatic 3종 | "구리다"·"다 똑같다"·"극도로 별로" | 모드 3 / 모드 7 / 모드 5 |
| 2026-07-01 | 마블 부처 10여 렌더 (bfast/rb2/prism/bright/vivid/fast/warm/warmglow...) | 전부 "별로" | 모드 1+2 복합 — 레시피 룰렛의 정점 |
| 2026-07-02 | DMT v4→v5→v6→v7→v8 (타 세션, 리서치 반영) | v6 dayglo↔v7 감쇠 진동, 자체 로그 "still read as recolored" | 모드 3↔보정 진동 + 모드 1 잔존 |

**시계열이 보여주는 것:** ① 성공은 소스 유형과 함께만 나타난다 (승인 3회 전부 흐름/딥블랙 소스).
② figure/석상 계열은 접근을 바꿔도(레시피 5계열, 리서치 반영 v4~v8까지) **모드 1을 벗어나지 못했다** —
파라미터 공간 안에 해가 없다는 강한 증거. ③ v6↔v7 진동은 위계 축이 없는 상태에서 전역 게인만
오르내린 결과 — 축 자체(D-6)가 필요하다는 증거.

---

# PART B — 현 엔진 전수 해부 (코드 실측)

## B-1. 렌더 경로 전체 맵

```
소스 PNG (1632×2912)
  │
  ├─[선택] scripts/pipeline-pro.ts ─ Replicate 분해
  │    ├─ bria remove-background → 전경 매트 (573×1024로 도착! → 업스케일 → 디테일 손실)
  │    ├─ flux-fill-pro 인페인트 → 배경 (807×1440로 도착 → 업스케일 → 블록화)
  │    └─ 휘도 160 임계 분리 → layer-1(어두움)/layer-2(밝음)   ← 의미론 없는 2분할
  │
  ├─ scene.json (Zod 검증: src/lib/scene-schema.ts)
  │
  ├─ 렌더러 (헤드리스 Chrome + Three.js)
  │    ├─ src/main.ts: ACESFilmicToneMapping 기본 (?tonemap=none으로 해제 가능)
  │    ├─ src/sketches/layered-psychedelic.ts: 레이어별 ShaderMaterial, uTime = 정규화(0..1)
  │    ├─ src/shaders/layer.frag: 색 파이프라인 (B-2)
  │    └─ src/lib/effect-composer.ts: bloom→CA→godRays→aura→kaleido→mandala→feedback→filmGrade
  │
  └─ scripts/export-layered.ts
       ├─ captureFrames: 풀해상도(1632×2912) PNG 600장
       └─ ffmpeg 인코딩: scale=1080:1920 lanczos + full→tv 레인지  ← 말단 손실 (B-7)
```

## B-2. 셰이더 색 파이프라인 — 수식 항별 분해 (layer.frag:345~410 실측)

```glsl
// 1. 위상 구성 (line 351-355)
lumPhase = pow(1.0 - lum, lumExponent + luminanceKey)     // 휘도→위상 (픽셀별)
huePhase = hsv.x * hueKey * hueSpeed                       // 원본 hue→위상 (픽셀별)
hueShift = fract(time/period * speed + lumPhase + huePhase + phaseOffset/360)

// 2. hue 적용 (line 383-387)
shiftedHue  = fract(hsv.x + hueShift)                      // 고채도 픽셀: 원본 hue 회전
injectedHue = fract(hueShift + lum * luminanceKey)         // 저채도 픽셀: 주입
hsv.x = mix(injectedHue, shiftedHue, smoothstep(satBlendLow, satBlendHigh, originalSat))

// 3. 채도/명도 (line 389-394)
hsv.y = mix(satBoost*satInjectionMul, clamp(origSat*satBoost,0,1), blend)
hsv.z = max(originalVal, valueLift * (1.0 - originalVal))

// 4. IQ 팔레트 오버레이 (line 400-410)
pal = A + B*cos(TAU*(C*fract(hueShift) + D))               // 팔레트 곡선
palHsv.z = max(palHsv.z, paletteValueFloor)                // 다크위상 방지 (검증됨)
palHsv.y = max(palHsv.y, paletteSatFloor)                  // 탁함 방지 (검증됨)
rgb = mix(rgb, pal * mix(originalVal, 1.0, paletteValueFloor), paletteAmount)
```

**항별 성질 분석:**

| 항 | 공간 분포 | 시간 분포 | 문제 |
|----|-----------|-----------|------|
| `time/period*speed` | **상수 (전 화면 동일)** | 선형 | = "global hue flooding". 리서치가 배제한 그것 |
| `lumPhase` | 픽셀별 (휘도 함수) | 정지 | **비평활** — 인접 픽셀 휘도차가 그대로 위상차 (→ B-3 스페클) |
| `huePhase` | 픽셀별 (hue 함수) | 정지 | 동일하게 비평활. hueKey↑ = 스페클↑ |
| `phaseOffset` | 레이어 상수 | 정지 | 층 분리의 유일한 수단 — 단 3층뿐 |

**결론: 위상의 공간 구조를 결정하는 항이 전부 (a) 상수이거나 (b) 픽셀 단위 비평활이다.
"매끄럽게 공간을 가로지르는 위상 그라디언트" = travelling wave를 만들 항이 존재하지 않는다.**
이것이 엔진의 근본 한계이며, 추가해야 할 것이 정확히 이 항 하나다 (D-3).

## B-3. 스페클의 수학

인접 픽셀 p, q의 hue 위상차:
```
Δφ(p,q) = |lumPhase(p)−lumPhase(q)| + |huePhase(p)−huePhase(q)|
        ≈ (lumExp+lumKey)·|Δlum| + hueKey·hueSpeed·|Δhue_src|
```
busy 텍스처는 |Δlum|, |Δhue_src|가 픽셀 스케일에서 크다(질감·그레인). hueKey×hueSpeed가 크면
Δφ가 픽셀 스케일에서 수십 도 → **인접 픽셀이 무지개의 다른 지점** → 눈이 평균화하면 회색(grey-fix 문서의 원인),
평균화 안 되면 스페클. **이는 파라미터 실수가 아니라 "비평활 결합"이라는 설계의 필연.**
K×S를 낮추면(대증) 스페클은 줄지만 공간 색 변주도 함께 죽는다 — 변주와 매끄러움이 한 노브에 묶인 딜레마.
**해결: 위상을 평활한 장(場)에서 가져오면 변주(장의 그라디언트)와 매끄러움(장의 블러)이 분리된다.**

## B-4. 그린 데드존의 수학

자유 hue 회전 경로: `H(t) = H_src + 360°·(t·speed/period)` — **모든 소스 hue가 원환 전체를 통과**한다.
- 블루(H≈220°) 소스: 회전 중 H=70~165°(올리브~그린) 구간을 **매 사이클 통과**. 통과 시간 비율 ≈ 95°/360° ≈ 26%.
- 골드(H≈45°): 동일하게 통과. **즉 어떤 소스든 사이클당 ~26%는 그린 대역에 있다.**
- 그린 대역이 특히 나쁜 이유: sRGB에서 중간 명도·중간 채도의 yellow-green은 지각적으로 "탁함(올리브)"으로
  읽힌다 (지각 균일성 문제). 채도를 올려도 "쨍한 라임"이 되어 여전히 조화 파괴 (실증: satFloor로 못 잡음).

**팔레트 경로가 답인 이유:** `pal(t) = A+B·cos(2π(C·t+D))`는 **닫힌 파라메트릭 곡선** — RGB 공간에서
곡선이 지나는 지점을 D벡터로 설계 가능. 그린을 곡선에서 **기하학적으로 제외**할 수 있다 (D-5에서 설계법).
paletteAmount가 낮으면(보존 계열) 원본 hue 회전 경로가 새어나와 그린이 복귀한다는 것도 실증됨
→ 그린-크리티컬 소스는 paletteAmount ≥ 0.6 또는 hue 회전 자체를 위상장 국소 파동으로 대체.

**더 깊은 지각적 근본 원인 (독립 리서치 신규 발견): HSV는 지각 비균등 공간이다.**
HSV에서 hue를 회전하면 **지각 밝기(perceived lightness)가 hue에 따라 요동**한다 — 같은 S·V의
옐로우는 밝고 블루는 어둡게 *보인다*. 즉 "밝기를 안 건드렸는데 회전 중 어둡거나 탁해지는" 현상은
HSV 회전의 내재적 성질이다. 현대 컬러 사이언스의 해법 = **OKLab/OKLCH** (Björn Ottosson, 2020;
CSS Color 4 표준 채택): OKLCH에서 L(지각 밝기)·C(채도) 고정 + h만 회전하면 **모든 hue에서 지각
밝기·채도가 일정**하게 유지된다 — "같은 색인데 색상만 다른" 회전. 그라디언트/블렌드의 머디 중간점도
OKLab 보간으로 해소됨이 업계 표준 지식. → **D-5b: 셰이더에 OKLCH hue-회전 경로 옵션 추가**
(IQ 팔레트와 상호보완: 팔레트 = 설계된 색 여정, OKLCH 회전 = 소스색 보존형 회전의 안전판).

## B-5. IQ 팔레트의 기하학 — D벡터 설계 이론

`pal_ch(t) = A_ch + B_ch·cos(2π(C_ch·t + D_ch))`, 채널별 코사인의 **위상차**가 색 경로를 결정한다.

- **D = [0, 1/3, 2/3]** (기본값): 3채널 위상 등간격 = RGB 원환 전체 순회 = **풀 레인보우 (그린 포함)**.
- **그린 지배 조건**: G채널이 최대(t ≈ −D_g mod 1 근방)일 때 R·B가 모두 낮으면 순수 그린.
- **그린 제외 전략 2가지**:
  1. **G를 R에 묶기**: |D_r − D_g| ≤ 0.10 → G가 뜰 때 R도 뜸 → 그린 대신 앰버/옐로우골드.
  2. **G를 B에 묶기**: |D_g − D_b| ≤ 0.10 → 그린 대신 시안/틸.
- **다크 위상 회피**: 모든 채널이 동시에 최저가 되는 t가 없도록 위상 분산 + `A_ch − B_ch ≥ 0.15` 보장
  (또는 기존 paletteValueFloor로 후처리 — 이미 구현·검증됨).

**팔레트 린트 스크립트 (신규, `scripts/lint-palette.ts`)**: t∈[0,1) 256샘플 →
각 t의 RGB→HSV → ① 올리브 밴드(H 60~110°, S<0.65 ∨ V<0.5) 체류율, ② 순그린(H 100~150° ∧ G>1.25·max(R,B)) 체류율,
③ 다크(V<0.25) 체류율 산출. 임계: 올리브 0%, 순그린 ≤8%(에메랄드 허용 여부는 프리셋별), 다크 0%.
**팔레트는 렌더 전에 린트를 통과해야 한다** — 그린 위상을 렌더 후 눈으로 발견하는 낭비 제거.

## B-6. 이펙트 체인 — 기여와 실패 모드 전수

| 이펙트 | 기여 | 실측된 실패 모드 | 마스터피스 세팅 지침 |
|--------|------|------------------|---------------------|
| bloom | 발광(luminous) 핵심 | threshold 낮으면 전면 글로우=백화 | strength 0.5~0.8, threshold 0.5+ — **하이라이트만** |
| chromaticAberration | 프리즘/홀로 엣지 | 과하면 이중상 | 0.3(은은)~1.0(rainbuddha2 홀로 엣지) |
| godRays | 광선 | **강도·샘플이 프레임별 밝기 변조 → strobe 주범** (실증) | 마스터피스에선 0 또는 ≤0.1 |
| aura | hue-shift 헤일로 | hueSpeed 비정수 → 깜빡임 (실증) | intensity ≤0.2, hueSpeed 0 |
| kaleidoscope | 대칭 접기 | 구도 파괴 (실증) | 0 (금지 인접) |
| mandala | 오버레이 | **생성 패턴 = 명시 금지** + ringWave 비정수 심 | 0 고정 |
| multipassFeedback | 트레일/에코/스월 | **콜드스타트 루프 심** (프레임0 에코 없음, 실증 seam 3.76) + 강하면 색 평균화(워시아웃) | strength ≤0.42 + **워밍업 프레임 필요 (D-9)** 또는 0 |
| filmGrade | 비네트/대비/sCurve | grain은 스페클과 시너지로 악화 | grain 0, 웜 비네트는 부처류 유효(rainbuddha2) |
| trails | 단순 프레임 믹스 | feedback과 동일 콜드스타트 | 0 권장 |

## B-7. 말단 손실 실측 (export-layered.ts:131)

```
-vf "scale=1080:1920:flags=lanczos:...:in_range=full:...:out_range=tv:..."
```
1. **1632×2912 → 1080×1920 다운스케일**: 선형 해상도 34% 손실. 기둥 3(고주파 디테일)의 미세 디테일이
   가장 먼저 뭉개진다. 마이크로글리프·주얼 패싯·에지 심머는 1080에서 상당 부분 소멸.
2. **full→tv 레인지 변환**: 0-255 → 16-235 압축. 플레이어가 태그를 올바로 해석하면 무손실 왕복이지만,
   해석이 어긋나는 환경(일부 브라우저/앱)에선 **대비·쨍함이 한 단계 씻겨 보임**. "쨍함 도둑" 후보.
3. 20Mbps H.264: 1080p엔 충분하나 풀해상도 인코딩 시 30~40Mbps 필요.

## B-8. 제약 시스템 형식화 — 가능 영역이 얼마나 좁았나

| # | 제약 (Isaac 확정) | 차단되는 수단 |
|---|-------------------|---------------|
| C1 | 정지 금지 | preserve의 cc=0 순수 정지 |
| C2 | 기하 왜곡 금지 (polarTwist/rotate/scalePulse/과한 breath) | 모핑·줌·트위스트 전부 |
| C3 | 드리프트 금지 (패턴의 translate) | noiseSpeed>0, 하드코딩 time*x 평행이동 |
| C4 | strobe 금지 | 고속 순환 + 밝기 변조 |
| C5 | 리페인트 금지 (완성 소스의 색 정체성 파괴) | 높은 paletteAmount 전면 적용 |
| C6 | 그린/올리브 금지 | 자유 hue 회전 (26% 그린 체류) |
| C7 | mandala/fractal/swirl **생성** 금지 | 절차적 패턴 오버레이 |
| C8 | AI 영상 금지 | img2video 전부 |
| C9 | 루프 심리스 | 비정수 케이던스, 피드백 콜드스타트 |

C1~C9의 교집합에서 기존 엔진에 남는 자유도 = **colorCycle 속도 · 레이어 3개의 위상 · 팔레트**.
이 좁은 영역 안에서 승인작들이 나온 것 자체가 소스의 공헌이었다 (A-4).
**위상장(D-3)은 C1~C9 어느 것도 건드리지 않으면서 자유도의 차원을 하나 늘린다** — 이것이 전략적 핵심.

---

# PART C — 격차 매트릭스: 요구 능력 vs 보유 능력

| # | 마스터피스 요구 능력 (A파트) | 현 엔진 | 격차 해소책 |
|---|------------------------------|---------|------------|
| 1 | 색 파동이 화면을 **여행** (travelling wave) | ❌ 전역 lockstep | **D-3 위상장** |
| 2 | 라인워크를 타고 기어가는 빛 (line crawling) | ❌ | **D-3 (edge-distance 장) + D-4** |
| 3 | 포탈/오라 호흡 (breathing, 기하왜곡 없이) | ❌ (breath는 기하라 금지) | **D-3 (radial 장, 색 호흡)** |
| 4 | 6~9층 광학 레이어, 층별 케이던스 | △ 3층 휘도분할 | **D-2 마스크 스택** |
| 5 | 밝음의 위계 (주얼 over 딥다크) | ❌ 전역 균일 부스트 | **D-6 마스크별 예산** |
| 6 | 그린-세이프 색 경로 | △ 수동 D 튜닝 | **D-5 프리셋 + 린트** |
| 7 | 피사체 보존 (매트 어둡힘 없이) | ❌ bria RGB 사용 | **D-2 (알파만 쓰고 RGB는 원본)** |
| 8 | 고주파 디테일 보존 | ❌ 1080 다운스케일 | **D-9 풀해상도 인코딩** |
| 9 | 결함 사전 검출 (strobe/그린/심/정적) | ❌ 수동 눈검사 | **D-8 QA 하네스** |
| 10 | 부드러운 디졸브 + 정수 루프 | ✅ 보유 (검증됨) | 유지 |
| 11 | 팔레트 floor (다크/탁함 방지) | ✅ 보유 (pvf/psf) | 유지 |
| 12 | 홀로/오일슬릭 표면 | ✅ 보유 (§5-G) | 위상장과 결합해 강화 |

격차 1~3이 "필터 vs 살아있음"을 가르는 본질이고, 전부 **위상장 하나**로 해소된다.
4~7은 품질 바닥을 올리고, 8~9는 손실을 막는다.

---

# PART D — 해결 아키텍처 (구현 스펙)

## D-1. 설계 원칙 5개조

1. **구조는 소스에서만** — 모든 마스크·위상장은 소스 자기 픽셀에서 파생 (C7 준수).
2. **픽셀은 안 움직인다** — 이동하는 것은 색의 위상뿐 (C2·C3 준수).
3. **위계 우선** — 어둠은 지키고, 쨍함은 장식·윤곽·하이라이트에만 (기둥 4).
4. **모든 시간항은 정수 사이클** — duration×speed/period ∈ ℤ, 위상장은 정적 (C9 준수).
5. **렌더 전 린트, 렌더 후 QA** — 사람 눈은 최종 감상에만 쓴다 (Isaac을 QA로 쓰지 않는다).

## D-2. 옵티컬 마스크 스택 — `scripts/make-optical-layers.ts` (신규)

v8의 일회성 구현(ganesha-dmt-v8-layers.ts)을 **소스 범용**으로 일반화한다.
v8과의 차이: ① 하드코딩 figureMask(타원 조합) 제거 → 범용 피사체 마스크, ② 스키마 통합, ③ 위상장 동시 생성.

### D-2-1. 마스크 6종 정의와 생성 알고리즘

입력: 소스 PNG (풀해상도). 출력: `layers/*.png` (RGBA, RGB=**원본 픽셀 그대로**, A=마스크) + 메타 JSON.

```
공통 준비:
  lum[i]  = Rec.601 휘도 (v8 makeLuminance 재사용)
  hsv[i]  = 픽셀별 HSV (v8 rgbToHsv 재사용)
  edge[i] = Sobel |∇lum| (v8 edgeSampler 재사용)
  lumS    = lum의 강블러(σ = 이미지폭×0.02)  ← 평활 버전 (위상장·위계용)

마스크 정의 (아래 상수는 기본값 예시 — 실전 임계는 E-1-1의 소스별 퍼센타일로 유도. 전부 soft, smoothstep 페더):
  M_void      = smoothstep(0.45, 0.15, lumS)                    # 어두운 배경/네거티브 스페이스
  M_body      = smoothstep(0.18, 0.42, lumS) · (1 − M_orn)      # 중간톤 몸체
  M_ornament  = smoothstep(0.45, 0.75, sat) · smoothstep(0.25, 0.5, val)   # 고채도 장식
  M_highlight = smoothstep(0.62, 0.92, val)                     # 하이라이트/광원
  M_edge      = smoothstep(0.02, 0.09, edge) · (0.4 + 0.6·sat)  # 윤곽 밴드 (v8 edge식 재사용)
  M_figure    = bria 알파 있으면 feather(alpha, 8px), 없으면 중심가중 saliency(sat×국소대비 블러)
```

**결정적 규칙 — 매트 어둡힘의 근본 해결:**
> 레이어 PNG의 **RGB는 항상 원본 소스 픽셀**을 쓰고, 마스크는 **알파 채널에만** 넣는다.
> (기존 실패: bria가 돌려준 어두운 전경 RGB를 그대로 사용 → 피사체 navy화.
> bria는 알파 소스로만 활용. flux-fill 인페인트도 배경 레이어가 필요할 때만.)

### D-2-1b. 구현 골격 (v8-layers에서 이식할 부분 명시)

```ts
// scripts/make-optical-layers.ts — 골격 (v8 유틸 재사용 표기)
import sharp from "sharp";
// v8에서 그대로 이식: rgbToHsv, hsvToRgb, smoothstep, clamp01, makeLuminance, edgeSampler

interface MaskSet { void_: Float32Array; body: Float32Array; ornament: Float32Array;
                    highlight: Float32Array; edge: Float32Array; figure: Float32Array; }

async function blurField(f: Float32Array, w: number, h: number, sigma: number): Promise<Float32Array> {
  // Float32 → 8bit gray → sharp.blur(sigma) → Float32 (품질 충분, 코드 최소)
  const buf = Buffer.alloc(w * h);
  for (let i = 0; i < f.length; i++) buf[i] = Math.round(clamp01(f[i]) * 255);
  const out = await sharp(buf, { raw: { width: w, height: h, channels: 1 } }).blur(sigma).raw().toBuffer();
  return Float32Array.from(out, (v) => v / 255);
}

export async function buildMasks(img: ImageData, briaAlphaPath?: string): Promise<MaskSet> {
  const { width: w, height: h, raw } = img;
  const lum = makeLuminance(img);
  const lumS = await blurField(lum, w, h, w * 0.02);          // 평활 휘도 (위상장과 공유)
  const edgeAt = edgeSampler(lum, img);
  const m: MaskSet = { /* Float32Array(w*h) × 6 초기화 */ } as MaskSet;
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const [hh, s, v] = rgbToHsv([raw[p], raw[p+1], raw[p+2]]);
    const e = edgeAt(i % w, Math.floor(i / w));
    m.void_[i]      = smoothstep(0.45, 0.15, lumS[i]);
    m.ornament[i]   = smoothstep(0.45, 0.75, s) * smoothstep(0.25, 0.5, v);
    m.body[i]       = smoothstep(0.18, 0.42, lumS[i]) * (1 - m.ornament[i]);
    m.highlight[i]  = smoothstep(0.62, 0.92, v);
    m.edge[i]       = smoothstep(0.02, 0.09, e) * (0.4 + 0.6 * s);
  }
  m.figure = briaAlphaPath
    ? await blurField(await loadAlpha(briaAlphaPath, w, h), w, h, 8)   // 알파만! RGB는 절대 안 씀
    : await blurField(saliency(lum, /*sat*/ m.ornament, w, h), w, h, w * 0.03);
  return m;
}

export async function writeLayerPng(img: ImageData, mask: Float32Array, out: string, blur = 0): Promise<void> {
  const buf = Buffer.alloc(img.raw.length);
  for (let i = 0; i < mask.length; i++) {
    const p = i * 4;
    buf[p] = img.raw[p]; buf[p+1] = img.raw[p+1]; buf[p+2] = img.raw[p+2];   // ★RGB=원본 그대로
    buf[p+3] = Math.round(clamp01(mask[i]) * 255);                            // ★마스크는 알파만
  }
  const s = sharp(buf, { raw: { width: img.width, height: img.height, channels: 4 } });
  await (blur > 0 ? s.blur(blur) : s).png().toFile(out);
}
// main(): buildMasks → 6장 writeLayerPng → D-2-2 표대로 scene.json 생성(케이던스·팔레트·예산 하드코딩)
```

### D-2-2. 레이어 역할·케이던스·팔레트 배정 표 (기본 설계)

| 레이어 (아래→위) | 마스크 | blend | 역할 | speed (20s 사이클수) | 팔레트 | 채도 예산 |
|------------------|--------|-------|------|---------------------|--------|----------|
| L0 base | 없음(전체) | normal | 소스 보존 베이스 | 2~3 (미세 드리프트) | 없음(palAmt 0~0.1) | satBoost ≤1.1 |
| L1 void | M_void | normal | 딥 네거티브 유지 | 2 | jewel-night 저휘도역 | **satBoost 1.0 고정, 밝히지 않음** |
| L2 body | M_body | normal | 몸체 젠틀 디졸브 | 4~6 | 소스친화 프리셋 | satBoost ≤1.4 |
| L3 ornament | M_ornament | normal | 주얼 포인트 | 10~14 | jewel-fire/night | satBoost 1.6~1.9 + psf 0.5 |
| L4 edge | M_edge | screen(α≤0.5) | 라인워크 크롤 | 14~22 | 프리즘 듀오톤 | 최대 비비드 허용 |
| L5 highlight | M_highlight | add(α≤0.15) | 스파크/글린트 | 10 (위상 180) | 화이트~골드 | bloom이 여기만 물게 threshold 조정 |

→ 기둥 2(층별 리듬)·기둥 4(위계)가 **구성 자체로 강제**된다. add/screen 저알파 규칙은 v4 백화 교훈 반영.

### D-2-3. scene-schema 확장

기존 스키마 변경 없음 — 마스크 스택은 **기존 layers[] 메커니즘 그대로** 사용 (레이어 수 제한 없음 확인됨).
`role` enum에 이미 background/midground/detail/foreground-occluder 존재 → 그대로 매핑.

## D-3. 위상장 (Phase Field) — 핵심 프리미티브 ★

### D-3-1. 수학과 루프 안전성 증명

```
hueShift(x,y,T) = fract( T·(speed/period) + φ(x,y) + lumPhase + huePhase + offset )
φ(x,y) = uPhaseAmount · field(x,y),  field: 정적 텍스처, 값 ∈ [0,1]
```
- **루프**: T=duration에서 T·speed/period ∈ ℤ (기존 조건) → fract 내 시간항이 T=0과 합동.
  φ는 T와 무관 → **모든 픽셀에서 frame0 ≡ frame600. 증명 끝.**
- **파동 해석**: 등위상선(field 등고선)을 따라 색이 정렬되고, 시간이 흐르면 색 밴드가
  **등고선의 수직 방향으로 이동하는 것처럼 보인다** — 픽셀은 고정인데 파동이 여행한다.
  이것이 travelling wave의 정확한 구현이며 C2(기하)·C3(드리프트)를 원천적으로 안 건드린다.
- **파장 제어**: uPhaseAmount = "장 전체 범위에 걸친 hue 사이클 수".
  0.2~0.5 = 완만한 스윕(권장 시작), 1.0 = 풀 무지개 1파장, ≥2 = 다중 밴드(링처럼 보일 수 있어 주의 — C7 인접).
- **속도 분리의 의미**: 파동의 이동 속도 = speed/period ÷ (field 그라디언트). **색 변화율(전역)과
  파동 이동감(국소)이 분리**된다 — "빠르게 흐르는데 부드럽다"가 처음으로 동시에 가능해진다 (C4 해소).
- **과학적 보증**: 이 구성은 Motion Without Movement(1991)의 "국소 위상 연속 변화 = 연속 운동 지각"과
  Phase-Based Motion Processing(2013)의 "위상 = 모션" 정식화의 직접 구현이다 (A-3-1·2). 추측이 아니라
  35년 검증된 지각 원리 위에 선다.

### D-3-2. 위상장 5종과 생성 알고리즘 (`scripts/make-phase-field.ts` 신규)

| 종류 | 수식/알고리즘 | 시각 효과 | 적합 소스 |
|------|---------------|-----------|-----------|
| **radial** | `dist((x,y), focal)/maxR` (focal=수동 지정 or 최대 휘도 블롭) | 초점에서 색 파동 방사/수렴 (부호로 방향) | 제3의 눈·후광 소스 (부처·가네샤·눈) |
| **luminance** | lumS (강블러 휘도, 2~98퍼센타일 정규화) | 명암 지형을 타고 색이 미끄러짐 = 오팔/자개 | 마블·드레이프·흐르는 구조 |
| **edge-distance** | Sobel 에지맵 → 2-pass chamfer distance transform → 정규화 | 라인워크에서 파동이 배어나와 면으로 퍼짐 | 라인 많은 소스 (uki요에·필리그리) |
| **vertical-depth** | `0.7·ny + 0.3·(1−lumS)` | 아래→위 상승 파동 (챔버 깊이) | 세로 구도·광선 소스 |
| **angular** | `atan2(y−fy, x−fx)/2π` | 초점 주위 회전 스윕 (윤곽 크롤) | 원형 후광·링 소스 |

구현 노트:
- 전부 sharp + Float32Array로 수십 줄 (v8의 makeLuminance/edgeSampler 재사용).
- **angular 필수 규칙**: 0↔1 랩 경계에서 hue 불연속을 없애려면 **uPhaseAmount가 정수**여야 함
  (fract가 함께 랩되므로 정수면 심리스, 비정수면 방사형 심 라인 발생).
- **안티밴딩**: 8-bit PNG(256계조)로 충분하나 완만한 장에선 hue 계단 가능 →
  셰이더에서 `field += (hash12(vUv·1024)−0.5)/300` 미세 디더 한 줄 추가.
- 여러 장 혼합: `field = w1·radial + w2·luminance` 사전 합성 후 1장으로 굽기 (셰이더는 1샘플 유지).

```ts
// scripts/make-phase-field.ts — 핵심부 (radial / luminance / edge-distance / vertical / angular)
type FieldKind = "radial" | "luminance" | "edge-distance" | "vertical" | "angular";

function radialField(w: number, h: number, fx: number, fy: number): Float32Array {
  const f = new Float32Array(w * h);
  const maxR = Math.hypot(Math.max(fx, w - fx), Math.max(fy, h - fy));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    f[y * w + x] = Math.hypot(x - fx, y - fy) / maxR;
  return f;   // 방향 반전(수렴형)은 1−f
}

function angularField(w: number, h: number, fx: number, fy: number): Float32Array {
  const f = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    f[y * w + x] = (Math.atan2(y - fy, x - fx) / (2 * Math.PI) + 0.5);   // 0..1
  return f;   // ★ phaseAmount는 정수만 (랩 심 방지)
}

// 2-pass chamfer distance transform — 에지에서의 거리 (edge-distance 장)
function chamferDT(edgeMask: Uint8Array, w: number, h: number): Float32Array {
  const INF = 1e9, d = new Float32Array(w * h).fill(INF);
  for (let i = 0; i < d.length; i++) if (edgeMask[i]) d[i] = 0;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? INF : d[y * w + x]);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)                       // forward pass
    d[y*w+x] = Math.min(d[y*w+x], at(x-1,y)+1, at(x,y-1)+1, at(x-1,y-1)+1.414, at(x+1,y-1)+1.414);
  for (let y = h - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--)             // backward pass
    d[y*w+x] = Math.min(d[y*w+x], at(x+1,y)+1, at(x,y+1)+1, at(x+1,y+1)+1.414, at(x-1,y+1)+1.414);
  // 퍼센타일 정규화(2~98%)로 0..1 스케일 후 반환
  return normalizePercentile(d, 0.02, 0.98);
}

// 초점 자동 탐지: 강블러 휘도의 최대점 (수동 지정이 항상 우선 — 미간/후광 중심)
function autoFocal(lumS: Float32Array, w: number, h: number): [number, number] {
  let best = 0, bi = 0;
  for (let i = 0; i < lumS.length; i++) if (lumS[i] > best) { best = lumS[i]; bi = i; }
  return [bi % w, Math.floor(bi / w)];
}
// main(): kind별 장 생성 → 필요 시 가중 혼합 → 8bit gray PNG로 layers/phase-<kind>.png 저장
```

### D-3-3. 구현 diff (3파일, 총 ~20줄)

**src/shaders/layer.frag** (uniform 블록에 2줄 + main에 4줄):
```glsl
uniform sampler2D uPhaseTex;
uniform float uPhaseAmount;
// ... main(), hueShift 계산 직전:
float fieldPhase = 0.0;
if (uPhaseAmount > 0.0001) {
  float f = texture2D(uPhaseTex, vUv).r;
  f += (fract(sin(dot(vUv, vec2(12.9898,78.233)))*43758.5453) - 0.5) / 300.0;  // 디더
  fieldPhase = f * uPhaseAmount;
}
float hueShift = fract(time / safePeriod * uColorCycleSpeed + lumPhase + huePhase + fieldPhase + uPhaseOffset / 360.0);
```

**src/lib/scene-schema.ts** (animation 스키마에 2필드):
```ts
phaseField: z.string().optional(),                          // 위상장 PNG 경로 (layers/phase-*.png)
phaseAmount: z.number().min(0).max(4).default(0),
```

**src/sketches/layered-psychedelic.ts** (텍스처 로드 + 유니폼 2개):
```ts
const phaseTex = anim.phaseField ? await loadTexture(textureLoader, `/${anim.phaseField}`) : nullTex;
// uniforms에:
uPhaseTex: { value: phaseTex },
uPhaseAmount: { value: anim.phaseAmount ?? 0 },
```
(phaseTex는 `colorSpace = NoColorSpace`로 로드 — 데이터 텍스처이므로 sRGB 변환 금지. 1×1 검정 nullTex 기본.)

**하위 호환**: phaseAmount 기본 0 → 기존 scene.json 전부 동작 동일. 리스크 최소.

### D-3-4. 안전 범위와 조합 규칙

| 파라미터 | 시작값 | 범위 | 규칙 |
|----------|--------|------|------|
| phaseAmount (radial) | 0.35 | 0.2~0.6 | >1이면 동심 링 인상 (C7 인접) — 금지 아님, 주의 |
| phaseAmount (luminance) | 0.5 | 0.3~1.0 | 소스 명암 대비가 클수록 낮게 |
| phaseAmount (edge-distance) | 0.4 | 0.2~0.8 | 라인 밀도 높으면 낮게 |
| phaseAmount (angular) | 1.0 | **정수만** (1, 2) | 비정수 = 방사 심 |
| 레이어별 배정 | L2 body: luminance / L3 ornament: radial / L4 edge: edge-distance | — | 층마다 다른 장 = 층별 파동 방향 분리 (기둥 2 강화) |
| hueKey 병용 | 기존보다 **낮춰라** (0.3~0.8) | — | 공간 변주를 위상장이 담당하므로 비평활 커플링 축소 → 스페클 여지 제거 |

### D-3-5. 파동의 휘도 프로파일 설계 ★신규 — 모션 지각의 결정 변수 (A-3-3·4 직결)

지각과학 발견의 실무 번역: **파동이 "움직임"으로 강하게 읽히려면 hue만이 아니라 휘도가 함께 흘러야 하고,
그 휘도의 "순서"가 방향감을 만든다.**

1. **팔레트 휘도 궤적 설계**: `pal(t)`의 지각 휘도 `L(t) = 0.299R+0.587G+0.114B`가 t 진행 방향으로
   **비대칭 톱니형**(완만한 상승 → 빠른 하강, Rotating Snakes의 dark→mid→bright 순서)이 되도록 A·B·D를
   설계한다. 린트 스크립트에 **L(t) 프로파일 검사** 추가: 진폭 0.15~0.35 (너무 평평=모션 약함,
   너무 크면=지역 깜빡임), 비대칭도(상승/하강 구간비) ≥ 1.5.
2. **strobe 안전성의 정확한 경계**: 파동 휘도 변조는 **국소적**(밴드가 지나감)이며 화면 전역 평균 휘도는
   상수 유지 (등위상선이 화면을 고르게 덮으므로 적분값 불변) → QA lumFlicker(전역 평균)는 잠잠하고
   모션 검출기(국소 그라디언트)만 발화. "살아있는데 안 번쩍인다"의 수학적 이유.
3. **청-황 축 활용**: blue-yellow 대비가 일루전 모션을 증폭한다는 실측 연구(A-3-4)에 따라, 모션감이
   최우선인 레이어(edge·ornament)의 팔레트는 **골드↔인디고/시안 축을 관통**하게 설계 (jewel-fire·night 부합).
4. **주변시 효과**: 드리프트 일루전은 주변시에서 강하다 — 9:16 세로 화면에서 시선은 피사체(중앙)에 있고
   배경·가장자리가 주변시에 놓인다 → **배경/에지 레이어에 톱니 휘도 파동**을 주면 "화면 전체가 살아있다"는
   인상이 극대화된다 (시선이 어딜 보든 주변부가 미세하게 흐름).

### D-3-6. 글로우 파동 (Glow Wave) — hue 불변 휘도 파동 ★v5 핵심 프리미티브

**완성-비비드 소스(대부분의 입력)의 기본 모션 경로.** 색은 소스 그대로 두고, 위상장을 따라
**밝기(+약간의 채도) 파동**만 여행시킨다 — "그림 위를 지나가는 빛".

**왜 이것이 마스터피스 경로인가 (3중 근거):**
1. 지각과학: 모션 지각의 주 운반체는 휘도다 (A-3-3). hue 파동보다 강하게 "움직임"으로 등록된다.
2. 실무: Alex Grey/CoSM의 무빙 작업 = 원화 위 빛 프로젝션 (A-2-0). 원화의 색은 불변, 빛이 흐른다.
3. 승인 법칙: "animate, don't repaint" — 색 정체성 보존. **hue를 안 돌리므로 그린/머디/데이글로가
   정의상 불가능** (모드 2·3의 원천 차단).

**스키마** (레이어 animation에 추가):
```jsonc
glowWave: { strength: 0~1 (기본 0), speed: 정수 (루프당 사이클, 기본 0), sharpness: 0~1 (기본 0.5),
            fieldCycles: 0.25~2 (기본 1) }   // 위상장 1스팬에 걸친 파동 개수
```

**셰이더** (최종 rgb 계산 후 적용, 기존 phaseField 텍스처 재사용):
```glsl
if (uGlowWaveStrength > 0.001) {
  float f = texture2D(uPhaseTex, vUv).r;                       // 정적 장 — 루프 안전
  float wp = fract(time / safePeriod * uGlowWaveSpeed + f * uGlowWaveFieldCycles);
  // D-3-5 비대칭 크레스트: 좁은 빛마루가 여행 (sharpness↑ = 좁고 예리)
  float crest = pow(0.5 + 0.5 * cos(TAU * (wp - 0.62)), mix(1.5, 7.0, uGlowWaveSharpness));
  rgb *= 1.0 + uGlowWaveStrength * (crest - 0.3);              // 마루는 발광, 골은 미세 침강
  // (선택) 마루에서 채도 소폭 리프트 — 주얼 글린트
}
```
- **루프 안전**: speed 정수 + 정적 장 → frame0 ≡ frameN. **strobe 안전**: 장의 등위상선이 화면을 고르게
  덮으므로 프레임 평균 휘도는 시간 불변 (QA lumFlicker 잠잠, 국소 모션 검출기만 발화 — D-3-5-2와 동일 논리).
- **깊이·위계와의 결합**: 파동의 마루가 하이라이트·장식에서 블룸을 물고 (threshold 상호작용),
  어둠(void)은 strength 0으로 어둠으로 남는다 → 기둥 4 "내부에서 발광"의 직접 구현.
- 층별 배정: body(luminance 장, 느림) / ornament(radial 장, 중간) / edge(edge 장, 빠름) —
  빛이 후광에서 방사되고 라인워크를 기어가는 층상 운동 (기둥 2·3).
- hue 파동(uPhaseAmount)과 공존 가능하나, 완성-비비드 소스에선 **glowWave가 주، hue 파동은 0~미세**.

## D-4. 보조 프리미티브

### D-4-1. edge-crawl (라인 주행광)
edge 마스크 레이어 + angular 또는 edge-distance 위상장 + 고속 케이던스(20~28) + 프리즘 듀오톤 팔레트.
효과: 윤곽선을 따라 빛 알갱이가 주행하는 인상 (Alex Grey 라인워크의 동적 버전). 신규 코드 불필요 — D-2+D-3 조합.

### D-4-2. aura breathing (색 호흡)
aura형 마스크(figure 팽창-침식 차분 밴드) + radial 위상장 + 저속(3~4) + 저알파.
glow.pulse(밝기 변조 = strobe 위험)와 달리 **색상 파동이므로 밝기 불변** → C4 안전.

### D-4-3. prism ghost (이중상 에코)
v8의 cyan(+3,−1)/magenta(−3,+1) 오프셋 레이어 기법 공식화: 에지 마스크를 ±3px 시프트한 2장,
위상 180° 분리. **정적 오프셋**(시간 이동 아님)이라 C3 안전. DMT "afterimage/double-vision" 직역.

### D-4-4. multipassFeedback 워밍업 (콜드스타트 심 제거)
export-layered.ts captureFrames에서 캡처 시작 전 **마지막 2초 구간(프레임 540~599)을 버리는 프리롤 렌더**
→ 프레임0이 이미 정상 상태 에코를 가진 채 시작 → 루프 심 소멸. (~15줄, 피드백 계열 완전 해금.)

```ts
// export-layered.ts captureFrames 내부, 본 캡처 루프 직전에 삽입:
const WARMUP_FRAMES = 60;                                 // 2초 @30fps — decay 0.9^60 ≈ 0.002, 충분한 정착
for (let i = totalFrames - WARMUP_FRAMES; i < totalFrames; i++) {
  await page.evaluate(`window.__captureFrame()`);          // 렌더만 하고 PNG는 버림
}
// 이후 기존 0..totalFrames 캡처 루프 그대로 → frame0 = frame600 직후 상태 = 심리스
```
검증: seamRatio(D-8 메트릭 5)가 워밍업 전 3.76(실측) → 목표 ≤1.2. 이 패치로 feedback·trails가
"루프 심 걱정 없는" 상시 사용 가능 이펙트로 승격된다 — 홀로 트레일·유사 파동 강화에 중요.

## D-5. 주얼 팔레트 시스템 — 프리셋 3종 + 린트

B-5 이론에 따른 설계값 (전부 `lint-palette.ts` 통과 조건부 — 수치는 린트로 최종 확정):

```jsonc
// jewel-night: 에메랄드↔시안↔바이올렛↔마젠타, 딥 인디고 저점 (기둥4의 기본 팔레트)
{ "A": [0.42, 0.40, 0.52], "B": [0.38, 0.34, 0.40], "C": [1, 1, 1], "D": [0.62, 0.55, 0.95] }
//  → G가 B에 근접(0.55↔0.95는 R·B 쪽) — 그린은 시안/에메랄드로만 발현. 저점은 인디고(다크위상은 pvf로 방어).

// jewel-fire: 앰버↔골드↔마젠타↔바이올렛 (웜 소스·부처류). 그린 완전 배제.
{ "A": [0.55, 0.42, 0.40], "B": [0.42, 0.32, 0.38], "C": [1, 1, 1], "D": [0.00, 0.06, 0.78] }
//  → |D_r−D_g|=0.06: G는 항상 R을 따라감 → 그린 불가능, 골드/앰버로만.

// jewel-opal: 시안↔골드↔핑크 루미너스 (홀로/파스텔 소스). §5-G 계보.
{ "A": [0.68, 0.62, 0.70], "B": [0.30, 0.28, 0.32], "C": [1, 1, 1.15], "D": [0.05, 0.48, 0.60] }
```

운용 규칙:
- 레이어마다 **다른 프리셋** 배정 가능 (Aliume "painting under painting" — 층이 교차할 때 숨은 그림 효과).
- pvf(paletteValueFloor) 0.15~0.3 + psf(paletteSatFloor) 층별 차등(위계) 병용 — 이미 검증된 방어선.
- **신규 팔레트는 반드시 린트 통과 후 사용** (B-5 스크립트). 그린-크리티컬 소스(블루/골드 지배)는
  jewel-fire 계열 + paletteAmount ≥0.6으로 hue 회전 경로 차단.

```ts
// scripts/lint-palette.ts — 전문 (~60줄). 사용: npx tsx scripts/lint-palette.ts '{"A":[...],"B":[...],"C":[...],"D":[...]}'
type V3 = [number, number, number];
const TAU = Math.PI * 2;

function pal(t: number, A: V3, B: V3, C: V3, D: V3): V3 {
  return [0, 1, 2].map((i) => A[i] + B[i] * Math.cos(TAU * (C[i] * t + D[i]))) as V3;
}
function rgbToHsvDeg([r, g, b]: V3): V3 {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d > 0) h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, max];
}

export function lintPalette(A: V3, B: V3, C: V3, D: V3, opts = { allowEmerald: false }) {
  let olive = 0, green = 0, dark = 0;
  const N = 256;
  for (let k = 0; k < N; k++) {
    const [h, s, v] = rgbToHsvDeg(pal(k / N, A, B, C, D).map((x) => Math.min(1, Math.max(0, x))) as V3);
    if (h >= 60 && h <= 110 && (s < 0.65 || v < 0.5)) olive++;          // 올리브(탁한 황록) — 하드 밴
    const [r, g, b] = pal(k / N, A, B, C, D);
    if (h > 100 && h < 150 && g > 1.25 * Math.max(r, b)) green++;       // 순그린 지배
    if (v < 0.25) dark++;                                                // 다크 위상 (pvf 미적용 기준)
  }
  const verdict = {
    olivePct: (olive / N) * 100, greenPct: (green / N) * 100, darkPct: (dark / N) * 100,
    pass: olive === 0 && (green / N) <= (opts.allowEmerald ? 0.15 : 0.08) && dark / N <= 0.1,
  };
  return verdict;   // pass=false면 D벡터 조정 (B-5 전략: G를 R 또는 B에 0.1 이내로 묶기)
}
```
운용: 프리셋 3종은 저장 전 1회 린트로 수치 확정. 새 소스용 커스텀 D는 **렌더 전 린트 필수** (그린을
렌더 후 눈으로 발견하는 사이클 자체를 제거 — 지금까지 그린 발견은 전부 렌더 후였다).
린트에 **D-3-5의 L(t) 톱니 프로파일 검사** 병합 (진폭·비대칭도) — 팔레트가 색뿐 아니라 모션 지각까지 책임진다.

### D-5b. OKLCH hue-회전 경로 — 머디의 지각적 근본 해결 ★신규 (B-4 발견 직결)

기존 hue 회전(HSV)은 지각 비균등 → 회전 중 밝기·탁함 요동이 **내재적**. OKLCH 회전 옵션을 셰이더에 추가:

```glsl
// layer.frag — OKLab 변환 (Björn Ottosson 공개 구현, ~25줄) + 회전 경로 스위치
uniform float uHueSpaceMode;   // 0 = 기존 HSV(호환), 1 = OKLCH
// OKLCH 모드: rgb → oklab → (L, C, h) → h += hueShift*360° → 역변환
// L·C 불변 → 회전 전 구간에서 지각 밝기·채도 일정 = 다크/머디 위상이 "정의상" 불가능
```

- **적용처**: 소스색 보존형 회전(보존 계열·finishedVivid 소스)의 기본 경로로 승격 —
  "원본색을 유지한 채 hue만 흐른다"가 지각적으로 처음 참이 된다.
- **팔레트와의 관계**: 상호보완. 설계된 색 여정(주얼 무드)이 필요하면 IQ 팔레트, 소스 정체성 유지가
  우선이면 OKLCH 회전. E-1-3 유도 규칙에 분기 추가: `finishedVivid 높음 → OKLCH 회전 경로`.
- **비용**: 프래그먼트당 수십 연산 추가 — 무시 가능 (오프라인 렌더).

### D-5c. 선형광(linear-light) 합성 감사 ★신규 — 탁한 합성의 숨은 원인 후보

sRGB(감마) 공간에서의 블렌드/가산은 중간값이 물리적 광량보다 **어둡게** 계산된다 — 머디 중간점의
고전적 원인 (업계 표준 지식). 우리 파이프라인의 감사 지점:
1. layer.frag의 HSV·팔레트 연산이 어느 공간의 값 위에서 도는가 (텍스처 sRGB 디코드 후 = 선형).
2. EffectComposer 중간 렌더타깃의 포맷/공간 — bloom 누적·feedback 에코·CA 샘플이 선형에서 도는가.
3. 최종 인코딩 전 단일 지점에서만 sRGB 인코드되는가.
→ **P1e 감사 태스크**: 각 경계의 공간을 코드로 확정하고, 어긋난 지점이 있으면 교정. (bloom이 유난히
빨리 백화되거나 feedback이 탁해지는 실측 증상들과 부합할 가능성 — 확정은 감사 후.)

## D-6. 밝음 위계 엔진 (코드 0줄 — 규약으로 강제)

D-2-2 표의 "채도 예산" 열이 곧 엔진이다. 스크립트 `make-optical-layers.ts`가 scene.json을 생성할 때
**예산표를 하드코딩**한다 — 사람이 satBoost를 전역으로 올리는 실수를 시스템이 차단.
- void: satBoost 1.0 / valueLift 0 (**절대 밝히지 않음** — eye2 "딥블랙 앵커" 법칙의 시스템화)
- body: ≤1.4 / ornament: ≤1.9 / edge·highlight: 상한 없음 (면적이 작아 dayglo 불가)
- bloom threshold는 highlight 레이어의 상위 휘도에 맞춰 자동 산출 (전면 글로우 방지).

## D-7. 케이던스 설계 이론

- **정수 규약**: period=20 고정 시 speed = 루프당 사이클 수. 전 레이어 정수 → 심리스 자동 보장.
- **서로소 원칙**: 층 speed를 {2,3,5,7,11,13} 같은 서로소 집합에서 뽑으면 **모든 층 조합의 위상 관계가
  루프 내내 한 번도 반복되지 않음** → 20초가 "한 패턴의 반복"이 아니라 "계속 변하는 상태"로 읽힘.
  (독립 검증: VJ 루프 실무의 제1 반복감-회피 기법이 정확히 이것 — "다른 주기의 층을 겹쳐 결합 주기를
  LCM으로 늘린다". A-2-0-5.)
- **비트(beat) 주파수**: 두 층의 |s1−s2|가 루프당 교차 횟수. 인접 층은 4~8 차이가 심리적으로 "재보정" 리듬.
- **권장 세트**:
  - 명상형(부처·성상): {2, 3, 5, 8, 13} — 피보나치, 느림→중간.
  - 플로우형(peacock 계열): {3, 5, 11, 17, 22} — 상층 고속.
  - 위상 오프셋: 층 간 균등 분산(0/72/144/216/288) + 위상장이 층마다 다르면 오프셋 중요도 하락.

## D-8. QA 하네스 — `scripts/qa-motion.ts` (신규)

렌더 완료 시 자동 실행. 프레임 PNG(–keep-frames) 또는 mp4 디코드에서 32×57 다운샘플 HSV 시계열 추출.

```
메트릭 정의 (다운샘플 그리드 기준):
 1. lumFlicker  = mean_t( |mean_xy(Y_t) − mean_xy(Y_{t−1})| )          임계 > 0.015 → STROBE 경고
 2. hueJump95   = 95pct_t,xy( circularDiff(H_t, H_{t−1}) )              임계 > 3×(전역 회전율/프레임) → 점프 경고
 3. oliveDwell  = frames% where olive-band(B-5 정의) 픽셀 비율 > 8%     임계 > 5% → GREEN 실패
 4. darkDwell   = frames% where mean(Y) < 0.28                          임계 > 10% → DARK 경고
 5. seamRatio   = d(f599,f0) / median_i d(f_i, f_{i+1})                 임계 > 1.5 → SEAM 실패
 6. staticZone  = 영역% where std_t(H) < 2°                             임계 > 15% → STATIC 경고 (기둥 3)
 7. hierarchy   = 밝기 상위 5% 픽셀 중 ornament∪edge∪highlight 마스크 내 비율   임계 < 0.6 → DAYGLO 경고 (기둥 4)
 8. subjectHold = M_figure 영역 mean(Y)의 min/max가 소스 대비 ±25% 이내   위반 → 앵커 실패 (기둥 1)
출력: qa-report.json + 콘솔 1줄 verdict (PASS / 경고 목록). PASS만 Isaac에게 제출.
```

구현: ffmpeg로 `fps=30, scale=32:57` raw 추출 → node에서 HSV 시계열 계산. ~150줄.

```ts
// scripts/qa-motion.ts — 골격. 사용: npx tsx scripts/qa-motion.ts out/.../title.mp4 [--masks <dir>]
import { execSync } from "node:child_process";

const W = 32, H = 57;                                   // 9:16 다운샘플 그리드
function extractFrames(mp4: string): Buffer {           // 600프레임 × W×H×3 raw RGB
  return execSync(`ffmpeg -v error -i "${mp4}" -vf "scale=${W}:${H}" -f rawvideo -pix_fmt rgb24 -`,
                  { maxBuffer: 1 << 28 });
}
const circDiff = (a: number, b: number) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

function analyze(buf: Buffer) {
  const F = buf.length / (W * H * 3);
  const meanY: number[] = [], oliveShare: number[] = [];
  const hueGrid: Float32Array[] = [];                   // 프레임별 hue 그리드 (staticZone·hueJump용)
  for (let f = 0; f < F; f++) { /* 그리드 순회: Y 평균, 올리브밴드 비율, hue 저장 */ }
  const lumFlicker = mean(diff(meanY).map(Math.abs));                        // 메트릭 1
  const hueJump95  = pct95(framePairHueDiffs(hueGrid));                      // 메트릭 2
  const oliveDwell = oliveShare.filter((x) => x > 0.08).length / F;          // 메트릭 3
  const darkDwell  = meanY.filter((y) => y < 0.28).length / F;               // 메트릭 4
  const seamRatio  = frameDiff(F - 1, 0) / median(adjacentDiffs());          // 메트릭 5
  const staticZone = cellsWhere((cell) => stdHue(cell) < 2) / (W * H);       // 메트릭 6
  return { lumFlicker, hueJump95, oliveDwell, darkDwell, seamRatio, staticZone };
}

const THRESH = { lumFlicker: 0.015, oliveDwell: 0.05, darkDwell: 0.10, seamRatio: 1.5, staticZone: 0.15 };
// verdict: 전 항목 임계 이내 → "PASS", 아니면 위반 목록 출력. exit code 반영 → 스크립트 체이닝 가능.
// --masks 주면 메트릭 7(hierarchy)·8(subjectHold)도 계산 (마스크 PNG 알파 × 그리드 다운샘플 매칭).
```
**운용 원칙: PASS 실패본은 Isaac에게 도달하지 않는다.** 렌더→QA→(실패 시 자가 진단·수정)→PASS→제출.
이것만으로 이번 세션의 "그린 뜬 채 제출 → 거부" 류 왕복 최소 절반이 사라진다.

## D-9. 말단 개선 + 프리뷰 모드

0. **`--preview` 플래그 (★v5 — 반복 속도 우선)**: 테스트 렌더는 화질을 버리고 속도를 산다 —
   해상도 1/2, fps 15 (300프레임), ffmpeg veryfast/crf 23, 파일명 `-preview` 접미.
   픽셀·프레임 총량 1/8 → 렌더 ~1분/건. duration 20s 유지 (루프·케이던스 판정은 실물과 동일).
   QA는 fps 무관 동작 — **프리뷰에서 판정하고, 승인된 것만 풀화질 재렌더.**
1. `--full-res` 플래그: scale 필터 제거, 소스 원치수 그대로, `-b:v 36M`. 최종 승인본 전용.
2. 레인지 A/B: 동일 프레임을 tv/full 두 인코딩으로 뽑아 실제 재생환경(폰·브라우저)에서 비교 → 씻김 여부 확정 후 기본값 결정.
3. 프리뷰 산출물 표준화: 렌더마다 ① 서브초 6프레임 격자(contact sheet, ffmpeg tile) ② 2초 webm(t=5~7, 720px) 자동 생성 — 리뷰 비용 최소화.

---

# PART E — 소스 불가지론적 자동 유도 시스템 (Universal Derivation)

> **원칙: 레시피에 소스 이름이 붙는 순간 시스템이 아니다.** 원본은 무한히 다양하다 — 성상이든 인물이든
> 풍경이든 추상이든, 파이프라인은 **이미지를 측정하고, 측정값에서 모든 파라미터를 유도**해야 한다.
> 과거의 "peacock 레시피 / rainbuddha 레시피"는 측정 공간의 특정 지점에서 규칙이 산출했어야 할 출력을
> 사람이 수동 시행착오로 찾아낸 것에 불과하다. 이 파트는 그 유도를 명시적 함수로 만든다.
> **입력이 무엇이든 경로는 하나다: 측정(M) → 유도 규칙(E-1) → scene.json → 렌더 → QA.**

## E-0. 소스 측정 벡터 M — `scripts/analyze-source.ts` (전부 자동)

| 축 | 측정 방법 | 산출값 |
|----|-----------|--------|
| **M1 휘도** | 히스토그램 p5/p50/p95, 다크앵커 면적(Y<0.12), 밝은 면적(Y>0.75) | darkAnchor%, brightArea%, midLum |
| **M2 채도** | 평균·최대, 고채도 면적(S>0.6) | satMean, vividArea% |
| **M3 hue** | 원형 히스토그램 → 도미넌트 hue 상위 3 + 집중도(원형분산), 그린리스크(블루 220°/골드 45° 지배) | domHues[], hueConc, greenRisk |
| **M4 구조밀도** | Sobel 에지 밀도, 로컬 대비(고주파 에너지) | edgeDensity, busyness |
| **M5 구조유형** | 에지 연결성·방향 일관성 → 라인워크 vs 텍스처 vs 평활 | structType ∈ {line, texture, smooth} |
| **M6 구도** | 초점 블롭(휘도·채도 피크), 방사 대칭성(각도 분산), 세로 흐름성 | focal(x,y), radialSym, verticalFlow |
| **M7 피사체** | figure 마스크 면적%, figure↔배경 명도·채도 대비 | figureArea%, figureContrast |
| **M8 완성도** | 이미 비비드-다색인가 (satMean × hue 다양성 곱) | finishedVivid ∈ [0,1] |

구현: make-optical-layers.ts와 동일한 lum/hsv/edge 패스에서 통계만 추가 (~80줄). 출력 = `analysis.json`.
과거의 소스 분류 논쟁("이건 무슨 타입인가")이 전부 **측정 가능한 수치**로 치환된다.

## E-1. 유도 규칙 — 측정값 → 서브시스템 (시스템의 심장)

### E-1-1. 마스크 임계 = 소스 자기 히스토그램의 퍼센타일 (절대 임계 금지)

D-2의 상수 임계(0.45/0.75 등)는 문서용 기본값일 뿐, 실제 임계는 소스별 퍼센타일로 유도한다:

```
void:      휘도 하위 25% 경계에 smoothstep 페더.
           darkAnchor% < 3 (어둠 없는 밝은 소스)이면 → 채도 하위 30% 영역이 void 역할 대행
           (위계의 본질은 "쉬는 영역"이지 "검은 영역"이 아니다 — 밝은 소스에선 저채도가 네거티브 스페이스)
ornament:  채도 상위 30% ∧ 명도 상위 60%
highlight: 명도 상위 8%
edge:      에지 강도 상위 15% (M4 busy면 상위 8%로 조여 주요 라인만)
body:      나머지 중간 대역
```
→ 파스텔·다크·비비드·저대비 어떤 분포의 소스든 마스크 6종이 **항상 유의미한 면적으로** 나온다.
"이 소스는 마스크가 안 잡혀요"가 구조적으로 불가능해진다.

### E-1-2. 위상장 선택 규칙 (구조가 장을 고른다)

```
w = {radial:0, luminance:0, edge:0, vertical:0, angular:0}
M6.focal 뚜렷 (피크 블롭 대비 > 임계)   → w.radial    += 0.5   # 성상·눈·광원 구도
M6.radialSym 높음                       → w.angular   += 0.3   # 후광·링 (phaseAmount 정수 규칙)
M5.structType == line                   → w.edge      += 0.5   # 라인워크·판화·필리그리
M5.structType == smooth                 → w.luminance += 0.5   # 드레이프·마블·구름·그라데이션
M6.verticalFlow 높음                    → w.vertical  += 0.3   # 세로 광선·상승 구도
→ 정규화 후 상위 1~2개 장 생성. 층 배정: body=1순위 장, ornament=radial(있으면), edge=edge 장 고정.
```

### E-1-3. 팔레트 유도 (소스 정체성 보존 + 올리브 배제, 자동)

1. **정체성 포함**: M3.domHues가 곡선 위에 오도록 D 초기값을 역산 (도미넌트 hue의 코사인 위상 풀이)
   → 소스 고유색이 팔레트 경로에 포함 = C5(리페인트 금지) 자동 준수.
2. **올리브 배제**: B-5 전략(G채널을 R 또는 B에 0.1 이내로 묶기)으로 조정 → `lint-palette` 통과까지
   D_g를 ±0.02 스텝 자동 탐색 (수렴 실패 시 프리셋 3종 중 domHues와 최근접 선택).
3. **경로 우선순위 (★v5 재정렬 — 실측 규칙충돌의 해소)**:
   ```
   1순위: finishedVivid ≥ 0.6 또는 intent=preserve
          → 보존+글로우파동 경로 (D-3-6): paletteAmount ≤0.15, satBoost ≤1.25, 전역 hue회전 정지~미세
            (colorCycle 2~5), 모션 = glowWave(층별 위상장) + 미세 OKLCH 드리프트.
            greenRisk는 이 경로에서 **무의미** (hue를 안 돌리므로). 리페인트 금지 법칙이 항상 우선.
   2순위: 저채도/무광 소스 (finishedVivid 낮음) — 색을 "입혀야" 하는 경우만
          → 회전/팔레트 경로: greenRisk면 hsv+greenCompress(0.85) 또는 팔레트 지배(≥0.6, 린트 통과 D)
            + 비비드 플로어. hue 파동(uPhaseAmount) 허용.
   ```
   교훈(실측): greenRisk가 1순위를 override하게 두면 리페인트→소스보다 열화. **절대 금지.**

### E-1-4. 케이던스·강도 유도 공식

```
hueKey            = clamp(1.6 − 2.5·edgeDensity, 0.2, 1.6)      # busy할수록 비평활 결합 축소 (스페클 방지)
speedScale        = 1 − 0.4·finishedVivid                        # 완성 비비드는 색 회전 절제
speeds            = round(speedScale × {2,3,5,8,13,22}) 정수 보정  # 서로소 기본 세트의 스케일
phaseAmount       = clamp(0.6 − 0.5·장그라디언트밀도, 0.2, 0.6)    # 장이 가파르면 진폭 축소 (밴드 과밀 방지)
valueLift(figure) = figureContrast 낮음 ∧ figure 어두움 ? 0.18~0.25 : 0
위계 예산          = D-2-2 표 고정                                # 위계는 원칙이지 변수가 아니다
```

## E-2. 통합 엔트리 — `scripts/master-pipeline.ts` ("이미지만 던지면"의 시스템화)

```
npx tsx scripts/master-pipeline.ts <source.png> [--focal x,y] [--intent vivid|meditative|preserve] [--title name]
  1. analyze-source      → analysis.json (M 벡터)
  2. make-optical-layers → 마스크 6층 (퍼센타일 임계, RGB=원본/알파=마스크)
  3. make-phase-field    → 규칙 선택된 1~2개 장
  4. 팔레트 유도 + lint 통과까지 자동 조정
  5. scene.json 생성 (E-1 규칙 전체 적용)
  6. export-layered 렌더 (피드백 워밍업 포함)
  7. qa-motion → PASS: 프리뷰(서브초 격자 + 2s webm) 생성 / FAIL: 위반 메트릭에 대응하는 유도 파라미터
     자가 조정 후 1회 재렌더 (예: oliveDwell → D_g 재탐색, staticZone → phaseAmount·speeds 상향)
```
사람의 개입 지점은 셋뿐: **focal 수동 지정**(자동 탐지가 빗나갈 때), **intent 스위치**(취향 축),
**최종 감상 판정**. 과거엔 에이전트의 감(그리고 룰렛)이었던 것이 측정과 규칙이 된다.

## E-3. 유도 규칙의 예시 출력 — 아키타입 F(figure-anchor) 지점에서의 인스턴스

**아래 JSON은 "특정 소스용 레시피"가 아니라, E-1 규칙이 측정 벡터
(focal 뚜렷 / figureArea ~40% / structType=line / darkAnchor 있음 / greenRisk 있음)에 대해
자동 산출하는 형태의 예시다.** 다른 측정값이면 층 구성·장·팔레트·케이던스가 전부 달라진다:

```jsonc
{
  "version": 1, "source": "<소스 파일명 — 측정으로 유도되므로 무엇이든>", "resolution": ["<소스 실측 W>", "<소스 실측 H>"], "duration": 20, "fps": 30,
  "layers": [
    { "id": "base", "file": "layers/base.png", "zIndex": 0, "blending": "normal", "role": "background-plate",
      "animation": { "colorCycle": { "speed": 2, "period": 20, "phaseOffset": 0 },
        "saturationBoost": 1.05, "satInjectionMul": 0, "hueKey": 0.3, "hueSpeed": 1.5,
        "paletteAmount": 0.08, "paletteValueFloor": 0.1, "bicubicFilter": true } },

    { "id": "void", "file": "layers/void.png", "zIndex": 1, "blending": "normal", "role": "background",
      "animation": { "colorCycle": { "speed": 2, "period": 20, "phaseOffset": 40 },
        "saturationBoost": 1.0, "satInjectionMul": 0, "hueKey": 0.2, "hueSpeed": 1.0,
        "paletteAmount": 0.5, "paletteValueFloor": 0.0, "paletteSatFloor": 0.2,
        "paletteA": [0.42, 0.40, 0.52], "paletteB": [0.38, 0.34, 0.40],
        "paletteC": [1, 1, 1], "paletteD": [0.62, 0.55, 0.95] } },      // jewel-night, 어둠 유지

    { "id": "body", "file": "layers/body.png", "zIndex": 2, "blending": "normal", "role": "midground",
      "animation": { "colorCycle": { "speed": 5, "period": 20, "phaseOffset": 90 },
        "phaseField": "layers/phase-luminance.png", "phaseAmount": 0.4,
        "saturationBoost": 1.35, "satInjectionMul": 0, "hueKey": 0.5, "hueSpeed": 2.0,
        "paletteAmount": 0.45, "paletteValueFloor": 0.22, "paletteSatFloor": 0.35,
        "paletteA": [0.55, 0.42, 0.40], "paletteB": [0.42, 0.32, 0.38],
        "paletteC": [1, 1, 1], "paletteD": [0.00, 0.06, 0.78], "bicubicFilter": true } },  // jewel-fire

    { "id": "ornament", "file": "layers/ornament.png", "zIndex": 3, "blending": "normal", "role": "detail",
      "animation": { "colorCycle": { "speed": 13, "period": 20, "phaseOffset": 180 },
        "phaseField": "layers/phase-radial.png", "phaseAmount": 0.35,
        "saturationBoost": 1.8, "satInjectionMul": 0, "hueKey": 0.6, "hueSpeed": 2.2,
        "paletteAmount": 0.7, "paletteValueFloor": 0.25, "paletteSatFloor": 0.55,
        "paletteA": [0.55, 0.42, 0.40], "paletteB": [0.42, 0.32, 0.38],
        "paletteC": [1, 1, 1], "paletteD": [0.00, 0.06, 0.78] } },

    { "id": "edge", "file": "layers/edge.png", "zIndex": 4, "blending": "screen", "opacity": 0.45, "role": "detail",
      "animation": { "colorCycle": { "speed": 22, "period": 20, "phaseOffset": 270 },
        "phaseField": "layers/phase-edge.png", "phaseAmount": 0.5,
        "saturationBoost": 2.0, "satInjectionMul": 0, "hueKey": 0.4, "hueSpeed": 2.0,
        "paletteAmount": 0.85, "paletteValueFloor": 0.3, "paletteSatFloor": 0.6,
        "paletteA": [0.68, 0.62, 0.70], "paletteB": [0.30, 0.28, 0.32],
        "paletteC": [1, 1, 1.15], "paletteD": [0.05, 0.48, 0.60] } },   // jewel-opal 프리즘 라인

    { "id": "highlight", "file": "layers/highlight.png", "zIndex": 5, "blending": "add", "opacity": 0.12,
      "role": "light-rays",
      "animation": { "colorCycle": { "speed": 8, "period": 20, "phaseOffset": 180 },
        "saturationBoost": 1.2, "satInjectionMul": 0, "hueKey": 0.3, "hueSpeed": 1.5,
        "paletteAmount": 0.3, "paletteValueFloor": 0.4, "paletteSatFloor": 0.2 } }
  ],
  "effects": {
    "bloom": { "strength": 0.65, "radius": 0.6, "threshold": 0.55 },
    "chromaticAberration": { "offset": 0.6, "modulationOffset": 0.1 },
    "multipassFeedback": { "strength": 0.3, "warp": 0, "decay": 0.93, "hueShift": 0.015, "zoom": 1.0, "rotate": 0 },
    "godRays": { "intensity": 0 }, "aura": { "intensity": 0 },
    "kaleidoscope": { "segments": 0, "blend": 0 }, "mandala": { "opacity": 0 },
    "trails": { "strength": 0 }, "parallax": { "scale": 0 }, "haze": { "intensity": 0 }, "feather": { "radius": 0 },
    "filmGrade": { "grain": 0, "vignetteIntensity": 0.12, "vignetteRadius": 1.08,
      "vignetteTintR": 0.14, "vignetteTintG": 0.05, "vignetteTintB": 0.05, "contrast": 1.03, "sCurve": 0.07 }
  }
}
```
케이던스 검산: {2,2,5,13,22,8} 전부 정수 → 심리스 보장. 서로소성: (5,13,22) 상호 서로소,
비트 주파수 |13−5|=8, |22−13|=9 → 루프 내내 층 관계 비반복. 위상장 3종이 층마다 달라
파동 방향도 분리(명암 지형/방사/라인) — 기둥 2·3·5 구성적 충족, 위계 예산(D-6)으로 기둥 4 충족,
base+figure 보존으로 기둥 1 충족.

## E-4. 아키타입 투영 — 측정 공간의 대표 영역들 (이름은 검증용 참조일 뿐)

**아키타입은 분류기가 아니라 회귀 테스트 고정점이다.** 신규 소스는 항상 측정→유도 경로로 가고,
아키타입 표는 "이 측정 영역에서 규칙이 이런 출력을 내는 게 맞는지" 확인하는 데만 쓴다.
(과거 소스명은 검증 데이터 포인트로서만 의미가 있다.)

| 아키타입 (측정 시그니처) | 유도 규칙이 내는 주요 출력 | 과거 검증 포인트 |
|--------------------------|---------------------------|------------------|
| **F figure-anchor**: focal↑, figureArea 20~60%, darkAnchor 있음 | radial+edge 장, 정체성 팔레트, 6층 풀스택, figure만 valueLift | 성상·석상 계열 (기존 최악 → 정면 돌파 대상) |
| **C flowing-vivid**: finishedVivid↑, structType=smooth, vividArea↑ | luminance 장 0.5~0.8, paletteAmount ≤0.25, speeds 상향, 경량 3층 | peacock·rainbuddha (승인작 재현 확인용) |
| **P pastel-finished**: satMean 중, 명도↑, busyness↓ | luminance 장 저진폭(0.3), 보존 팔레트, edge만 주얼 저알파 | 홀로 파스텔 계열 — "preserve인데 정적 아님"(모드 6 해소) |
| **D dark-bold**: darkAnchor↑, 굵은 형태, hueConc↑ | void 신성불가침, ornament/edge 프리즘, radial 장 | hand-eye·eye2 (승인작 재현 확인용) |
| **B green-risk**: domHues 블루/골드, greenRisk↑ | paletteAmount ≥0.6 + G묶기 D 자동탐색, vertical/luminance 장 | ukiyo 계열 (기존 접음 → "블루 보존+모션+그린 없음" 동시 성립 검증) |

측정 벡터가 아키타입 사이에 떨어지는 소스(대부분이 그럴 것)는 **규칙이 연속적으로 보간된 출력**을 낸다 —
이것이 named 레시피 대비 유도 시스템의 본질적 우위다. 5개 고정점 사이의 무한한 중간 지대가 전부 커버된다.

## E-5. 엣지 케이스 규칙 (유도가 예외 처리하는 영역)

- **무채색** (satMean < 0.08): 유일하게 유도가 중단되는 영역 (Isaac 정책: 무채 소스 안 받음). 측정 결과와 함께 보고.
- **초점 탐지 실패** (피크 블롭 대비 낮음): focal 수동 지정 요청 — 단 luminance 장으로 진행은 가능 (radial만 비활성).
- **극단 노이즈/저해상도**: busyness 상한 초과 시 라이트 디노이즈(median 3) 후 1회 재측정 (강한 median은 역효과 실증 — 금지).
- **다중 피사체**: figure 마스크 다봉이면 focal은 최대 블롭, angular 장 비활성 (회전 중심이 모호하므로).
- **극소 다크앵커 + 극고 채도** (전면 비비드): void 대행(저채도)도 빈약 → 위계를 "명도 대비"로 3차 대체
  (highlight 마스크만 bloom 허용, 나머지 bloom 차단).

---

# PART F — 검증 프로토콜

## F-1. A/B 실험 설계 (P2 완료 직후)

| 실험 | 소스 | A (현행 최선) | B (신규) | 판정 기준 |
|------|------|----------------|----------|-----------|
| 1 | 가네샤 석상 (7연속 거부) | rainbuddha2 레시피 | E-1 Entity Chamber | "필터 vs 살아있음" 체감 + QA staticZone |
| 2 | 골드 마블 부처 (10연속 거부) | warm 팔레트 최선본 | E-1 (jewel-fire) | oliveDwell 0 + 체감 |
| 3 | ukiyo 블루 (접음) | 팔레트 0.85 정지 최선본 | E-5 Indigo Tide | 블루 보존 + 모션 동시 성립 여부 |
| 4 | peacock-b (최애) | 승인본 그대로 | E-2 (위상장 추가만) | 승인본 대비 개선/동급/악화 |

- 동일 팔레트·동일 케이던스로 위상장 유무만 분리하는 **통제 변인** 원칙.
- 실험 4가 리트머스: 이미 좋은 것을 해치지 않으면서 나쁜 것을 살리는지.
- **주의: 실험 소스들은 회귀 고정점이지 목표가 아니다** — 검증 목적은 "이 4개를 살리는 것"이 아니라
  "유도 시스템(E-1 규칙)이 측정 공간의 서로 먼 4지점에서 전부 옳은 출력을 내는가"다. 4지점이 통과하면
  그 사이의 무한한 신규 소스가 커버된다는 것이 유도 시스템의 논리다.

## F-2. 수용 기준 (마스터피스 게이트)

QA 하네스 전 항목 PASS + 아래 체감 3문:
1. 10초 시청 후 "필터를 돌린 사진"인가 "살아있는 그림"인가?
2. 어디를 보든 미세하게 움직이는가? (기둥 3)
3. 가장 쨍한 색이 어디 있는가 — 장식/윤곽인가 전면인가? (기둥 4)

---

# PART G — 실행 로드맵 (파일 단위)

| Phase | 태스크 | 파일 | 규모 | 산출물 |
|-------|--------|------|------|--------|
| **P1a** | 팔레트 린트 (+L(t) 톱니 프로파일 검사) | `scripts/lint-palette.ts` 신규 | ~100줄 | 프리셋 3종 확정값 + 자동 D탐색 |
| **P1b** | 소스 측정기 | `scripts/analyze-source.ts` 신규 | ~120줄 | M 벡터 (analysis.json) |
| **P1c** | 마스크 스택 일반화 | `scripts/make-optical-layers.ts` 신규 (v8-layers 이식, 퍼센타일 임계) | ~250줄 | 소스→6레이어 |
| **P1d** | 위계 예산 내장 | 위 스크립트 내 | — | dayglo 시스템 차단 |
| **P1e** | **선형광 합성 감사** (D-5c) | layer.frag·effect-composer·main.ts 코드 확인 | 감사 | 색공간 경계 확정 + 교정 목록 |
| **P2a** | 위상장 셰이더 | `layer.frag` +6줄, `scene-schema.ts` +2필드, `layered-psychedelic.ts` +4줄 | ~20줄 | uPhaseTex 동작 |
| **P2b** | 위상장 생성기 | `scripts/make-phase-field.ts` 신규 | ~180줄 | 5종 장 + 선택 규칙 |
| **P2c** | **통합 유도 파이프라인** | `scripts/master-pipeline.ts` 신규 (E-1 규칙 전체) | ~200줄 | **이미지 1장 → 측정→유도→렌더→QA 원커맨드** |
| **P2d** | A/B 실험 (F-1) | — | 렌더 4건+ | 방향 판정 |
| **P2e** | **OKLCH hue-회전 경로** (D-5b) | `layer.frag` +~30줄 (uHueSpaceMode) | ~40줄 | 보존형 회전의 머디 원천 제거 |
| **P3a** | QA 하네스 | `scripts/qa-motion.ts` 신규 | ~150줄 | qa-report + verdict (P2c가 호출) |
| **P3b** | 피드백 워밍업 | `export-layered.ts` | ~15줄 | 심 제거, 피드백 해금 |
| **P3c** | 풀해상도/레인지 | `export-layered.ts` | ~10줄 | --full-res |
| **P4** | 워크플로우 문서 갱신 | `IMAGE_TO_LOOP_WORKFLOW.md` | 문서 | "측정→유도" 경로를 정본 절차로 승격 |

의존성: P2a↔P2b 병렬 가능, P2c는 P1b·P1c·P2a·P2b 완료 후 조립, P2d는 P2c 후. P1은 전부 독립(오늘 시작 가능). P3a·b·c는 병렬.
리스크: ① 위상장 파장이 링으로 읽힐 가능성(C7 인접) → phaseAmount 상한 0.6 + 실험 1에서 확인.
② angular 심 → 정수 규칙 강제. ③ 위상장+피드백 동시 사용 시 파동이 번질 수 있음 → 실험에서 분리 검증.

---

# PART H — 프로세스 계약 (에이전트 행동 규칙)

1. **2-스트라이크 룰**: 같은 소스 2회 거부 → 파라미터 반복 즉시 중단. A-5의 실패 모드 1~7 중 어느 것인지
   진단문 1줄 명시 후 **접근(프리미티브/레이어 구성)을 바꾼다**. 10연속 렌더 같은 룰렛 재발 금지.
2. **배치 설계 규칙**: 변주는 서로 다른 축 2~3개, 각 축은 인지 가능하게 극단화. "보수 1 + 과감 1" 필수.
   모션 축 변주는 스틸로 비교 불가 → 배치에 넣지 말고 webm으로 단독 제시.
3. **리뷰 산출물 표준**: 서브초 6프레임 격자 + 2초 webm. 정수초 스틸 단독 판정 금지 (위상 함정).
4. **사전 선언**: 렌더 전 "이 버전에서 살아 움직여야 하는 것 = ___" 1문장. 렌더 후 그 문장으로 자가검증 후 제출.
5. **QA 게이트**: qa-motion PASS 실패본은 Isaac에게 보여주지 않는다 (자동 검출 가능한 결함으로 시간 뺏지 않기).
6. **최애 우선**: Isaac이 최애로 지목한 레시피가 새 소스의 1차 시도. 임의 변경은 1차 결과 확인 후.
7. **기록**: 모든 렌더는 PER_IMAGE_TUNING_GUIDE §9에 1행 (기존 규칙 유지). 신뢰도 태그 n=1/n≥3.
8. **벤치마크 과적합 금지 (★v5, 실측 교훈)**: 단일 소스로 라운드를 연속 돌리지 마라 — 한 소스에서의
   결함 수정이 그 소스에 과적합된다 (가네샤 6라운드의 오류). **모든 라운드는 측정 공간이 서로 먼
   이질 소스 2종 이상에서 프리뷰 검증** 후 판정한다. 특정 소스가 기준이 되는 순간 시스템이 아니다.
9. **원본 열화 금지 (★v5, 판정 제1문)**: 모든 산출물의 첫 판정 질문은 "**소스 원본보다 아름다운가?**"
   출력이 원본보다 못하면 지표가 전부 PASS여도 실패다. 프리뷰 격자에 원본 스틸을 항상 나란히 배치.

---

# PART I — 부록

## I-1. 전체 노브 사전 (scene-schema 실측 + 신규)

| 노브 | 범위(기본) | 역할 | 마스터피스 지침 |
|------|-----------|------|-----------------|
| colorCycle.speed | (0) | 루프당 색 사이클 수 (period=20 시) | 층별 서로소 세트 (D-7) |
| colorCycle.period | (10) | 사이클 주기 | 20 고정 권장 (speed=사이클수 직관) |
| colorCycle.phaseOffset | (0) | 층 위상 | 층 균등 분산 |
| **phaseField** (신규) | — | 위상장 텍스처 | 층별 다른 장 (D-3-4) |
| **phaseAmount** (신규) | 0~4 (0) | 파동 파장 | 0.2~0.6, angular는 정수 |
| hueKey / hueSpeed | 0~ (0/1) | 공간 hue 분산 (비평활) | 위상장 도입 후 0.3~0.8로 축소 |
| luminanceKey / lumExponent | 0~1 (0.6/1) | 휘도→위상 결합 | 잔디테일 소스에서 스페클원 — 낮게 |
| saturationBoost | 0~10 (2.5) | 채도 증폭 | **마스크별 예산 (D-6) 준수** |
| satInjectionMul | (0.35) | 저채도 주입 | 컬러풀 0 / K×S 낮을 때만 >0 |
| satBlendLow/High | (0.1/0.4) | 주입↔회전 경계 | 기본 유지 |
| valueLift | 0~1 (0) | 어두운 픽셀 리프트 | void엔 0 고정, subject만 |
| paletteAmount | 0~1 (0) | 팔레트 경로 강제율 | 그린-크리티컬 ≥0.6 / 보존 ≤0.12 |
| paletteA/B/C/D | — | IQ 곡선 | **린트 통과 프리셋만** (D-5) |
| paletteValueFloor / SatFloor | 0~1 (0/0) | 다크/탁함 방어 | pvf 0.15~0.3, psf 층별 위계 |
| bicubicFilter | bool | 부드러운 샘플링 | 대형 매끈면 true |
| breath.amplitude | ≤0.1 (0) | 기하 호흡 | ≤0.008 (C2 인접 — 사실상 0) |
| noiseScale/Amount (Speed) | (0) | 정지 fbm 마블 | Speed=0 필수, Amount≤0.35 |
| domainWarp/2 | 0~3 (0) | 마블 심화 | 필리그리 소스만 |
| flowAmp/Scale | (0/3) | curl 변위 | **기하 변위 — 사실상 금지 유지** |
| rimIntensity/HueShift/Width | (0/0.1/0.004) | 윤곽 글로우 | HueShift=0 (깜빡임), Intensity ≤1.0 |
| worley/voronoi/julia/sdf/pattern/tile/polarTwist/rotateSpeed/scalePulse | (0) | 절차 패턴/기하 | **0 고정** (C2·C7) |
| glow.intensity/pulse | (0/0) | 발광/맥동 | pulse는 밝기 변조 → 0, 색 호흡은 D-4-2로 |
| ringIntensity 계열 | (0) | 링 | 0 고정 |
| effects.* | — | B-6 표 참조 | godRays 0 / mandala·kaleido 0 / feedback은 워밍업 후 |

## I-2. 금지 × 해법 대응 최종표

| 금지 (C#) | 지향점이 요구하는 유사 효과 | 합법 구현 |
|-----------|------------------------------|-----------|
| C2 기하왜곡 | 호흡·맥동·모핑 | radial 위상장 색 호흡 (D-4-2) |
| C3 드리프트 | 흐르는 에너지 | 정적 장 위 위상 파동 (D-3) |
| C4 strobe | 빠른 변화 | 국소 위상차로 화면 내 다양성↑, 전역 변화율은 온건 |
| C5 리페인트 | 색 변화 | 저 paletteAmount + 위상장 (색 보존, 타이밍만 국소화) |
| C6 그린 | 풀스펙트럼 느낌 | 린트 통과 주얼 곡선 (그린만 절제된 스펙트럼) |
| C7 패턴 생성 | fractal적 질서 | 소스 파생 마스크·장만 사용 |
| C8 AI 영상 | 진짜 모션 | 위상 파동 = 렌더 내 생성 모션 |

## I-3. 용어집

- **위상장(phase field)**: 픽셀별 색 사이클 시작점을 담은 정적 텍스처. 시간이 흐르면 등위상선을 따라 색 밴드가 이동해 보임.
- **케이던스**: 레이어의 colorCycle 속도·위상 설계. **위계(hierarchy)**: 밝기/채도의 공간 예산 — 쨍함을 어디에 허락할지.
- **콜드스타트 심**: 피드백 버퍼가 프레임0에서 비어 루프 경계에 생기는 밝기 점프. **린트**: 렌더 전 팔레트 정적 검사.
- **K×S**: hueKey×hueSpeed, 비평활 공간 hue 분산량. **데이글로**: 전면 균일 고채도 (기둥 4 위반의 속칭).

## I-4. Isaac 미학 프로파일 — 세션 발언 전수에서 추출한 판정 함수

에이전트가 Isaac의 눈으로 자가 판정할 수 있도록, 실제 발언과 그 함의를 정리한다.

| 발언 (실제) | 함의 (판정 규칙) |
|-------------|------------------|
| "너무 정적이잖아, 패턴은 살아서 맘에 들어" | 정지 = 즉시 탈락. 단 "살아있는 패턴"이 기준 — 움직임의 품질을 본다 |
| "색 흐름이 엄청 빨라야 돼" | 색 변화 속도는 공격적으로. 단 아래 strobe 금지와 동시 성립해야 (→ 위상장이 유일 해법) |
| "쨍한 밝음이어야 하는데 탁한 밝음이어서 더 구려" | 밝기만 올리면 감점. 밝음 = 고채도 동반 필수 (psf) |
| "노이즈 끼고 엉망이야" / 스페클 계열 전부 거부 | 고주파 무질서 = 즉시 탈락. 디테일은 "질서 있는" 고주파여야 (기둥 3) |
| "뭘 다 안된대" / "이미지 핑계 그만 대" | 소스 탓 보고 = 신뢰 손상. 능력 부족을 소스 문제로 치환하지 말 것 |
| "ai 사용하지말고 이전처럼 작업해줘" | 수단의 정체성도 평가 대상 — GLSL 파이프라인의 결과여야 함 |
| "다 똑같아 보이는데?" | 변주는 한눈에 구분돼야. 미묘한 배치 = 전부 낭비 |
| "장난하냐 완전히 형편 없잖아" (멜팅 flow) | 형태 붕괴(멜팅) = 최악 등급. 피사체 존엄(기둥 1)은 협상 불가 |
| "딥블랙 유지하지 말고 value-floor 적용해서" ↔ eye2 딥블랙 복귀 | 어둠 판정은 소스별: 구조형 소스의 다크 코너는 밝혀라, 딥블랙 **앵커**는 지켜라 — void 마스크가 이 구분을 시스템화 |
| "응 이 영상 아주 맘에들어" (rainbuddha2) / "이게 젤 맘에들어" (peacock-b) | 승인 신호는 명시적. 애매한 무반응은 승인 아님 |
| 음악 요청 (Lightyears, Splitting Atoms) | 음악 요청 = 실질 최종 승인 신호. 그 세팅이 권위 기준이 됨 |

**종합 판정 함수 (의사코드):** `masterpiece = 살아있음(정적 아님 ∧ strobe 아님 ∧ 멜팅 아님) ∧ 쨍함(고채도 밝음)
∧ 질서(스페클 아님 ∧ 그린/머디 아님) ∧ 피사체 존엄 ∧ 위계(전면 균일 아님) ∧ GLSL 산출`.
6항 중 하나라도 위반이면 나머지가 아무리 좋아도 거부된다 — 감점제가 아니라 **탈락제**다.

## I-5. 신규 프리미티브 트러블슈팅 매트릭스 (도입 후 예상 문제)

| 증상 (예상) | 원인 | 대응 |
|-------------|------|------|
| radial 위상장이 동심원 "링"으로 읽힘 | phaseAmount 과다 (>0.8) → 다중 밴드 | 0.2~0.5로. 그래도 링이면 luminance 장과 5:5 혼합 |
| angular 장에서 방사형 심 라인 | phaseAmount 비정수 | 정수(1,2)로 고정 (D-3-2 규칙) |
| 위상장 + 높은 hueKey에서 스페클 재발 | 비평활 항(huePhase)이 잔존 | hueKey ≤0.8로 — 공간 변주는 장이 담당 |
| 파동이 안 보임 (여전히 lockstep 느낌) | phaseAmount 과소 or 장의 그라디언트 빈약 | amount↑ 또는 장의 정규화 범위 재조정 (퍼센타일 2~98) |
| 완만한 장에서 hue 계단(밴딩) | 8-bit 계조 한계 | 셰이더 디더 확인, 심하면 장 생성 시 ±1/512 노이즈 프리믹스 |
| 피드백 + 위상장에서 파동 번짐/잔상 과다 | 에코가 파동 밴드를 중첩 | feedback strength ≤0.3, decay ≤0.93, 또는 분리 사용 |
| 마스크 경계에서 색 단차 | 페더 부족 | 마스크 블러 반경 ↑ (경계 8~16px), 인접 층 팔레트 유사도 확인 |
| 6층인데 여전히 "한 장" 느낌 | 케이던스 근접 (speed 차 ≤2) | 서로소 세트 재배정, 위상장 종류도 층별 분리 |
| QA lumFlicker 경고 | add/screen 층의 케이던스 밝기 변조 | 해당 층 opacity↓ 또는 normal 전환 |
| 풀해상도 인코딩 후 파일 과대 | 36Mbps × 20s ≈ 90MB | 승인 최종본만 풀해상도, 리뷰는 1080 유지 |

## I-6. 기각된 대안들 — 왜 이 길이 아닌가 (재론 방지 기록)

| 대안 | 기각 근거 |
|------|-----------|
| AI img2video (Kling/wan/seedance/hailuo) | Isaac 명시 거부 ("영상은 다 별로야 ai 사용하지말고"). 품질도 실측 열세 |
| 옵티컬 플로우 기반 픽셀 워핑 (소스를 실제로 움직임) | C2(기하왜곡)·C3(드리프트) 정면 위반. 멜팅 실패("장난하냐") 재현 위험. 위상장이 동일 지각 효과를 색으로만 달성 |
| curl-noise flow (uFlowAmp, 이미 구현됨) | 기하 변위라 figure 멜팅 실측. 추상 소스 극저값 한정 — 마스터피스 경로의 주축 불가 |
| 절차 패턴 오버레이 (mandala/fractal/kaleido) | C7 명시 금지. 실무 검증과도 일치 — 프로의 무빙 비저너리 작업은 외부 패턴을 덮지 않고 원화 위에 빛·색만 얹는다 (A-2-0) |
| 프레임별 다중 이미지 크로스페이드 (여러 스틸 블렌드) | 소스 1장 원칙 위배 + 형태 불일치 고스팅. 레이어 스택이 상위호환 |
| Replicate 분해 고도화 (더 좋은 매트 모델) | 방향 틀림 — 문제는 매트 품질이 아니라 매트 RGB 사용 방식(D-2 알파-온리로 해결) + 의미론적 마스크는 로컬 생성이 더 통제 가능 |
| 전역 파라미터 자동 최적화 (grid search) | 목적함수가 "Isaac 판정"이라 자동화 불가. 게다가 해가 파라미터 공간 밖에 있음이 본 문서의 결론 |

## I-7. 이 문서와 기존 문서의 관계

- **본 문서 (OUTPUT_GAP_ANALYSIS.md)**: 왜 실패했는가 + 어디로 가는가 (전략·설계·구현 스펙). P1~P4의 설계 원본.
- **IMAGE_TO_LOOP_WORKFLOW.md**: 오늘의 실행 절차 (현행 레시피). P4에서 측정→유도 경로로 갱신 예정.
- **PER_IMAGE_TUNING_GUIDE.md**: 소스별 실측 로그 (§9 폐회로). 신규 렌더도 계속 기록.
- **LAYERED_PIPELINE_PLAYBOOK.md**: 파이프라인 기술 레퍼런스. D파트 구현 후 위상장/마스크 절 추가 예정.
- `.omo/ultraresearch/*`: 과거 리서치 이력 — **v4부터 본 문서는 독립 1차 문헌(I-8)으로 재검증되어
  .omo에 의존하지 않는다** (결론이 수렴한 부분은 상호 확증으로만 남음).

## I-8. 독립 리서치 소스 (v4 재검증의 1차 문헌)

**지각과학 (위상 = 모션):**
- Freeman, Adelson, Heeger — *Motion Without Movement*, SIGGRAPH 1991: https://www.cns.nyu.edu/heegerlab/content/publications/Freeman-siggraph1991.pdf
- Wadhwa, Rubinstein, Durand, Freeman — *Phase-Based Video Motion Processing*, SIGGRAPH 2013: https://people.csail.mit.edu/nwadhwa/phase-video/
- Eulerian Video Magnification (MIT CSAIL): https://people.csail.mit.edu/mrub/evm/

**일루전 모션 (정지 이미지의 움직임 지각):**
- Peripheral drift illusion: https://en.wikipedia.org/wiki/Peripheral_drift_illusion
- Rotating Snakes 휘도 순서 (Kitaoka): https://www.psy.ritsumei.ac.jp/akitaoka/rotsnakes14e.html
- Microsaccades & 일루전 회전 (J. Neurosci): https://www.jneurosci.org/content/32/17/6043
- 청-황 대비의 모션 증폭: https://pmc.ncbi.nlm.nih.gov/articles/PMC10989047/
- 역-phi 모션 (Michael Bach 데모): https://michaelbach.de/ot/mot-reversePhi/
- 4-스트로크 모션: https://www.georgemather.com/MotionDemos/FourstrokeQT.html

**컬러 사이언스:**
- Oklab 공간 (Ottosson): https://en.wikipedia.org/wiki/Oklab_color_space
- OKLCH 그라디언트의 머디 중간점 해소: https://bluemonkeymakes.com/articles/oklch-makes-better-gradients
- 선형광 블렌딩 (GPU Gems 3 "The Importance of Being Linear"): https://developer.nvidia.com/gpugems/gpugems3/part-iv-image-effects/chapter-24-importance-being-linear
- Three.js 색 관리 (r152+): https://www.donmccurdy.com/2020/06/17/color-management-in-threejs/
- IQ 코사인 팔레트 원문: https://iquilezles.org/articles/palettes/
- 코사인 팔레트 에디터: https://erkaman.github.io/glsl-cos-palette/

**실무 (무빙 비저너리 아트 · 비주얼라이저 · 루프):**
- MilkDrop 프리셋 저작 가이드 (Geiss — 피드백 워프 메시·decay 원문): https://www.geisswerks.com/milkdrop/milkdrop_preset_authoring.html
- projectM (오픈소스 재구현): https://github.com/projectM-visualizer/projectm
- Alex Grey / CoSM (프로젝션 기반 무빙 작업): https://www.alexgrey.com/
- Android Jones 인터뷰 (실시간 레이어드 합성 실무): https://edm.com/interviews/android-jones-psychedelics-visionary-arts/
- 심리스 루프 설계 (다중 주기 층화): https://map.club/blog/how-to-create-seamless-loops
- VDMX 루프 실무: https://vdmx.vidvox.net/tutorials/loops-performance-production-and-progression

---

# PART J — 최종 통합 아키텍처 (v6 확정 설계안)

> Isaac 승인(2026-07-03): 봉인됐던 구조·깊이 차원을 "프로 버전"으로 해금한 3대 실험 포함, 이것이
> 마스터피스 파이프라인의 **확정 목표 아키텍처**다. 원칙: 소스 불가지론(측정→유도) · 리페인트 금지 ·
> 싸구려 아티팩트 금지(금지의 정신은 유지, 문자는 구조-인지 구현으로 넘는다) · 판정 제1문 "원본보다 아름다운가".

## J-1. 전체 파이프라인 (이미지 1장 → 마스터피스 루프)

```
소스 PNG (임의의 스타일 — 측정이 경로를 정한다)
  │
  ├─ ① 측정 analyze-source (M1~M8)
  ├─ ② 구조 추출 (전부 소스 자기 픽셀에서, 풀해상도)
  │     ├─ 마스크 6종 (base/void/body/ornament/highlight/edge) — RGB=원본, 알파=마스크
  │     ├─ 위상장 (radial/luminance/edge-distance/vertical/angular)
  │     ├─ ★뎁스 프록시 (figure=근경, void=원경, lumS 중간) → layers/depth.png      [EXP-A]
  │     ├─ ★플로우장 (structure tensor 접선 방향 RG + 이방성 강도 B, 피사체 코어 제외) [EXP-B]
  │     └─ ★포탈 마스크 (figure 팽창−figure = 후광 링 밴드)                          [EXP-C]
  ├─ ③ 유도 master-derivation (E-1 v5 우선순위)
  │     1순위 finishedVivid≥0.6 → 보존+글로우파동 / 2순위 저채도 → 회전·팔레트(린트 통과)
  ├─ ④ 렌더 (모션 시스템 = J-2, 전 항목 루프-정수)
  ├─ ⑤ QA qa-motion (PASS만 통과) + 프리뷰 반복 (--preview, 1/8 비용)
  └─ ⑥ 승인 → 풀해상도 최종 렌더 (--full-res)
```

## J-2. 모션 시스템 — 5기둥 × 프리미티브 매핑 (설계의 심장)

| 기둥 | 프리미티브 | 상태 |
|------|-----------|------|
| 1 성상 앵커 | base 보존 + figure 마스크 보호 (플로우·강글로우 제외역) | ✅ 구현 |
| 2 하이퍼스페이스 깊이 | **EXP-A 2.5D 카메라 드리프트** (depth.png, 원궤도 1사이클/루프, 반경 0.004~0.008 UV) + **EXP-C 마스크드 포탈 피드백** (후광 링 안에서만 zoom/echo — 포탈이 숨쉬고 성상은 고정) | 🔶 r9 |
| 3 살아있는 디테일 | **EXP-B 구조-추종 미세 흐름** (붓결 접선 방향으로 sub-pixel 변위 파동 — "멜팅"과의 차이는 방향이 구조를 따른다는 것) + edge 글로우파동 크롤 | 🔶 r9 |
| 4 발광 위계 | 글로우 파동 (D-3-6, hue 불변 빛 마루) + 마스크 채도예산 + void 어둠 보존 | ✅ r8 |
| 5 부드러운 변성 | 느린 OKLCH 드리프트 + 서로소 케이던스 + 피드백 워밍업 + 전항목 정수 사이클 | ✅ 구현 |

**모든 움직임의 공통 원리**: 시간항은 정수 사이클(심리스), 공간항은 정적 장(소스 자기 구조에서 파생),
움직이는 것은 [빛(글로우파동) / 시점(카메라) / sub-pixel 위상(플로우)] — 그림 자체는 결코 뭉개지지 않는다.

## J-3. 3대 실험 스펙 (r9)

### EXP-A: 2.5D 카메라 드리프트
- 뎁스: 실측 depth맵 없으면 프록시 합성 `depth = 0.55·figureMask + 0.25·lumS + 0.2·(1−ny)` 블러.
- 셰이더: 샘플 전 `uv += camOffset · (depth−pivot)`, `camOffset = r·(cos, sin)(TAU·t·k)` k=1 정수.
- 진폭 미세(0.004~0.008) → 오클루전 홀 비가시. 스키마: `effects.cameraDrift {radius, cycles, pivot}`.
### EXP-B: 구조-추종 미세 흐름
- 오프라인: Sobel→구조텐서(σ8 평활)→지배 방향의 **접선**(=붓결 방향) RG 인코딩 + 이방성(코히런스) B.
  figure 코어 마스크로 얼굴 보호. `layers/flow-field.png`.
- 셰이더: `uv += flowDir · amp · coherence · sin(TAU(t·k + phaseField))` — 변위의 파동이 붓결을 타고 여행.
  amp ≤ 0.002 UV (sub~2px). 스키마: 레이어 `structureFlow {strength, cycles}`.
### EXP-C: 마스크드 포탈 피드백
- effect-composer feedback에 `uFeedbackMaskTex` — 포탈 링 마스크 내에서만 strength 적용.
  zoom 0.97~0.99 + 워밍업 → 후광이 안으로 숨쉬는 포탈, 성상 잔상 0.
- 스키마: `multipassFeedback.mask: "layers/portal.png"`.

## J-4. 유도 규칙 확장 (r9)

- `radialSym↑ 또는 figure 20~60%` → cameraDrift on + 포탈 피드백 on (후광 소스)
- `structType ∈ {line, texture} ∧ 코히런스↑` → structureFlow on (강도 ∝ 코히런스, busyness 역비례)
- 전부 1순위(보존+글로우파동) 위에 **가산**되는 레이어 — 색 경로는 불변.
- 검증 배터리: 이질 소스 3종 × {baseline(r8) / +A / +B / +C / +ABC} 프리뷰 → 원본 스틸과 나란히 판정.

---

# PART K — 구현 현황 레저 (2026-07-03 세션 종료 시점)

> 구현 주체: Codex CLI (gpt-5.5 xhigh) / 검수·판정: Claude / 최종 미학 판정: Isaac.
> 다음 세션은 이 레저에서 이어간다.

## K-1. 완료된 인프라 (전부 검수·테스트 통과)

| 구성요소 | 파일 | 상태 |
|----------|------|------|
| 소스 측정기 M1~M8 | `scripts/analyze-source.ts` | ✅ |
| 옵티컬 마스크 6종 (퍼센타일 임계, RGB=원본/알파=마스크) + depth/portal | `scripts/make-optical-layers.ts` | ✅ |
| 위상장 5종 + 붓결 플로우장 | `scripts/make-phase-field.ts` | ✅ |
| 팔레트 린트 (올리브0%/그린/다크/L(t)톱니) | `scripts/lint-palette.ts` | ✅ |
| QA 하네스 8메트릭 | `scripts/qa-motion.ts` | ✅ |
| 통합 파이프라인 (측정→유도→렌더→QA, rule-id 트레이스) | `scripts/master-pipeline.ts` + `scripts/lib/master-*.ts` | ✅ |
| 프리뷰 모드 (1/8 비용, ~1분/건) | `export-layered.ts --preview` | ✅ |
| 피드백 워밍업 (콜드스타트 심 제거, seam 1.70→1.10 실측) | `export-layered.ts` + `main.ts __seekFrame` | ✅ |

## K-2. 셰이더 프리미티브 현황

| 프리미티브 | 상태 |
|-----------|------|
| 위상장 hue 파동 (uPhaseTex/uPhaseAmount) | ✅ A/B 검증됨 (전역필터→구조따라 흐르는 다색 파동) |
| 글로우 파동 (glowWave: 빛 마루가 구조를 타고 주행) | ✅ 구현 / ⚠️ **평균-밝기 버그 → r11 수정 중** |
| 붓결 플로우 (structureFlow, 구조텐서 접선 변위) | ✅ 구현, marble에서 활성 확인, 육안 검증 대기 |
| 2.5D 카메라 드리프트 (depth.png) | ✅ 구현, 육안 검증 대기 |
| 포탈 마스크드 피드백 | ✅ 구현, 육안 검증 대기 |
| OKLCH 회전 + greenCompress | ✅ 구현 / ⚠️ **OKLCH 좌표계 그린밴드 불일치 → r11 수정 중** |
| atan2Safe (ANGLE/Metal 2-인자 atan=NaN 드라이버 버그) | ✅ 전 콜사이트 교체 (과거 feedback 이상동작의 유력 원인) |

## K-3. 라운드 연대기 (r0~r11)

r0 유도규칙 초판(olive 47.5%) → r3 oklch+압축(7.7%, 창백) → r4 가무트투영+팔레트지배 → r5 atan 버그 발견·수정(블랙 해소, olive 1.33%) → r6 워밍업(seam PASS)+비비드 분기 → r7 출력아크 압축 → **r8 글로우파동+프리뷰** → **r9 3대 구조 프리미티브** → **r10 극한 운동 티어**(축 분리: 색-정체성 ⊥ 운동-강도, 기본=극한) → **r11 ✅완료** (2026-07-03 막판 랜딩): 글로우 제로-민 정규화(uGlowWaveMean — sharpness별 실측 평균 0.233~0.274, 기존 기준선 0.3의 편향 입증) + OKLCH 그린밴드 수치 유도(0.2777~0.4998, 순그린 앵커 142.5°). tsc/401테스트/셰이더 34종 전부 통과. **씬 재생성 불필요** (셰이더 런타임 전용 수정 — r10 씬 그대로 재렌더만 하면 됨).

검수에서 잡은 버그 4건: sharp 1ch blur→3ch 반환(focal 붕괴) / atan NaN / 글로우 평균 편향(화면 침몰) / OKLCH 밴드 불일치 — **4건 전부 수정 완료.**

**r12** (2026-07-06): 역사적 "어두운 톤" 근본 원인 확정·수정 — 커스텀 포스트 경로가 최종 linear→sRGB 인코드를 누락(COLORSPACE_AUDIT #1/#2 예측 적중). TS 픽셀 하니스로 입증(하늘 0.223→인코드 없이 0.047, 인코드 시 0.224). effect-composer `writeOutput()`(tonemapping+colorspace 청크)으로 수정. 8소스 프리뷰 배터리: **darkDwell 전원 0.0000, seam 전원 PASS** — 어둠 문제 종결. **그러나 과잉수정 발견**: writeOutput이 모든 패스에 삽입되어 패스 N개 체인 시 sRGB 인코드가 N번 적용 → **표백 버그** (whitebuddha 채도 0.75→0.17, flowrobe bleach비율 0.7%→70.8%, 8소스 전부 밝기상승+채도붕괴). QA는 이를 못 잡음(whiteDwell/bleach 메트릭 부재 — darkDwell만 있음).

**r13** (2026-07-06, Codex 발주·랜딩): ① 인코드-정확히-1회 구조 수정(FinalTexturePass 캡처 + 화면 blit 단일 인코드, 피드백 blit linear) + 인코드-횟수 불변 회귀 테스트, ② QA `bleachDwell` 신설(Y>0.6 & sat<0.15, 소스 대비 2×), ③ `oliveDwell` 소스-기준선 상대화(min(0.2, max(0.05, 1.5×소스))). 417테스트 통과. **검증 배터리(9소스) 결과: olive는 대폭 개선(eyestack 0.233→0.049)됐으나 표백은 그대로**(ganesha bleachDwell 0.72, eyestack 0.31→0.29) — 이중 인코드는 부차 원인이었음. `--tonemap none` 프로브로 ACES도 주범이 아님을 확인.

**r14 근본 원인 통합 (2026-07-06, 프로젝트 만성 색 병리의 정체)**: 파이프라인이 역사 내내 색공간 비일관 상태였다.
- **역사적 상태**: 레이어 텍스처 sRGB 마킹(입력 디코드 有) + 출력 인코드 無 → **소스 유래 픽셀만 감마만큼 어둡게 표시**(= 만성 "어두운 톤"·"피사체가 검다"의 근본 원인). 반면 셰이더 내 디스플레이 값으로 저작된 팔레트/색 상수는 그대로 표시돼 비비드 (승인작들이 팔레트-지배적이었던 이유. pvf/psf·satBoost 등 모든 튜닝은 이 어긋난 기준선을 보상하며 진화).
- **r12/r13 상태**: 출력 인코드 추가 → 소스 통과는 정상화, 대신 **모든 디스플레이-저작 상수가 감마 리프트** (jewel-night [0.62,0.63,0.95]→[0.81,0.82,0.98]) = 전면 파스텔 표백.
- **해법 = 디스플레이-참조 일관 파이프라인**: 입력 디코드 제거(NoColorSpace) + 출력 변환 제거(blit 순수 복사) + 톤매핑 기본 없음. 통과=원본 항등이 회귀 테스트로 고정됨. 분석(M-벡터, sRGB 바이트)·셰이더 작업값·QA(mp4 바이트)가 **동일 수치 공간**에서 만남. 예외: OKLCH 회전 블록만 국소 srgb↔linear 정밀 어댑터로 감싸 색채학 정확성 유지(그린밴드 상수 0.2777~0.4998 유효성 보존). Codex r14 발주·랜딩(423테스트 통과).

**r14 후 잔존 표백 격리 실험 (2026-07-06, 신규 소스 ganesha-halo로 실측)**: r14 랜딩 후에도 표백 29.7%(소스 0.3%) 잔존 확인. 단일 파라미터씩 강제 0으로 끈 5-way 격리 렌더로 기여도 분해:

| 변형 | 백색비율(Y>0.85) | 표백비율(Y>0.6&sat<0.15) | 평균채도 |
|---|---|---|---|
| 베이스라인(전체 이펙트) | 37.7% | 38.1% | 0.24 |
| paletteAmount=0 전레이어 | 38.3% | 31.9% | 0.33 |
| glowWave strength=0 전레이어 | 38.1% | 37.8% | 0.24 |
| bloom strength=0 | 28.3% | 26.2% | 0.28 |
| multipassFeedback strength=0 | 11.0% | 17.1% | 0.29 |
| **bloom=0 AND feedback=0 동시** | **3.9%** | **8.8%** | **0.33** |

소스 자체: 백색 2.0%, 표백 0.3%, 채도 0.64. **결론: 표백의 ~90%는 bloom+multipassFeedback 두 이펙트가 원인**(글로우파동 무관, 팔레트는 부차). 근본: 두 이펙트의 강도 상수(bloom threshold 0.55/0.62 고정, feedback decay 0.93~0.94 고정)가 옛 "어두운" 기준선 위에서 튜닝된 값 — r14로 밝기가 정상화되자 같은 상수가 (a) bloom 임계값 이하로 거의 안 남을 만큼 낮아 이미-밝은 소스 전체가 블룸 추출되고, (b) feedback의 높은 decay가 여러 프레임의 다른 색조를 누적 평균해 무채색으로 수렴시킴. 부가 발견: `layer.frag`의 satBlend 로직이 `satInjectionMul=0`(컬러풀 소스 표준 설정)일 때 원본 저채도 픽셀(하이라이트·크림색 피부 등, 정확히 표백 취약군)의 채도를 강제로 0까지 떨어뜨리는 버그 확인.

**r15 랜딩 (2026-07-06)**: ① bloom threshold M1.p95 기반 유도(가네샤: 0.55 고정→0.8753, strength 0.65→0.48, radius 0.6→0.5), ② multipassFeedback 재보정(decay 0.93→0.82, strength 0.3→0.2 — 포탈 소용돌이 유지하며 탈채도만 억제) + 최종 출력에 밝은영역 채도 하한선(brightSatFloor) 신설, ③ satBlend 강제-제로 버그 수정(disabledInjectionSat = max(boostedSat, sourceSat+0.16 floor)). 430테스트 통과.

**9소스 배터리 재검증(2026-07-06)**: ganesha bleachDwell 0.72→0.045(PASS), **7/9 PASS(경고만)** — eyestack/marble/whitebuddha/flowrobe/womaneye/eyebranch/ganesha. 잔여 2건은 임계값 근접 마진 FAIL: turtle(oliveDwell 0.076/0.06, bleachDwell 0.062/0.05 — 이전 40%대에서 대폭 개선된 잔차), thirdeye(oliveDwell 0.051/0.05 — 경계선). 육안 확인: 전 소스 비비드 색 회복, 무지개/네온/스월 뚜렷, 표백 소멸. **판정 제1문 재개 가능 상태 도달**(원본 대비 육안 비교 대기).

**부수 수정**: `vite.config.ts`의 `server.open: true` 제거 — export-layered.ts 렌더 시 puppeteer가 headless로 이미 캡처하므로 시스템 브라우저 자동 오픈은 불필요한 부작용이었음(Isaac 요청으로 제거).

**r16 (2026-07-06): "볼드한 실버 매직 텍스처" 정체 규명 + 수정(불완전).** 가네샤 최종 풀해상도 렌더에서 Isaac이 "완전히 별로야" 판정. 원인 진단: `edge` 레이어(소스 전체의 Sobel 윤곽선 추출)가 씬 내 유일하게 `screen` 블렌드(밝히기 전용)이면서 채도부스트 2.0(최댓값)·글로우파동 0.8(최댓값)·opacity 0.45. Codex 수정: satBoost 2.0→1.25, opacity 0.45→0.18, glowWave strength 0.8→0.45. 430테스트 통과. **하지만 풀해상도 재렌더 후 Isaac이 여전히 같은 실버 브러시 자국 지적 — r16이 문제를 완전히 해결하지 못함.**

**r17 (2026-07-06): r16의 opacity 수정이 실제로는 무효였던 코드 버그 발견.** `layered-psychedelic.ts`의 `screen` 블렌드 구현이 `THREE.CustomBlending`에 `blendSrc = THREE.OneFactor`를 사용 — 이 블렌드 함수는 **알파(불투명도)를 아예 읽지 않음**. 즉 셰이더가 `uOpacity`로 alpha를 계산해도 GPU 블렌드 단계에서 버려져 opacity 값이 무엇이든 렌더링에 전혀 반영되지 않았음. 증명: opacity=0 강제 프로브와 opacity=0.18(r16값) 프로브를 렌더해 프레임 MD5 비교 → **완전히 동일**(원본 diff 0.0). r16의 satBoost/glowWave 조정은 일부 효과가 있었지만 "opacity로 강도를 줄인다"는 핵심 조치 자체가 처음부터 죽어있었음 — edge 레이어는 계속 100% 강도로 화면 전체를 screen-블렌드 중이었음. 수정: 셰이더에서 `uPremultiplyAlpha`(screen 블렌드 레이어에서만 1) 플래그 추가, `rgb *= alpha`로 최종 출력 전 프리멀티플라이 — screen 블렌드가 이제 opacity를 실제로 따름. 검증: opacity 0 vs 0.18이 이제 프레임당 mean abs diff 3.86~4.67로 실제 차이 발생(수정 전엔 0.0). 육안 확인: 연꽃·손 윤곽의 굵은 창백한 붓자국 소멸, 자연스러운 색 경계로 복원. 435테스트 통과. **동일 버그가 영향을 준 다른 파일**: `scripts/split-layers.ts`, `scripts/create-ganesha-dmt-v6.ts`, `scripts/ganesha-dmt-v8-scene-style.ts` — `createLayeredPsychedelic` 경유 렌더는 전부 이 수정의 혜택을 받음.

**교훈**: 파라미터를 낮췄는데도 증상이 그대로면 "덜 낮췄나"가 아니라 "그 파라미터가 애초에 배선이 안 됐나"를 의심할 것 — 실측(MD5/픽셀 diff)으로 파라미터 민감도부터 검증.

## K-4. 미학 기준 (확정, 메모리 저장됨)

- **"3초 응시 = 환각"** 극한 사이키델릭. 극한 = 운동 밀도·최면성 (채도 극한 아님).
- 전에 없던 것: 레퍼런스는 바닥 캘리브레이션용, 천장의 모델 아님. 우리 차선 = "작품 자신의 해부학을 타고 여행하는 빛·시점·위상".
- 판정 제1문: "소스 원본보다 아름다운가" (원본 스틸 나란히 필수).
- 가드 불변: strobe·멜팅·머디/그린·스페클·dayglo 금지.

## K-5. 다음 착수 순서 (2026-07-06 3차 갱신)

1. ~~r12~~ / ~~r13~~ / ~~r14 디스플레이-참조 전환~~ / ~~r15 bloom·feedback 재보정+satBlend 버그 수정~~ 전부 ✅ (9소스 배터리 7/9 PASS — K-3 r15 참조)
2. **[여기부터 시작]** {원본|출력} 나란히 판정 시트 생성 후 Isaac 육안 승인 — 제1문 "원본보다 아름다운가" (이제 표백 없이 판정 가능한 상태)
3. 잔여 2건 마무리: turtle(oliveDwell 0.076/0.06, bleachDwell 0.062/0.05) / thirdeye(oliveDwell 0.051/0.05) — 임계값 근접 마진, 필요시 소폭 추가 튜닝
4. flowrobe·ganesha M8 캘리브레이션 판단(0.47/0.54가 회전 경로로 가는 게 맞는지 — 육안 판정 후 결정)
5. 남은 QA 경고 정리: hueJump95 / hierarchy / subjectHold → Isaac 승인분 `--full-res`
6. 잔여 백로그: P3c 레인지 A/B, IMAGE_TO_LOOP_WORKFLOW P4 갱신(측정→유도 경로 반영)

---

# 마무리 — 한 문단 요약 (v5)

지금까지의 모든 실패는 하나의 문장으로 환원된다: **엔진은 "고정된 그림의 색을 통째로 돌리는" 단일 기술만 갖고
있었고, 지향점은 "그림의 구조를 따라 빛이 여행하는" 다른 종류의 기술을 요구했다.** 구현 6라운드의 실측이
여기에 마지막 정밀화를 더했다: 그 "여행하는 것"은 hue가 아니라 **빛(휘도)**이어야 한다 — 입력 소스는
대부분 이미 완성된 비비드 아트이고, 그것의 색을 돌리는 순간(리페인트) 원본보다 열화된다. 마스터피스 경로는
다섯 가지 시스템 능력의 합이다 — ① **글로우 파동**(D-3-6: 색 불변, 빛의 마루가 위상장을 타고 후광에서
방사되고 라인워크를 기어감 — 그린·머디·데이글로가 원천 소멸), ② **위상장**(파동의 지도 — 소스 자기 구조에서
파생), ③ **마스크 위계**(빛은 장식·윤곽에만, 어둠은 어둠으로), ④ **측정→유도**(어떤 소스든 M 벡터가
경로를 정한다 — 1순위 보존+글로우파동, 색 입히기는 저채도 소스 전용. 특정 소스 기준 설계 금지),
⑤ **자동 QA + 프리뷰 반복**(판정은 빠르게, 풀화질은 승인 후). 판정의 제1문은 언제나 하나다:
**"소스 원본보다 아름다운가?"** — 이것을 통과하지 못하면 어떤 지표도 의미가 없다.
