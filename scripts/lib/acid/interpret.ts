import * as fs from "node:fs";
import * as path from "node:path";
import Replicate from "replicate";
import { validateAnalysis, validateInterpretation } from "./schemas.ts";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.ts";

const LLM_MODEL = "meta/meta-llama-3-70b-instruct";
const MAX_RETRIES = 1;

export const interpret = async (
  analysisPath: string,
  outPath: string,
): Promise<void> => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN not set");
  }

  const rawAnalysis = JSON.parse(fs.readFileSync(analysisPath, "utf-8"));
  const analysis = validateAnalysis(rawAnalysis);

  // Check analysis QC gate
  if (!analysis.analysis_qc.passed && !analysis.analysis_qc.degraded) {
    const total = analysis.drums.kick_positions.length +
      analysis.drums.snare_positions.length +
      analysis.drums.hat_positions.length;
    if (total === 0) {
      throw new Error("Analysis QC ABORT: no drum onsets detected");
    }
  }

  const duration = analysis.selected_range.end - analysis.selected_range.start;

  // Summarize analysis to reduce token count (LLM struggles with large JSON)
  const summary = {
    bpm: analysis.bpm.value,
    key: analysis.key,
    duration,
    drums: {
      kicks: analysis.drums.kick_positions.length,
      snares: analysis.drums.snare_positions.length,
      hats: analysis.drums.hat_positions.length,
    },
    bass_notes: analysis.bass.notes.slice(0, 20).map((n) => ({
      time: n.time, midi: n.midi, dur: n.duration, slide: n.slide,
    })),
    other_notes: analysis.other.notes.slice(0, 15).map((n) => ({
      time: n.time, midi: n.midi, dur: n.duration,
    })),
    energy_summary: {
      min: Math.min(...analysis.energy_curve),
      max: Math.max(...analysis.energy_curve),
      trend: analysis.energy_curve.length > 1 ?
        (analysis.energy_curve[analysis.energy_curve.length - 1] > analysis.energy_curve[0] ? "rising" : "falling") : "flat",
    },
    structure: analysis.structure,
  };
  const analysisJson = JSON.stringify(summary, null, 2);
  const userPrompt = buildUserPrompt(analysisJson, duration);

  const replicate = new Replicate({ auth: token });
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      let output = "";
      const prompt = attempt === 0
        ? `${SYSTEM_PROMPT}\n\n${userPrompt}`
        : `${SYSTEM_PROMPT}\n\n${userPrompt}\n\nPREVIOUS ATTEMPT FAILED: ${lastError?.message}. Fix the JSON and try again.`;

      for await (const event of replicate.stream(LLM_MODEL, {
        input: {
          prompt,
          max_tokens: 4096,
          temperature: 0.3,
          top_p: 0.9,
        },
      })) {
        output += event.toString();
      }

      // Extract JSON from response
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON object found in LLM response");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // Try fixing common issues: trailing commas
        const fixed = jsonMatch[0].replace(/,\s*([}\]])/g, "$1");
        parsed = JSON.parse(fixed);
      }

      // Validate with Zod
      const interpretation = validateInterpretation(parsed);

      fs.writeFileSync(outPath, JSON.stringify(interpretation, null, 2));
      console.log(`Interpretation saved: ${outPath}`);
      console.log(`  bass_303: ${interpretation.tracks.bass_303.events.length} events`);
      console.log(`  riff_303: ${interpretation.tracks.riff_303.events.length} events`);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        console.warn(`Interpret attempt ${attempt + 1} failed: ${lastError.message}. Retrying...`);
      }
    }
  }

  throw new Error(`Interpretation failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`);
};
