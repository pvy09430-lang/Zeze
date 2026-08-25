const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

code = code.replace(/for \(let i = 0; i < \(prevS\.bots \? prevS\.bots\.length : 0\); i\+\+\) \{/g, 'const len = prevS.bots ? prevS.bots.length : 0;\n  for (let i = 0; i < len; i++) {');

fs.writeFileSync('src/components/AdminPanel.tsx', code);
