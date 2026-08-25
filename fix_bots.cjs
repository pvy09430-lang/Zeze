const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  /app\.delete\("\/api\/bots\/:id"[\s\S]*?firestoreDelete\("bots", id\)\.catch\(console\.error\);\n\s*res\.json\(\{ success: true, state \}\);\n\s*\}\s*else/,
  match => {
    return match.replace("saveStateBackup(state);", "saveStateBackup(state);\n      saveMainStateToFirestoreThrottled(true);");
  }
);
fs.writeFileSync('server.ts', code);
