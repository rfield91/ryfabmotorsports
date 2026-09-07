import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/projects',
    // A project can be a flat `slug.md` file (no photos yet), or a
    // `slug/index.md` folder with photo files alongside it — either way
    // the page lives at /projects/slug/.
    generateId: ({ entry }) => entry.replace(/(^|\/)index\.md$/, '').replace(/\.md$/, ''),
  }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      vehicle: z.string(),
      date: z.coerce.date(),
      tags: z.array(z.string()).default([]),
      status: z.enum(['delivered', 'in-shop', 'waiting-parts']).default('delivered'),
      summary: z.string(),
      // Real photo, once one exists — a relative path to a file next to this
      // entry, e.g. `./cover.jpg` inside a `slug/index.md` folder.
      cover: image().optional(),
      // Alt text for `cover`, and the caption shown on the grey placeholder
      // box when no `cover` is set yet.
      coverAlt: z.string().default('Project photo'),
      gallery: z
        .array(z.object({ image: image(), alt: z.string().default('Project photo') }))
        .default([]),
      draft: z.boolean().default(false),
    }),
});

const products = defineCollection({
  loader: glob({
    pattern: '**/*.md',
    base: './src/content/products',
    // Same convention as projects: a flat `slug.md` file (no photos yet), or
    // a `slug/index.md` folder with photo files alongside it — either way
    // the page lives at /products/slug/.
    generateId: ({ entry }) => entry.replace(/(^|\/)index\.md$/, '').replace(/\.md$/, ''),
  }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      summary: z.string(),
      // Every product is one or more configurations — a single-item product
      // is just a `variants` list with one entry. Each variant is its own
      // Stripe Payment Link (https://dashboard.stripe.com/payment-links, no
      // code required) with its own price. The /products/ card shows
      // variants[0]'s price.
      variants: z
        .array(
          z.object({
            label: z.string(),
            price: z.string(),
            stripeLink: z.string().url(),
          })
        )
        .min(1),
      cover: image().optional(),
      coverAlt: z.string().default('Product photo'),
      gallery: z
        .array(z.object({ image: image(), alt: z.string().default('Product photo') }))
        .default([]),
      draft: z.boolean().default(false),
    }),
});

export const collections = { projects, products };
