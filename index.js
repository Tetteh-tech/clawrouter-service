// index.js
const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || 10000;

// Start ClawRouter as a child process
const clawrouter = spawn('npx', ['@blockrun/clawrouter', 'start'], {
  stdio: 'pipe',
  shell: true
});

clawrouter.stdout.on('data', (data) => console.log(data.toString()));
clawrouter.stderr.on('data', (data) => console.error(data.toString()));

// Create the proxy server
const server = http.createServer((req, res) => {
  // Log the incoming request
  console.log(`${req.method} ${req.url}`);

  // Handle the root path for Render's health checks
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ClawRouter Proxy is running');
    return;
  }

  // Prepare the options for the request to the local ClawRouter
  const options = {
    hostname: '127.0.0.1',
    port: 8402,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  // Make the request to the local ClawRouter
  const proxyReq = http.request(options, (proxyRes) => {
    // Forward the status code and headers from ClawRouter
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    // Pipe the response body back to the original client
    proxyRes.pipe(res, { end: true });
  });

  // Handle errors from the local request (e.g., ClawRouter not running)
  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Bad Gateway: ClawRouter unreachable' }));
  });

  // Pipe the request body from the client to ClawRouter
  req.pipe(proxyReq, { end: true });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`HTTP proxy listening on 0.0.0.0:${PORT}`);
});

process.on('SIGTERM', () => {
  clawrouter.kill();
  server.close();
  process.exit(0);
});