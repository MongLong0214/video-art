/**
 * Tile 2–6 `--sketch` MP4s into one grid so Isaac picks a *language*, not a knob (00 §4).
 *
 *   npx tsx scripts/sketch-grid.ts --out out/manual-runs/<slug>/sketch-grid.mp4 \
 *     "A L1+L2 counterflow=out/layered/.../<slug>-a-sketch.mp4" \
 *     "B L1+L5 texture=out/layered/.../<slug>-b-sketch.mp4" ...
 *
 * Writes <out>.txt legend (tile → label → path). All tiles are scaled to the first tile's size.
 * No drawtext (font-path fragility); the legend is the label.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type Tile = { readonly label: string; readonly file: string };

function parse(argv: readonly string[]): { out: string; tiles: Tile[] } {
  let out: string | undefined;
  const tiles: Tile[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") {
      out = argv[++i];
      if (!out || out.startsWith("--")) throw new Error("expected path after --out");
      continue;
    }
    const eq = a.lastIndexOf("=");
    if (eq <= 0) throw new Error(`tile must be "label=path.mp4" (got ${a})`);
    tiles.push({ label: a.slice(0, eq).trim(), file: a.slice(eq + 1).trim() });
  }
  if (!out) throw new Error("--out <grid.mp4> is required");
  if (tiles.length < 2 || tiles.length > 6) throw new Error(`need 2–6 tiles (got ${tiles.length}) — one language per tile`);
  for (const t of tiles) if (!fs.existsSync(t.file)) throw new Error(`tile not found: ${t.file}`);
  return { out, tiles };
}

function probeSize(file: string): { w: number; h: number } {
  const txt = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file], { encoding: "utf8" });
  const [w, h] = txt.trim().split(",").map(Number);
  if (!w || !h) throw new Error(`ffprobe could not read size of ${file}`);
  return { w, h };
}

export function gridLayout(n: number): { cols: number; rows: number; layout: string } {
  const cols = Math.min(3, n);
  const rows = Math.ceil(n / cols);
  const cells: string[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = c === 0 ? "0" : Array.from({ length: c }, () => "w0").join("+");
    const y = r === 0 ? "0" : Array.from({ length: r }, () => "h0").join("+");
    cells.push(`${x}_${y}`);
  }
  return { cols, rows, layout: cells.join("|") };
}

function main(): void {
  const { out, tiles } = parse(process.argv.slice(2));
  const { w, h } = probeSize(tiles[0].file);
  const { cols, rows, layout } = gridLayout(tiles.length);
  const slots = cols * rows;

  const args: string[] = ["-y"];
  for (const t of tiles) args.push("-i", t.file);
  for (let i = tiles.length; i < slots; i++) args.push("-f", "lavfi", "-i", `color=c=black:s=${w}x${h}:r=12:d=6`);

  const scaled = Array.from({ length: slots }, (_, i) => `[${i}:v]scale=${w}:${h}:flags=lanczos,setsar=1[t${i}]`).join(";");
  const inputs = Array.from({ length: slots }, (_, i) => `[t${i}]`).join("");
  const filter = `${scaled};${inputs}xstack=inputs=${slots}:layout=${layout}[v]`;
  args.push("-filter_complex", filter, "-map", "[v]", "-shortest", "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out);

  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  execFileSync("ffmpeg", args, { stdio: ["ignore", "ignore", "inherit"] });

  const legend = tiles
    .map((t, i) => `tile ${i + 1} (row ${Math.floor(i / cols) + 1}, col ${(i % cols) + 1}): ${t.label} → ${t.file}`)
    .join("\n");
  fs.writeFileSync(`${out}.txt`, `${legend}\n`);
  process.stdout.write(`${out}\n${legend}\nask Isaac: which tile's *language* (not knob) — then one 1632 --preview of that tile only.\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    main();
  } catch (error: unknown) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
}
