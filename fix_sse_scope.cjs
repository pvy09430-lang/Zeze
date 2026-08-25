const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Remove from inside startServer
code = code.replace(/const sseClients = new Set<express\.Response>\(\);\n/g, '');
code = code.replace(/function broadcastStateUpdate\(\) \{[\s\S]*?\}\n/g, '');

// Prepend to top level
const topLevelSse = `
const sseClients = new Set<express.Response>();

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

code = code.replace(/import express from "express";/, topLevelSse + '\nimport express from "express";');

fs.writeFileSync('server.ts', code);
