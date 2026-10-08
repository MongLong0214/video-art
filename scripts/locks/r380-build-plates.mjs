// r380 palm-eye-lotus lock plates. rebuild-closed-lock runs plate commands without args or env, so the chain lives here.
// Wide hold (margin 6) cuts the field-fill hole and becomes the colour ring; the tight hold (margin 2) is the still figure.
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const wd = "out/manual-runs/r380-palm-eye-lotus";
const env = { ...process.env, R379_FLOWER: "1", R379_HERO: "819,1535" }; // prepare override beam@0.502,0.527
const run = (script, ...args) => execFileSync("node", [`scripts/locks/${script}`, ...args], { stdio: "inherit", env });

run("r380-build-beam-plates.mjs");
run("r379-build-hand-hold.mjs", wd, "6");
run("r379-build-field-fill.mjs", wd);
fs.copyFileSync(`${wd}/layers/hand-hold.png`, `${wd}/layers/hand-hold-wide.png`);
run("r379-build-hand-hold.mjs", wd, "2");
run("r379-build-color-ring.mjs", wd);
run("r379-build-edge-columns.mjs", wd);
