# `video-blueprint` 스킬 후속 리뷰

- 작성일: 2026-03-25
- 리뷰 대상: `/Users/isaac/projects/video-art/.claude/skills/video-blueprint`
- 이전 리뷰: `/Users/isaac/projects/video-art/docs/video-blueprint-skill-review-2026-03-25.md`
- 최종 판정: **Revise (가벼운 수정 후 재확인 권장)**

---

## 1. 요약

이번 수정으로 **이전 리뷰의 핵심 P0 두 개는 해소됐다.**

해소된 핵심 항목:
1. `analyze-layers.py` 진입점 부재 문제 해결
2. `generate-sketch.py`의 kebab-case 이름이 TypeScript 식별자를 깨뜨리던 문제 해결

추가로 아래도 좋아졌다.
- `requirements-dev.txt` 추가
- `test_skill_integration.py`가 `SKILL.md`와 `requirements.txt` 계약에 맞게 조정됨
- `generate-shader.py`가 실제로 layer body를 템플릿에 주입하도록 개선됨
- `shader-patterns.md`의 템플릿 파일명 드리프트 해소
- `__pycache__` 제거

다만 아직 **실사용자 문서 기준으로는 한 군데 치명적인 CLI 계약 불일치가 남아 있다.**
그 외 schema 예시와 validator 간의 드리프트도 완전히 해소되진 않았다.

즉, 상태는 **분명 좋아졌고 거의 실사용 직전이지만, 아직 완전 승인까지는 한 번 더 손봐야 하는 단계**다.

---

## 2. 이번에 실제로 확인한 것

### verified 완료
- `scripts/analyze-layers.py` wrapper 파일이 실제로 존재함
- `python3 .../scripts/analyze-layers.py --help` 실행이 정상적으로 동작함
- Python 파일 **27개 문법 파싱 통과**
- `generate-sketch.py`에 이름 정규화 함수가 추가됨
  - `_validate_name()`
  - `_name_to_ts_identifier()`
  - `_name_to_const()`
- `generate-shader.py`에서 `render_layer_body()` 결과를 템플릿 context에 실제로 주입함
- `requirements-dev.txt`가 추가됨
- `test_skill_integration.py`가 더 이상 `SKILL.md`에 패키지명이 직접 적혀 있기를 강제하지 않음

### 검증 불가
- 이 호스트 환경에는 `pytest`, `jinja2`가 아직 설치되어 있지 않아 전체 테스트 pass/fail은 끝까지 검증하지 못함
  - `python3 -m pytest --version` → 실패 (`No module named pytest`)
  - `importlib.util.find_spec('jinja2')` → `None`

이건 **현재 호스트 환경 제약**이지, 이번 스킬 수정 자체의 결함이라고 단정할 사안은 아니다. 다만 “테스트 통과 verified” 판정은 아직 못 준다.

---

## 3. 이전 P0 해소 여부

### 3.1 해결됨 — `analyze-layers.py` entrypoint 문제
이전에는 문서가 `scripts/analyze-layers.py`를 가리켰지만 실제 파일이 없어 실패했다.

현재는 다음 wrapper가 추가됐다.
- `scripts/analyze-layers.py`

또한 실제 help 호출도 정상 동작했다.

판정: **해결됨**

---

### 3.2 해결됨 — kebab-case 이름이 TS 식별자를 깨뜨리던 문제
이전에는 `my-mode` 같은 이름이 들어오면 다음처럼 깨질 위험이 있었다.
- `createMy-mode`
- `IS_MY-MODE`

현재는 아래 분리가 들어갔다.
- 파일/원본 이름: `name`
- TS 식별자: `_name_to_ts_identifier()`
- 상수 식별자: `_name_to_const()`

판정: **핵심 구조 수정 완료**

다만 이 수정에 대한 **회귀 테스트가 아직 보이지 않는다.**
즉, 코드상 해결은 맞지만 `my-mode -> createMyMode / IS_MY_MODE`를 직접 고정 검증하는 테스트가 있으면 더 좋다.

---

## 4. 남아 있는 이슈

## 4.1 P1 — `SKILL.md`의 핵심 codegen 커맨드가 아직 CLI와 안 맞음

### 문제
`SKILL.md`는 Phase E에서 이렇게 적고 있다.
- `SKILL.md:80`
- `SKILL.md:81`

```bash
python3 .claude/skills/video-blueprint/scripts/generate-shader.py ./blueprint.json --out ./src/shaders/{name}.frag
python3 .claude/skills/video-blueprint/scripts/generate-sketch.py ./blueprint.json --out ./src/sketches/{name}.ts
```

