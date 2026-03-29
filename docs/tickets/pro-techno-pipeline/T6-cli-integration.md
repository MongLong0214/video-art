# T6: CLI 통합 (render-pro.ts)

**Size**: M | **Depends**: T1-T5 | **PRD**: US-5

## Goal
한 줄 CLI로 전체 파이프라인 실행: analysis → 5-stem NRT render → sidechain → mix → master → calibrate score.

## New File: `scripts/render-pro.ts`

### CLI Interface
```bash
npx tsx scripts/render-pro.ts <analysis-dir> \
  [--mode synth|samples|hybrid] \
  [--style dark-techno|hard-techno|melodic|industrial|psytrance] \
  [--reference ref.wav] \
  [--no-sidechain] \
  [--no-score] \
  [--stems-only]
```

### Pipeline Steps
```ts
async function renderPro(analysisDir: string, opts: RenderProOptions) {
  const analysis = JSON.parse(fs.readFileSync(path.join(analysisDir, "analysis.json"), "utf-8"));
  const outDir = path.join(analysisDir, "pro");
  const stemsDir = path.join(outDir, "stems");
  fs.mkdirSync(stemsDir, { recursive: true });

  // Step 1: Generate 5 NRT score files (reuse render-analysis.ts logic)
  console.log("[1/5] Generating NRT scores...");
  const scoreEntries = generateScoreEntries(analysis, opts.mode);

  // Step 2: Render 5 stems via scsynth NRT (parallel)
  console.log("[2/5] Rendering stems (5x scsynth NRT)...");
  await renderStems(scoreEntries, stemsDir, analysis);
  // → kick.wav, bass.wav, hat.wav, synth.wav, fx.wav

  // Step 3: Mix + sidechain + master via mix-pro.py
  console.log("[3/5] Mixing (pedalboard)...");
  await execPython("audio/analyzer/mix-pro.py", [
    "--stems-dir", stemsDir,
    "--analysis", path.join(analysisDir, "analysis.json"),
    "--output", path.join(outDir, "master.wav"),
    "--style", opts.style ?? "hard-techno",
    ...(opts.noSidechain ? ["--no-sidechain"] : []),
  ]);

  // Step 4: Score (optional)
  if (!opts.noScore) {
    console.log("[4/5] Scoring...");
    const score = await execPython("audio/analyzer/calibrate.py", [
      path.join(outDir, "master.wav"),
      ...(opts.reference ? ["--reference", opts.reference] : []),
    ]);
    console.log(score.stdout);
  }

  console.log("[5/5] Done → " + path.join(outDir, "master.wav"));
}
```

### Output Structure
```
out/analysis/{name}/pro/
  stems/
    kick.wav
    bass.wav
    hat.wav
    synth.wav
    fx.wav
  master.wav
  mix-log.json    # chain params + levels used
```

### Python 실행 헬퍼
기존 `execPython()` 패턴 재사용 (scripts/lib/에 있으면), 없으면:
```ts
const execPython = async (script: string, args: string[]) => {
  const { stdout, stderr } = await execFileAsync("python3", [script, ...args], {
    timeout: 300_000,  // 5min max
  });
  if (stderr) console.error(stderr);
  return { stdout, stderr };
};
```

### 에러 처리
- Step 2 실패 (scsynth) → 해당 스템 빈 WAV 생성 + warning
- Step 3 실패 (pedalboard) → master.py fallback
- Step 4 실패 (calibrate) → score 생략, master.wav는 유지

## Acceptance Criteria
- [ ] AC-6.1: `npx tsx scripts/render-pro.ts <dir>` 한 줄로 전체 실행
- [ ] AC-6.2: 출력: `pro/master.wav` + `pro/stems/*.wav` (5개)
- [ ] AC-6.3: 처리 시간 < 30초 (30초 트랙 기준)
- [ ] AC-6.4: `--mode`, `--style`, `--reference` 플래그 동작
- [ ] AC-6.5: 중간 단계 실패 시 graceful fallback

## Test
```bash
# Full pipeline
time npx tsx scripts/render-pro.ts out/analysis/void-acid-carousel --style dark-techno
# → pro/master.wav exists, < 30s

# Stems only
npx tsx scripts/render-pro.ts out/analysis/void-acid-carousel --stems-only
ls out/analysis/void-acid-carousel/pro/stems/
# → 5 WAV files, no master.wav

# With reference scoring
npx tsx scripts/render-pro.ts out/analysis/void-acid-carousel \
  --reference audio/references/void-acid-carousel.wav
```
