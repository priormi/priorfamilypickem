import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/priorfamilypickem/",
  plugins: [react()],
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "jsdom",
    globals: true
  }
});
