import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export async function serveExport() {
  const root = path.resolve('dist');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/harness') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`<!doctype html><html lang="en"><head><title>Pond Dash sandbox test</title><style>body{margin:0;background:#102f32;color:#e4eddf;font:16px Arial}iframe{display:block;border:0;width:100%;height:950px}h1{font-size:16px;padding:8px}</style></head><body><h1>Opaque-origin iframe verification</h1><iframe id="game" title="Pond Dash" sandbox="allow-scripts allow-pointer-lock" src="/preview/index.html"></iframe><iframe id="stranger" title="Untrusted sibling" src="about:blank" hidden></iframe><script>window.messages=[];window.addEventListener('message',event=>{if(event.source===document.querySelector('#game').contentWindow)window.messages.push(event.data)});window.sendGame=(data)=>document.querySelector('#game').contentWindow.postMessage(data,'*');</script></body></html>`);
      return;
    }
    try {
      if (!url.pathname.startsWith('/preview/')) throw new Error('Not found');
      let file = path.resolve(root, '.' + decodeURIComponent(url.pathname.slice('/preview'.length)));
      if (!file.startsWith(root + path.sep) && file !== root) throw new Error('Not found');
      if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  return { server, url, close: () => new Promise(resolve => server.close(resolve)) };
}
