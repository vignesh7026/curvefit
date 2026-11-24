import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["cjs"],
  target: "node20",
  clean: true,
  // The shared package ships as TypeScript source, so bundle it into the API build.
  noExternal: ["@curvefit/shared"],
});
