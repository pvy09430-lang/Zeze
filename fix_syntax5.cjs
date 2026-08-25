const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

code = code.replace(/const len = prevS\.bots \? prevS\.bots\.length : 0;\n  for \(let i = 0; i != len; i\+\+\) \{/g, '');
code = code.replace(/    const pb = prevS\.bots\[i\];\n    const nb = nextS\.bots\[i\];\n    if \(pb\.id !== nb\.id\) return false;\n    if \(pb\.views !== nb\.views\) return false;\n    if \(pb\.likes !== nb\.likes\) return false;\n    if \(pb\.name !== nb\.name\) return false;\n    if \(pb\.updatedAt !== nb\.updatedAt\) return false;\n    if \(getBotCommentCount\(pb\) !== getBotCommentCount\(nb\)\) return false;\n  \}/g, '');

fs.writeFileSync('src/components/AdminPanel.tsx', code);
