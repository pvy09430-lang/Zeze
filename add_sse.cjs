const fs = require('fs');
let serverCode = fs.readFileSync('server.ts', 'utf8');

const sseCode = `
// --- Server-Sent Events (SSE) for Real-Time Sync without Firestore Reads ---
const sseClients = new Set<express.Response>();

app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders(); // flush the headers to establish SSE

  // Send initial connection success
  res.write('data: {"type":"CONNECTED"}\n\n');

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

function broadcastStateUpdate() {
  const message = 'data: ' + JSON.stringify({ type: "STATE_UPDATED", timestamp: Date.now() }) + '\n\n';
  sseClients.forEach((client) => {
    try {
      client.write(message);
    } catch (e) {
      sseClients.delete(client);
    }
  });
}
`;

if (!serverCode.includes('/api/stream')) {
  serverCode = serverCode.replace(
    '  app.get("/api/state", (req, res) => {',
    sseCode + '\n  app.get("/api/state", (req, res) => {'
  );
  
  // Also add broadcastStateUpdate() to saveStateBackup or where relevant
  serverCode = serverCode.replace(
    'function saveStateBackup(state: AppState) {',
    'function saveStateBackup(state: AppState) {\n  broadcastStateUpdate(); // Real-time push to all online clients'
  );

  fs.writeFileSync('server.ts', serverCode);
}
