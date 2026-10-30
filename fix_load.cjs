const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const regex = /\/\/ 1\. Try to load from Split Consolidated Documents under appData[\s\S]*?(?=    \/\/ 2\. Backward Compatibility)/;
const replacement = `// 1. Try to load from Split Consolidated Documents under appData (to prevent 1MB limit errors)
    try {
      const feedbacksRef = doc(database, "appData", "mainState_feedbacks");
      const requestsRef = doc(database, "appData", "mainState_botRequests");
      const metaRef = doc(database, "appData", "mainState_metadata");

      const [feedbacksDoc, requestsDoc, metaDoc] = await Promise.all([
        getDoc(feedbacksRef),
        getDoc(requestsRef),
        getDoc(metaRef)
      ]);

      const metaData = metaDoc.exists() ? metaDoc.data() : {};
      
      let allBots = [];
      let loadedBots = false;
      let reads = 3;

      if (metaData.botsChunkCount && metaData.botsChunkCount > 0) {
        const chunkPromises = [];
        for (let i = 0; i < metaData.botsChunkCount; i++) {
          chunkPromises.push(getDoc(doc(database, "appData", \`mainState_bots_chunk_\${i}\`)));
        }
        const chunkDocs = await Promise.all(chunkPromises);
        reads += metaData.botsChunkCount;
        chunkDocs.forEach(d => {
          if (d.exists() && d.data().bots) {
            allBots = allBots.concat(d.data().bots);
          }
        });
        loadedBots = allBots.length > 0;
      } else {
        const botsDoc = await getDoc(doc(database, "appData", "mainState_bots"));
        reads += 1;
        if (botsDoc.exists()) {
          allBots = botsDoc.data().bots || [];
          loadedBots = allBots.length > 0;
        }
      }

      recordFirestoreReads(reads, "Split Consolidated mainState Loading");

      if (loadedBots) {
        const feedbacksData = feedbacksDoc.exists() ? feedbacksDoc.data() : {};
        const requestsData = requestsDoc.exists() ? requestsDoc.data() : {};

        mainStateData = {
          bots: allBots,
          feedbacks: feedbacksData.feedbacks || [],
          botRequests: requestsData.botRequests || [],
          announcements: metaData.announcements || [],
          authorSettings: metaData.authorSettings || {},
          polls: metaData.polls || [],
          visitorLogs: []
        };

        if (Array.isArray(mainStateData.bots) && mainStateData.bots.length > 0) {
          console.log(\`⚡ [Split Consolidated Loading] Successfully loaded all \${mainStateData.bots.length} bots from \${reads} split appData documents!\`);
          loadedFromMainState = true;
        }
      }
    } catch (e: any) {
      console.warn("⚠️ Split consolidated loading failed, falling back to legacy single-document mainState:", e.message);
    }
`;

content = content.replace(regex, replacement);
fs.writeFileSync('server.ts', content, 'utf8');
console.log('Fixed load logic!');
