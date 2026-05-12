const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || 10000;  // ← Render expects 10000
const CLAWROUTER_INTERNAL_PORT = 8402;   // ← ClawRouter internal port

// Start ClawRouter
const clawrouter = spawn('npx', ['@blockrun/clawrouter', 'start'], {
  stdio: 'pipe',
  shell: true
});

clawrouter.stdout.on('data', (data) => console.log(data.toString()));
clawrouter.stderr.on('data', (data) => console.error(data.toString()));

// Create HTTP proxy
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ClawRouter Proxy is running');
    return;
  }
  
  // Forward to ClawRouter on port 8402
  const options = {
    hostname: '127.0.0.1',
    port: CLAWROUTER_INTERNAL_PORT,  // ← 8402
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end('Bad Gateway');
  });
  
  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy listening on 0.0.0.0:${PORT} -> 127.0.0.1:${CLAWROUTER_INTERNAL_PORT}`);
});

process.on('SIGTERM', () => {
  clawrouter.kill();
  server.close();
});