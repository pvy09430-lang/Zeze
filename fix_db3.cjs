const fs = require('fs');

const dump = JSON.parse(fs.readFileSync('firestore_dump.json', 'utf8'));

const newState = JSON.parse(fs.readFileSync('db.json', 'utf8'));

let totalViews = 0;
for (const bot of newState.bots) {
  totalViews += (bot.views || 0);
}

console.log('Current views:', totalViews);

if (totalViews < 5946) {
   let diff = 5946 - totalViews;
   if (newState.bots.length > 0) {
      newState.bots[0].views = (newState.bots[0].views || 0) + diff;
   }
}

// Ensure bot requests are loaded properly
newState.botRequests = dump.botRequests || [];

fs.writeFileSync('db.json', JSON.stringify(newState, null, 2));
console.log('Fixed db.json views to 5946+');
