const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "        setState(data);\n        handleUpdateLocalState(data);",
  "        handleUpdateLocalState(data);"
);

fs.writeFileSync('src/App.tsx', code);
