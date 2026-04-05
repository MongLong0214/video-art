import * as fs from "node:fs";
import * as path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { validateAnalysis, validateInterpretation } from "./schemas.ts";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.ts";

const MAX_RETRIES = 2;

export const interpret = async (
  analysisPath: string,
  outPath: string,
): Promise<void> => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not set");
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

  // Summarize analysis to reduce token count
  const defaultKey = { root: "G", mode: "minor" as const, midi: 43, confidence: 0.5 };
  const summary = {
    bpm: analysis.bpm.value,
    key: analysis.key ?? defaultKey,
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
      min: analysis.energy_curve.length > 0 ? analysis.energy_curve.reduce((a, b) => Math.min(a, b)) : 0,
      max: analysis.energy_curve.length > 0 ? analysis.energy_curve.reduce((a, b) => Math.max(a, b)) : 1,
      trend: analysis.energy_curve.length > 1 ?
        (analysis.energy_curve[analysis.energy_curve.length - 1] > analysis.energy_curve[0] ? "rising" : "falling") : "flat",
    },
    structure: analysis.structure,
  };
  const analysisJson = JSON.stringify(summary, null, 2);
  const userPrompt = buildUserPrompt(analysisJson, duration, Math.round(analysis.bpm.value));

  const client = new Anthropic({ apiKey });
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const userContent = attempt === 0
        ? userPrompt
        : `${userPrompt}\n\nPREVIOUS ATTEMPT FAILED: ${lastError?.message}. Fix the JSON and try again.`;

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userContent }],
      });

      const output = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("");

      // Debug: save raw output (opt-in)
      if (process.env.DEBUG_LLM) {
        const debugPath = path.join(path.dirname(outPath), `debug_llm_attempt${attempt}.txt`);
        fs.writeFileSync(debugPath, output);
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
        // Trailing commas
        const fixed = jsonMatch[0].replace(/,\s*([}\]])/g, "$1");
        parsed = JSON.parse(fixed);
      }

      // Expand single-bar patterns to fill full duration
      const expandEvents = (events: Array<Record<string, unknown>>, totalDuration: number, bpm: number): Array<Record<string, unknown>> => {
        if (events.length === 0) return events;
        const barDuration = (60 / bpm) * 4;
        const maxTime = Math.max(...events.map((e) => (e.time as number) + (e.duration as number)));
        const patternLength = maxTime <= barDuration * 1.1 ? barDuration : maxTime;
        if (patternLength >= totalDuration * 0.8) return events;
        const repeats = Math.ceil(totalDuration / patternLength);
        const expanded: Array<Record<string, unknown>> = [];
        for (let r = 0; r < repeats; r++) {
          const offset = r * patternLength;
          if (offset >= totalDuration) break;
          for (const e of events) {
            const t = (e.time as number) + offset;
            if (t >= totalDuration) continue;
            expanded.push({ ...e, time: Math.round(t * 1000) / 1000 });
          }
        }
        return expanded;
      };

      const p = parsed as Record<string, unknown>;
      const tracks = p.tracks as Record<string, unknown>;
      const bass = tracks.bass_303 as Record<string, unknown>;
      const riff = tracks.riff_303 as Record<string, unknown>;
      const bpmVal = (p.bpm as number) || 126;
      const dur = (p.duration as number) || duration;
      bass.events = expandEvents(bass.events as Array<Record<string, unknown>>, dur, bpmVal);
      riff.events = expandEvents(riff.events as Array<Record<string, unknown>>, dur, bpmVal);

      // Clamp out-of-range values
      for (const track of [bass, riff]) {
        for (const ev of (track.events as Array<Record<string, unknown>>)) {
          if ((ev.envMod as number) > 1) ev.envMod = Math.min((ev.envMod as number) / 10, 1);
          if ((ev.decay as number) > 2) ev.decay = Math.min((ev.decay as number) / 10, 2);
          if ((ev.cutoff as number) > 5000) ev.cutoff = 5000;
        }
      }

      // Validate with Zod
      const interpretation = validateInterpretation(p);

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
