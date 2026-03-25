# `video-blueprint` 스킬 정식 리뷰

- 작성일: 2026-03-25
- 리뷰 대상: `/Users/isaac/projects/video-art/.claude/skills/video-blueprint`
- 리뷰 목적: 스킬의 구조, 문서-구현 계약, 실행 가능성, 테스트 신뢰도를 점검하고 실제 사용 전 수정 우선순위를 확정한다.
- 최종 판정: **Revise (수정 후 재검토 권장)**

---

## 1. Executive Summary

`video-blueprint`는 방향과 구조가 분명한 스킬이다. 특히 `분석 → 시각 검증 → 블루프린트 조립 → 코드 생성 → 검증`으로 이어지는 파이프라인 설계, `references/` 분리, 테스트 파일 존재 자체는 긍정적이다.

다만 현재 상태는 **실무 배포 가능한 완성 스킬**보다는 **강한 내부 프로토타입**에 가깝다. 가장 큰 이유는 아래 두 가지다.

1. **문서에 적힌 핵심 실행 커맨드가 실제 파일 구조와 맞지 않는다.**
2. **코드 생성기의 이름 처리 로직이 TypeScript 식별자를 깨뜨릴 수 있다.**

즉, 아이디어와 뼈대는 좋지만, 지금 상태로 바로 신뢰하고 사용하면 초반부터 실행 실패나 생성 코드 오류를 맞을 가능성이 높다.

---

## 2. 리뷰 범위와 방법

### 2.1 검토 범위
- `SKILL.md`
- `references/analysis-workflow.md`
- `references/output-schema.md`
- `references/shader-patterns.md`
- `requirements.txt`
- `scripts/*.py`
- `scripts/analyze_layers/*.py`
- `scripts/tests/*`
- `templates/*`

### 2.2 수행한 검증
- 디렉터리 구조 확인
- 문서와 실제 파일 경로 대조
- Python 소스 전체 문법 파싱 확인
- 문서에 적힌 대표 커맨드 일부 실제 실행
- 테스트 실행 시도
- generator 코드와 schema/validator 계약 비교

### 2.3 상태 구분
- **시도**: 수행은 했지만 결과 해석에 추가 전제가 필요한 항목
- **verified 완료**: 실제로 확인된 사실
- **검증 불가**: 환경/의존성 부족으로 확인을 끝까지 못 한 항목
- **실패**: 실제로 깨지는 것이 확인된 항목
- **차단**: 다음 검증으로 넘어가려면 먼저 선행 조건 해결이 필요한 항목

---

## 3. 확인 결과 요약

### 3.1 verified 완료
- Python 파일 **25개 문법 파싱 통과**
- 스킬 디렉터리 구조는 기본적으로 합리적임
  - `SKILL.md`
  - `references/`
  - `scripts/`
  - `templates/`
- 분석 파이프라인의 단계 구분은 명확함 (`SKILL.md:22-122`)
- validator / verifier / generator / tests가 각기 분리되어 있어 설계 의도는 선명함

### 3.2 실패
- `SKILL.md`에 적힌 `analyze-layers.py` 실행 경로가 실제로는 존재하지 않음 (`SKILL.md:39-40`)
- 해당 실패는 실제 실행으로 재현됨

### 3.3 검증 불가 / 차단
- `python3 -m pytest scripts/tests -q` 실행 시 `pytest` 미설치로 차단
- `generate-sketch.py` 직접 import 시 `jinja2` 미설치로 차단
- 따라서 테스트 전체 pass/fail은 현 시점에서 끝까지 검증하지 못함

---

## 4. 강점

### 4.1 파이프라인 설계가 좋다
`SKILL.md`는 단순 설명이 아니라 실제 작업 흐름을 단계별로 정리하고 있다.
- Phase A: Frame extraction + loop detection
- Phase B: Computational analysis
- Phase C: Visual verification
- Phase D: Blueprint assembly
- Phase E: Code generation
- Phase F: Verification

