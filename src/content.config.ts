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

export const collections = { projects };
