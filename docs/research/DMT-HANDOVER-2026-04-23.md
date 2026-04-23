# DMT Shader Production — Session Handover

Date: 2026-04-23
Branch: `experiment/shader-dev-maximal`
Status: v62 쉐이더 기본 구조 확정, 렌더 검증 대기

---

## 1. 최종 결정된 방향

**Shot Family A: Masterpiece Synthesis (v47 recipe 구현)**

Isaac 승인: 비상업 개인 사용 → Shadertoy NC-SA 레퍼런스 직접 참고 OK, 단 코드 직접 임베드는 재구현 원칙 유지.

핵심 레퍼런스 문서 (a~z 100% 숙지 완료):
- `docs/research/MASTERPIECE-SYNTHESIS.md` (2746줄, §1306-2019 DMT Art Code/Math Deep Dive 15개 포함)
- `docs/research/dmt-infinite-loop-reference-bank-2026-04-23.md`
- `docs/research/dmt-masterpiece-artwork-canon-2026-04-23.md`

### 1.1 구현 재료 (라이선스 상태)

| 재료 | 라이선스 | 상태 |
|---|---|---|
| IQ Apollonian map (`4ds3zn`/`4sX3Rn`) | MIT | 코드 사용 |
| IQ cosine palette | MIT | 코드 사용 |
| IQ Mandelbulb DE (`ltfSWn`) | 제한적 | 수식만 재구현 OK |
| IQ Rainforest exp fog (`4ttSWf`) | 제한적 | 공식만 재구현 OK |
| AgX tonemap (iolite) | Public | 코드 사용 |
| Sun & Wang thin-film (§13) | Academic | 수식 재구현 |
| Way of Light volumetric (`cdsSRf`) | CC BY-NC-SA | 기법만, 비상업 개인 사용 |
| mrange smoothKaleidoscope (`7lKSWW`) | 혼합 | 현재 제거 (죽은 코드였음) |
| Log-Moebius (`XdyXD3`) | Unknown | 수식만 재구현 |

---

## 2. 반복 실패 히스토리 (v46 → v61)

| 버전 | 시도 | 실패 원인 | 학습 |
|---|---|---|---|
| v46 | sine swirl 4-iter | 프랙탈 아님 | 진짜 프랙탈 필요 |
| v47 | 10 effect 스택 | 섞여서 평평해짐 | 레이어 legibility 필요 |
| v48 | iq Apollonian 순수 | 흰 배경 + 저채도 | DMT void + 하이퍼크로매틱 필요 |
| v49 | + 8-fold 카레이도+브리딩+CA | "52% 만족" — 지루 | 스케일 랜드마크 없음 |
| v50 | log-spherical Droste | 선버스트만 남음 | Droste wrap만으론 프랙탈 소실 |
| v52 | 2D log-polar Kali | "61% 방향은 맞음" | 3D + 엔티티 공간 깊이 필요 |
| v53-54 | 3-layer 파라랙스 | 오버익스포저 | screen blend × glow 주의 |
| v55 | Bressloff V1 cortex | 줌아웃처럼 보임 | 드리프트 방향 검증 |
| v56 | inward drift | + 중앙 과밝음 → 지루 | Abyss 필요 |
| v57 | Family A Cathedral 시도 | 링 단조로움 | 아키텍처 디테일 필요 |
| v58 | 옥타브별 페탈 count | 중앙 hex 밀집, 녹/마젠타만 | corona + RGB 위상 |
| v60 | v47 Recipe 1차 | 스크린 카레이도 + thin-film ×1.25 → 시임, 블로아웃 | 구조적 3D fold 필요 |
| v61 | 3D xy-fold + thin-film ×0.5 | 수평 시임, 여전히 블로아웃 | 카메라 안전거리, 클램프 |
| v62 | 코드 리뷰 반영 + 전면 수정 | **렌더 검증 대기** | — |

### 사용자 명시 불만족 기준
- "줌아웃되는 느낌" ← 드리프트 방향 중요
- "균일한 빨려들어가는 느낌" ← 속도/펄스 제거, 연속 드리프트
- "지루하다" ← 스케일 랜드마크, mid-scale 디테일 필요
- "전혀 LSD/DMT스럽지 않음" ← 하이퍼크로매틱 + 만다라 대칭 + 블랙 보이드
- "속도 더 빨라야" ← 옥타브/loop 증가

