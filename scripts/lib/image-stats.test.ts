import { describe, expect, it } from "vitest";
import { blurField } from "./image-stats.js";

describe("blurField", () => {
  it("returns one blurred value per pixel for one-channel raw input", async () => {
    const width = 100;
    const height = 50;
    const field = new Float32Array(width * height);
    for (let i = 0; i < field.length; i++) field[i] = i / Math.max(1, field.length - 1);

    const blurred = await blurField(field, width, height, 2);

    expect(blurred).toHaveLength(width * height);
  });
});
