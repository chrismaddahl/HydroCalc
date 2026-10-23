import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// A self-contained IIFE avoids file:// module imports and CORS restrictions.
export default defineConfig({
  plugins: [react()],
  define: { "process.env.NODE_ENV": JSON.stringify("production") },
  build: {
    outDir: ".hydrocalc/offline-build",
    emptyOutDir: true,
    sourcemap: false,
    cssCodeSplit: false,
    minify: true,
    lib: {
      entry: "src/main.tsx",
      name: "HydroCalcOffline",
      formats: ["iife"],
      fileName: () => "hydrocalc.js",
      cssFileName: "hydrocalc",
    },
  },
});
