const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex = /state\.announcements\.unshift\(newAnnouncement\);\s+saveStateBackup\(state\);\s+res\.json\(\{ success: true, state \}\);/;
const replacement = `state.announcements.unshift(newAnnouncement);
    saveStateBackup(state);
    saveMainStateToFirestoreThrottled(true);
    res.json({ success: true, state });`;

content = content.replace(regex, replacement);
fs.writeFileSync('server.ts', content, 'utf8');
console.log('Fixed announcements!');
