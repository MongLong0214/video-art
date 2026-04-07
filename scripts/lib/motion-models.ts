/**
 * Motion model definitions — maps CLI model names to Replicate IDs and parameters.
 * Follows existing pipeline-pro.ts constant pattern (BRIA_MODEL, FLUX_FILL_MODEL).
 */

export interface MotionModelConfig {
  replicateId: string;
  defaultDuration: number; // seconds
  supportsLastFrame: boolean;
  promptSuffix: string;
  imageInputKey: "image" | "first_frame"; // model-specific image parameter name
  lastFrameKey?: string; // model-specific last-frame parameter name
}

const MOTION_MODELS: Record<string, MotionModelConfig> = {
  "wan-2.2": {
    replicateId: "wan-video/wan-2.2-i2v-fast",
    defaultDuration: 5,
    supportsLastFrame: false,
    promptSuffix: ", high quality, smooth motion",
    imageInputKey: "image",
  },
  "veo-3.1": {
    replicateId: "google/veo-3.1",
    defaultDuration: 8,
    supportsLastFrame: true,
    promptSuffix: "",
    imageInputKey: "image",
    lastFrameKey: "last_frame",
  },
  "seedance": {
    replicateId: "bytedance/seedance-1-pro",
    defaultDuration: 5,
    supportsLastFrame: true,
    promptSuffix: "",
    imageInputKey: "image",
    lastFrameKey: "last_frame_image",
  },
};

export function getMotionModel(name: string): MotionModelConfig {
  const config = MOTION_MODELS[name];
  if (!config) {
    const valid = Object.keys(MOTION_MODELS).join(", ");
    throw new Error(`Unknown motion model "${name}". Valid: ${valid}`);
  }
  return config;
}

export function getValidMotionModelNames(): string[] {
  return Object.keys(MOTION_MODELS);
}

/**
 * Generate i2v prompt based on layer role.
 */
export function generateMotionPrompt(
  role: string | undefined,
  intensity: "low" | "medium" | "high",
): string {
  const intensityMap = {
    low: "very subtle, barely perceptible",
    medium: "gentle, subtle",
    high: "noticeable, flowing",
  };

  const motionDesc = intensityMap[intensity];

  const rolePrompts: Record<string, string> = {
    "background-plate": `${motionDesc} wind through foliage, gentle cloud movement, soft ripples, static camera`,
    "background": `${motionDesc} atmospheric movement, gentle drift, static camera`,
    "subject": `${motionDesc} breathing motion, slight natural sway, static camera`,
    "foreground-occluder": `${motionDesc} movement, slight motion, static camera`,
  };

  return rolePrompts[role ?? "background-plate"] ?? rolePrompts["background-plate"];
}

export const TARGET_DURATION_SEC = 8;
export const TARGET_FPS = 24;
export const TARGET_FRAMES = TARGET_DURATION_SEC * TARGET_FPS; // 192
