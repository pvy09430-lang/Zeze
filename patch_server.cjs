const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Restore firestoreWrite
code = code.replace(
`async function firestoreWrite(collPath: string, docId: string, data: any) {
  return; // Disabled as per instructions
}`, 
`async function firestoreWrite(collPath: string, docId: string, data: any) {
  const key = \`\${collPath}/\${docId}\`;
  try {
    const database = getDb();
    if (!database) {
      console.warn(\`Firestore chưa sẵn sàng, đã lưu [\${key}] vào hàng đợi đệm.\`);
      enqueuePendingWrite(key, collPath, docId, data, 'set');
      return;
    }
    const cleanedData = cleanUndefined(data);
    await setDoc(doc(database, collPath, docId), cleanedData);
    recordFirestoreWrites(1, \`write:\${collPath}\`);
    removeFromPendingQueue(key);
  } catch (error: any) {
    console.error(\`⚠️ Lỗi ghi Firestore [\${key}] (Có thể hết Quota/mất mạng). Đã lưu dữ liệu mới vào Hàng Đợi Chờ:\`, error?.message || String(error));
    enqueuePendingWrite(key, collPath, docId, data, 'set');
  }
}`);

// 2. Restore firestoreDelete
code = code.replace(
`async function firestoreDelete(collPath: string, docId: string) {
  return; // Disabled as per instructions
}`, 
`async function firestoreDelete(collPath: string, docId: string) {
  const key = \`\${collPath}/\${docId}\`;
  try {
    const database = getDb();
    if (!database) {
      console.warn(\`Firestore chưa sẵn sàng, đã lưu lệnh xóa [\${key}] vào hàng đợi đệm.\`);
      enqueuePendingWrite(key, collPath, docId, null, 'delete');
      return;
    }
    await deleteDoc(doc(database, collPath, docId));
    recordFirestoreWrites(1, \`delete:\${collPath}\`);
    removeFromPendingQueue(key);
  } catch (error: any) {
    console.error(\`⚠️ Lỗi xóa Firestore [\${key}] (Có thể hết Quota/mất mạng). Đã lưu lệnh xóa vào Hàng Đợi Chờ:\`, error?.message || String(error));
    enqueuePendingWrite(key, collPath, docId, null, 'delete');
  }
}`);

// 3. Restore saveMainStateToFirestoreThrottled stripped image logic
code = code.replace(
`  // We are storing the full state. If base64 is used, it might exceed 1MB, but the instruction is to use 1 document.
  // We'll trust the user that Cloudinary is handling the bulk of image data.
  const mainStateData = {
    bots: state.bots,
    announcements: state.announcements || [],
    feedbacks: state.feedbacks || [],
    botRequests: state.botRequests || [],
    authorSettings: state.authorSettings || {},
    polls: state.polls || [],
    visitorLogs: [], // Zero Firestore quota used for visitor logs
    updatedAt: new Date().toISOString()
  };`,
`  const sanitizedBots = state.bots.map((b) => {
    if (b.imageUrl && b.imageUrl.startsWith("data:image/")) {
      return { ...b, imageUrl: "" };
    }
    return b;
  });

  const mainStateData = {
    bots: sanitizedBots,
    announcements: state.announcements || [],
    feedbacks: state.feedbacks || [],
    botRequests: state.botRequests || [],
    authorSettings: state.authorSettings || {},
    polls: state.polls || [],
    visitorLogs: [], // Zero Firestore quota used for visitor logs
    updatedAt: new Date().toISOString()
  };`);

// 4. Restore flushRAMToFirestore mainState save
code = code.replace(
`  // 2. Flush mainState to Firestore disabled to prevent data shadowing and write quota
}`,
`  // 2. Flush mainState to Firestore appData/mainState
  if (state.bots && state.bots.length > 0) {
    const sanitizedBots = state.bots.map((b) => {
      if (b.imageUrl && b.imageUrl.startsWith("data:image/")) {
        return { ...b, imageUrl: "" };
      }
      return b;
    });

    const mainStateData = {
      bots: sanitizedBots,
      announcements: state.announcements || [],
      feedbacks: state.feedbacks || [],
      botRequests: state.botRequests || [],
      authorSettings: state.authorSettings || {},
      polls: state.polls || [],
      visitorLogs: [],
      updatedAt: new Date().toISOString()
    };

    try {
      await setDoc(doc(database, "appData", "mainState"), mainStateData);
      console.log("✅ [RAM Flush] Successfully saved complete mainState to Firestore appData/mainState before exit!");
    } catch (err: any) {
      console.error("❌ [RAM Flush] Failed to flush mainState to Firestore:", err.message);
    }
  }
}`);

fs.writeFileSync('server.ts', code);
