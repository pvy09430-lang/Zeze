import re

with open("src/components/UserPanel.tsx", "r") as f:
    text = f.read()

bad_wrapper = """className={`relative w-full border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up transition-all duration-300 ${
                readingMode 
                   ? "max-w-2xl max-h-[90vh] bg-amber-50/95 dark:bg-slate-950 border-amber-200 dark:border-amber-950 text-slate-900 dark:text-slate-100"
                   : "max-w-5xl h-[88vh] md:h-[82vh] max-h-[88vh] md:max-h-[82vh] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 md:grid md:grid-cols-[60%_40%]"
              }`}"""

good_wrapper = 'className="relative w-full border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up transition-all duration-300 max-w-5xl h-[88vh] md:h-[82vh] max-h-[88vh] md:max-h-[82vh] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 md:grid md:grid-cols-[60%_40%]"'

text = text.replace(bad_wrapper, good_wrapper)

with open("src/components/UserPanel.tsx", "w") as f:
    f.write(text)
print("wrapper fixed")
