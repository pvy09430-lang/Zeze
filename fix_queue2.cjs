const fs = require('fs');
if (fs.existsSync('pending_writes.json')) {
  fs.writeFileSync('pending_writes.json', '[]');
  console.log('Cleared pending queue completely.');
}
