// index.js
const { spawn } = require('child_process');
const { createServer } = require('net');

const PORT = process.env.PORT || 10000;

// Start ClawRouter as a child process
const clawrouter = spawn('npx', ['@blockrun/clawrouter', 'start'], {
  stdio: 'inherit',
  shell: true
});

// Create a simple TCP proxy to forward traffic from 0.0.0.0:PORT to 127.0.0.1:8402
const proxy = createServer((socket) => {
  const target = require('net').createConnection(8402, '0.0.0.0', () => {
    socket.pipe(target);
    target.pipe(socket);
  });
  target.on('error', () => socket.end());
  socket.on('error', () => target.end());
});

proxy.listen(PORT, '0.0.0.0', () => {
  console.log(`Proxy listening on 0.0.0.0:${PORT} -> 127.0.0.1:8402`);
});

clawrouter.on('error', (err) => {
  console.error('Failed to start ClawRouter:', err);
  process.exit(1);
});

process.on('SIGTERM', () => {
  clawrouter.kill();
  proxy.close();
  process.exit(0);
});