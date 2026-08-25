import re

with open("src/components/UserPanel.tsx", "r") as f:
    text = f.read()

text = text.replace("detailedBotModal.tags.map(", "(detailedBotModal.tags || []).map(")
text = text.replace("detailedBotModal.links.map(", "(detailedBotModal.links || []).map(")
text = text.replace("bot.tags.forEach(", "(bot.tags || []).forEach(")
text = text.replace("bot.tags.some(", "(bot.tags || []).some(")
text = text.replace("bot.tags.length", "(bot.tags || []).length")

with open("src/components/UserPanel.tsx", "w") as f:
    f.write(text)
print("done")
