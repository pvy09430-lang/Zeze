const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// 1. Replace loading logic
const loadTarget = `    // 1. Try to load from Split Consolidated Documents under appData (to prevent 1MB limit errors)
    try {
      const botsRef = doc(database, "appData", "mainState_bots");
      const feedbacksRef = doc(database, "appData", "mainState_feedbacks");
      const requestsRef = doc(database, "appData", "mainState_botRequests");
      const metaRef = doc(database, "appData", "mainState_metadata");

      const [botsDoc, feedbacksDoc, requestsDoc, metaDoc] = await Promise.all([
        getDoc(botsRef),
        getDoc(feedbacksRef),
        getDoc(requestsRef),
        getDoc(metaRef)
      ]);

      recordFirestoreReads(4, "Split Consolidated mainState Loading");

      if (botsDoc.exists()) {
        const botsData = botsDoc.data();
        const feedbacksData = feedbacksDoc.exists() ? feedbacksDoc.data() : {};
        const requestsData = requestsDoc.exists() ? requestsDoc.data() : {};
        const metaData = metaDoc.exists() ? metaDoc.data() : {};

        mainStateData = {
          bots: botsData.bots || [],
          feedbacks: feedbacksData.feedbacks || [],
          botRequests: requestsData.botRequests || [],
          announcements: metaData.announcements || [],
          authorSettings: metaData.authorSettings || {},
          polls: metaData.polls || [],
          visitorLogs: []
        };

        if (Array.isArray(mainStateData.bots) && mainStateData.bots.length > 0) {
          console.log(\`⚡ [Split Consolidated Loading] Successfully loaded all \${mainStateData.bots.length} bots from 4 split appData documents!\`);
          loadedFromMainState = true;
        }
      }`;

const loadReplacement = `    // 1. Try to load from Split Consolidated Documents under appData (to prevent 1MB limit errors)
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
      
      let allBots: any[] = [];
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
      }`;

content = content.replace(loadTarget, loadReplacement);


// 2. Replace background save logic
const saveTarget = `  // Save to 4 split documents to stay safely under 1MB Firestore limits
  Promise.all([
    setDoc(doc(database, "appData", "mainState_bots"), { bots: sanitizedBots, updatedAt }),
    setDoc(doc(database, "appData", "mainState_feedbacks"), { feedbacks: sanitizedFeedbacks, updatedAt }),
    setDoc(doc(database, "appData", "mainState_botRequests"), { botRequests: sanitizedBotRequests, updatedAt }),
    setDoc(doc(database, "appData", "mainState_metadata"), {
      announcements: state.announcements || [],
      authorSettings: state.authorSettings || {},
      polls: state.polls || [],
      visitorLogs: [],
      updatedAt
    })
  ])
    .then(() => {
      console.log(\`✅ [Consolidated Cloud Backup] Successfully backed up complete state across 4 split appData documents in Firestore!\`);
    })`;

const saveReplacement = `  // Break bots into chunks of 3 to avoid 1MB Firestore document limits
  const CHUNK_SIZE = 3;
  const botChunks: any[][] = [];
  for (let i = 0; i < sanitizedBots.length; i += CHUNK_SIZE) {
    botChunks.push(sanitizedBots.slice(i, i + CHUNK_SIZE));
  }

  const promises = [
    setDoc(doc(database, "appData", "mainState_feedbacks"), { feedbacks: sanitizedFeedbacks, updatedAt }),
    setDoc(doc(database, "appData", "mainState_botRequests"), { botRequests: sanitizedBotRequests, updatedAt }),
    setDoc(doc(database, "appData", "mainState_metadata"), {
      announcements: state.announcements || [],
      authorSettings: state.authorSettings || {},
      polls: state.polls || [],
      visitorLogs: [],
      updatedAt,
      botsChunkCount: botChunks.length
    })
  ];

  botChunks.forEach((chunk, index) => {
    promises.push(setDoc(doc(database, "appData", \`mainState_bots_chunk_\${index}\`), { bots: chunk, updatedAt }));
  });

  // Save legacy document as empty array to signal we've migrated, or we can just leave it as is. We'll overwrite with empty array to reclaim 7MB space.
  promises.push(setDoc(doc(database, "appData", "mainState_bots"), { bots: [], updatedAt, migratedToChunks: true }));

  Promise.all(promises)
    .then(() => {
      console.log(\`✅ [Consolidated Cloud Backup] Successfully backed up complete state across \${promises.length} split appData documents in Firestore!\`);
    })`;

content = content.replace(saveTarget, saveReplacement);

// 3. Replace RAM flush save logic
const flushTarget = `    try {
      await Promise.all([
        setDoc(doc(database, "appData", "mainState_bots"), { bots: sanitizedBots, updatedAt }),
        setDoc(doc(database, "appData", "mainState_feedbacks"), { feedbacks: sanitizedFeedbacks, updatedAt }),
        setDoc(doc(database, "appData", "mainState_botRequests"), { botRequests: sanitizedBotRequests, updatedAt }),
        setDoc(doc(database, "appData", "mainState_metadata"), {
          announcements: state.announcements || [],
          authorSettings: state.authorSettings || {},
          polls: state.polls || [],
          visitorLogs: [],
          updatedAt
        })
      ]);
      console.log("✅ [RAM Flush] State & views buffered to Firestore successfully!");
    } catch (e: any) {`;

const flushReplacement = `    try {
      const CHUNK_SIZE = 3;
      const botChunks: any[][] = [];
      for (let i = 0; i < sanitizedBots.length; i += CHUNK_SIZE) {
        botChunks.push(sanitizedBots.slice(i, i + CHUNK_SIZE));
      }

      const promises = [
        setDoc(doc(database, "appData", "mainState_feedbacks"), { feedbacks: sanitizedFeedbacks, updatedAt }),
        setDoc(doc(database, "appData", "mainState_botRequests"), { botRequests: sanitizedBotRequests, updatedAt }),
        setDoc(doc(database, "appData", "mainState_metadata"), {
          announcements: state.announcements || [],
          authorSettings: state.authorSettings || {},
          polls: state.polls || [],
          visitorLogs: [],
          updatedAt,
          botsChunkCount: botChunks.length
        }),
        setDoc(doc(database, "appData", "mainState_bots"), { bots: [], updatedAt, migratedToChunks: true })
      ];

      botChunks.forEach((chunk, index) => {
        promises.push(setDoc(doc(database, "appData", \`mainState_bots_chunk_\${index}\`), { bots: chunk, updatedAt }));
      });

      await Promise.all(promises);
      console.log("✅ [RAM Flush] State & views buffered to Firestore successfully!");
    } catch (e: any) {`;

content = content.replace(flushTarget, flushReplacement);

fs.writeFileSync('server.ts', content, 'utf8');
console.log('Patched server.ts successfully!');
