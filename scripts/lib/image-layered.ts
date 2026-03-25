import Replicate from "replicate";
import fs from "node:fs";
import path from "node:path";

function getToken(): string {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    throw new Error(
      "REPLICATE_API_TOKEN is not set. Add it to .env file.\n" +
        "Get your token at https://replicate.com/account/api-tokens",
    );
  }
  return token;
}

export interface LayerOptions {
  numLayers?: number;
  description?: string;
  outputFormat?: "png" | "webp" | "jpg";
  goFast?: boolean;
  seed?: number | null;
  disableSafetyChecker?: boolean;
  outputQuality?: number;
}

export interface LayerResult {
  urls: string[];
  count: number;
}

export async function decomposeImage(
  imagePath: string,
  options: LayerOptions = {},
): Promise<LayerResult> {
  const {
    numLayers = 4,
    description = "auto",
    outputFormat = "png",
    goFast = true,
    seed = null,
    disableSafetyChecker = true,
    outputQuality = 95,
  } = options;

  const replicate = new Replicate({ auth: getToken() });

  const imageData = fs.readFileSync(imagePath);
  const ext = path.extname(imagePath).toLowerCase().replace(".", "");
  const mimeMap: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  const mime = mimeMap[ext] || "image/png";
  const dataUri = `data:${mime};base64,${imageData.toString("base64")}`;

  let output: unknown[];
  try {
    output = (await replicate.run("qwen/qwen-image-layered", {
      input: {
        image: dataUri,
        num_layers: numLayers,
        description,
        output_format: outputFormat,
        output_quality: outputQuality,
        go_fast: goFast,
        disable_safety_checker: disableSafetyChecker,
        ...(seed !== null && { seed }),
      },
    })) as unknown[];
  } catch (err: unknown) {
    if (err instanceof Error) {
      const msg = err.message;
      if (msg.includes("401") || msg.includes("Unauthorized")) {
        throw new Error(
          "Replicate API authentication failed (401). Check your REPLICATE_API_TOKEN.",
        );
      }
      if (msg.includes("402")) {
        throw new Error(
          "Replicate API: Insufficient credit (402). Add credit at https://replicate.com/account/billing",
        );
      }
      if (msg.includes("429") || msg.includes("rate")) {
        throw new Error(
          "Replicate API rate limit reached (429). Please wait and try again.",
        );
      }
      if (msg.includes("500") || msg.includes("Internal")) {
        throw new Error("Replicate API server error (500). Try again later.");
      }
    }
    throw err;
  }

  const urls = output.map((item) => {
    if (typeof item === "string") return item;
    if (item && typeof item === "object" && "url" in item) {
      const urlVal = (item as Record<string, unknown>).url;
      if (typeof urlVal === "function") return urlVal() as string;
      if (typeof urlVal === "string") return urlVal;
    }
    return String(item);
  });

  return { urls, count: urls.length };
}

export async function downloadLayers(
  urls: string[],
  outputDir: string,
): Promise<string[]> {
  fs.mkdirSync(outputDir, { recursive: true });

  const files: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const res = await fetch(urls[i]);
    if (!res.ok) {
      throw new Error(
        `Failed to download layer ${i}: ${res.status} ${res.statusText} (${urls[i]})`,
      );
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const filePath = path.join(outputDir, `layer-${i}.png`);
    fs.writeFileSync(filePath, buf);
    files.push(filePath);
  }

  return files;
}