이 구조는 영상 역설계/재생성 작업에서 현실적인 흐름이다. 특히 **스크립트 측정 + 모델 해석 + 후속 검증**의 역할 분리가 적절하다. 근거: `SKILL.md:22-122`

### 4.2 progressive disclosure가 비교적 잘 되어 있다
핵심 흐름은 `SKILL.md`에 두고, 세부 계약은 reference 파일로 분리했다.
- `references/analysis-workflow.md`
- `references/output-schema.md`
- `references/shader-patterns.md`

이 구조는 스킬 컨텍스트를 과도하게 비대하게 만들지 않으면서도, 필요할 때 상세 규칙을 읽게 만드는 방식이라 좋다.

### 4.3 테스트를 붙이려는 태도는 좋다
테스트 범위가 최소한 아래 축을 덮고 있다.
- schema validation
- shader generation
- sketch generation
- verification report
- skill integration

이건 분명 장점이다. 근거: `scripts/tests/*`

### 4.4 schema 지향적 접근이 좋다
`output-schema.md`가 감상문형 문서가 아니라 데이터 계약 중심으로 적혀 있다. 이건 나중에 자동화, 검증, diff, 회귀 체크에 모두 유리하다. 근거: `references/output-schema.md:1-209`

---

## 5. 핵심 문제점

## 5.1 P0 — 문서와 실제 entrypoint가 어긋남

### 문제
문서와 reference는 모두 `scripts/analyze-layers.py`가 존재한다고 가정한다.
- `SKILL.md:39-40`
- `references/analysis-workflow.md:3`

하지만 실제 구조에는 해당 파일이 없고, 대신 package 형태만 존재한다.
- `scripts/analyze_layers/__init__.py`
- `scripts/analyze_layers/color_mask.py`
- `scripts/analyze_layers/motion.py`
- `scripts/analyze_layers/effects.py`

즉, 사용자가 문서대로 따라 하면 바로 실패한다.

### 영향
- 첫 실행부터 스킬 신뢰도 하락
- 문서 기반 사용 불가
- downstream 단계(Phase B 이후) 전체 차단

### 실제 재현
문서에 적힌 경로로 실행 시 다음과 같이 실패했다.
- `python3 /Users/isaac/projects/video-art/.claude/skills/video-blueprint/scripts/analyze-layers.py`
- 결과: `No such file or directory`

### 권장 수정
둘 중 하나를 반드시 택해야 한다.
1. `scripts/analyze-layers.py` thin wrapper 추가
2. `SKILL.md`와 reference 문서를 실제 실행 방식으로 일괄 수정

현실적으로는 **wrapper 추가가 더 안전**하다. 기존 문서 계약을 덜 흔들기 때문이다.

---

## 5.2 P0 — `generate-sketch.py`의 이름 처리 로직이 코드 식별자를 깨뜨릴 수 있음

### 문제
`generate-sketch.py`는 `_NAME_RE`에서 `-`를 허용한다. 근거: `scripts/generate-sketch.py:20-30`

그런데 같은 `name` 값을 아래 식별자 생성에도 그대로 사용한다.
- `create{name.capitalize()}` (`scripts/generate-sketch.py:52`)
- `IS_{upper}` (`scripts/generate-sketch.py:97-107`)

즉 이름이 `my-mode`면 다음이 생성될 수 있다.
- 함수명: `createMy-mode`
- 상수명: `IS_MY-MODE`

이건 TypeScript 식별자로 유효하지 않다.

### 영향
- 생성 산출물이 즉시 컴파일 에러를 낼 수 있음
- 파일명은 안전해도 코드 식별자는 unsafe한 상태
- mode name 입력 자유도가 오히려 오류를 유발함

### 권장 수정
`name`을 하나로 쓰지 말고 최소 3개로 분리해야 한다.
- `file_slug`
- `ts_identifier`
- `const_identifier`

