import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    vehicle: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    status: z.enum(['delivered', 'in-shop', 'waiting-parts']).default('delivered'),
    summary: z.string(),
    cover: z.string().default('Project photo'),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects };
