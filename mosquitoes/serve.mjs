import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const requestedPort = Number(process.env.PORT || 8080);
// Port 0 asks Windows to assign any currently available ephemeral port.
const fallbackPorts = [...new Set([requestedPort, 4173, 3000, 5173, 0])];
const root = dirname(fileURLToPath(import.meta.url));
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
};

const server = createServer(async (request, response) => {
  try {
    let pathname = normalize(decodeURIComponent(request.url.split('?')[0]));
    if (pathname === '/' || pathname === '\\') pathname = '/index.html';
    const file = join(root, pathname.replace(/^[/\\]+/, ''));
    if (!file.startsWith(root)) throw new Error('Invalid path');
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end('Not found');
  }
});

let portIndex = 0;
function listen() {
  const port = fallbackPorts[portIndex];
  server.listen(port, '127.0.0.1');
}

server.on('listening', () => {
  const address = server.address();
  console.log(`Mosquito viewer: http://127.0.0.1:${address.port}`);
});

server.on('error', (error) => {
  if ((error.code === 'EACCES' || error.code === 'EADDRINUSE') && portIndex < fallbackPorts.length - 1) {
    const blockedPort = fallbackPorts[portIndex++];
    const nextPort = fallbackPorts[portIndex];
    console.log(`Port ${blockedPort} is unavailable; ${nextPort === 0 ? 'asking Windows for a free port' : `trying ${nextPort}`}…`);
    listen();
    return;
  }
  throw error;
});

listen();
