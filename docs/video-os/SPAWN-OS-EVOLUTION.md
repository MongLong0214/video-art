> **Delivered 2026-09-02 → `00-INDEX.md` v2** (two contracts · state-machine loop · `--hero` override · sketch grid · `isaac-pick` · `close-lock` · quote dictionary). Rationale in `05-HALLUCINATION-METHOD.md`. This brief is history now; 00 wins.

# Spawn brief — video-os 작업방식 대대적 고도화

**이건 SSOT가 아니다.** 새 에이전트 첫 메시지에 이 파일 **전체**를 붙여넣기 위한 브리프다.  
일상 렌더 잡(새 이미지 / 풀렌더 / 락 재현)은 계속 `docs/video-os/00-INDEX.md`에서 시작한다.  
이 파일과 00이 싸우면 **00 승**.

범위: **제품 전체의 일하는 방식**. 최근 한 장(r346)의 후기가 아니다.  
r325–r346은 증거일 뿐, 문제 정의의 경계가 아니다.

아래 `---` 이후를 그대로 붙여라.

---

역할: 너는 렌더러가 아니다. video-art의 **작업 OS 설계자**다.

Isaac은 미학 최종 심판이다. 문서+스크립트는 execution grade만 보장한다
(히어로가 움직이고, 박스/스핀이 없고, 락 플레이트가 있는 상태여야 Isaac이 심판할 수 있다).

이번 잡: 제로컨텍스트 에이전트가 Isaac과 이미지를 영상으로 만드는 **전 과정**을
규칙 더미가 아니라 **더 높은 추상의 운영 체제**로 다시 짠다.

대상은 한 장의 실패 복기가 아니다. 대상은 이 루프 전부다.

```
이미지 입고
  → 분류 / 골든
  → prepare + hero/plates + session-grade
  → preview + stills + qa
  → Isaac quote (축 하나)
  → (반복) 룩 수렴
  → full (gate PASS | humanOverride)
  → audio (트랙 + 시작점)
  → (선택) 닫힌 락 / 다른 PC 재현
  → (선택) 릴스 컷 — 룩과 분리
```

성공하면 다음 에이전트는 01을 소설처럼 읽지 않고도,
Isaac 한 줄만으로 올바른 축만 만지고, 잘못된 제품을 안 뽑는다.

실패하면 01에 R-번호를 더 쌓거나, r346 전용 패치를 시스템이라고 부른다.

## 하지 말 것

- 파이프라인 렌더 / 풀렌더 / 오디오 먹스 / 새 소스 프리뷰
- 01에 규칙·R-번호·케이스를 더 쌓는 것을 “고도화”로 위장
- 두 번째 SSOT, 새 플레이북 폴더, 에이전트별 산출물 파일 난립
- killed axis 부활: spin / `phase-angular` / figure `colorCycle` / cosmos on figure-vivid /
  `nx-ny` box / overlay / img2video / optical liquid
- 닫힌 락 룩 리튠 (r221, r242, r274, r325, r342, r343–r346 …)
- Isaac 승인 전 문서/스크립트 패치
- `01` §9 전수 읽기
- 웹앱 conventions / Elite Dev TF 오케스트레이션을 이 제품에 이식
- SuperCollider, 셰이더 갤러리, 릴스 업로드 전략을 이번 잡의 본체로 삼기

## 반드시 읽을 것 (이 순서, lazy)

1. `Agents.md` — 포인터. 00과 싸우면 00 승
2. `docs/video-os/00-INDEX.md` — 유일 시작 페이지. 두 잡(create vs rebuild), hard bans, 경로
3. `docs/video-os/04-QUALITY-CONTRACT.md` — Isaac 전 실행 바. hero tree, hold, spin, checklist
4. `docs/video-os/01-CREATE-OS.md` — 분류, 기계 루프, killed, full/audio, 원장 **구조**.
   §9는 전수 금지. 샘플만:
   - 골든/타입: r221, r139, r240–r242
   - killed 교훈: r299 (cosmos / godRays-main / zero-prism)
   - halo/hold 교훈: r325, r342
   - 최근 본선: r343, r344, r345, r346
5. `docs/video-os/02-REPRO-LOCKS.md` + `recipes/locks/manifest.json`
   — 무엇이 git에 있고, 플레이트가 왜 룩인지, local final vs lock pack
6. `docs/video-os/03-INSTAGRAM-REELS.md` **앞부분만** (루프 룩과 릴스가 왜 파일로 갈라져 있는지.
   릴스 컷 히스토리 전수는 읽지 말 것)
7. 강제 여부 (읽기 전용, 문서가 거짓말하는지):
   - `scripts/prepare-new-source.ts`
   - `scripts/rebuild-closed-lock.ts`
   - `scripts/export-layered.ts` (session-grade / gate-report 진입점만)
   - `scripts/lib/session-grade.ts`
   - `scripts/lib/hero-detect.ts`
   - `scripts/lib/session-plates.ts` / `session-scene.ts`
   - `scripts/lib/figure-vivid-legal.ts`
   - `scripts/lib/psychedelic-final-guard.ts`
   - `scripts/lib/hold-walls.ts`
   - `recipes/golden/*.json` (파일명+용도. 전부 디코딩하지 말 것)
