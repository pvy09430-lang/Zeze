const fs = require('fs');
const state = JSON.parse(fs.readFileSync('db.json', 'utf8'));
const database = require('./firestore_dump.json');

console.log("Restoring Bot Requests...");
state.botRequests = database.botRequests || [];
console.log(`Restored ${state.botRequests.length} bot requests.`);

fs.writeFileSync('db.json', JSON.stringify(state, null, 2));
