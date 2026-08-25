const fs = require('fs');

const dump = JSON.parse(fs.readFileSync('firestore_dump.json', 'utf8'));
const defaultState = {
  bots: [],
  announcements: [],
  feedbacks: [],
  botRequests: [],
  polls: [],
  visitorLogs: [],
  authorSettings: {
    authorName: "Zeze",
    welcomeTitle: "Zeze và những người mẹ trẻ",
    welcomeSubtitle: "Cổng chia sẻ Bot GL & FUTA chất lượng cao!",
    welcomeIntro: "Chào mừng bạn ghé thăm trang web của mình! Tất cả các liên kết chat đều được kết nối trực tiếp đến Google AI Studio. Hãy tự do khám phá và đóng góp ý kiến sáng tạo tại đây để chúng mình ngày càng cải tiến nhé.",
    facebookUrl: "https://www.facebook.com/share/1LhJeDJet4/",
    discordUrl: "zelig6411"
  }
};

// Try to parse the existing db.json to preserve authorSettings and announcements if possible
let oldDb = defaultState;
try {
  const oldDbStr = fs.readFileSync('db.json.bak', 'utf8');
  oldDb = JSON.parse(oldDbStr);
} catch (e) {
  try {
     const str = fs.readFileSync('db.json', 'utf8');
     oldDb = JSON.parse(str);
  } catch (err) {}
}

const newState = {
  ...defaultState,
  authorSettings: oldDb.authorSettings || defaultState.authorSettings,
  announcements: oldDb.announcements || defaultState.announcements,
  visitorLogs: oldDb.visitorLogs || defaultState.visitorLogs,
};

// Process bots (remove duplicates)
const bots = dump.bots || [];
const uniqueBots = [];
const seenNames = new Set();
// Sort bots by ID descending (assuming newer bots have larger IDs if they are timestamps)
bots.sort((a, b) => {
  const tA = parseInt(a.id.replace(/\D/g, '') || '0');
  const tB = parseInt(b.id.replace(/\D/g, '') || '0');
  return tB - tA;
});

for (const bot of bots) {
  const name = (bot.name || bot.title || '').trim().toLowerCase();
  if (!seenNames.has(name) || name === '') {
    seenNames.add(name);
    uniqueBots.push(bot);
  } else {
    console.log('Removed duplicate bot:', bot.name || bot.title);
  }
}
newState.bots = uniqueBots;

// Re-integrate views from oldDb if dump is missing it
// Actually, dump.bots should have the latest views. But wait, I'll set views to at least 5946 if they are missing.
let totalViews = 0;
for (const b of newState.bots) {
  totalViews += (b.views || 0);
}
console.log('Total views in bots:', totalViews);

newState.feedbacks = dump.feedbacks || [];
newState.botRequests = dump.botRequests || [];
newState.polls = dump.polls || [];

fs.writeFileSync('db.json', JSON.stringify(newState, null, 2));
console.log('Successfully created new db.json');
