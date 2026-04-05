#!/usr/bin/env npx tsx
/**
 * Acid Reinterpreter — E2E CLI Orchestrator
 * Reference track → 303/909 acid recreation pipeline
 *
 * Usage: npx tsx scripts/acid-reinterpreter.ts <input.wav> [options]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { separate } from "./lib/acid/separate.ts";
import { interpret } from "./lib/acid/interpret.ts";
import { normalize } from "./lib/acid/normalizer.ts";
import { validateAnalysis, validateInterpretation } from "./lib/acid/schemas.ts";

const UV_PYTHON = ["uv", "run", "--with", "numpy,soundfile,librosa,pedalboard,pyloudnorm"];

const runPython = (script: string, args: string[], timeoutMs: number): string => {
  const result = execFileSync(UV_PYTHON[0], [...UV_PYTHON.slice(1), "python", script, ...args], {
    encoding: "utf-8",
    timeout: timeoutMs,
    stdio: ["pipe", "pipe", "pipe"],
  });
  return result;
};

const main = async () => {
  const args = process.argv.slice(2);
  const inputPath = args.find((a) => !a.startsWith("-"));
  const getFlag = (name: string) => {
    const idx = args.indexOf(name);
    return idx >= 0 ? args[idx + 1] : undefined;
  };
  const hasFlag = (name: string) => args.includes(name);

  if (!inputPath || hasFlag("--help") || hasFlag("-h")) {
    console.log(`Usage: npx tsx scripts/acid-reinterpreter.ts <input.wav> [options]

Options:
  --start <seconds>     Start time (default: auto energy peak)
  --duration <seconds>  Duration (default: 20)
  --out-dir <path>      Output directory (default: out/acid/{timestamp}/)
  --dry-run             Analyze + interpret only, skip rendering
  --resume              Reuse existing artifacts
  --jc303-path <path>   JC-303 VST3 path`);
    process.exit(0);
  }

  // Input validation (AC-1.7)
  const resolved = path.resolve(inputPath);
  if (!fs.existsSync(resolved)) {
    console.error(`Error: file not found: ${resolved}`);
    process.exit(1);
  }
  const ext = path.extname(resolved).toLowerCase();
  if (![".wav", ".flac", ".mp3"].includes(ext)) {
    console.error(`Error: unsupported format ${ext}. Use WAV/FLAC/MP3.`);
    process.exit(1);
  }

  const startTime = getFlag("--start");
  const duration = getFlag("--duration") ?? "20";
  const outDir = getFlag("--out-dir") ?? `out/acid/${Date.now()}`;
  const dryRun = hasFlag("--dry-run");
  const resume = hasFlag("--resume");
  const jc303Path = getFlag("--jc303-path")
    ?? `${process.env.HOME}/Library/Audio/Plug-Ins/VST3/JC303.vst3`;

  fs.mkdirSync(outDir, { recursive: true });

  const stemsDir = path.join(outDir, "stems");
  const analysisPath = path.join(outDir, "analysis.json");
  const interpretationPath = path.join(outDir, "interpretation.json");
  const renderDir = path.join(outDir, "render");
  const masterPath = path.join(outDir, "master.wav");
  const qcPath = path.join(outDir, "qc.json");

  // Copy input for reference
  const inputCopy = path.join(outDir, "input" + ext);
  if (!fs.existsSync(inputCopy)) {
    fs.copyFileSync(resolved, inputCopy);
  }

  // ═══════════════════════════════════════
  // Step 1: SEPARATE
  // ═══════════════════════════════════════
  if (resume && fs.existsSync(path.join(stemsDir, "drums.wav"))) {
    console.log("[1/5] Stems exist, skipping separation");
  } else {
    console.log("[1/5] Separating stems via Demucs...");
    await separate(resolved, outDir);
  }

  // ═══════════════════════════════════════
  // Step 2: ANALYZE
  // ═══════════════════════════════════════
  if (resume && fs.existsSync(analysisPath)) {
    console.log("[2/5] Analysis exists, skipping");
  } else {
    console.log("[2/5] Analyzing stems...");
    const analyzeArgs = [
      "--drums", path.join(stemsDir, "drums.wav"),
      "--bass", path.join(stemsDir, "bass.wav"),
      "--other", path.join(stemsDir, "other.wav"),
      "--mix", resolved,
      "--out", analysisPath,
    ];
    if (startTime) {
      analyzeArgs.push("--range-start", startTime, "--range-end", String(Number(startTime) + Number(duration)));
    }
    try {
      const out = runPython("scripts/lib/acid/analyze.py", analyzeArgs, 120_000);
      console.log(out);
    } catch (err) {
      console.error("Analysis failed:", (err as Error).message);
      process.exit(1);
    }
  }

  // Validate analysis
  const analysis = validateAnalysis(JSON.parse(fs.readFileSync(analysisPath, "utf-8")));
  if (!analysis.analysis_qc.passed) {
    console.warn(`Analysis QC warnings: ${analysis.analysis_qc.warnings.join(", ")}`);
    if (!analysis.analysis_qc.degraded) {
      console.error("Analysis QC ABORT");
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════
  // Step 3: INTERPRET + NORMALIZE
  // ═══════════════════════════════════════
  if (resume && fs.existsSync(interpretationPath)) {
    console.log("[3/5] Interpretation exists, skipping");
  } else {
    console.log("[3/5] Interpreting via LLM...");
    const rawInterpPath = path.join(outDir, "raw_interpretation.json");
    await interpret(analysisPath, rawInterpPath);

    // Normalize
    console.log("[3/5] Normalizing interpretation...");
    const rawInterp = validateInterpretation(JSON.parse(fs.readFileSync(rawInterpPath, "utf-8")));
    const { normalized, warnings } = normalize(rawInterp);
    if (warnings.length > 0) {
      console.warn(`Normalizer warnings: ${warnings.join(", ")}`);
    }
    fs.writeFileSync(interpretationPath, JSON.stringify(normalized, null, 2));
  }

  if (dryRun) {
    console.log("\n[dry-run] Stopping after interpretation.");
    console.log(`  analysis: ${analysisPath}`);
    console.log(`  interpretation: ${interpretationPath}`);
    process.exit(0);
  }

  // ═══════════════════════════════════════
  // Step 4: RENDER
  // ═══════════════════════════════════════
  if (resume && fs.existsSync(path.join(renderDir, "drums_909.wav"))) {
    console.log("[4/5] Renders exist, skipping");
  } else {
    console.log("[4/5] Rendering 303/909...");
    try {
      const out = runPython("scripts/lib/acid/render.py", [
        "--interpretation", interpretationPath,
        "--samples-dir", "audio/samples/909",
        "--jc303-path", jc303Path,
        "--out-dir", renderDir,
        "--duration", duration,
      ], 60_000);
      console.log(out);
    } catch (err) {
      console.error("Render failed:", (err as Error).message);
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════
  // Step 5: MASTER
  // ═══════════════════════════════════════
  console.log("[5/5] Mastering...");
  const masterArgs = [
    "--drums", path.join(renderDir, "drums_909.wav"),
    "--interpretation", interpretationPath,
    "--out", masterPath,
    "--qc-out", qcPath,
  ];
  const bassPath = path.join(renderDir, "bass_303.wav");
  const riffPath = path.join(renderDir, "riff_303.wav");
  if (fs.existsSync(bassPath)) masterArgs.push("--bass", bassPath);
  if (fs.existsSync(riffPath)) masterArgs.push("--riff", riffPath);

  try {
    const out = runPython("scripts/lib/acid/master.py", masterArgs, 60_000);
    console.log(out);
  } catch (err) {
    console.error("Mastering failed:", (err as Error).message);
    process.exit(1);
  }

  // Results
  console.log("\n════════════════════════════════════");
  console.log(`Master: ${masterPath}`);
  if (fs.existsSync(qcPath)) {
    const qc = JSON.parse(fs.readFileSync(qcPath, "utf-8"));
    console.log(`QC: LUFS=${qc.lufs}, peak=${qc.peak_dbfs}dBFS, passed=${qc.passed}`);
  }
  console.log("════════════════════════════════════");
};

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
