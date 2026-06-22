// @ts-check
import { defineConfig } from "astro/config";
import { unified } from "@astrojs/markdown-remark";

import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import remarkGfm from "remark-gfm";

export default defineConfig({
  site: "https://rentsomehash.com",
  trailingSlash: "ignore",
  integrations: [react()],
  markdown: {
    processor: unified({
      remarkPlugins: [remarkGfm],
    }),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
