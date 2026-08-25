const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const sseCode = `
app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); 
  res.write('data: {"type":"CONNECTED"}\\n\\n');

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

function broadcastStateUpdate() {
  const message = 'data: ' + JSON.stringify({ type: "STATE_UPDATED", timestamp: Date.now() }) + '\\n\\n';
  sseClients.forEach((client) => {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  });
}
`;

// Replace from 'app.get("/api/stream"' until '  app.get("/api/state"'
code = code.replace(/app\.get\("\/api\/stream"[\s\S]*?(?=  app\.get\("\/api\/state")/g, sseCode + '\n');
fs.writeFileSync('server.ts', code);
