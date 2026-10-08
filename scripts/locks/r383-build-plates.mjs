// r383 mushroom-hand lock plates (v10d, zero motion). rebuild-closed-lock runs plate commands without args or env, so the
// chain lives here: the tight hold (margin 1, bodies=1) seeds phase-elements (one colour clock per drawn element), and the
// source luminance at blur 4 is the prism's phaseField2 (colour bands follow the drawing's own detail).
import { execFileSync } from "node:child_process";

const wd = "out/manual-runs/r383-mushroom-hand";
const run = (script, ...args) => execFileSync("node", [`scripts/locks/${script}`, ...args], { stdio: "inherit" });

run("r383-build-hand-hold.mjs", wd, "1", "1");
run("r383-build-element-phase.mjs", wd);
run("r383-build-luma-phase.mjs", wd, "4");
