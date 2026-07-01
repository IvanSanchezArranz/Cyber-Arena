import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "./", // Compiles using relative paths so assets load correctly on GitHub Pages subfolder
  server: {
    port: 3000,
    host: true
  }
});
