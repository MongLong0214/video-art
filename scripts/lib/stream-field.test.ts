import { describe, expect, it } from "vitest";
import { buildIntegratedStreamField, type MaterialFlow } from "./stream-field.js";

function constantVerticalFlow(width: number, height: number): MaterialFlow {
  const total = width * height;
  return {
    tangentX: new Float32Array(total),
    tangentY: new Float32Array(total).fill(1),
    coherence: new Float32Array(total).fill(1),
  };
}

function phaseDistance(
  field: Buffer,
  width: number,
  x: number,
  firstY: number,
  secondY: number,
): number {
  const firstOffset = (firstY * width + x) * 3;
  const secondOffset = (secondY * width + x) * 3;
  const firstX = field[firstOffset] / 255 * 2 - 1;
  const firstYValue = field[firstOffset + 1] / 255 * 2 - 1;
  const secondX = field[secondOffset] / 255 * 2 - 1;
  const secondYValue = field[secondOffset + 1] / 255 * 2 - 1;
  const firstLength = Math.hypot(firstX, firstYValue);
  const secondLength = Math.hypot(secondX, secondYValue);
  const cosine = (firstX * secondX + firstYValue * secondYValue) /
    Math.max(firstLength * secondLength, 1e-6);

  return Math.acos(Math.min(1, Math.max(-1, cosine)));
}

describe("buildIntegratedStreamField", () => {
  it("advances a full-size aligned material stream through the interior", () => {
    const width = 384;
    const height = 768;
    const field = buildIntegratedStreamField(constantVerticalFlow(width, height), width, height);

    const difference = phaseDistance(field, width, width / 2, height / 2, height / 2 + 48);

    expect(difference).toBeGreaterThan(1);
  });
});
