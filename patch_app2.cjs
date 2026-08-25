const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
`    // Real-Time Sync via Firestore onSnapshot (Downloads full state initially, then only delta changes)
    const unsubscribeSnapshot = onSnapshot(doc(db, "appData", "mainState"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.bots)) {
          const sanitizedData = deepSanityCheckBots(data as AppState);
          
          setState((prevState) => {
            // Prevent overwriting if the incoming state is older
            const currentTs = prevState?.lastUpdated || (prevState?.updatedAt ? new Date(prevState.updatedAt).getTime() : 0);
            const newTs = sanitizedData.lastUpdated || (sanitizedData.updatedAt ? new Date(sanitizedData.updatedAt).getTime() : 0);
            
            if (currentTs > 0 && newTs > 0 && newTs < currentTs) {
              return prevState;
            }
            
            return { ...sanitizedData, lastUpdated: newTs || Date.now() };
          });
          setLoading(false);
          setIsSyncing(false);
        }
      }
    }, (err) => {
      console.warn("⚠️ [onSnapshot] Connection lost or permission error:", err);
      // Fallback to fetchState if onSnapshot fails
      fetchState(false);
    });

    return () => {
      unsubscribeSnapshot();
    };`,
`    // Fetch state directly from server
    fetchState(false);

    // Real-Time Sync via Server-Sent Events (ZERO Firestore Reads)
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
    };

    // Periodic silent background auto-sync to guarantee multi-user updates across separate instances & browser tabs
    const pollInterval = setInterval(() => {
      fetchState(true);
    }, 12000);

    return () => {
      eventSource.close();
      clearInterval(pollInterval);
    };`);

// And I also need to revert the "Làm mới dữ liệu từ máy chủ" text to include the cache logic because the user asked to remove IndexedDB, but maybe they want it back, or it doesn't matter. The user asked "Khôi phục lại mọi dữ liệu của trang web cho tôi... web đang trống không nè". So long as data is back, it's fine.

fs.writeFileSync('src/App.tsx', code);