예시:
- input: `my-mode`
- file slug: `my-mode`
- ts identifier: `MyMode`
- const identifier: `MY_MODE`

이건 구조적 수정이 필요하다.

---

## 5.3 P1 — 문서가 약속하는 EffectComposer 생성 범위와 실제 구현이 다름

### 문제
`SKILL.md`는 Phase E Step 1에서 다음을 생성한다고 적고 있다.
- `uniforms`
- `main() structure`
- `SDF library`
- `EffectComposer setup`

근거: `SKILL.md:78-85`

하지만 실제 `generate-sketch.py`는 다음 수준에 가깝다.
- sketch 파일 생성 (`scripts/generate-sketch.py:39-83`)
- `main.ts` patch 텍스트 출력 (`scripts/generate-sketch.py:86-118`)
- effects가 있으면 post shader 파일 생성 (`scripts/generate-sketch.py:121-220`)

즉 **EffectComposer wiring을 실제로 생성한다기보다, wiring용 단서와 post shader를 일부 만든다**에 가깝다.

### 영향
- 문서 신뢰도 하락
- 사용자 기대치와 구현 범위 불일치
- “자동 생성”이라고 믿고 썼다가 수동 patch가 남을 수 있음

### 권장 수정
둘 중 하나로 통일해야 한다.
1. 문서를 낮춰서 “composer wiring stub + post shader 생성”이라고 정확히 적기
2. 실제로 EffectComposer setup 코드를 생성하기

현재 상태에선 **문서 표현이 과장**돼 있다.

---

## 5.4 P1 — reference 문서의 템플릿 파일명과 실제 파일명이 다름

### 문제
`references/shader-patterns.md`는 다음 템플릿을 가리킨다.
- `templates/post-effects.frag.j2`

근거: `references/shader-patterns.md:7-12`

하지만 실제 파일은 다음이다.
- `templates/post.frag.j2`

그리고 `generate-sketch.py`도 실제로 `post.frag.j2`를 찾는다. 근거: `scripts/generate-sketch.py:128-136`

### 영향
- reference를 따라간 사용자가 헷갈림
- Claude가 reference 기반으로 reasoning할 때 드리프트 발생
- 유지보수 시 문서-코드 탐색 비용 증가

### 권장 수정
reference 문서의 파일명을 실제 구현과 맞춘다.

---

## 5.5 P1 — 테스트 계약과 설치 계약이 서로 맞지 않음

### 문제 1: `SKILL.md` 내용에 대한 테스트 기대가 현재 문서와 안 맞음
`test_skill_integration.py`는 `SKILL.md`에 특정 패키지명이 직접 적혀 있기를 기대한다.
- `numpy`
- `Pillow`
- `opencv-python-headless`
- `jinja2`
- `colorspacious`

근거: `scripts/tests/test_skill_integration.py:25-31`

하지만 실제 `SKILL.md`는 `pip install -r .../requirements.txt`만 적고 있다. 근거: `SKILL.md:14-18`

즉 현재 테스트는 문서와 계약이 맞지 않는다.

### 문제 2: 테스트 실행용 의존성이 별도 정리되지 않음
실제 실행 시 `pytest`가 설치되어 있지 않아 테스트가 차단되었다. 또한 `requirements.txt`에는 runtime 패키지 위주만 있고, test dependency 계약이 없다.

### 영향
- 테스트가 있어도 CI/로컬에서 바로 신뢰하기 어려움
- 문서 수정과 테스트 수정이 서로 독립적으로 깨질 수 있음

### 권장 수정
- `requirements.txt`는 runtime 전용으로 유지
- `requirements-dev.txt` 또는 `pyproject.toml`로 test dependency 분리
- `test_skill_integration.py`는 `SKILL.md`에 패키지 문자열이 직접 있는지 검사하지 말고, `requirements.txt` 존재/핵심 패키지 포함 여부를 검사하도록 바꾸는 게 맞다.

