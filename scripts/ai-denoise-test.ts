import "dotenv/config";
import Replicate from "replicate";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const frames = ["/tmp/buddha-frames/frame_0001.png", "/tmp/buddha-frames/frame_0030.png", "/tmp/buddha-frames/frame_0060.png"];
  const outDir = "/tmp/buddha-ai-denoised";
  fs.mkdirSync(outDir, { recursive: true });

  for (const frame of frames) {
    const buf = fs.readFileSync(frame);
    const dataUri = "data:image/png;base64," + buf.toString("base64");
    const name = path.basename(frame);
    console.log("Processing:", name);
    
    const output = await replicate.run(
      "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
      { input: { image: dataUri, scale: 2, face_enhance: false } }
    );
    const url = String(output);
    const resp = await fetch(url);
    const outBuf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(path.join(outDir, name), outBuf);
    console.log("  Done:", name, outBuf.length, "bytes");
  }
  console.log("AI denoise test complete");
}
main().catch(e => { console.error(e); process.exit(1); });
