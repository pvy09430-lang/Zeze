const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `  function handleUpdateLocalState(newState: AppState) {`;
const newStr = `  const deepEqual = (a: any, b: any): boolean => {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    if (Array.isArray(a)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (let key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  };

  function handleUpdateLocalState(newState: AppState) {`;

if(!code.includes("const deepEqual =")) {
  fs.writeFileSync('src/App.tsx', code.replace(targetStr, newStr));
  console.log("Added deepEqual");
}

code = fs.readFileSync('src/App.tsx', 'utf8');
const oldCompareStr = `      const newStr = JSON.stringify(strippedState);
      const oldStr = localStorage.getItem("cl_portal_local_state_backup");
      
      if (newStr === oldStr) {
         return; 
      }
      
      localStorage.setItem("cl_portal_local_state_backup", newStr);`;

const newCompareStr = `      const newStr = JSON.stringify(strippedState);
      const oldStr = localStorage.getItem("cl_portal_local_state_backup");
      
      if (oldStr) {
         try {
            const oldState = JSON.parse(oldStr);
            if (deepEqual(oldState, strippedState)) {
               return; // State is identical, prevent loop
            }
         } catch(e) {}
      }
      
      localStorage.setItem("cl_portal_local_state_backup", newStr);`;

if (code.includes(oldCompareStr)) {
   fs.writeFileSync('src/App.tsx', code.replace(oldCompareStr, newCompareStr));
   console.log("Updated compare");
}

