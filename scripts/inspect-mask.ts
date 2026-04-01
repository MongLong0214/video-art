import sharp from "sharp";

const mask = await sharp("experiment-output/diagnose/1536px-mask.png").metadata();
console.log("Mask metadata:", JSON.stringify(mask, null, 2));

const raw = await sharp("experiment-output/diagnose/1536px-mask.png").raw().toBuffer();
console.log("Raw buffer length:", raw.length);
console.log("Expected 1ch:", 861 * 1536, "3ch:", 861 * 1536 * 3, "4ch:", 861 * 1536 * 4);

// Check unique pixel values in first 100 pixels
const uniqueFirst = new Set<string>();
for (let i = 0; i < Math.min(raw.length, 300); i += (mask.channels ?? 3)) {
  const vals = [];
  for (let c = 0; c < (mask.channels ?? 3); c++) vals.push(raw[i + c]);
  uniqueFirst.add(vals.join(","));
}
console.log("Unique pixel values (first 100px):", [...uniqueFirst]);

// Count by channel
const ch = mask.channels ?? 3;
const total = raw.length / ch;
let whitePixels = 0;
for (let i = 0; i < raw.length; i += ch) {
  // SAM3 mask: white = object
  if (raw[i] > 128) whitePixels++;
}
console.log(`Channel 0 white: ${(whitePixels / total * 100).toFixed(1)}%`);

// After grayscale conversion
const gray = await sharp("experiment-output/diagnose/1536px-mask.png").grayscale().raw().toBuffer();
let grayWhite = 0;
for (let i = 0; i < gray.length; i++) if (gray[i] > 128) grayWhite++;
console.log(`After grayscale: ${(grayWhite / gray.length * 100).toFixed(1)}% white`);

// What applyMaskToImage sees (threshold 128)
const resized = await sharp("experiment-output/diagnose/1536px-mask.png").resize(861, 1536).grayscale().raw().toBuffer();
let above128 = 0;
for (let i = 0; i < resized.length; i++) if (resized[i] > 128) above128++;
console.log(`After resize+grayscale (applyMaskToImage input): ${(above128 / resized.length * 100).toFixed(1)}% > 128`);
