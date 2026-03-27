import { execFile as execFileCb } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { promisify } from "node:util";
import type { NrtScore, NrtEvent } from "./osc-to-nrt";
import { SYNTH_STEM_MAP, FX_PARAMS } from "./synth-stem-map";

const execFileAsync = promisify(execFileCb);

export interface StemConfig {
  name: string;
  bus: number;
  channels: number;
}

export const DEFAULT_STEMS: StemConfig[] = [
  { name: "drums", bus: 0, channels: 2 },
  { name: "bass", bus: 2, channels: 2 },
  { name: "synth", bus: 4, channels: 2 },
  { name: "fx", bus: 6, channels: 2 },
];

export const SIDECHAIN_BUS = 100;

export const getStemBus = (synthDef: string): { bus: number; channels: number } | null => {
  const mapping = SYNTH_STEM_MAP[synthDef];
  if (!mapping) return null;
  return { bus: mapping.bus, channels: 2 };
};

export const parseCustomStems = (arg: string): StemConfig[] => {
  // Format: "kick:kick bass:bass synth:supersaw,pad,lead,arp_pluck fx:riser"
  const groups = arg.trim().split(/\s+/);
  const stems: StemConfig[] = [];
  let busIndex = 0;

  for (const group of groups) {
    const colonIdx = group.indexOf(":");
    if (colonIdx === -1) {
      throw new Error(`Invalid stem format: "${group}". Expected "name:synth1,synth2"`);
    }
    const name = group.slice(0, colonIdx);
    stems.push({ name, bus: busIndex, channels: 2 });
    busIndex += 2;
  }

  return stems;
};

// FX chain order (same as live mode)
const FX_CHAIN_ORDER = [
  "customSidechain",
  "customCompressor",
  "customSaturator",
  "customEQ",
  "nrtReverb",
  "nrtDelay",
];

interface ScoreEntry {
  time: number;
  cmd: string[];
}

export const generateNrtScoreEntries = (
  nrtScore: NrtScore,
  stemConfig: StemConfig[] = DEFAULT_STEMS,
): ScoreEntry[] => {
  const entries: ScoreEntry[] = [];
  let fxNodeId = 2000;

  for (const event of nrtScore.events) {
    const bus = getStemBus(event.synthDef)?.bus ?? 0;

    // Instrument node: [\s_new, defName, nodeId, addAction=0 (addToHead), targetGroup=0, ...args]
    const args: (string | number)[] = ["out", bus];
    for (const [key, val] of Object.entries(event.params)) {
      if (typeof val === "number" || typeof val === "string") {
        if (!FX_PARAMS.has(key)) {
          args.push(key, val as number);
        }
      }
    }

    entries.push({
      time: event.time,
      cmd: ["s_new", event.synthDef, String(event.nodeId), "0", "0", ...args.map(String)],
    });

    // Sidechain: kick writes to sidechain bus
    if (event.synthDef === "kick") {
      entries.push({
        time: event.time,
        cmd: ["s_new", "nrt_sidechain_send", String(fxNodeId), "3", String(event.nodeId),
          "inBus", String(bus), "outBus", String(SIDECHAIN_BUS)],
      });
      fxNodeId += 10;
    }

    // FX nodes — insert after instrument, following chain order
    const hasFxParams = Object.keys(event.params).some((k) => FX_PARAMS.has(k));
    if (hasFxParams) {
      for (const fxDef of FX_CHAIN_ORDER) {
        if (fxDef === "customSidechain" && event.synthDef === "kick") continue; // kick sends, doesn't receive

        const fxArgs: (string | number)[] = ["out", bus];

        if (fxDef === "customSidechain") {
          fxArgs.push("sidechainBus", SIDECHAIN_BUS);
        }

        // Map event FX params to this FX SynthDef
        for (const [key, val] of Object.entries(event.params)) {
          if (FX_PARAMS.has(key) && typeof val === "number") {
            fxArgs.push(key, val);
          }
        }

        entries.push({
          time: event.time,
          cmd: ["s_new", fxDef, String(fxNodeId), "3", String(event.nodeId), ...fxArgs.map(String)],
        });
        fxNodeId += 10;
      }
    }
  }

  // Sort by time for proper Score ordering
  entries.sort((a, b) => a.time - b.time);

  // Add end marker
  const maxTime = nrtScore.metadata.duration + 1;
  entries.push({ time: maxTime, cmd: ["c_set", "0", "0"] });

  return entries;
};

export const stemOutputPath = (
  projectRoot: string,
  title: string,
  date: Date = new Date(),
): string => {
  const dateStr = date.toISOString().slice(0, 10);
  const safeTitle = title.replace(/[^a-zA-Z0-9_-]/g, "-") || "untitled";
  return path.join(projectRoot, "out", "audio", `${dateStr}_${safeTitle}`, "stems");
};

export const buildSplitCommands = (
  inputPath: string,
  outputDir: string,
  stems: StemConfig[] = DEFAULT_STEMS,
): { args: string[]; outputFile: string }[] => {
  return stems.map((stem) => {
    const outputFile = path.join(outputDir, `stem-${stem.name}.wav`);
    // ffmpeg: extract 2 channels starting at channel offset
    const channelOffset = stem.bus; // bus number = channel offset in multi-ch file
    return {
      args: [
        "-i", inputPath,
        "-map_channel", `0.0.${channelOffset}`,
        "-map_channel", `0.0.${channelOffset + 1}`,
        "-ar", "48000",
        "-y", outputFile,
      ],
      outputFile,
    };
  });
};

export const writeScoreConfig = (
  entries: ScoreEntry[],
  nrtJsonPath: string,
  outputPath: string,
): void => {
  const config = {
    nrtJsonPath,
    entries: entries.map((e) => ({ time: e.time, cmd: e.cmd })),
    outputChannels: 8,
    sampleRate: 48000,
  };
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
};

const RENDER_LOCK = ".render.lock";

export const checkRenderLock = (projectRoot: string): void => {
  const lockPath = path.join(projectRoot, RENDER_LOCK);
  if (fs.existsSync(lockPath)) {
    throw new Error("Render already in progress. Remove .render.lock if stale.");
  }
};

export const writeRenderLock = (projectRoot: string): void => {
  fs.writeFileSync(path.join(projectRoot, RENDER_LOCK), String(process.pid));
};

export const removeRenderLock = (projectRoot: string): void => {
  try { fs.unlinkSync(path.join(projectRoot, RENDER_LOCK)); } catch { /* ignore */ }
};

export const checkDiskSpace = (
  availableBytes: number,
  estimatedBytes: number,
): boolean => availableBytes >= estimatedBytes * 2;
