import * as fs from "node:fs";
import * as path from "node:path";
import Replicate from "replicate";

const DEMUCS_MODEL = "cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953";
const TIMEOUT_MS = 300_000;
const MAX_RETRIES = 1;

const STEM_NAMES = ["drums", "bass", "other"] as const;

export const separate = async (
  inputPath: string,
  outDir: string,
): Promise<{ drums: string; bass: string; other: string }> => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN not set. Export it or add to .env");
  }

  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`Input file not found: ${resolvedInput}`);
  }

  const stemsDir = path.join(outDir, "stems");
  fs.mkdirSync(stemsDir, { recursive: true });

  const replicate = new Replicate({ auth: token });

  let output: Record<string, string> | null = null;
  let lastError: Error | null = null;

  // Upload file to Replicate (handles large files)
  console.log("Uploading audio to Replicate...");
  const fileData = fs.readFileSync(resolvedInput);
  const uploadedFile = await replicate.files.create(
    new Blob([fileData]),
    { filename: path.basename(resolvedInput) },
  );
  const fileUrl = uploadedFile.urls.get;
  console.log(`Uploaded: ${fileUrl}`);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await Promise.race([
        replicate.run(DEMUCS_MODEL, {
          input: { audio: fileUrl },
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Demucs timeout after ${TIMEOUT_MS}ms`)), TIMEOUT_MS),
        ),
      ]);

      output = result as Record<string, string>;
      break;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) {
        console.warn(`Demucs attempt ${attempt + 1} failed: ${lastError.message}. Retrying...`);
      }
    }
  }

  if (!output) {
    throw new Error(`Demucs failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`);
  }

  const paths: Record<string, string> = {};

  await Promise.all(STEM_NAMES.map(async (stem) => {
    const url = output[stem];
    if (!url) {
      throw new Error(`Demucs response missing '${stem}' stem URL`);
    }

    const stemPath = path.join(stemsDir, `${stem}.wav`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download ${stem} stem: HTTP ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(stemPath, buffer);
    paths[stem] = stemPath;
  }));

  // Discard vocals if present
  const vocalsPath = path.join(stemsDir, "vocals.wav");
  if (fs.existsSync(vocalsPath)) {
    fs.unlinkSync(vocalsPath);
  }

  console.log(`Stems saved: ${STEM_NAMES.map((s) => paths[s]).join(", ")}`);

  return {
    drums: paths.drums,
    bass: paths.bass,
    other: paths.other,
  };
};