---

## 3. v62 현재 구현 상태 (`src/shaders/dmt-tunnel.frag`)

### 6-Pass 아키텍처
```
Pass 0: IQ Apollonian + 4ch orbit trap (구조적 N-fold 내장)
Pass 1: Breathing fractal s = uFoldScale + 0.15*cos(uZoomLoops * time)
Pass 2: Sun & Wang thin-film iridescence (§13 공식)
Pass 3: Volumetric accumulation (coeff 0.008, pre-AgX clamp 4.0)
Pass 4: Background core + halo + palette tint
Pass 5: Exp fog (IQ Rainforest) + AgX + S-curve + CA + breathing vignette
```

### 유니폼
- `uTime` (normalized [0,1])
- `uResolution`
- `uSymmetry` (N-fold mandala, 기본 8)
- `uZoomLoops` (정수, 브리딩 사이클/loop)
- `uCameraLoops` (정수, 카메라 오빗 사이클/loop)
- `uFoldScale` (Apollonian s base)
- `uPaletteMode` (0|1|2|3)
- `uHueSpeed`
- `uGlow`

### 팔레트 모드 (0/1/2/3)
- 0: Sacred Neon (magenta/cyan/gold) — Android Jones/Luke Brown
- 1: Old-Master Visionary (glazed gold/ruby/ultramarine) — Fuchs/Klarwein
- 2: Fractal Cinema (blues/metallic gold) — Horsthuis/Trumbull
- 3: Belson Cosmic (soft blue/amber/void)

### 구조적 N-fold
`foldSymmetry(vec3 p, float n)` → `apollonian()` 시작점에서 xy-plane에 SABS-style smooth fold 적용.
- **경고**: 3D xy-fold + 카메라 축 정렬 시 뷰어가 fold plane과 평행할 때 수평 시임 아티팩트 가능.
- **해결 후보**: 테트라 fold(§4) 교체 또는 카메라 경로 제약.

---

## 4. 코드 리뷰 수정 완료 (6/6)

이전 리뷰어 findings 모두 반영됨:

1. ✅ **uZoomLoops/uCameraLoops 연결** — 유니폼 선언 + `main()`에서 `cos(camN*time)` 사용
2. ✅ **라이선스 헤더 정정** — "STUDY/NON-COMMERCIAL, rights not cleared"로 변경
3. ✅ **paletteMode 타입** — `0|1` → `0|1|2|3` (`src/sketches/dmt-config.ts:9`)
4. ✅ **shader-compile-check** — `mode-dmt` 추가 (`scripts/shader-compile-check.ts:37`)
5. ✅ **smoothKaleidoscope 죽은 코드** — 전체 블록 제거 (foldSymmetry만 유지)
6. ✅ **중복 post 제거** — `src/main.ts:184` dmtPostShader에서 CA/vignette 제거, contrast만 경미하게 유지 (셰이더가 primary grade 담당)

### 검증
- `npx tsc --noEmit` ✓
- `npm run check:shaders` → **8/8 PASS** (mode-dmt 포함)

---

## 5. 즉시 다음 작업

### 5.1 v62a 렌더 실행
```bash
npx tsx scripts/export-dmt.ts --variant a --title v62a-fixed
```
실제 유저가 중단한 지점. 렌더 후 프레임 추출 → 시각 검증.

### 5.2 기대 개선
- 브리딩/카메라 사이클이 config 반영됨 (dmt-config-a.json: zoomLoops 2.0, cameraLoops 2)
- Pre-AgX clamp로 블로아웃 방지
- thin-film ×0.5로 에지 이리데센스 순화
- Composer CA/vignette 제거로 중복 보정 없음 (셰이더 원본 의도 보존)

### 5.3 v62 검증 체크리스트
- [ ] 중앙 abyss 유지 (DMT void)
- [ ] 3D Apollonian 디테일 가시
- [ ] 만다라 대칭 (N-fold 구조적)
- [ ] 블로아웃 없음 (f04 타입)
- [ ] 수평 시임 없음 (f02 타입)
- [ ] 외향 흐름 (sucked-in 감각)
- [ ] 시작/끝 프레임 일치 (seamless loop)

