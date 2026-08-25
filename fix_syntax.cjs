const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(`
  });
});
  });
}
  app.get("/api/state"`, `
  });
});
  app.get("/api/state"`);

fs.writeFileSync('server.ts', code);
