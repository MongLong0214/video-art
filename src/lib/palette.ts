export const PALETTE_HEX = [
  "#0E2329", "#403E70", "#65341B",
  "#CA7D6E", "#D8AE9C", "#A36E23", "#DF8E2B",
  "#186785", "#179ADA", "#6DCEE5",
  "#6459C0", "#B091EA", "#968CA3",
  "#20861A", "#42C82F", "#6FDE7C", "#C5D556",
  "#C034BB", "#BD1E17", "#2EB495", "#E4E5E2",
  "#974A67", "#6B886B", "#A8DDB2",
] as const;

export function hexToVec3(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

export const PALETTE_VEC3 = PALETTE_HEX.map(hexToVec3);
