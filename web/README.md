# Rent Some Hash

Static Astro site for `rentsomehash.com`, deployed with Cloudflare Workers static assets.

## Commands

- `npm install`
- `npm run dev`
- `npm run check`
- `npm run build`
- `npm run deploy`

## Content

Editorial content lives outside the Astro app in repo-root `/content`:

- `content/pages/home.md`
- `content/guides/braiins-ocean.md`
- `content/guides/startos.md`

`web/src/content.config.ts` loads those files with Astro content collections.
