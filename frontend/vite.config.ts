import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./", // ensure assets are relative for backend single-host deploy
  build: { outDir: "dist" },
});
