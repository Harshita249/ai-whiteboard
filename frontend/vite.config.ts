import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",        // important for hosted builds so assets are relative
  build: { outDir: "dist" },
});
