const fs = require('fs');
let content = fs.readFileSync('src/components/UserPanel.tsx', 'utf8');

const target = 'Share2\n  TrendingUp\n} from "lucide-react";';
const replacement = 'Share2,\n  TrendingUp\n} from "lucide-react";';

content = content.replace(target, replacement);
fs.writeFileSync('src/components/UserPanel.tsx', content, 'utf8');
console.log('Patched imports again!');
