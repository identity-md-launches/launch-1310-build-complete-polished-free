// A bounded foreground review server. It closes on interruption or after 15 minutes.
import { serveExport } from './serve.mjs';
const preview = await serveExport();
console.log(`${preview.url}/preview/`);
const timer = setTimeout(async () => { await preview.close(); }, 15 * 60 * 1000);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { clearTimeout(timer); await preview.close(); process.exit(0); });
