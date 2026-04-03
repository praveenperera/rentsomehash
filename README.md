# Rent Some Hash

Static Astro site for `rentsomehash.com`.

The site is split into:

- `content/` for editorial content
- `web/` for the Astro app, styling, and Cloudflare deployment code

## How To Change Content

### Homepage

Most homepage content lives in [`content/pages/home.md`](./content/pages/home.md).

That file controls:

- page title and meta description
- eyebrow text
- primary and secondary CTA labels and links
- the highlight cards
- the warnings accordion
- the body copy below the hero buttons

The homepage schema is defined in [`web/src/content.config.ts`](./web/src/content.config.ts). If you add new frontmatter fields, update the schema too.

Important: the large hero headline is currently hardcoded in [`web/src/pages/index.astro`](./web/src/pages/index.astro), along with a few small UI labels like section headings and some summary text. Editing `home.md` will not change those strings.

### Guides

Each guide is a Markdown file in [`content/guides/`](./content/guides).

Current guides:

- [`content/guides/braiins-ocean.md`](./content/guides/braiins-ocean.md)
- [`content/guides/startos.md`](./content/guides/startos.md)
- [`content/guides/umbrel.md`](./content/guides/umbrel.md)

Each guide needs frontmatter that matches the guides schema in [`web/src/content.config.ts`](./web/src/content.config.ts):

- `title`
- `description`
- `slug`
- `order`
- `kind`
- `summary`
- `navLabel`
- `routeType`
- `eyebrow`
- `featured`
- `updated`

Guide body content is regular Markdown below the frontmatter.

### Add A New Guide

1. Create a new Markdown file in [`content/guides/`](./content/guides)
2. Add all required frontmatter fields
3. Pick a unique `slug`
4. Set `order` to control the list order
5. Run `just check`

The guide route is generated from the `slug` field, so a guide with `slug: foo` becomes `/guides/foo/`.

### Reorder Guides

Edit the `order` field in each guide file. Guides are sorted numerically in [`web/src/lib/content.ts`](./web/src/lib/content.ts).

### Change Navigation Labels Or Fixed UI Copy

Guide navigation and footer labels are content-driven:

- edit the `navLabel` field in the relevant guide frontmatter under [`content/guides/`](./content/guides/) to change how that guide appears in the header and footer

Some other content is intentionally still code-owned:

- homepage hero headline and several section labels in [`web/src/pages/index.astro`](./web/src/pages/index.astro)
- guide page labels like `Main route`, `Home node`, and `Related guide` in [`web/src/pages/guides/[slug].astro`](./web/src/pages/guides/[slug].astro)

If you want those to become editable content instead of code edits, the content schema would need to be expanded first.

## General Info

- Framework: Astro
- Deployment target: Cloudflare Workers static assets
- Package manager: `npm`
- Node version: `22.12.0+` from [`.node-version`](./.node-version)
- Main local workflow: use the top-level [`justfile`](./justfile)

## Repo Layout

- [`content/pages/home.md`](./content/pages/home.md): homepage content and frontmatter
- [`content/guides/`](./content/guides): guide pages
- [`web/src/content.config.ts`](./web/src/content.config.ts): content schema
- [`web/src/pages/index.astro`](./web/src/pages/index.astro): homepage layout and some hardcoded copy
- [`web/src/pages/guides/[slug].astro`](./web/src/pages/guides/[slug].astro): guide page layout
- [`web/src/components/Header.astro`](./web/src/components/Header.astro): top navigation
- [`web/src/components/Footer.astro`](./web/src/components/Footer.astro): footer links

## Local Commands

Run these from the repo root:

- `just install` to install dependencies
- `just dev` to start the Astro dev server
- `just check` to run Astro checks
- `just build` to build the site
- `just deploy` to deploy to Cloudflare
- `just preview <subdomain>` to upload a preview build

If you want to work directly inside `web/`, the equivalent commands are in [`web/package.json`](./web/package.json).

## Deployment Notes

- Cloudflare config lives in [`web/wrangler.toml`](./web/wrangler.toml)
- The Worker entrypoint is [`web/worker.js`](./web/worker.js)
- `just deploy` builds first, then deploys

## Verification

After content or code changes, run at least:

- `just check`
- `just build`
