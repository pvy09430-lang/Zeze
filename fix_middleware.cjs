const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We can add a middleware that checks if we need to flush views or main state.
// Actually, it's safer to just tell the user about the CPU suspension in Cloud Run.
