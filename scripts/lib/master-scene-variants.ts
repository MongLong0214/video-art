import fs from "node:fs";
import path from "node:path";
import { sceneSchema } from "../../src/lib/scene-schema.js";
import { portalFeedbackFor } from "./master-motion.js";
import { CAMERA_DRIFT_OFF, STRUCTURE_FLOW_OFF } from "./master-structure-rules.js";
import type { CameraDriftParams, PhaseKind, StructureFlowParams } from "./master-derivation.js";
import type { MotionTier } from "./master-motion.js";

type SceneVariantLayer = Record<string, unknown> & {
  readonly id: unknown;
  readonly animation: Record<string, unknown>;
};

type SceneVariantDraft = Record<string, unknown> & {
  readonly layers: SceneVariantLayer[];
  readonly effects: Record<string, unknown>;
};

type StructuralVariantOptions = {
  readonly camera: boolean;
  readonly flow: boolean;
  readonly portal: boolean;
};

type StructuralVariantInput = {
  readonly scene: unknown;
  readonly cameraDrift: CameraDriftParams;
  readonly structureFlow: StructureFlowParams;
  readonly portalFeedback: boolean;
  readonly motionTier: MotionTier;
  readonly options: StructuralVariantOptions;
};

type PortalFeedbackUpdate = {
  readonly enabled: boolean;
  readonly portalFeedback: boolean;
  readonly motionTier: MotionTier;
};

export type SceneVariantsInput = {
  readonly workDir: string;
  readonly scene: unknown;
  readonly cameraDrift: CameraDriftParams;
  readonly structureFlow: StructureFlowParams;
  readonly portalFeedback: boolean;
  readonly motionTier: MotionTier;
};

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSceneVariantLayer(value: unknown): value is SceneVariantLayer {
  return isRecord(value) && isRecord(value.animation);
}

function isSceneVariantDraft(value: unknown): value is SceneVariantDraft {
  return isRecord(value) && Array.isArray(value.layers) && value.layers.every(isSceneVariantLayer) && isRecord(value.effects);
}

function cloneSceneDraft(scene: unknown): SceneVariantDraft {
  const draft: unknown = JSON.parse(JSON.stringify(scene));
  if (!isSceneVariantDraft(draft)) {
    throw new Error("generated scene did not match the expected variant draft shape");
  }
  return draft;
}

export function phaseOutputKinds(phaseKinds: readonly PhaseKind[], structureFlow: StructureFlowParams): readonly string[] {
  const outputKinds: string[] = [...phaseKinds];
  if (structureFlow.strength > 0 && !outputKinds.includes("flow")) outputKinds.push("flow");
  return outputKinds;
}

function setCameraDrift(scene: SceneVariantDraft, enabled: boolean, cameraDrift: CameraDriftParams): void {
  const active = enabled && cameraDrift.radius > 0;
  scene.effects.cameraDrift = active ? { ...cameraDrift } : { ...CAMERA_DRIFT_OFF };
  for (const layer of scene.layers) {
    if (active) {
      layer.animation.depthField = "layers/depth.png";
    } else {
      delete layer.animation.depthField;
    }
  }
}

function setStructureFlow(scene: SceneVariantDraft, enabled: boolean, structureFlow: StructureFlowParams): void {
  const active = enabled && structureFlow.strength > 0;
  for (const layer of scene.layers) {
    if (active && (layer.id === "body" || layer.id === "edge")) {
      layer.animation.flowField = "layers/flow-field.png";
      layer.animation.structureFlow = { ...structureFlow };
    } else {
      delete layer.animation.flowField;
      delete layer.animation.structureFlow;
    }
  }
}

function setPortalFeedback(scene: SceneVariantDraft, update: PortalFeedbackUpdate): void {
  scene.effects.multipassFeedback = portalFeedbackFor(update.enabled && update.portalFeedback, update.motionTier);
}

function makeStructuralVariant(input: StructuralVariantInput): SceneVariantDraft {
  const draft = cloneSceneDraft(input.scene);
  setCameraDrift(draft, input.options.camera, input.cameraDrift);
  setStructureFlow(draft, input.options.flow, input.structureFlow);
  setPortalFeedback(draft, { enabled: input.options.portal, portalFeedback: input.portalFeedback, motionTier: input.motionTier });
  sceneSchema.parse(draft);
  return draft;
}

export function writeSceneVariants(input: SceneVariantsInput): readonly string[] {
  const variants: readonly { readonly fileName: string; readonly options: StructuralVariantOptions }[] = [
    { fileName: "scene-base.json", options: { camera: false, flow: false, portal: false } },
    { fileName: "scene-A.json", options: { camera: true, flow: false, portal: false } },
    { fileName: "scene-B.json", options: { camera: false, flow: true, portal: false } },
    { fileName: "scene-C.json", options: { camera: false, flow: false, portal: true } },
  ];
  for (const variant of variants) {
    writeJson(path.join(input.workDir, variant.fileName), makeStructuralVariant({ ...input, options: variant.options }));
  }
  return variants.map((variant) => variant.fileName);
}
