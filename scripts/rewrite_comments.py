import re

with open("src/components/UserPanel.tsx", "r") as f:
    text = f.read()

# We need to replace the comment rendering in detailed modal
# The block starts around line 3200: `{(!detailedBotModal.comments || detailedBotModal.comments.length === 0) ? (`
# and ends before `{/* Bottom sticky Comment box */}` around line 3352.

