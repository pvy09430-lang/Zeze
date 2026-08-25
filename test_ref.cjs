const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("const stateRef = React.useRef")) {
    console.log("No stateRef");
}
