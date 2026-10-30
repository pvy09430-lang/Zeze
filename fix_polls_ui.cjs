const fs = require('fs');
let content = fs.readFileSync('src/components/UserPanel.tsx', 'utf8');

const target = `{/* ACTIVE POLLS CONTAINER REMOVED */}
        {false && (`;
const replacement = `{state.polls && state.polls.length > 0 && (`

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('src/components/UserPanel.tsx', content, 'utf8');
    console.log('Fixed UI in UserPanel.tsx');
} else {
    console.log('Target not found in UserPanel.tsx');
}
