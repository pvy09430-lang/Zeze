const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const sigEndpoint = `
  app.get("/api/cloudinary-signature", (req, res) => {
    if (!isCloudinaryConfigured) {
      return res.status(503).json({ error: "Cloudinary not configured" });
    }
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: "bot_hub" },
      process.env.CLOUDINARY_API_SECRET!
    );
    res.json({
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY
    });
  });
`;

code = code.replace('  app.post("/api/upload"', sigEndpoint + '\n  app.post("/api/upload"');
fs.writeFileSync('server.ts', code);
