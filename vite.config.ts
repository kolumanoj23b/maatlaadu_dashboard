// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { fileURLToPath } from "node:url";

// Deploying outside Lovable? Name your platform with NITRO_PRESET when you build,
// e.g. NITRO_PRESET=node-server npm run build for your own server or container.
// Left unset, the build keeps Lovable's default target.
const nitroPreset = process.env['NITRO_PRESET'];

export default defineConfig({
  tanstackStart: {
    srcDirectory: "src",
    router: {
      enableRouteGeneration: true,
      // Start resolves these paths relative to srcDirectory, not the project root.
      routesDirectory: "routes",
      generatedRouteTree: "routeTree.gen.ts",
      // The generator uses atomic rename. Its temporary files must share the
      // output filesystem; a different cwd or TSR_TMP_DIR can otherwise cause
      // EXDEV, which the plugin logs before continuing with a missing tree.
      tmpDir: fileURLToPath(new URL("./.tanstack/tmp", import.meta.url)),
    },
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  ...(nitroPreset ? { nitro: { preset: nitroPreset } } : {}),
});