---

## 5.6 P2 — schema 문서와 validator가 완전히 같은 계약을 쓰지 않음

### 관찰
`output-schema.md`는 핵심 필드처럼 설명하지만 validator는 강제하지 않거나, 문서와 허용 범위가 다르게 잡힌 부분이 있다.

예시:
- 문서에는 `loop_point_sec`가 핵심 필드로 설명됨 (`references/output-schema.md:27`)
- 문서에는 `aspect_ratio`, `coordinate_system`가 명시됨 (`references/output-schema.md:36-37`)
- validator는 해당 필드들을 강하게 요구하지 않음 (`scripts/validate-blueprint.py:88-110`)
- 문서는 blend mode를 `additive | alpha | multiply` 중심으로 제시 (`references/output-schema.md:61`)
- validator는 `normal`, `screen`, `overlay`, `add`, `soft_light`까지 허용 (`scripts/validate-blueprint.py:31,148-150`)

또한 문서의 `effects` 예시는 top-level `effects` 아래 또 `effects` object를 두는 형태처럼 보여 shape가 혼동될 여지가 있다. 근거: `references/output-schema.md:148-181`

### 영향
- blueprint producer와 consumer 사이 계약 드리프트
- validator pass인데 문서상으론 미완성처럼 보이거나 그 반대가 될 수 있음

### 권장 수정
- schema 문서와 validator를 **한 계약으로 정렬**한다.
- “필수 / 권장 / 선택”을 명시적으로 나눈다.
- 예시 JSON 구조를 validator 기준으로 다시 맞춘다.

---

## 5.7 P2 — `generate-shader.py`의 하이브리드 전략 설명과 실제 render path가 완전히 연결되어 있지 않음

### 문제
`render_layer_body()`는 꽤 구체적인 GLSL 패턴을 생성한다. 근거: `scripts/generate-shader.py:95-192`

하지만 실제 `render_shader()`는 template context만 렌더하고, layer body generation 결과를 템플릿에 주입하지 않는다. 근거: `scripts/generate-shader.py:195-205`, `templates/shader.frag.j2:63-77`

즉 현재 상태는:
- helper는 있음
- 최종 렌더 경로에는 완전히 연결되지 않음
- 템플릿에는 여전히 `Claude writes layer body here` placeholder가 남아 있음

### 영향
- “hybrid generator”라고 부르기엔 자동 생성 범위가 애매함
- 사람/Claude가 어느 정도까지 수동으로 써야 하는지 경계가 불명확함

### 추가 리스크
`render_layer_body()`는 `count == 1`일 때 `ratio = fi / {count - 1}.0` 형태 문자열을 만들 수 있어 0 나눗셈 형태 코드가 생성될 위험이 있다. 근거: `scripts/generate-shader.py:118-121`

### 권장 수정
- 완전 수동 placeholder 전략이면 문서를 더 솔직하게 수정
- 반자동 전략이면 template에 실제 layer body 삽입까지 연결
- `count == 1` guard 추가

---

## 5.8 P2 — 패키지 디렉터리에 `__pycache__`가 포함되어 있음

### 관찰
리포 내 스킬 디렉터리에 다음이 있다.
- `scripts/__pycache__/`
- `scripts/tests/__pycache__/`

### 영향
- 리뷰/패키징 노이즈 증가
- 배포 산출물 오염 가능성

### 권장 수정
- `.gitignore`로 제외
- 패키징 전 정리

---

## 6. 실행 검증 로그 요약

### 6.1 문서 경로 검증
- 시도: `python3 .../scripts/analyze-layers.py`
- 결과: **실패** (`No such file or directory`)
- 해석: 문서와 실제 entrypoint 불일치

### 6.2 테스트 실행
- 시도: `python3 -m pytest scripts/tests -q`
- 결과: **차단** (`No module named pytest`)
- 해석: 테스트 환경 계약 미정리

