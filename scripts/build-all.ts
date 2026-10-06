import { $ } from "bun";
import * as fs from "fs";

if (!fs.existsSync("dist")) {
  fs.mkdirSync("dist", { recursive: true });
}

console.log("Building IQX CLI for multiple platforms...");

const targets = [
  { target: "bun-darwin-arm64", outfile: "dist/iqx-darwin-arm64" },
  { target: "bun-darwin-x64", outfile: "dist/iqx-darwin-x64" },
  { target: "bun-linux-x64-baseline", outfile: "dist/iqx-linux-x64" },
  { target: "bun-windows-x64-baseline", outfile: "dist/iqx-windows-x64.exe" }
];

for (const t of targets) {
  console.log("Compiling for " + t.target + " -> " + t.outfile + "...");
  try {
    await $`bun build --compile --target=${t.target} --outfile=${t.outfile} src/index.ts`;
    console.log("✔ Successfully compiled " + t.outfile);
  } catch (err: any) {
    console.error("✖ Failed for " + t.target + ": " + err.message);
  }
}