하지만 실제 parser는 다음을 받는다.
- `generate-shader.py` → `--output`, `-o` (`scripts/generate-shader.py:224`)
- `generate-sketch.py` → `--output-dir` (`scripts/generate-sketch.py:212`)

즉, 문서대로 실행하면 codegen 핵심 단계에서 깨질 가능성이 높다.

### 영향
- 사용자가 `SKILL.md`를 그대로 따라 하면 실패
- 문서-구현 계약 드리프트가 아직 남아 있음
- Phase E는 스킬의 핵심 가치인데, 바로 여기서 꺾인다

### 권장 수정
정확히 아래처럼 바꾸는 게 맞다.

```bash
python3 .claude/skills/video-blueprint/scripts/generate-shader.py ./blueprint.json --output ./src/shaders/{name}.frag
python3 .claude/skills/video-blueprint/scripts/generate-sketch.py ./blueprint.json --name {name} --output-dir ./src/sketches
```

판정: **잔존 주요 이슈**

---

## 4.2 P1/P2 — `output-schema.md`의 `effects` 예시가 아직 한 번 더 중첩됨

### 문제
`output-schema.md`는 Section `effects` 아래 예시를 이렇게 적고 있다.
- `references/output-schema.md:152-184`

```jsonc
{
  "effects": {
    ...
  }
}
```

그런데 이 문맥 자체가 이미 top-level `effects` section 설명이다. 즉 예시 shape가 사실상 `effects.effects`처럼 읽힌다.

반면 validator는 top-level `effects` 아래에 effect entries가 직접 온다고 가정한다.
- `scripts/validate-blueprint.py:245-250`

### 영향
- schema producer와 consumer 해석 차이 발생 가능
- 문서를 읽고 JSON 짜면 nested 구조로 오해할 수 있음

### 권장 수정
Section `effects` 예시는 아래처럼 바로 풀어야 한다.

```jsonc
{
  "glow": { ... },
  "breathing": { ... },
  "chromatic_aberration": { ... },
  "grain": { ... },
  "vignette": { ... }
}
```

판정: **잔존 문서 드리프트**

---

## 4.3 P2 — 스크립트 내부 설명 일부가 최신 구현과 완전히 맞진 않음

### 관찰
- `generate-sketch.py:5-6`
  - “optionally an EffectComposer setup”라고 적지만, 실제 구현은 post shader 생성 + main.ts wiring hint에 더 가깝다.
- `generate-shader.py:5-6`
  - 여전히 “Layer body blocks are placeholders”라고 적지만, 현재 구현은 base layer body를 실제로 주입한다.

### 영향
- 기능은 동작해도 설명 truthfulness가 약간 떨어짐
- 후속 유지보수 시 혼란 가능

### 권장 수정
- docstring을 지금 구현 수준에 맞게 조정

판정: **경미한 truth drift**

---

## 4.4 P2 — 회귀 테스트 보강 여지

이번 수정으로 중요한 버그가 잡혔지만, 아래 회귀 테스트는 있으면 좋다.

1. `generate-sketch.py`
   - 입력: `my-mode`
   - 기대:
     - `createMyMode`
     - `IS_MY_MODE`
2. `SKILL.md` 커맨드 계약 테스트
   - Phase E 커맨드 문구가 실제 CLI 옵션과 맞는지 검사
3. `output-schema.md`의 `effects` 예시 shape 검사

판정: **버그는 아니지만 추천 보강**

---

## 5. 총평

이전 리뷰 대비 체감상 많이 좋아졌다.

- 이전 상태: 핵심 P0 2개가 바로 사용을 막는 수준
- 현재 상태: 핵심 경로 대부분 정리됨
- 남은 핵심: `SKILL.md`의 Phase E CLI 계약 1건 + schema 문서 드리프트 1건

즉 지금 판정은:

> **Revise 유지**
> 다만 무게는 크게 줄었고, 사실상 `almost approved`에 가깝다.

내 기준으로는 아래 두 개만 정리되면 다음 라운드에서 `Approve` 쪽으로 볼 수 있다.

1. `SKILL.md`의 `--out` → 실제 CLI 옵션으로 정정
2. `output-schema.md`의 `effects` 예시 중첩 제거

---

## 6. 저장 경로
- `/Users/isaac/projects/video-art/docs/video-blueprint-skill-review-followup-2026-03-25.md`
