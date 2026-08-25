const fs = require('fs');
if (fs.existsSync('pending_writes.json')) {
  let queue = JSON.parse(fs.readFileSync('pending_writes.json', 'utf8'));
  function removeUndefined(obj) {
    if (obj === undefined) return null;
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(removeUndefined);
    const cleanObj = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] !== undefined) {
        cleanObj[key] = removeUndefined(obj[key]);
      }
    }
    return cleanObj;
  }
  
  queue = queue.map(item => {
     if (item.data) {
        item.data = removeUndefined(item.data);
     }
     return item;
  });
  
  fs.writeFileSync('pending_writes.json', JSON.stringify(queue, null, 2));
  console.log('Fixed undefined in queue');
} else {
  console.log('Queue not found');
}