8. `.claude/skills/layered-pipeline/SKILL.md` — 00 패배 확인. 스킬에서 명령을 가져오지 말 것

**열지 말 것:** 루트 `OUTPUT_GAP_ANALYSIS.md`, `IMAGE_TO_LOOP_WORKFLOW.md`,
`docs/REPRO_LOCKS_PLAYBOOK.md` (stubs), `docs/video-os/archive/**` (01/04가 보낼 때만).

충돌 규칙 (00과 동일):
- Isaac 전 실행 바 → **04**
- 분류 / 룩 법 / gate / cases → **01**
- 재현 / 커밋 / 플레이트 → **02**
- 릴스 컷 로그 → **03**, 루프 룩은 여전히 **01**
- 이 브리프 vs 00 → **00**

## 이 시스템이 이미 잘 하는 것 (깨지 말 것)

제품 불변식. 고도화해도 이건 남는다.

- GLSL only. 소스 픽셀 in-place motion (R-038). 외국 텍스처/오버레이 금지
- 애니메이트하지, 다시 그리지 마라 (R-001)
- no spin (R-060). custom `phase-halo` / `phase-fall` / `phase-beam` 은 travel이지 spin이 아님
- `prepare-new-source` 가 명령의 기록. scaffold-only r221 on halo/pour/beam = 제품 실패
- session-grade 스킵 플래그 없음. 직사각 hold 금지
- Isaac quote is law. QA PASS ≠ 성공 (R-020)
- preview first. full = 시각 OK + (gate PASS | Isaac override). audio = 트랙+시작점 명시 때만
- 2-layer source+hold 는 둘 다 소스 픽셀이면 legal
- 닫힌 락은 임기응변 재현 금지 (`rebuild-closed-lock` + plates)

고도화 = 이 불변식을 **에이전트가 덜 읽고도 지키게** 만드는 것.
고도화 ≠ 불변식을 에세이로 다시 쓰기.

## 설계해야 하는 면 (전부. 최근 이미지에 한정하지 말 것)

각 면마다: 지금 문서가 말하는 것 / 스크립트가 강제하는 것 / 에이전트가 실제로 하는 것.
세 층이 다르면 그게 버그다. 규칙을 더 쓰지 말고 모델을 바꿔라.

### 1. 제로컨텍스트 경제

에이전트는 세션마다 기억을 잃는다. 지금 해법은 “00을 읽고 01을 더 읽으라”다.
01은 원장+법률+런북이 한 파일이다. 실패 모드: 최근 법만 못 읽고 골든 r221을 켠다.
질문: 살아있는 법(짧게, 강제) vs 증거 로그(길게, on-demand) vs 명령(스크립트)을
어떻게 나눌 것인가. 새 패턴은 어디에 한 줄로 올라가는가.

### 2. 입고 → 분류 → 골든

§3 트리는 숫자로 타입을 고른다. 실제로는 detector/아이작 눈이 타입을 뒤집는다
(figure-vivid vs busy-line vs sheet; r343 oil vs r221; r346 form vs halo).
질문: 분류는 게이트인가 가설인가. 골든은 시작 템플릿인가 최종 룩인가.
레이어마다 다른 골든(강=r221, 인물=r139)은 합법 축인가 3번째 패밀리인가.

### 3. Hero / plates / hold

04는 hero 하나, 살아 있는 것을 홀드하지 말 것, 박스 금지.
실제 그림은 링 travel + 얼굴 identity + 실루엣 texture 가 동시에 필요할 수 있다.
detector와 “living part”가 갈라지면 누가 이기는가. 오버라이드는 어떻게 강제되는가.
session-grade가 그 오버라이드를 존중하는가, 아니면 준비 시점 form을 박제하는가.

### 4. Preview 루프와 Isaac

한 축만 바꾸고, 2 miss에 멈추고, 6 프리뷰 캡.
Isaac은 같은 소스에서 싸이키 → 창의 → 고도화 → 디노이즈 → 최종본 → 사람만 을 연속 지시한다.
내부 실패 프리뷰를 보여야 하나. “알아서 최종본”은 풀렌더 인가 한 번 더 스냅인가.
Quote를 knob이 아니라 named axis로 번역하는 테이블이 시스템에 없다.

### 5. 가드 vs 룩

qa-motion / olive / seam / drift 는 깨진 영상을 막는다. 예쁜 영상을 만들지 않는다.
gate:psychedelic 은 레퍼런스 모션 계약인데, 최근 본선 최종은 거의 REJECT+override다.
문서의 본선(PASS해야 full)과 제품의 본선(Isaac pick이면 override)이 다르다.
역할을 나눠라: 실행 가드 / Isaac 픽 기록 / 재현 permit.

