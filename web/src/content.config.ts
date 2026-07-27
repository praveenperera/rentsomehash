import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const pages = defineCollection({
  loader: glob({
    base: "../content/pages",
    pattern: "**/*.md",
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    eyebrow: z.string(),
    primaryCtaLabel: z.string(),
    primaryCtaHref: z.string(),
    secondaryCtaLabel: z.string(),
    secondaryCtaHref: z.string(),
    highlights: z.array(
      z.object({
        title: z.string(),
        body: z.string(),
      }),
    ),
    warnings: z.array(
      z.object({
        title: z.string(),
        body: z.string(),
      }),
    ),
  }),
});

const guideMetadata = {
  title: z.string(),
  description: z.string(),
  slug: z.string(),
  order: z.number().int(),
  summary: z.string(),
  navLabel: z.string(),
  setupType: z.string(),
  eyebrow: z.string(),
  featured: z.boolean().default(false),
  updated: z.string(),
};

const guides = defineCollection({
  loader: glob({
    base: "../content/guides",
    pattern: "**/*.md",
    generateId: ({ data, entry }) =>
      typeof data.slug === "string" ? data.slug : entry.replace(/\.md$/, ""),
  }),
  schema: z.discriminatedUnion("stage", [
    z.object({
      ...guideMetadata,
      stage: z.literal("node"),
    }),
    z.object({
      ...guideMetadata,
      stage: z.literal("hashpower"),
      provider: z.enum(["pickhash", "braiins"]),
      approach: z.string(),
      bestFor: z.string(),
      tradeoffs: z.array(z.string()).min(1),
    }),
  ]),
});

export const collections = { pages, guides };
