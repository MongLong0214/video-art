# Acperience1 Validation — 2026-04-03

## Input

- Source file: `/Users/isaac/Downloads/Hardfloor - ＂Acperience 1＂.wav`
- Working copy: [`input/acperience1.wav`](/Users/isaac/WebstormProjects/video-art-303/input/acperience1.wav)
- Duration: `542.88s`

## Pipeline

### 1. Reference Analysis

- Output: [`analysis.json`](/Users/isaac/WebstormProjects/video-art-303/out/analysis/acperience1/analysis.json)
- Result:
  - BPM: `126.0`
  - Confidence: `0.93`
  - Key: `None`
  - Warnings:
    - `essentia not installed — Key/Loudness/Danceability unavailable`
    - `demucs not installed — stem separation skipped`

### 2. 303 Render

- Dry run output: [`out/analysis/acperience1/303`](/Users/isaac/WebstormProjects/video-art-303/out/analysis/acperience1/303)
- Real render output: [`out/analysis/acperience1/303-live-v2`](/Users/isaac/WebstormProjects/video-art-303/out/analysis/acperience1/303-live-v2)
- Real render artifacts:
  - [`render-303-raw.wav`](/Users/isaac/WebstormProjects/video-art-303/out/analysis/acperience1/303-live-v2/render-303-raw.wav)
  - [`master.wav`](/Users/isaac/WebstormProjects/video-art-303/out/analysis/acperience1/303-live-v2/master.wav)
  - [`reference-abstraction.json`](/Users/isaac/WebstormProjects/video-art-303/out/analysis/acperience1/303-live-v2/reference-abstraction.json)
  - [`composition-ir.json`](/Users/isaac/WebstormProjects/video-art-303/out/analysis/acperience1/303-live-v2/composition-ir.json)
  - [`source-purity-audit.json`](/Users/isaac/WebstormProjects/video-art-303/out/analysis/acperience1/303-live-v2/source-purity-audit.json)

## Metrics

### 303 Domain Evaluation

- Output: [`evaluation-303.json`](/Users/isaac/WebstormProjects/video-art-303/out/analysis/acperience1/303-live-v2/evaluation-303.json)
- Total score: `79`
- Source purity: `pass`
- Unique sources used: `16`

### Technical QC

- Output: [`technical-qc.json`](/Users/isaac/WebstormProjects/video-art-303/out/analysis/acperience1/303-live-v2/technical-qc.json)
- Result:
  - LUFS: `-15.02`
  - Peak: `-0.3 dBFS`
  - RMS: `-28.29 dBFS`
  - Stereo width: `0.0`
  - Clipping: `0`
  - Passed: `true`

## Release Gate

- Output: [`release-report.json`](/Users/isaac/WebstormProjects/video-art-303/out/analysis/acperience1/303-live-v2/release-report.json)
- Status: `manual_review_required`

Automatic checks:

- `source_purity_pass = true`
- `technical_qc_pass = true`
- `benchmark_score_pass = true`
- `listening_pass = null`

## Interpretation

- 코드/테스트 기준뿐 아니라 실제 입력 WAV 기준으로도 render-303 path는 동작했다.
- 자동 게이트는 모두 통과했고, 현재 남은 것은 청취 평가 입력뿐이다.
- 이 validation은 "기술적으로 usable" 상태를 보여주지만, release-adjacent 판정은 listener panel이 필요하다.

