const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// We will add a force parameter to saveMainStateToFirestoreThrottled
code = code.replace(
  "function saveMainStateToFirestoreThrottled() {",
  "function saveMainStateToFirestoreThrottled(force = false) {"
);

code = code.replace(
  "  if (now - lastMainStateSyncTime < 2 * 60 * 1000) {",
  "  if (!force && now - lastMainStateSyncTime < 2 * 60 * 1000) {"
);

// We will also export it or make sure it's accessible.
// Now, find all delete routes and force save.
// 1. app.delete("/api/bots/:id"
code = code.replace(
  /app\.delete\("\/api\/bots\/:id"[\s\S]*?res\.json\(\{ success: true \}\);\n\s*\}\n\s*\}\)/,
  match => {
    return match.replace("saveStateBackup(state);", "saveStateBackup(state);\n      saveMainStateToFirestoreThrottled(true);");
  }
);

// 2. app.delete("/api/announcements/:id"
code = code.replace(
  /app\.delete\("\/api\/announcements\/:id"[\s\S]*?res\.json\(\{ success: true, state \}\);\n\s*\}\s*else/,
  match => {
    return match.replace("saveStateBackup(state);", "saveStateBackup(state);\n      saveMainStateToFirestoreThrottled(true);");
  }
);

// 3. app.delete("/api/polls/:id"
code = code.replace(
  /app\.delete\("\/api\/polls\/:id"[\s\S]*?res\.json\(\{ success: true, state \}\);\n\s*\}\s*else/,
  match => {
    return match.replace("saveStateBackup(state);", "saveStateBackup(state);\n      saveMainStateToFirestoreThrottled(true);");
  }
);

fs.writeFileSync('server.ts', code);
