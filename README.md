# RyFab Motorsports — website

Static marketing site: landing page, projects log, and a quote-request contact form. Built with
[Astro](https://astro.build) (static output, no client-side framework) using the RyFab Motorsports
design system (School Bus Yellow, Barlow Condensed/Barlow/Space Mono, zinc neutrals).

## Adding a project

Every project is one markdown file. The build turns it into its own page at `/projects/<slug>/`
and adds it to the `/projects/` grid and the homepage's "Recent projects" strip automatically. No
other file needs to change — just add the project and commit.

**No photos yet?** Drop a single file straight into `src/content/projects/`:

```md
---
title: Project name — short description
vehicle: Year, make, model, engine
date: 2026-03-01
tags: [Street, Fabrication]
status: delivered # delivered | in-shop | waiting-parts
summary: One or two sentences, shown on the card and in the page's meta description.
coverAlt: Caption shown on the grey placeholder box, e.g. "Camaro — engine bay before teardown"
---

Body copy in markdown. Use `## headings`, bullet lists, and a `| |` table for a spec block —
see the sample projects in `src/content/projects/` for the pattern this site's styling expects.
```

That renders a labelled grey placeholder wherever a photo would go.

**Have photos?** Give the project its own folder instead, with the write-up as `index.md` and the
photos alongside it:

```
src/content/projects/
  1969-camaro-driveline-rebuild/
    index.md
    cover.jpg
    bay-before.jpg
    bay-after.jpg
```

```md
---
title: 1969 Camaro — driveline rebuild
vehicle: 1969 Chevrolet Camaro, LS3
date: 2026-03-01
tags: [Street, Repair]
status: delivered
summary: Full driveline rebuild after a track day let go.
cover: ./cover.jpg
coverAlt: 1969 Camaro on the lift with the driveline pulled
gallery:
  - image: ./bay-before.jpg
    alt: Engine bay before teardown
  - image: ./bay-after.jpg
    alt: Engine bay after the rebuild
---

Body copy...
```

`cover` is the photo shown at the top of the project page and on its card in `/projects/` and the
homepage strip. `gallery` is an optional list of additional photos shown further down the project
page. Both are optimized automatically at build time (resized, converted to modern formats) —
just use whatever a phone camera produces; no manual resizing or compression needed. The project's
folder name becomes its URL slug, exactly like the filename does for a photo-less project.

Set `draft: true` in the frontmatter to keep a project out of the build while it's still being
written.

## Development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs static site to ./dist/
npm run preview  # serve the production build locally
```

## Contact form

The form on `/contact/` is wired for **Netlify Forms** (`data-netlify="true"`, a hidden
`form-name` field, and a `bot-field` honeypot) — this needs zero backend code, but only works
when the site is deployed on Netlify. On submit it redirects to `/contact/success/`.

If you deploy anywhere else (Vercel, GitHub Pages, Cloudflare Pages, your own server), the form
will not submit anywhere until you either:

- swap it for a third-party form service (e.g. [Formspree](https://formspree.io) — change the
  form's `action` to your Formspree endpoint and drop the `data-netlify`/`netlify-honeypot`
  attributes), or
- add a real backend endpoint and point `action` at it.

The form markup and fields live in `src/pages/contact.astro`.

## What's still a placeholder

This is a V1/MVP build. Before it goes in front of a customer:

- **No logo** — the header/footer use a type-only wordmark (`src/components/Logotype.astro`).
  Replace it when real artwork exists.
- **No photography yet** — see "Adding a project" above for how to attach real photos once they
  exist. Until then, every image slot is a labelled grey box.
- **No phone number, address, or hours are advertised anywhere** — the shop is appointment-only
  with no fixed hours, by design. The only published contact points are the form on `/contact/`,
  email (`ryan@ryfabmotorsports.com`), and Instagram (`@ryfabmotorsports`), set in
  `src/components/Footer.astro` and `src/pages/contact.astro`.
- **Sample projects are fictional** — the three files in `src/content/projects/` are examples of
  the format, not real jobs. Replace or delete them.

## Structure

```
src/
├── content/
│   ├── projects/         one markdown file per project
│   └── config lives in src/content.config.ts
├── components/            Header, Footer, Logotype
├── layouts/BaseLayout.astro
├── pages/
│   ├── index.astro        landing page
│   ├── contact.astro      quote request form
│   ├── contact/success.astro
│   └── projects/
│       ├── index.astro    project grid
│       └── [slug].astro   one page per project, generated from the content collection
└── styles/
    ├── tokens/             design tokens (colors, type, spacing, elevation, motion)
    └── global.css          base styles + reusable classes (buttons, cards, forms, etc.)
```
