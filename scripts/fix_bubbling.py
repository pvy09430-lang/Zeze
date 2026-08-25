import re

with open("src/components/UserPanel.tsx", "r") as f:
    text = f.read()

# Fix the button
text = text.replace("onClick={() => setExpandedBotId(isExpanded ? null : bot.id)}", 
                    "onClick={(e) => { e.stopPropagation(); setExpandedBotId(isExpanded ? null : bot.id); }}")

# Fix the expanded comments area by adding onClick={(e) => e.stopPropagation()} to its wrapper
# We need to find the wrapper. It is:
# {isExpanded && (
#   <div className="mt-3 space-y-3 animate-fade-in">
# Let's replace it:
text = text.replace('{isExpanded && (\n                          <div className="mt-3 space-y-3 animate-fade-in">',
                    '{isExpanded && (\n                          <div className="mt-3 space-y-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>')

with open("src/components/UserPanel.tsx", "w") as f:
    f.write(text)
print("done")
