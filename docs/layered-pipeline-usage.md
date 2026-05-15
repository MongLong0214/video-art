# Layered Pipeline 사용법

이미지 1장 → 20초 사이키델릭 루프 영상 (1080×1920 H.264 ~10Mbps Instagram Reels 사양).

## 빠른 실행

```bash
# 1. 레이어 추출 + scene.json 생성 (default: commercial 톤)
npx tsx scripts/pipeline-pro.ts <이미지 경로>

# 2. 영상 캡쳐 + ffmpeg 인코딩
npx tsx scripts/export-layered.ts --title <출력 이름>
```

출력: `out/layered/YYYY-MM-DD_<title>-<hash>/<title>.mp4` (≈49MB / 20초)

## 톤 선택

### commercial (기본)
사이키델릭 부스트가 강한 enterprise 셋팅. SNS/광고 공통 베이스.

```bash
npx tsx scripts/pipeline-pro.ts <이미지>
# 또는 명시
npx tsx scripts/pipeline-pro.ts <이미지> --tone commercial
```

핵심 값: sat 4.4/5.4/3.8, satInj 0.95/1.4/0.85, hueSpeed 18/20/14, hueKey 4.4/5.4/3.8, lumExp 0.85/0.78/0.82, bloom 1.0, CA 0.18, godRays 1.1 (centerY 0.25 planet/sun), aura 1.05 + hueSpeed 0.34, layer-1 glow 0.1, vignette 0.05.

### elegant
소스 색감을 보존하는 절제된 톤. 인물·풍경 강조용.

```bash
npx tsx scripts/pipeline-pro.ts <이미지> --tone elegant
```

핵심 값: sat 2.4/2.6/1.95, satInj 0.54/0.56/0.36, hueSpeed 15/16/12, bloom 0.55, CA 0.08, godRays 0.55 (centerY 0.4), aura 0.65, vignette 0.15.

## 자동 해상도 보정

소스 이미지가 1632×2912보다 작으면 lanczos3로 자동 업스케일됩니다. (저해상도 소스에서도 출력이 흐릿하지 않음)

## 옵션

| 플래그 | 기본 | 설명 |
|--------|------|------|
| `--tone commercial\|elegant` | `commercial` | scene.json 톤 프리셋 |
| `--duration N` | 20 | 영상 길이 (초) |
| `--fps N` | 30 | 프레임레이트 |
| `--production` | off | Replicate 버전 핀 강제 |
| `--work-dir <path>` | off | 격리 작업 디렉터리 (배치 처리용) |

export-layered도 동일하게 `--fps`, `--prores`, `--keep-frames`, `--work-dir`, `--archive-dir`, `--title` 지원.

## 시나리오 — godRays 위치 조정

`public/scene.json` 의 `effects.godRays.centerY` 값을 이미지 광원 위치에 맞춰 조정:

- 머리 위 후광 / 상단 sun: `0.2 ~ 0.3`
- 얼굴 정면 광원: `0.35 ~ 0.45`
- 중앙 광원: `0.5`
- 하단 광원: `0.6 ~ 0.7`

## 오디오 합치기

```bash
ffmpeg -y \
  -i <영상>.mp4 \
  -ss <시작초> -t 20 -i <음원>.wav \
  -c:v copy -c:a aac -b:a 256k \
  -af "afade=t=in:st=0:d=0.4" \
  -shortest -map 0:v:0 -map 1:a:0 \
  <영상>-with-audio.mp4
```

`-ss N`: 음원의 N초부터 사용. fade-in 0.4초만 적용 (fade-out 없음).

## 환경 변수

`.env` 에 Replicate 토큰 필요:

```
REPLICATE_API_TOKEN=r8_...
```

## 트러블슈팅

- **검정/회색만 보임** → 소스의 어두운 영역이 압도적. `satInjectionMul` 또는 `valueLift` 손대기 전에 source 자체가 어두운 톤 지배 이미지인지 확인. 메모리 정책: 검은 톤 지배 소스는 레이어드 파이프라인에 부적합 → 다른 이미지 사용 권장.
- **잎/디테일이 가려짐** → bria 전경 추출이 디테일을 silhouette 레이어로 보냈을 가능성. `public/layers/layer-1.png` opacity를 scene.json에서 0.6~0.7로 낮추면 layer-0의 원본 색이 비침.
- **자글거림** → `chromaticAberration.offset`, `aura.hueSpeed`, layer `hueSpeed`를 동시에 낮춤.
- **흐릿함** → 자동 업스케일이 적용되지만 소스가 SDR JPG일 경우 디테일 손실이 있을 수 있음. 가능한 한 원본 PNG·고해상도 사용.
