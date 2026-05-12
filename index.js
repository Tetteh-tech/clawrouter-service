// index.js
const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || 10000;

// Start ClawRouter as a child process
const clawrouter = spawn('npx', ['@blockrun/clawrouter', 'start'], {
  stdio: 'pipe',
  shell: true
});

// Forward ClawRouter's output to console
clawrouter.stdout.on('data', (data) => console.log(data.toString()));
clawrouter.stderr.on('data', (data) => console.error(data.toString()));

// Create an HTTP proxy server
const server = http.createServer((req, res) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  // Handle root path for health checks
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ClawRouter Proxy is running\n');
    return;
  }
  
  // Proxy all other requests to ClawRouter
  const options = {
    hostname: '127.0.0.1',
    port: 8402,
    path: req.url,
    method: req.method,
    headers: req.headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway: Unable to reach ClawRouter');
  });
  
  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP proxy listening on 0.0.0.0:${PORT}`);
});

clawrouter.on('error', (err) => {
  console.error('Failed to start ClawRouter:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  clawrouter.kill();
  server.close();
  process.exit(0);
});