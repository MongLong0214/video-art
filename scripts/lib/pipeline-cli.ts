/**
 * CLI argument parsing for pipeline-pro.
 */

const VALID_MOTION_MODELS = ["wan-2.2", "veo-3.1", "seedance"] as const;
type MotionModel = (typeof VALID_MOTION_MODELS)[number];

const VALID_MOTION_INTENSITIES = ["low", "medium", "high"] as const;
type MotionIntensity = (typeof VALID_MOTION_INTENSITIES)[number];

export interface PipelineCliArgs {
  inputPath: string;
  duration?: number;
  production: boolean;
  prores?: boolean;
  fps?: number;
  workDir?: string;
  motion: boolean;
  motionModel: MotionModel;
  motionIntensity: MotionIntensity;
  skipFlow: boolean;
}

export function parseCliArgs(argv: string[]): PipelineCliArgs {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const inputPath = positional[0] ?? "";

  // --duration N
  let duration: number | undefined;
  const durIdx = argv.indexOf("--duration");
  if (durIdx !== -1 && durIdx + 1 < argv.length) {
    const val = parseInt(argv[durIdx + 1], 10);
    if (Number.isNaN(val) || val < 1 || val > 300) {
      throw new Error(`Invalid --duration value. Must be 1-300 (integer).`);
    }
    duration = val;
  }

  // --production
  const production = argv.includes("--production");

  // --prores
  const prores = argv.includes("--prores");

  // --fps N
  let fps: number | undefined;
  const fpsIdx = argv.indexOf("--fps");
  if (fpsIdx !== -1 && fpsIdx + 1 < argv.length) {
    const val = parseInt(argv[fpsIdx + 1], 10);
    if (Number.isNaN(val) || val < 1 || val > 120) {
      throw new Error(`Invalid --fps value. Must be 1-120 (integer).`);
    }
    fps = val;
  }

  // --work-dir <path>
  let workDir: string | undefined;
  const wdIdx = argv.indexOf("--work-dir");
  if (wdIdx !== -1 && wdIdx + 1 < argv.length) {
    workDir = argv[wdIdx + 1];
  }

  // --motion
  const motion = argv.includes("--motion");

  // --motion-model <model>
  let motionModel: MotionModel = "wan-2.2";
  const mmIdx = argv.indexOf("--motion-model");
  if (mmIdx !== -1 && mmIdx + 1 < argv.length) {
    const val = argv[mmIdx + 1];
    if (!VALID_MOTION_MODELS.includes(val as MotionModel)) {
      throw new Error(
        `Invalid --motion-model "${val}". Valid: ${VALID_MOTION_MODELS.join(", ")}`,
      );
    }
    motionModel = val as MotionModel;
  }

  // --motion-intensity <level>
  let motionIntensity: MotionIntensity = "medium";
  const miIdx = argv.indexOf("--motion-intensity");
  if (miIdx !== -1 && miIdx + 1 < argv.length) {
    const val = argv[miIdx + 1];
    if (!VALID_MOTION_INTENSITIES.includes(val as MotionIntensity)) {
      throw new Error(
        `Invalid --motion-intensity "${val}". Valid: ${VALID_MOTION_INTENSITIES.join(", ")}`,
      );
    }
    motionIntensity = val as MotionIntensity;
  }

  // --skip-flow
  const skipFlow = argv.includes("--skip-flow");

  return {
    inputPath,
    duration,
    production,
    prores,
    fps,
    workDir,
    motion,
    motionModel,
    motionIntensity,
    skipFlow,
  };
}
