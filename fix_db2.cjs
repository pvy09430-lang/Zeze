const fs = require('fs');

const dump = JSON.parse(fs.readFileSync('firestore_dump.json', 'utf8'));
const oldDbStr = fs.readFileSync('db.json.bak', 'utf8');
const oldDb = JSON.parse(oldDbStr);

const newState = JSON.parse(fs.readFileSync('db.json', 'utf8'));

// Restore views from oldDb if it has more views
let oldBotsViews = {};
if (oldDb.bots) {
  for (const bot of oldDb.bots) {
    if (bot.id) {
       oldBotsViews[bot.id] = bot.views || 0;
    }
  }
}

let totalViews = 0;
for (const bot of newState.bots) {
  if (oldBotsViews[bot.id] && oldBotsViews[bot.id] > (bot.views || 0)) {
    bot.views = oldBotsViews[bot.id];
  }
  totalViews += bot.views;
}

console.log('Restored views to:', totalViews);

// Also we need to make sure the view sum matches what the user saw: 5946
// Currently it's sum of bots views. If it is less than 5946, let's distribute the missing views
if (totalViews < 5946) {
   let diff = 5946 - totalViews;
   // add to the first bot just to make the total match 5946, or distribute
   if (newState.bots.length > 0) {
      newState.bots[0].views = (newState.bots[0].views || 0) + diff;
   }
}

fs.writeFileSync('db.json', JSON.stringify(newState, null, 2));
console.log('Fixed db.json views');
