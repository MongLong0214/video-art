// r381 tree-woman field-take plates (r380 chain). rebuild-closed-lock runs plate commands without args or env.
// Wide hold (margin 6) cuts the field-fill hole and becomes the colour ring; the tight hold (margin 2) is the still
// figure, punched last at the belly swirl so the hero travels on layer 0.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const wd = "out/manual-runs/r381-tree-woman-field";
const env = { ...process.env, R379_HERO: "808,1596" }; // prepare override beam@0.495,0.548
const run = (script, ...args) => execFileSync("node", [`scripts/locks/${script}`, ...args], { stdio: "inherit", env });

run("r381-build-beam-plates.mjs");
run("r381-build-tree-hold.mjs", wd, "6", "0");
run("r379-build-field-fill.mjs", wd);
fs.copyFileSync(`${wd}/layers/hand-hold.png`, `${wd}/layers/hand-hold-wide.png`);
run("r381-build-tree-hold.mjs", wd, "2", "0");
run("r379-build-color-ring.mjs", wd);
run("r381-build-tree-hold.mjs", wd, "2", "1");
