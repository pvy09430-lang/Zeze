const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
`    // Load consolidated mainState. Since Cloudinary is active, images are light URLs, fitting safely under 1MB limit.
    try {
      const mainStateRef = doc(database, "appData", "mainState");
      mainStateDoc = await getDoc(mainStateRef);
      recordFirestoreReads(1, "Consolidated mainState Loading");
      if (mainStateDoc.exists()) {
        mainStateData = mainStateDoc.data();
        if (mainStateData && Array.isArray(mainStateData.bots) && mainStateData.bots.length > 0) {
          console.log(\`⚡ [Consolidated Loading Mode] Loaded all \${mainStateData.bots.length} bots from a single Firestore document (1 read operation instead of 41+)!\`);
          loadedFromMainState = true;
        }
      }
    } catch (e: any) {`,
`    // Load consolidated mainState. Since Cloudinary is active, images are light URLs, fitting safely under 1MB limit.
    try {
      const mainStateRef = doc(database, "appData", "mainState");
      mainStateDoc = await getDoc(mainStateRef);
      recordFirestoreReads(1, "Consolidated mainState Loading");
      if (mainStateDoc.exists()) {
        mainStateData = mainStateDoc.data();
        if (mainStateData && Array.isArray(mainStateData.bots) && mainStateData.bots.length > 0) {
          console.log(\`⚡ [Consolidated Loading Mode] Loaded all \${mainStateData.bots.length} bots from a single Firestore document (1 read operation instead of 41+)!\`);
          loadedFromMainState = true;
        }
      }
      
      // FORCED RECOVERY: If we are empty, force read from individual collections
      if (!loadedFromMainState || (mainStateData && mainStateData.bots && mainStateData.bots.length === 0)) {
         console.warn("⚠️ FORCED RECOVERY: mainState is empty or missing, falling back to individual collections!");
         loadedFromMainState = false;
      }
    } catch (e: any) {`);

fs.writeFileSync('server.ts', code);
