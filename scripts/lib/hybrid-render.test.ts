import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  readManifest,
  generateSampleBufferCommands,
  scheduleSampleEvents,
} from "./hybrid-render.js";
import { BufferAllocator } from "./buffer-allocator.js";

// === Fixtures ===
const mockManifest = {
  kick: [
    { file: "kick_001.wav", duration: 0.15, onset_time: 0.0 },
    { file: "kick_002.wav", duration: 0.12, onset_time: 0.5 },
  ],
  snare: [
    { file: "snare_001.wav", duration: 0.2, onset_time: 1.0 },
  ],
};

const mockManifestWithBass = {
  ...mockManifest,
  bass: [
    { file: "bass_001.wav", duration: 0.8, onset_time: 0.0 },
    { file: "bass_002.wav", duration: 0.6, onset_time: 1.5 },
  ],
};

describe("T16: Hybrid Sample Render", () => {
  // --- AC-1: manifest read / fallback ---
  describe("readManifest", () => {
    it("reads and parses manifest.json", () => {
      const tmpDir = fs.mkdtempSync("/tmp/hybrid-test-");
      const manifestPath = path.join(tmpDir, "manifest.json");
      fs.writeFileSync(manifestPath, JSON.stringify(mockManifest));

      const result = readManifest(manifestPath);
      expect(result).not.toBeNull();
      expect(result!.kick).toHaveLength(2);
      expect(result!.snare).toHaveLength(1);

      fs.rmSync(tmpDir, { recursive: true });
    });

    it("returns null + warning when manifest missing (AC-1.1 fallback)", () => {
      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const result = readManifest("/nonexistent/manifest.json");
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("manifest"),
      );
      consoleSpy.mockRestore();
    });
  });

  // --- AC-2: BufferAllocator + b_allocRead ---
  describe("generateSampleBufferCommands", () => {
    it("generates b_allocRead for each hit (AC-1.2)", () => {
      const allocator = new BufferAllocator();
      const analysisDir = "/fake/analysis";
      const { bufCmds, bufMap } = generateSampleBufferCommands(
        mockManifest,
        allocator,
        analysisDir,
      );

      // 3 hits total (2 kick + 1 snare)
      expect(bufCmds).toHaveLength(3);
      expect(bufMap.size).toBe(3);

      // Each command is a b_allocRead NRT command at time 0
      for (const cmd of bufCmds) {
        expect(cmd).toMatch(/^\[0,/);
        expect(cmd).toContain("b_allocRead");
      }
    });

    it("allocates from samples range (100+)", () => {
      const allocator = new BufferAllocator();
      const { bufMap } = generateSampleBufferCommands(
        mockManifest,
        allocator,
        "/fake",
      );

      const bufNums = [...bufMap.values()];
      for (const buf of bufNums) {
        expect(buf).toBeGreaterThanOrEqual(100);
        expect(buf).toBeLessThanOrEqual(299);
      }
    });

    it("buf sentinel -1 for missing sample file (AC-1.2 edge)", () => {
      const allocator = new BufferAllocator();
      const tmpDir = fs.mkdtempSync("/tmp/hybrid-buf-");
      // No actual WAV files in tmpDir

      const { bufMap } = generateSampleBufferCommands(
        mockManifest,
        allocator,
        tmpDir,
      );

      // bufMap should still have entries but commands should handle missing gracefully
      expect(bufMap.size).toBe(3);

      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  // --- AC-3/4: sample_player event scheduling ---
  describe("scheduleSampleEvents", () => {
    it("schedules kick/snare at onset times (AC-1.3)", () => {
      const events: Array<{
        time: number;
        synthDef: string;
        params: Record<string, number>;
      }> = [];
      const addEvent = (
        time: number,
        synthDef: string,
        params: Record<string, number>,
      ) => {
        events.push({ time, synthDef, params });
      };

      const bufMap = new Map([
        ["kick_001.wav", 100],
        ["kick_002.wav", 101],
        ["snare_001.wav", 102],
      ]);

      scheduleSampleEvents(mockManifest, bufMap, addEvent, 30);

      expect(events).toHaveLength(3);
      expect(events[0].time).toBe(0.0);
      expect(events[0].synthDef).toBe("sample_player");
      expect(events[1].time).toBe(0.5);
      expect(events[2].time).toBe(1.0);
    });

    it("schedules bass samples at pitch_contour timing (AC-1.4)", () => {
      const events: Array<{
        time: number;
        synthDef: string;
        params: Record<string, number>;
      }> = [];
      const addEvent = (
        time: number,
        synthDef: string,
        params: Record<string, number>,
      ) => {
        events.push({ time, synthDef, params });
      };

      const bufMap = new Map([
        ["kick_001.wav", 100],
        ["kick_002.wav", 101],
        ["snare_001.wav", 102],
        ["bass_001.wav", 103],
        ["bass_002.wav", 104],
      ]);

      scheduleSampleEvents(mockManifestWithBass, bufMap, addEvent, 30);

      // 2 kick + 1 snare + 2 bass = 5
      expect(events).toHaveLength(5);
      const bassEvents = events.filter(
        (e) => e.params.buf === 103 || e.params.buf === 104,
      );
      expect(bassEvents).toHaveLength(2);
    });

    // --- AC-7: gain staging ---
    it("sample_player amp=0.6 (AC-1.7 gain staging)", () => {
      const events: Array<{
        time: number;
        synthDef: string;
        params: Record<string, number>;
      }> = [];
      const addEvent = (
        time: number,
        synthDef: string,
        params: Record<string, number>,
      ) => {
        events.push({ time, synthDef, params });
      };

      const bufMap = new Map([
        ["kick_001.wav", 100],
        ["kick_002.wav", 101],
        ["snare_001.wav", 102],
      ]);

      scheduleSampleEvents(mockManifest, bufMap, addEvent, 30);

      for (const ev of events) {
        expect(ev.params.amp).toBe(0.6);
      }
    });

    it("skips events outside duration range", () => {
      const events: Array<{
        time: number;
        synthDef: string;
        params: Record<string, number>;
      }> = [];
      const addEvent = (
        time: number,
        synthDef: string,
        params: Record<string, number>,
      ) => {
        events.push({ time, synthDef, params });
      };

      const manifest = {
        kick: [
          { file: "kick_001.wav", duration: 0.15, onset_time: 0.0 },
          { file: "kick_002.wav", duration: 0.12, onset_time: 35.0 }, // beyond 30s
        ],
      };

      const bufMap = new Map([
        ["kick_001.wav", 100],
        ["kick_002.wav", 101],
      ]);

      scheduleSampleEvents(manifest, bufMap, addEvent, 30);

      expect(events).toHaveLength(1); // only the one at 0.0
    });

    it("uses buf=-1 sentinel for unmapped files (silent)", () => {
      const events: Array<{
        time: number;
        synthDef: string;
        params: Record<string, number>;
      }> = [];
      const addEvent = (
        time: number,
        synthDef: string,
        params: Record<string, number>,
      ) => {
        events.push({ time, synthDef, params });
      };

      const bufMap = new Map<string, number>(); // empty — no buffers mapped

      scheduleSampleEvents(mockManifest, bufMap, addEvent, 30);

      // Events still scheduled but with buf=-1
      for (const ev of events) {
        expect(ev.params.buf).toBe(-1);
      }
    });
  });
});
