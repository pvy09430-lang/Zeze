const fs = require('fs');
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

code = code.replace(/return true;\n\};/g, '  </div>\n  );\n}\n\nconst areAdminPanelPropsEqual = (prevProps: AdminPanelProps, nextProps: AdminPanelProps) => {\n  if (prevProps.passcode !== nextProps.passcode) return false;\n  if (prevProps.isAdminUnlocked !== nextProps.isAdminUnlocked) return false;\n  return true;\n};');

fs.writeFileSync('src/components/AdminPanel.tsx', code);
