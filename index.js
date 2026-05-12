const { spawn } = require('child_process');
const http = require('http');

// Render provides PORT, default to 10000
const PORT = process.env.PORT || 10000;

// Start ClawRouter process
const clawrouter = spawn('npx', ['@blockrun/clawrouter', 'start'], {
  stdio: 'pipe',
  shell: true
});

clawrouter.stdout.on('data', (data) => console.log(data.toString()));
clawrouter.stderr.on('data', (data) => console.error(data.toString()));

// Give ClawRouter time to initialize (increase to 10 seconds)
setTimeout(() => {
  console.log('ClawRouter process should be ready');
}, 10000);

// Create a simple HTTP proxy that forwards ALL requests to ClawRouter
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // For health checks at root
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  
  // Forward everything else to ClawRouter on port 8402
  const options = {
    hostname: '127.0.0.1',
    port: 8402,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('ClawRouter unavailable');
  });
  
  req.pipe(proxyReq);
});

// Bind to 0.0.0.0 and the Render PORT
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy listening on 0.0.0.0:${PORT}`);
});

// Handle cleanup on exit
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  clawrouter.kill();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  clawrouter.kill();
  server.close(() => {
    process.exit(0);
  });
});