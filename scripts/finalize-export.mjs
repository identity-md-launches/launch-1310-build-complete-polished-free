import { readFile, writeFile } from 'node:fs/promises';
// Vite bundles one IIFE with no runtime imports. A classic deferred script also
// works in opaque-origin iframes on hosts that provide no CORS headers.
const file = new URL('../dist/index.html', import.meta.url);
const html = await readFile(file, 'utf8');
const final = html.replace(/<script type="module" crossorigin /g, '<script defer ').replace(/ crossorigin(?=\s|>)/g, '');
if (final.includes('type="module"')) throw new Error('Unexpected module script in static export');
await writeFile(file, final);
console.log('Finalized portable classic-script export.');
