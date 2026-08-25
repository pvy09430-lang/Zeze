import re

with open("server.ts", "r") as f:
    text = f.read()

# Add GET /api/bots/:id after GET /api/bots
endpoint = """  app.get("/api/bots/:id", (req, res) => {
    const { id } = req.params;
    const bot = state.bots.find(b => b.id === id);
    if (bot) {
      res.json(bot);
    } else {
      res.status(404).json({ error: "Không tìm thấy Bot" });
    }
  });
"""

text = text.replace('  app.get("/api/bots", (req, res) => {\n    res.json(state.bots);\n  });\n', 
                    '  app.get("/api/bots", (req, res) => {\n    res.json(state.bots);\n  });\n\n' + endpoint)

with open("server.ts", "w") as f:
    f.write(text)
print("done")
