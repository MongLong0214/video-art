/**
 * Pro Techno Pipeline — unified CLI.
 * Orchestrates: analysis → 5-stem NRT render → pedalboard mix → master → calibrate score.
 *
 * Usage: npx tsx scripts/render-pro.ts <analysis-dir>
 *   [--mode synth|samples|hybrid]
 *   [--style dark-techno|hard-techno|melodic|industrial|psytrance]
 *   [--reference ref.wav]
 *   [--no-sidechain]
 *   [--no-score]
 *   [--stems-only]
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------
const analysisDir = process.argv[2];
if (!analysisDir) {
  console.error(
    "Usage: npx tsx scripts/render-pro.ts <analysis-dir> [--mode synth|samples|hybrid] [--style hard-techno] [--reference ref.wav]",
  );
  process.exit(1);
}

const getArg = (flag: string, fallback: string): string => {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : fallback;
};

const mode = getArg("--mode", "synth");
const style = getArg("--style", "hard-techno");
const reference = getArg("--reference", "");
const noSidechain = process.argv.includes("--no-sidechain");
const noScore = process.argv.includes("--no-score");
const stemsOnly = process.argv.includes("--stems-only");

const outDir = path.join(analysisDir, "pro");
const stemsDir = path.join(outDir, "stems");
fs.mkdirSync(stemsDir, { recursive: true });

const analysisJson = path.join(analysisDir, "analysis.json");
if (!fs.existsSync(analysisJson)) {
  console.error(`ERROR: ${analysisJson} not found`);
  process.exit(1);
}

const startTime = Date.now();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const execPython = (script: string, args: string[]): string => {
  try {
    return execFileSync("python3", [script, ...args], {
      encoding: "utf-8",
      timeout: 300_000,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[python] ${script} failed: ${msg}`);
    return "";
  }
};

const SCSYNTH = "/Applications/SuperCollider.app/Contents/Resources/scsynth";
const SCLANG = "/Applications/SuperCollider.app/Contents/MacOS/sclang";

// ---------------------------------------------------------------------------
// Step 1: Generate NRT score + render stems via render-analysis.ts
// ---------------------------------------------------------------------------
console.log("[1/4] Rendering (render-analysis.ts)...");
try {
  const renderArgs = [
    path.join(process.cwd(), "scripts/render-analysis.ts"),
    analysisDir,
    "--mode", mode,
    "--no-master",     // skip old master.py — we use mix-pro.py
    "--multi-stem",    // render 10ch for 5-stem splitting
  ];
  const renderResult = execFileSync("npx", ["tsx", ...renderArgs], {
    encoding: "utf-8",
    timeout: 120_000,
    cwd: process.cwd(),
  });
  console.log(renderResult.trim().split("\n").map((l: string) => `  ${l}`).join("\n"));
} catch (e) {
  console.error(`[render] Failed: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}

// Check that render output exists
const renderWav = path.join(analysisDir, "render-synthesis.wav");
const renderHybrid = path.join(analysisDir, "render-hybrid.wav");
const sourceWav = fs.existsSync(renderHybrid) ? renderHybrid : renderWav;

if (!fs.existsSync(sourceWav)) {
  console.error(`[render] No WAV output found at ${sourceWav}`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Step 2: Verify stems (split by render-analysis.ts --multi-stem)
// ---------------------------------------------------------------------------
console.log("[2/4] Checking stems...");
const stemNames = ["kick", "bass", "hat", "synth", "fx"];
const missingStems = stemNames.filter(
  (n) => !fs.existsSync(path.join(stemsDir, `stem-${n}.wav`)),
);
if (missingStems.length > 0) {
  console.log(`  [stems] Missing: ${missingStems.join(", ")} — creating from source`);
  for (const name of missingStems) {
    const stemPath = path.join(stemsDir, `stem-${name}.wav`);
    // Fallback: copy source WAV as kick, silence for rest
    if (name === "kick") {
      fs.copyFileSync(sourceWav, stemPath);
    } else {
      const safeSrc = sourceWav.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      const safeStem = stemPath.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      execFileSync("python3", ["-c", `
import soundfile as sf; import numpy as np
info = sf.info("${safeSrc}")
sf.write("${safeStem}", np.zeros((info.frames, 2), dtype="float32"), info.samplerate)
`], { encoding: "utf-8", timeout: 30_000 });
    }
  }
} else {
  console.log(`  [stems] All 5 stems found`);
}

if (stemsOnly) {
  console.log(`Done (stems only) → ${stemsDir}`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Step 3: Mix + sidechain + master via mix-pro.py
// ---------------------------------------------------------------------------
console.log("[3/4] Mixing (pedalboard)...");
const masterWav = path.join(outDir, "master.wav");
const mixArgs = [
  path.join(process.cwd(), "audio/analyzer/mix-pro.py"),
  "--stems-dir", stemsDir,
  "--analysis", analysisJson,
  "--output", masterWav,
  "--style", style,
];
if (noSidechain) mixArgs.push("--no-sidechain");
if (reference) mixArgs.push("--reference", reference);

const mixResult = execPython(mixArgs[0], mixArgs.slice(1));
if (mixResult) {
  console.log(mixResult.trim().split("\n").map((l: string) => `  ${l}`).join("\n"));
}

if (!fs.existsSync(masterWav)) {
  // Fallback: use master.py
  console.warn("  [mix] mix-pro.py failed, falling back to master.py");
  const masterPy = path.join(process.cwd(), "audio/analyzer/master.py");
  if (fs.existsSync(masterPy)) {
    execFileSync("python3", [masterPy, sourceWav, analysisJson], {
      encoding: "utf-8", timeout: 60_000,
    });
    const masteredPath = sourceWav.replace(".wav", "-mastered.wav");
    if (fs.existsSync(masteredPath)) {
      fs.copyFileSync(masteredPath, masterWav);
    }
  }
}

// ---------------------------------------------------------------------------
// Step 4: Score (optional)
// ---------------------------------------------------------------------------
if (!noScore && reference && fs.existsSync(masterWav)) {
  console.log("[4/4] Scoring...");
  const calibratePy = path.join(process.cwd(), "audio/analyzer/calibrate.py");
  if (fs.existsSync(calibratePy)) {
    // calibrate.py requires: reference synthesized
    const scoreArgs = [calibratePy, reference, masterWav];
    const scoreResult = execPython(scoreArgs[0], scoreArgs.slice(1));
    if (scoreResult) {
      console.log(scoreResult.trim().split("\n").map((l: string) => `  ${l}`).join("\n"));
    }
  }
} else {
  console.log("[4/4] Scoring skipped");
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nDone in ${elapsed}s → ${masterWav}`);
if (fs.existsSync(masterWav)) {
  const stat = fs.statSync(masterWav);
  console.log(`  master.wav: ${(stat.size / 1024 / 1024).toFixed(1)}MB`);
}