### 5.4 v62 검증 후 양산
b/c/d 변종 렌더:
```bash
npx tsx scripts/export-dmt.ts --variant b --title v62b-amber
npx tsx scripts/export-dmt.ts --variant c --title v62c-petrol
npx tsx scripts/export-dmt.ts --variant d --title v62d-cosmic
```

각 variant config 확인 위치:
- `public/dmt-config-a.json` — Sacred Neon
- `public/dmt-config-b.json` — Old-Master
- `public/dmt-config-c.json` — Petrol
- `public/dmt-config-d.json` — Cosmic

---

## 6. 남은 이슈/리스크

### 6.1 구조적 N-fold 시임 리스크
3D xy-fold + 카메라 축 정렬 시 수평 밴드. 관찰되면 대안:
- **옵션 A**: 테트라 fold (§4 tetraFold, MASTERPIECE-SYNTHESIS line 1467)
- **옵션 B**: 카메라 path 제약 (y 축 변조 증가 → fold plane과 비평행)
- **옵션 C**: fold를 앞단에서 z축으로도 추가 (진정 3D 대칭)

### 6.2 volumetric vs surface 충돌
Way of Light volumetric과 surface BRDF가 `mix(col, rr.volCol*1.5, 0.32)`로 결합. 비중 조정이 감각 톤 결정.

### 6.3 thin-film thickness 범위
현재 380~500nm. 특정 각도에서 3채널 peak 정렬 가능. 더 안전한 접근: `thickness * ndotv`를 `sin(angle)` 기반으로 변조.

### 6.4 아직 활용 안 한 마스터피스 요소
- Central entity pareidolia (Android Jones/Luke Brown)
- Tibetan 4-fold 카디널 gates (실제로 구현 안 됨 — N-fold만)
- Point mandala (Whitney Lapis)
- Slit-scan 스트릭 (Trumbull Stargate)
- Gallimore orthogonal seams (불가능한 깊이)
- Schnörkel filigree (에지 나선 장식)

이 중 어느 것을 v63+에서 추가할지 사용자 판단 대기.

---

## 7. 파일 참조

### 핵심 파일
- `src/shaders/dmt-tunnel.frag` — v62 shader
- `src/sketches/dmt-tunnel.ts` — Three.js runner
- `src/sketches/dmt-config.ts` — config schema (paletteMode 0|1|2|3)
- `src/main.ts` — 모드 라우팅 + composer (CA/vignette 제거됨)
- `scripts/export-dmt.ts` — Puppeteer 캡처 + ffmpeg 인코딩
- `scripts/shader-compile-check.ts` — 스모크 (mode-dmt 포함)
- `public/dmt-config-{a,b,c,d}.json` — 4 variants

### 아카이브
- `out/dmt/2026-04-23_v{버전}-*/` — 각 렌더 output
- `docs/research/dmt-shaders/` — 19개 로컬 shader 레퍼런스 (MIT/CC0/NC-SA 혼합)

### 레퍼런스 문서
- `docs/research/MASTERPIECE-SYNTHESIS.md` ← **single source of truth**
- `docs/research/dmt-infinite-loop-reference-bank-2026-04-23.md`
- `docs/research/dmt-masterpiece-artwork-canon-2026-04-23.md`

---

## 8. 컨텍스트 재개 프로토콜

새 세션에서:
1. 이 파일 Read → 현재 상태 파악
2. `docs/research/MASTERPIECE-SYNTHESIS.md` 필요시 참조 (필독 아님 — 이 파일에 요약됨)
3. `src/shaders/dmt-tunnel.frag` Read → 최신 v62 shader 확인
4. `git status` → 로컬 변경사항 확인 (현재 commit 안 됨)
5. 바로 `npx tsx scripts/export-dmt.ts --variant a --title v62a-fixed` 실행 → 검증
6. 프레임 추출 후 (§5.3 체크리스트) 평가 → 사용자 피드백 대기
