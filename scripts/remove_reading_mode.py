import re

with open("src/components/UserPanel.tsx", "r") as f:
    text = f.read()

# 1. Remove readingMode state
text = re.sub(r'  const \[readingMode, setReadingMode\] = useState<boolean>.*?\n  \}\);\n', '', text, flags=re.DOTALL)
text = re.sub(r'  const toggleReadingMode = \(\) => \{.*?\n  \};\n', '', text, flags=re.DOTALL)

# 2. Fix the modal wrapper classes (remove dynamic readingMode classes)
wrapper_start = r'className={`relative w-full border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up transition-all duration-300 \$\{\n                readingMode \n                   \? ".*?"\n                   : "(.*?)"\n              \}`}'
# we just want the normal split view classes
text = re.sub(wrapper_start, r'className="relative w-full border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up transition-all duration-300 \1"', text)

# 3. Remove the top buttons container (which contains the mode toggle and close button)
# We will just keep the close button.
buttons_html = r'<div className="absolute top-4 right-4 flex items-center gap-2 z-50">.*?</div>'
close_btn_only = """<div className="absolute top-4 right-4 flex items-center gap-2 z-50">
                <button 
                  onClick={() => setDetailedBotModal(null)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-250 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-full p-2.5 transition cursor-pointer shadow active:scale-[0.92]"
                  title="Đóng bảng chi tiết"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>"""
text = re.sub(buttons_html, close_btn_only, text, flags=re.DOTALL)

# 4. Remove the `{readingMode ? (...) : (<> ... </>)}` structure
# It looks like:
# {readingMode ? ( ... ) : ( <> ... </> )}
# This is hard to regex reliably. I'll use a safer script approach or manual replacement.

with open("src/components/UserPanel.tsx", "w") as f:
    f.write(text)
print("regex part 1 done")
