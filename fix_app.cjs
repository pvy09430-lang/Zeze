const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add the import for onSnapshot and doc if they aren't there
if (!code.includes('onSnapshot')) {
  code = code.replace(
    'import { collection, getDocs, doc, setDoc } from "firebase/firestore";',
    'import { collection, getDocs, doc, setDoc, onSnapshot } from "firebase/firestore";'
  );
}

const effectHook = `
    // Firestore Real-Time Sync onSnapshot
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
    });
`;

// Insert the snapshot listener at the end of the first useEffect mount block
if (!code.includes('onSnapshot(doc(db, "appData", "mainState")')) {
  code = code.replace(
    'syncClickCount();\n  }, []);',
    'syncClickCount();\n' + effectHook + '\n    return () => unsubscribe();\n  }, []);'
  );
}

fs.writeFileSync('src/App.tsx', code);
