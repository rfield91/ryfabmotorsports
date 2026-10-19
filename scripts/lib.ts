import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, extname, join, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { unzipSync } from 'fflate';
import sharp from 'sharp';

sharp.cache(false);

const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;
const MAX_WIDTH = 2400;

export const CONTENT_DIR = resolve(import.meta.dir, '../src/content');

export function parseArgs(argv: string[]) {
  const flags: Record<string, string[]> = {};
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) (flags[argv[i].slice(2)] ??= []).push(argv[++i] ?? '');
    else positional.push(argv[i]);
  }
  return { flags, source: positional[0] };
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function yamlString(s: string) {
  return /^[\w][\w .,'()/+\-]*$/.test(s) && !/^(true|false|null|yes|no)$/i.test(s) && !/:\s/.test(s)
    ? s
    : JSON.stringify(s);
}

export function createAsker(flags: Record<string, string[]>) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = async (key: string, label: string, fallback = '') => {
    if (flags[key] !== undefined) return flags[key][0].trim();
    if (!process.stdin.isTTY) return fallback;
    const answer = (await rl.question(fallback ? `${label} [${fallback}]: ` : `${label}: `)).trim();
    return answer || fallback;
  };
  return { ask, close: () => rl.close() };
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

const naturalSort = (a: string, b: string) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

export function loadPhotos(source: string | undefined) {
  if (!source) {
    console.error('Missing photos: pass a .zip file or a folder of photos.');
    process.exit(1);
  }
  const sourcePath = resolve(source);
  if (!existsSync(sourcePath)) {
    console.error(`Not found: ${sourcePath}`);
    process.exit(1);
  }

  let tempDir: string | null = null;
  let files: string[];

  if (statSync(sourcePath).isDirectory()) {
    files = collectImages(sourcePath);
  } else if (extname(sourcePath).toLowerCase() === '.zip') {
    const dir = (tempDir = mkdtempSync(join(tmpdir(), 'ryfab-photos-')));
    const entries = unzipSync(new Uint8Array(readFileSync(sourcePath)), {
      filter: (f) => IMAGE_EXT.test(f.name) && !basename(f.name).startsWith('.') && !f.name.includes('__MACOSX'),
    });
    files = Object.entries(entries).map(([name, data]) => {
      const target = join(dir, basename(name));
      writeFileSync(target, data);
      return target;
    });
  } else {
    console.error('Source must be a .zip file or a folder of photos.');
    process.exit(1);
  }

  files.sort((a, b) => naturalSort(basename(a), basename(b)));
  if (files.length === 0) {
    console.error('No .jpg, .png, or .webp photos found in that source.');
    process.exit(1);
  }
  console.log(`Found ${files.length} photo${files.length === 1 ? '' : 's'}.`);

  const cleanup = () => {
    if (!tempDir) return;
    try {
      rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Windows can still hold the files briefly; the OS temp folder gets cleaned up eventually.
    }
  };

  return { files, cleanup };
}

export async function writePhotos(files: string[], destDir: string) {
  const names: string[] = [];
  for (const [i, file] of files.entries()) {
    const name = `photo-${String(i + 1).padStart(2, '0')}.jpg`;
    await sharp(file)
      .rotate()
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toFile(join(destDir, name));
    names.push(name);
  }
  return names;
}

export const photoSummary = (n: number) => `${n} photo${n === 1 ? '' : 's'} (resized to max ${MAX_WIDTH}px wide)`;
