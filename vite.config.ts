import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";
import { resolve } from "path";

export default defineConfig({
  plugins: [glsl()],
  publicDir: process.env.VITE_PUBLIC_DIR || "public",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    open: true,
  },
});
