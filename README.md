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

## Adding a product

Same pattern as projects, in `src/content/products/` — a flat `slug.md` file for a product with
no photos yet, or a `slug/index.md` folder with photos alongside it. Turns into a page at
`/products/<slug>/` and a card on `/products/`.

Every product is a `variants` list — even a plain product with nothing to configure is just a list
with one entry. Each variant is its own [Stripe Payment Link](https://dashboard.stripe.com/payment-links)
(create one per variant in the Stripe dashboard, no code) with its own label and price:

```md
---
name: Product name
summary: One or two sentences shown on the card and in the page's meta description.
variants:
  - label: Standard
    price: "$45.00"
    stripeLink: https://buy.stripe.com/xxxxxxxxxxxx
cover: ./cover.jpg
coverAlt: What the cover photo shows
gallery:
  - image: ./detail.jpg
    alt: What this photo shows
---

Body copy in markdown — what it is, what it's made of, sizing, whatever's relevant.
```

The `/products/` card shows the first variant's price. Set `draft: true` to keep a product out of
the build while it's still being written.

**Multiple configurations of the same product** (e.g. with/without an add-on, or a choice of
bracket type) — just add more entries to `variants`, each with its own label, price, and Stripe
Payment Link:

```md
---
name: Wing uprights
summary: One or two sentences.
variants:
  - label: Wing uprights only
    price: "$100.00"
    stripeLink: https://buy.stripe.com/xxxxxxxxxxxx
  - label: Wing uprights + E423 mounting brackets
    price: "$140.00"
    stripeLink: https://buy.stripe.com/yyyyyyyyyyyy
  - label: Wing uprights + MSHD mounting brackets
    price: "$150.00"
    stripeLink: https://buy.stripe.com/zzzzzzzzzzzz
---
```

With one variant, the product page just shows that variant's label, price, and a "Buy now" button.
With more than one, it shows a select instead — picking an option updates the "Buy now" link to
that variant's Payment Link.

## Development

Uses [Bun](https://bun.sh) instead of npm.

```bash
bun install
bun run dev      # http://localhost:4321
bun run build    # outputs static site to ./dist/
bun run preview  # serve the production build locally
```

## Contact form

The form on `/contact/` submits to **[Formspree](https://formspree.io)** — no backend code, works
on any static host (Vercel, Netlify, GitHub Pages, etc.).

The endpoint comes from the `FORMSPREE_ENDPOINT` environment variable (read in
`src/pages/contact.astro`), with a hardcoded testing form as the fallback if it's unset — so the
site still builds and the form still works with zero config. This isn't hiding a secret (the
endpoint is visible in the page's HTML either way); it's so different environments can point at
different Formspree forms — e.g. a real business inbox in production, a throwaway form for
preview/local builds so test submissions don't land in the real inbox.

- **Local dev**: copy `.env.example` to `.env` and set `FORMSPREE_ENDPOINT` there. `.env` is
  gitignored — never commit it.
- **Vercel**: set `FORMSPREE_ENDPOINT` under Project Settings → Environment Variables, scoped to
  the Production environment (with the real business form) and/or Preview (with the testing form).
  Since this is a static build, the value is baked in at build time — changing it requires a
  redeploy.

A small inline script progressively enhances the form: it submits via `fetch` and redirects to
the branded `/contact/success/` page on success, or shows an inline error (with a `mailto:`
fallback) if the request fails. With JavaScript disabled, the form still submits as a plain POST
and lands on Formspree's own confirmation page instead.

Spam protection is a hidden `_gotcha` honeypot field (Formspree's convention — bots that fill
every field get silently rejected). Submissions also set `_subject` for the notification email's
subject line. The form markup and fields live in `src/pages/contact.astro`.

Formspree's free tier covers 50 submissions/month, which should be well above what a contact
form like this sees.

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
## Structure

```
src/
├── content/
│   ├── projects/          one markdown file (or folder) per project
│   ├── products/          one markdown file (or folder) per product
│   └── config lives in src/content.config.ts
├── components/            Header, Footer, Logotype
├── layouts/BaseLayout.astro
├── pages/
│   ├── index.astro        landing page
│   ├── contact.astro      quote request form
│   ├── contact/success.astro
│   ├── projects/
│   │   ├── index.astro    project grid
│   │   └── [slug].astro   one page per project, generated from the content collection
│   └── products/
│       ├── index.astro    product grid
│       └── [slug].astro   one page per product, generated from the content collection
└── styles/
    ├── tokens/             design tokens (colors, type, spacing, elevation, motion)
    └── global.css          base styles + reusable classes (buttons, cards, forms, etc.)
```
