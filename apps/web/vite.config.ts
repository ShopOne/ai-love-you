import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoName = "ai-love-you";

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_ACTIONS ? `/${repoName}/` : "/"
});
