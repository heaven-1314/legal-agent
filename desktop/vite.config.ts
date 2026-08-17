import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  base: "./",
  plugins: [react()],
  build: { outDir: "dist" },
  server: { port: 5174, strictPort: true },
});
