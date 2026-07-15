export type PhaseKind = "radial" | "luminance" | "edge" | "detail" | "vertical" | "angular";
type OutputKind = PhaseKind | "flow" | "stream" | "region";
export type FlowProfile = "coarse" | "material";

type MixTerm = {
  readonly kind: PhaseKind;
  readonly weight: number;
};

export type CliArgs = {
  readonly sourcePath: string;
  readonly workDir: string;
  readonly kinds: readonly OutputKind[];
  readonly focal?: readonly [number, number];
  readonly invert: boolean;
  readonly mix: readonly MixTerm[];
  readonly figureMaskPath?: string;
  readonly flowProfile: FlowProfile;
};

function normalizePhaseKind(value: string): PhaseKind {
  if (value === "radial" || value === "luminance" || value === "edge" || value === "detail" || value === "vertical" || value === "angular") return value;
  if (value === "edge-distance") return "edge";
  throw new Error(`unknown phase kind: ${value}`);
}

function normalizeKind(value: string): OutputKind {
  if (value === "flow") return "flow";
  if (value === "stream") return "stream";
  if (value === "region") return "region";
  return normalizePhaseKind(value);
}

function parseFocal(value: string): readonly [number, number] {
  const [xRaw, yRaw] = value.split(",");
  const x = Number(xRaw);
  const y = Number(yRaw);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error("expected --focal x,y");
  return [x, y];
}

function parseKinds(value: string | undefined): readonly OutputKind[] {
  if (!value) throw new Error("expected --kinds radial,luminance,edge,detail,vertical,angular,flow,stream,region");
  return value.split(",").filter((part) => part.length > 0).map(normalizeKind);
}

function parseMix(value: string | undefined): readonly MixTerm[] {
  if (!value) return [];
  return value.split(",").filter((part) => part.length > 0).map((term) => {
    const [kindRaw, weightRaw] = term.split(":");
    const weight = Number(weightRaw);
    if (!kindRaw || !Number.isFinite(weight) || weight < 0) throw new Error(`invalid --mix term: ${term}`);
    return { kind: normalizePhaseKind(kindRaw), weight };
  });
}

function parseFlowProfile(value: string | undefined): FlowProfile {
  if (value === "coarse" || value === "material") return value;
  throw new Error("expected --flow-profile coarse|material");
}

export function parseCli(argv: readonly string[]): CliArgs {
  const sourcePath = argv[0];
  const workDirIndex = argv.indexOf("--work-dir");
  const kindsIndex = argv.indexOf("--kinds");
  if (!sourcePath || workDirIndex === -1 || !argv[workDirIndex + 1]) {
    throw new Error("usage: npx tsx scripts/make-phase-field.ts <source.png> --work-dir <dir> --kinds radial,luminance,edge,detail,vertical,angular,flow,stream,region [--focal x,y] [--invert] [--mix radial:0.6,luminance:0.4] [--flow-profile coarse|material]");
  }
  const focalIndex = argv.indexOf("--focal");
  const mixIndex = argv.indexOf("--mix");
  const figureMaskIndex = argv.indexOf("--figure-mask");
  const flowProfileIndex = argv.indexOf("--flow-profile");
  return {
    sourcePath,
    workDir: argv[workDirIndex + 1],
    kinds: parseKinds(kindsIndex === -1 ? undefined : argv[kindsIndex + 1]),
    focal: focalIndex === -1 || !argv[focalIndex + 1] ? undefined : parseFocal(argv[focalIndex + 1]),
    invert: argv.includes("--invert"),
    mix: parseMix(mixIndex === -1 ? undefined : argv[mixIndex + 1]),
    figureMaskPath: figureMaskIndex === -1 ? undefined : argv[figureMaskIndex + 1],
    flowProfile: flowProfileIndex === -1 ? "coarse" : parseFlowProfile(argv[flowProfileIndex + 1]),
  };
}
