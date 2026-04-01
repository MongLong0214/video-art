import "dotenv/config";
import Replicate from "replicate";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

async function main() {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
  const layersDir = path.join(process.cwd(), "public", "layers");
  const files = ["layer-0.png", "layer-1.png"];

  for (const file of files) {
    const filePath = path.join(layersDir, file);
    const buf = fs.readFileSync(filePath);
    const meta = await sharp(buf).metadata();
    console.log(`${file}: ${meta.width}x${meta.height} → upscaling 2x...`);

    const dataUri = "data:image/png;base64," + buf.toString("base64");
    const output = await replicate.run(
      "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
      { input: { image: dataUri, scale: 2, face_enhance: false } }
    );
    const url = String(output);
    const resp = await fetch(url);
    const upBuf = Buffer.from(await resp.arrayBuffer());

    // Resize back to original resolution (cleaner than raw upscale artifact)
    const targetW = meta.width!;
    const targetH = meta.height!;
    const finalBuf = await sharp(upBuf).resize(targetW, targetH, { kernel: "lanczos3" }).png().toBuffer();
    
    // Backup original
    fs.copyFileSync(filePath, filePath + ".bak");
    fs.writeFileSync(filePath, finalBuf);

    const finalMeta = await sharp(finalBuf).metadata();
    console.log(`  → ${finalMeta.width}x${finalMeta.height} (upscaled 2x then downscaled back = super-resolution denoise)`);
  }
  console.log("\nDone. Layers enhanced.");
}
main().catch(e => { console.error(e); process.exit(1); });
