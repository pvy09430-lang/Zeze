const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `  function handleUpdateLocalState(newState: AppState) {
    setState(newState);
    setCachedAppState(newState).catch(console.warn);
    // Lưu bản sao lưu vào localStorage làm dự phòng
    try {
      if (newState && Array.isArray(newState.bots)) {
        const strippedBots = newState.bots.map((b: any) => {
          if (b.imageUrl && b.imageUrl.startsWith("data:image/")) {
            return { ...b, imageUrl: "" };
          }
          return b;
        });
        const strippedState = { ...newState, bots: strippedBots };
        localStorage.setItem("cl_portal_local_state_backup", JSON.stringify(strippedState));
      } else {
        localStorage.setItem("cl_portal_local_state_backup", JSON.stringify(newState));
      }
    } catch (e) {
      console.warn("Không thể lưu bản sao lưu sau cập nhật do vượt quá giới hạn localStorage:", e);
    }
  };`;

const newStr = `  function handleUpdateLocalState(newState: AppState) {
    let strippedBots = newState.bots;
    if (newState && Array.isArray(newState.bots)) {
      strippedBots = newState.bots.map((b: any) => {
        if (b.imageUrl && b.imageUrl.startsWith("data:image/")) {
          return { ...b, imageUrl: "" };
        }
        return b;
      });
    }
    const strippedState = { ...newState, bots: strippedBots };
    
    try {
      const newStr = JSON.stringify(strippedState);
      const oldStr = localStorage.getItem("cl_portal_local_state_backup");
      
      if (newStr === oldStr) {
         return; 
      }
      
      localStorage.setItem("cl_portal_local_state_backup", newStr);
    } catch (e) {
      console.warn("Không thể lưu bản sao lưu sau cập nhật do vượt quá giới hạn localStorage:", e);
    }

    setState(newState);
    setCachedAppState(newState).catch(console.warn);
  };`;

if(code.includes(targetStr)) {
  fs.writeFileSync('src/App.tsx', code.replace(targetStr, newStr));
  console.log("Success");
} else {
  console.log("Could not find target string");
}
