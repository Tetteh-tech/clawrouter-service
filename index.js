const { spawn } = require('child_process');
const http = require('http');

const PORT = process.env.PORT || 10000;

// Start ClawRouter
const clawrouter = spawn('npx', ['@blockrun/clawrouter', 'start'], {
  stdio: 'pipe',
  shell: true
});

clawrouter.stdout.on('data', (data) => console.log(`[ClawRouter] ${data}`));
clawrouter.stderr.on('data', (data) => console.error(`[ClawRouter ERR] ${data}`));

// Wait for ClawRouter to initialize (important!)
let isClawRouterReady = false;
setTimeout(() => {
  isClawRouterReady = true;
  console.log('[Proxy] ClawRouter should be ready now');
}, 8000);

// Create HTTP proxy server
const server = http.createServer((req, res) => {
  console.log(`[Proxy] ${req.method} ${req.url}`);
  
  // Handle root health check for Render
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ClawRouter Proxy is running');
    return;
  }
  
  // Handle /health endpoint
  if (req.url === '/health') {
    const healthReq = http.request({
      hostname: '127.0.0.1',
      port: 8402,
      path: '/health',
      method: 'GET',
    }, (healthRes) => {
      res.writeHead(healthRes.statusCode, healthRes.headers);
      healthRes.pipe(res, { end: true });
    });
    healthReq.on('error', (err) => {
      console.error(`[Proxy] Health check failed: ${err.message}`);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ClawRouter unavailable' }));
    });
    healthReq.end();
    return;
  }
  
  // For all other requests (including /v1/chat/completions)
  let body = '';
  
  req.on('data', chunk => {
    body += chunk;
  });
  
  req.on('end', () => {
    const options = {
      hostname: '127.0.0.1',
      port: 8402,
      path: req.url,
      method: req.method,
      headers: {
        ...req.headers,
        'Content-Length': Buffer.byteLength(body),
        'Connection': 'close'
      }
    };
    
    const proxyReq = http.request(options, (proxyRes) => {
      let responseBody = '';
      proxyRes.on('data', chunk => responseBody += chunk);
      proxyRes.on('end', () => {
        console.log(`[Proxy] Response status: ${proxyRes.statusCode}`);
        res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
        res.end(responseBody);
      });
    });
    
    proxyReq.on('error', (err) => {
      console.error(`[Proxy] Forward error: ${err.message}`);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'ClawRouter request failed', details: err.message }));
    });
    
    proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[Proxy] Listening on 0.0.0.0:${PORT} -> 127.0.0.1:8402`);
});

process.on('SIGTERM', () => {
  clawrouter.kill();
  server.close();
  process.exit(0);
});