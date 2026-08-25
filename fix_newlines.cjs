const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace("res.write('data: {\"type\":\"CONNECTED\"}');", "res.write('data: {\"type\":\"CONNECTED\"}\\n\\n');");

// Let's find the broadcastStateUpdate broken string
code = code.replace(
  "const message = 'data: ' + JSON.stringify({ type: \"STATE_UPDATED\", timestamp: Date.now() }) + '", 
  "const message = 'data: ' + JSON.stringify({ type: \"STATE_UPDATED\", timestamp: Date.now() }) + '\\n\\n';"
);

fs.writeFileSync('server.ts', code);