### 6. Full · audio · 배달

20s / 30fps / 1632×2912 / H.264. 오디오는 트랙+timestamp만.
에이전트는 시작점을 추측하거나, 무음 파이널을 닫힌 것으로 취급한다.
먹스 실수(0:56 vs 5:06)는 룩 버그가 아니라 운영 버그다.
배달물 이름, silent vs with-audio, 무엇을 Isaac에게 경로로 주는가.

### 7. 잠금 · 재현 · git

02: PNG + lock scene + gate report 가 git. MP4/WAV/out 은 로컬.
r325/r342는 plates가 룩이다. r343–r346은 local final, lock pack 없음.
질문: Isaac final의 정의는 “폴더에 mp4 있음”인가 “다른 PC에서 같은 영화가 나옴”인가.
lock을 기본 경로로 올릴지, “요청 전에 local”을 명시할지.

### 8. 루프 vs 릴스

03은 컷 로그, 룩은 01. 에이전트가 릴스 문서를 루프 기본값으로 읽거나 그 반대를 한다.
고도화는 두 잡을 한 파일로 합치는 것이 아니라, 진입점이 실수 불가능하게 하는 것.

### 9. 스킬 · 엔트리포인트 · 유령 문서

`AGENTS.md` → 00. skill은 00에 진다. 루트 스텁이 아직 존재한다.
제로컨텍스트가 잘못된 파일에서 명령을 복사하는 한, 04는 죽은 계약이다.
엔트리/스킬/스텁을 운영 모델의 일부로 설계하라.

### 10. 지식 수명

R-번호, killed axes, §9 케이스, PATTERN/DECISION 비슷한 산문.
무엇이 30일 증거이고 무엇이 영구 법인가.
에이전트가 “새 교훈”을 어디에 쓰도록 할 것인가 (04 한 줄 vs 01 부록 vs 스크립트 테스트).

최근 케이스(r343–r346)는 위 10개 면을 **검증하는 증거**로만 써라.
거기에 맞춰 시스템 범위를 줄이지 마라.

## 방법

1. 세 층 맵을 그려라: 문서 / 스크립트 강제 / 실제 Isaac 루프. 면(1–10)마다 한 줄.
2. Grep으로 문서 거짓말을 찾아라 (hero override, grade, gate, hold, skill 명령).
3. 렌더하지 마라. 설계만.
4. 면마다 대안은 최대 2개. 각 대안: 남는 불변식 / 죽는 실패모드 / 다음 에이전트가 하는 일 3단계.
5. 전체를 관통하는 운영 모델 하나 + (필요하면) 폐기된 모델 하나.
6. Isaac 승인 없이 01/04 대규모 리라이트 금지. 채팅 산출물 1개. 파일 여러 개 금지.

## 산출물 (채팅에 이 구조로만)

1. **범위 확인:** 네가 재설계하는 루프를 10줄 이하로. r346 전용 패치가 아님을 명시.
2. **세 층 진단:** 면 1–10 중 불일치가 큰 것 최대 7개. 각각 증거(문서 절 / 스크립트 / 케이스).
3. **목표 운영 모델:** 상태머신. 에이전트 턴마다 읽는 파일 수, 만지는 축 수, Isaac에게 묻는 횟수.
4. **Quote → 축 사전** 초안 (싸이키, 노이즈, 선명, 구려, 약해, 스피디, 유지, 사람만, 풀렌더, 오디오 시각 …).
5. **문서 재배치:** 00/04/01/02/03/skill 에서 남길 것 / 지울 것 / 옮길 것. 파일당 최대 8줄.
6. **강제 갭:** 스크립트가 문서를 배신하는 지점. 코드 패치는 제안만.
7. **Isaac 질문 최대 5개.** 예:
   - 히어로 1개 강제 vs dual-contract
   - gate를 룩 심판에서 permit으로 격하할지
   - Isaac final에 lock pack을 기본으로 할지
   - 01을 법/원장으로 쪼갤지
   - 레이어별 골든을 1축으로 인정할지

성공 기준 (다음 제로컨텍스트 에이전트):

- 새 이미지에서 04 실행 바를 스킵하지 않는다
- Isaac 한 줄을 knob 더미가 아니라 축 하나로 번역한다
- 링/포어를 홀드하지 않고, 인물 텍스처가 필요하면 별도 축으로 다룬다
- “알아서 최종본”을 denoise나 melt로 오역하지 않는다
- 풀렌더+오디오는 quote의 트랙/시각만 따른다
- 01 전체를 읽지 않고도 최근 법을 적용한다
- 닫힌 락을 임기응변으로 재현하지 않는다

`01`에 규칙을 더 쌓아 위 목록을 흉내 내면 실패다.
한 장의 후기(r346)만 고치면 실패다.
제품 전체의 작업 OS가 짧아지고 강제되면 성공이다.
