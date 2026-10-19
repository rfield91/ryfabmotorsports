// Usage: bun run new-project <photos.zip | photos-folder> [--title ... --vehicle ... --date ... --tags ... --status ... --summary ...]
// Any field not passed as a flag is prompted for. See README.md "Adding a project".
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_DIR, createAsker, loadPhotos, parseArgs, photoSummary, slugify, writePhotos, yamlString } from './lib';

const STATUSES = ['delivered', 'in-shop', 'waiting-parts'];

const { flags, source } = parseArgs(process.argv.slice(2));
const { files, cleanup } = loadPhotos(source);

const { ask, close } = createAsker(flags);
const today = new Date().toISOString().slice(0, 10);
const title = await ask('title', 'Title (e.g. "GLTC Spec RX8 Aero")');
const vehicle = await ask('vehicle', 'Vehicle (e.g. "Mazda RX8, LFX Swap")');
const date = await ask('date', 'Date (YYYY-MM-DD)', today);
const tagsRaw = await ask('tags', 'Tags, comma separated (Fabrication, Wiring, Setup)', 'Fabrication');
const status = await ask('status', `Status (${STATUSES.join(' | ')})`, 'delivered');
const summary = await ask('summary', 'One-sentence summary');
close();

const problems: string[] = [];
if (!title) problems.push('title is required');
if (!vehicle) problems.push('vehicle is required');
if (!summary) problems.push('summary is required');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push('date must be YYYY-MM-DD');
if (!STATUSES.includes(status)) problems.push(`status must be one of: ${STATUSES.join(', ')}`);
const slug = slugify(title);
if (!slug) problems.push('title must contain letters or numbers');
const projectDir = join(CONTENT_DIR, 'projects', slug);
if (slug && (existsSync(projectDir) || existsSync(`${projectDir}.md`))) problems.push(`a project named "${slug}" already exists`);
if (problems.length) {
  cleanup();
  console.error(`\n${problems.map((p) => `- ${p}`).join('\n')}`);
  process.exit(1);
}

const tags = tagsRaw
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

mkdirSync(projectDir, { recursive: true });
const names = await writePhotos(files, projectDir);

const frontmatter = [
  '---',
  `title: ${yamlString(title)}`,
  `vehicle: ${yamlString(vehicle)}`,
  `date: ${date}`,
  `tags: [${tags.map(yamlString).join(', ')}]`,
  `status: ${status}`,
  `summary: ${yamlString(summary)}`,
  `cover: ./${names[0]}`,
  'coverAlt: "TODO: describe the cover photo"',
  'gallery:',
  ...names.flatMap((n, i) => [`  - image: ./${n}`, `    alt: "TODO: describe photo ${i + 1}"`]),
  'draft: true # remove this line (or set to false) to publish',
  '---',
  '',
  'TODO: write about the job — what the customer wanted, what you built, and anything interesting about it.',
  '',
  '## What was done',
  '',
  '- TODO',
  '',
].join('\n');

writeFileSync(join(projectDir, 'index.md'), frontmatter);
cleanup();

console.log(`\nCreated src/content/projects/${slug}/ with ${photoSummary(names.length)}.`);
console.log('\nNext:');
console.log(`  1. Open src/content/projects/${slug}/index.md`);
console.log('  2. Replace every TODO: alt text for each photo, and the write-up. Reorder or delete gallery entries as needed.');
console.log('  3. Remove the "draft: true" line to publish, then commit.');
console.log('\nUntil step 3, the project is a draft and will not appear on the site.');
