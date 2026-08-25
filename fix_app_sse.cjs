const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Remove onSnapshot code and replace with SSE
const oldSnapshotCode = `    // Firestore Real-Time Sync onSnapshot
    const unsubscribe = onSnapshot(doc(db, "appData", "mainState"), (docSnap) => {
      if (docSnap.exists()) {
        console.log("🔥 [Real-Time Sync] Received update from Firestore!");
        const rawData = docSnap.data();
        const data = deepSanityCheckBots(rawData as AppState);
        setState(data);
        setCachedAppState(data).catch(console.warn);
      }
    }, (error) => {
      console.warn("⚠️ [Real-Time Sync] Connection error:", error);
    });`;

const newSseCode = `    // Real-Time Sync via Server-Sent Events (ZERO Firestore Reads)
    const eventSource = new EventSource("/api/stream");
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "STATE_UPDATED") {
          console.log("⚡ [Real-Time SSE] State updated on server, fetching new state from RAM cache...");
          fetchState(true);
        }
      } catch (err) {}
    };
    eventSource.onerror = () => {
      console.warn("⚠️ [Real-Time SSE] Connection lost, reconnecting...");
    };`;

if (code.includes('onSnapshot(doc(db, "appData", "mainState")')) {
  code = code.replace(oldSnapshotCode, newSseCode);
  code = code.replace('return () => unsubscribe();', 'return () => eventSource.close();');
}

fs.writeFileSync('src/App.tsx', code);
