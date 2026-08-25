const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Convert handleUpdateLocalState to a hoisted function
code = code.replace(
  "const handleUpdateLocalState = (newState: AppState) => {",
  "function handleUpdateLocalState(newState: AppState) {"
);

// Replace setState(data) in fetchState with handleUpdateLocalState(data)
// Find the one after setting local storage counters
code = code.replace(
  /localStorage\.setItem\("portal_prev_reply_count", totalReplies\.toString\(\)\);\n\s*setState\(data\);/g,
  'localStorage.setItem("portal_prev_reply_count", totalReplies.toString());\n      handleUpdateLocalState(data);'
);

fs.writeFileSync('src/App.tsx', code);
