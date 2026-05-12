const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || 10000;

// Start ClawRouter
const clawrouter = spawn('npx', ['@blockrun/clawrouter', 'start'], {
  stdio: 'pipe',
  shell: false
});

clawrouter.stdout.on('data', (data) => {
  console.log(`[ClawRouter] ${data}`);
});

clawrouter.stderr.on('data', (data) => {
  console.error(`[ClawRouter ERROR] ${data}`);
});

// Wait a bit for ClawRouter to start
setTimeout(() => {
  console.log("Proxy starting...");
}, 5000);

// Main proxy server
const server = http.createServer((req, res) => {

  console.log(`${req.method} ${req.url}`);

  if (req.url === '/') {
    res.writeHead(200);
    return res.end('ClawRouter Proxy Running');
  }

  const options = {
    hostname: '127.0.0.1',
    port: 8402,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502);
    res.end(JSON.stringify({ error: 'ClawRouter unreachable' }));
  });

  if (req.body) req.pipe(proxyReq);
  else proxyReq.end();
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${PORT}`);
});

process.on('SIGTERM', () => {
  clawrouter.kill();
  server.close();
});