import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  target: "node20",
  clean: true,
  sourcemap: false,
  outDir: "dist",
});