### 6.3 Python 문법 확인
- 시도: `ast.parse` 기반 전체 Python 파일 파싱
- 결과: **verified 완료** (25개 파일 파싱 성공)
- 해석: 적어도 문법 수준의 깨짐은 현재 없음

### 6.4 generator import 확인
- 시도: `generate-sketch.py` import
- 결과: **차단** (`No module named 'jinja2'`)
- 해석: runtime dependency 설치 전제는 있으나, 현재 환경에서 즉시 재현 가능한 상태는 아님

---

## 7. 우선순위별 수정 권고

### P0 (즉시 수정)
1. `analyze-layers.py` entrypoint 문제 해결
2. `generate-sketch.py`의 파일명/식별자 분리

### P1 (빠른 정렬 필요)
3. EffectComposer 생성 범위 문서-구현 정렬
4. `shader-patterns.md`의 템플릿 파일명 수정
5. 테스트 계약과 requirements 계약 정렬

### P2 (다음 라운드 정리)
6. schema 문서와 validator 계약 통일
7. `generate-shader.py` hybrid 설명과 실제 render path 정렬
8. `__pycache__` 정리

---

## 8. 추천 액션 플랜

### Step 1 — 실행 계약 먼저 고정
- `scripts/analyze-layers.py` wrapper 추가
- `SKILL.md` 커맨드 재검증

### Step 2 — 코드 생성기 안전성 보강
- name normalization 분리
- TS identifier / const identifier / file slug 분리
- 관련 테스트 추가

### Step 3 — 문서 truthfulness 정리
- EffectComposer wording 수정
- `post-effects.frag.j2` → `post.frag.j2` reference 수정
- schema 예시 JSON 정리

### Step 4 — 테스트 환경 계약 정리
- `requirements-dev.txt` 추가 또는 `pyproject.toml`로 정리
- `pytest` 포함
- integration test를 현재 문서 계약에 맞게 수정

### Step 5 — 재검토 기준
다음 조건을 만족하면 재리뷰 없이도 “실사용 가능” 쪽으로 판단해볼 수 있다.
- 문서 커맨드 전부 실제 실행 가능
- generator가 hyphenated name에서도 안전하게 코드 생성
- 최소 테스트 스위트가 로컬에서 실제 실행됨
- schema 문서와 validator 계약 불일치 해소

---

## 9. 최종 판정

현재 `video-blueprint`는 **방향이 좋은 설계형 프로토타입**이다. 다만 **문서-구현 계약 드리프트**와 **generator 식별자 안정성 문제** 때문에 바로 실전 투입하기엔 이르다.

따라서 최종 판정은 다음과 같다.

> **Revise — P0/P1 수정 후 재검토 권장**

승인 보류의 핵심 이유는 품질이 낮아서가 아니라, **지금은 “좋은 아이디어가 잘 정리된 상태”이지 “실행 계약이 완전히 맞물린 상태”는 아니기 때문**이다.

---

## Appendix A. 근거 파일
- `/.claude/skills/video-blueprint/SKILL.md`
- `/.claude/skills/video-blueprint/references/analysis-workflow.md`
- `/.claude/skills/video-blueprint/references/output-schema.md`
- `/.claude/skills/video-blueprint/references/shader-patterns.md`
- `/.claude/skills/video-blueprint/requirements.txt`
- `/.claude/skills/video-blueprint/scripts/generate-sketch.py`
- `/.claude/skills/video-blueprint/scripts/generate-shader.py`
- `/.claude/skills/video-blueprint/scripts/validate-blueprint.py`
- `/.claude/skills/video-blueprint/scripts/verify-output.py`
- `/.claude/skills/video-blueprint/scripts/tests/test_skill_integration.py`

## Appendix B. 문서 저장 경로
- `/Users/isaac/projects/video-art/docs/video-blueprint-skill-review-2026-03-25.md`
