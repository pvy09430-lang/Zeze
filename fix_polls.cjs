const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex1 = /saveStateBackup\(state\);\s+res\.json\(\{ success: true, poll: newPoll, state \}\);/;
const replacement1 = `saveStateBackup(state);
    saveMainStateToFirestoreThrottled(true);
    res.json({ success: true, poll: newPoll, state });`;
content = content.replace(regex1, replacement1);

const regex2 = /saveStateBackup\(state\);\s+res\.json\(\{ success: true, poll, state \}\);/g;
const replacement2 = `saveStateBackup(state);
    saveMainStateToFirestoreThrottled(true);
    res.json({ success: true, poll, state });`;
content = content.replace(regex2, replacement2);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Fixed polls!');
