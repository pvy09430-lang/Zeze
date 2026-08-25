import re

with open("src/components/UserPanel.tsx", "r") as f:
    text = f.read()

pattern = r'className=\{`relative w-full border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up transition-all duration-300 \$\{\s*readingMode\s*\?\s*"[^"]+"\s*:\s*"([^"]+)"\s*\}`\}'
text = re.sub(pattern, r'className="relative w-full border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up transition-all duration-300 \1"', text)

with open("src/components/UserPanel.tsx", "w") as f:
    f.write(text)
print("wrapper fixed 2")
