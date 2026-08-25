const http = require('http');
http.get('http://localhost:3000/api/bots', (res) => {
  console.log('Server is running');
}).on('error', (e) => {
  console.log('Server error:', e.message);
});
