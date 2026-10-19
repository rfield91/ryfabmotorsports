// Usage: bun run new-product <photos.zip | photos-folder> [--name ... --summary ... --variant "Label|$230|https://buy.stripe.com/..." (repeatable)]
// Any field not passed as a flag is prompted for. See README.md "Adding a product".
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONTENT_DIR, createAsker, loadPhotos, parseArgs, photoSummary, slugify, writePhotos, yamlString } from './lib';

const STRIPE_PLACEHOLDER = 'https://buy.stripe.com/TODO';

const formatPrice = (raw: string) => {
  if (!/\d/.test(raw)) return '';
  const n = Number(raw.replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? `$${n.toFixed(2)}` : '';
};

const { flags, source } = parseArgs(process.argv.slice(2));
const { files, cleanup } = loadPhotos(source);

const { ask, close } = createAsker(flags);
const name = await ask('name', 'Product name (e.g. "RX8 Hood Vents")');
const summary = await ask('summary', 'One-sentence summary (shown on the page and in search results)');

const variants: { label: string; price: string; stripeLink: string }[] = [];
if (flags.variant) {
  for (const v of flags.variant) {
    const [label = '', price = '', link = ''] = v.split('|').map((s) => s.trim());
    variants.push({ label, price: formatPrice(price), stripeLink: link || STRIPE_PLACEHOLDER });
  }
} else if (process.stdin.isTTY) {
  console.log('\nEvery product has one or more variants (configurations). A single-item product has just one.');
  do {
    const n = variants.length + 1;
    const label = await ask(`label${n}`, `Variant ${n} label (e.g. "Uprights Only")`);
    const price = formatPrice(await ask(`price${n}`, `Variant ${n} price (e.g. 230)`));
    const link = await ask(`link${n}`, `Variant ${n} Stripe Payment Link (blank to fill in later)`);
    variants.push({ label, price, stripeLink: link || STRIPE_PLACEHOLDER });
  } while ((await ask('more', 'Add another variant? (y/N)', 'n')).toLowerCase().startsWith('y'));
}
close();

const problems: string[] = [];
if (!name) problems.push('name is required');
if (!summary) problems.push('summary is required');
if (variants.length === 0) problems.push('at least one variant is required (--variant "Label|230|https://buy.stripe.com/...")');
variants.forEach((v, i) => {
  if (!v.label) problems.push(`variant ${i + 1}: label is required`);
  if (!v.price) problems.push(`variant ${i + 1}: price must be a number, e.g. 230`);
  if (!/^https:\/\/\S+$/.test(v.stripeLink)) problems.push(`variant ${i + 1}: Stripe link must be an https:// URL`);
});
const slug = slugify(name);
if (!slug) problems.push('name must contain letters or numbers');
const productDir = join(CONTENT_DIR, 'products', slug);
if (slug && (existsSync(productDir) || existsSync(`${productDir}.md`))) problems.push(`a product named "${slug}" already exists`);
if (problems.length) {
  cleanup();
  console.error(`\n${problems.map((p) => `- ${p}`).join('\n')}`);
  process.exit(1);
}

mkdirSync(productDir, { recursive: true });
const names = await writePhotos(files, productDir);

const frontmatter = [
  '---',
  `name: ${yamlString(name)}`,
  `summary: ${yamlString(summary)}`,
  'variants:',
  ...variants.flatMap((v) => [
    `  - label: ${yamlString(v.label)}`,
    `    price: "${v.price}"`,
    `    stripeLink: ${v.stripeLink}`,
  ]),
  `cover: ./${names[0]}`,
  'coverAlt: "TODO: describe the cover photo"',
  'gallery:',
  ...names.flatMap((n, i) => [`  - image: ./${n}`, `    alt: "TODO: describe photo ${i + 1}"`]),
  'draft: true # remove this line (or set to false) to publish',
  '---',
  '',
  'TODO: one or two sentences on what this is and why it is built the way it is.',
  '',
  "## What's included",
  '',
  '- TODO',
  '',
  '## What you need',
  '',
  '- TODO',
  '',
].join('\n');

writeFileSync(join(productDir, 'index.md'), frontmatter);
cleanup();

const needsLinks = variants.some((v) => v.stripeLink === STRIPE_PLACEHOLDER);
console.log(`\nCreated src/content/products/${slug}/ with ${photoSummary(names.length)}.`);
console.log('\nNext:');
console.log(`  1. Open src/content/products/${slug}/index.md`);
console.log('  2. Replace every TODO: alt text for each photo, the description, and the lists. Reorder or delete gallery entries as needed.');
if (needsLinks) console.log(`  3. Replace ${STRIPE_PLACEHOLDER} with the real Stripe Payment Link for each variant that needs one.`);
console.log(`  ${needsLinks ? 4 : 3}. Remove the "draft: true" line to publish, then commit.`);
console.log('\nUntil then, the product is a draft and will not appear on the site.');
