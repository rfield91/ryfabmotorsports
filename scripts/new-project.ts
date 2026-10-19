// Usage: bun run new-project <photos.zip | photos-folder> [--title ... --vehicle ... --date ... --tags ... --status ... --summary ...]
// Any field not passed as a flag is prompted for. See README.md "Adding a project".
import { existsSync, mkdirSync, readdirSync, statSync, writeFileSync, readFileSync, rmSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { unzipSync } from 'fflate';
import sharp from 'sharp';

sharp.cache(false);

const PROJECTS_DIR = resolve(import.meta.dir, '../src/content/projects');
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const STATUSES = ['delivered', 'in-shop', 'waiting-parts'];
const MAX_WIDTH = 2400;

function parseArgs(argv: string[]) {
  const flags: Record<string, string> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i] ?? '';
    else positional.push(argv[i]);
  }
  return { flags, source: positional[0] };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const naturalSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

function yamlString(s: string) {
  return /^[\w][\w .,'()/+\-]*$/.test(s) && !/^(true|false|null|yes|no)$/i.test(s) && !/:\s/.test(s)
    ? s
    : JSON.stringify(s);
}

function collectImages(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...collectImages(full));
    else if (IMAGE_EXT.test(name) && !name.startsWith('.')) out.push(full);
  }
  return out;
}

const { flags, source } = parseArgs(process.argv.slice(2));

if (!source) {
  console.error('Usage: bun run new-project <photos.zip | photos-folder>');
  process.exit(1);
}
const sourcePath = resolve(source);
if (!existsSync(sourcePath)) {
  console.error(`Not found: ${sourcePath}`);
  process.exit(1);
}

let tempDir: string | null = null;
let photoFiles: string[];

if (statSync(sourcePath).isDirectory()) {
  photoFiles = collectImages(sourcePath);
} else if (extname(sourcePath).toLowerCase() === '.zip') {
  tempDir = mkdtempSync(join(tmpdir(), 'ryfab-photos-'));
  const entries = unzipSync(new Uint8Array(readFileSync(sourcePath)), {
    filter: (f) => IMAGE_EXT.test(f.name) && !basename(f.name).startsWith('.') && !f.name.includes('__MACOSX'),
  });
  photoFiles = Object.entries(entries).map(([name, data]) => {
    const target = join(tempDir!, basename(name));
    writeFileSync(target, data);
    return target;
  });
} else {
  console.error('Source must be a .zip file or a folder of photos.');
  process.exit(1);
}

photoFiles.sort((a, b) => naturalSort(basename(a), basename(b)));
if (photoFiles.length === 0) {
  console.error('No .jpg, .png, or .webp photos found in that source.');
  process.exit(1);
}
console.log(`Found ${photoFiles.length} photo${photoFiles.length === 1 ? '' : 's'}.`);

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = async (key: string, label: string, fallback = '') => {
  if (flags[key] !== undefined) return flags[key].trim();
  if (!process.stdin.isTTY) return fallback;
  const answer = (await rl.question(fallback ? `${label} [${fallback}]: ` : `${label}: `)).trim();
  return answer || fallback;
};

const today = new Date().toISOString().slice(0, 10);
const title = await ask('title', 'Title (e.g. "GLTC Spec RX8 Aero")');
const vehicle = await ask('vehicle', 'Vehicle (e.g. "Mazda RX8, LFX Swap")');
const date = await ask('date', 'Date (YYYY-MM-DD)', today);
const tagsRaw = await ask('tags', 'Tags, comma separated (Fabrication, Wiring, Setup)', 'Fabrication');
const status = await ask('status', `Status (${STATUSES.join(' | ')})`, 'delivered');
const summary = await ask('summary', 'One-sentence summary');
rl.close();

const problems: string[] = [];
if (!title) problems.push('title is required');
if (!vehicle) problems.push('vehicle is required');
if (!summary) problems.push('summary is required');
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) problems.push('date must be YYYY-MM-DD');
if (!STATUSES.includes(status)) problems.push(`status must be one of: ${STATUSES.join(', ')}`);
const slug = slugify(title);
if (!slug) problems.push('title must contain letters or numbers');
const projectDir = join(PROJECTS_DIR, slug);
if (slug && (existsSync(projectDir) || existsSync(`${projectDir}.md`))) problems.push(`a project named "${slug}" already exists`);
if (problems.length) {
  console.error(`\n${problems.map((p) => `- ${p}`).join('\n')}`);
  process.exit(1);
}

const tags = tagsRaw
  .split(',')
  .map((t) => t.trim())
  .filter(Boolean);

mkdirSync(projectDir, { recursive: true });

const names: string[] = [];
for (const [i, file] of photoFiles.entries()) {
  const name = `photo-${String(i + 1).padStart(2, '0')}.jpg`;
  await sharp(file)
    .rotate()
    .resize({ width: MAX_WIDTH, withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toFile(join(projectDir, name));
  names.push(name);
}

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
if (tempDir) {
  try {
    rmSync(tempDir, { recursive: true, force: true });
  } catch {
    // Windows can still hold the files briefly; the OS temp folder gets cleaned up eventually.
  }
}

console.log(`\nCreated src/content/projects/${slug}/ with ${names.length} photo${names.length === 1 ? '' : 's'} (resized to max ${MAX_WIDTH}px wide).`);
console.log('\nNext:');
console.log(`  1. Open src/content/projects/${slug}/index.md`);
console.log('  2. Replace every TODO: alt text for each photo, and the write-up. Reorder or delete gallery entries as needed.');
console.log('  3. Remove the "draft: true" line to publish, then commit.');
console.log('\nUntil step 3, the project is a draft and will not appear on the site.');
