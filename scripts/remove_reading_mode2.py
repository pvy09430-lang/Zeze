import re

with open("src/components/UserPanel.tsx", "r") as f:
    text = f.read()

# Replace the conditional ternary start
start_pattern = r'\{/\* READING MODE VIEW \*/\}.*?\) : \(\n                <>'
text = re.sub(start_pattern, '', text, flags=re.DOTALL)

# Now we need to remove the closing `</>\n              )}` 
# Let's search from the bottom for detailedBotModal.
# The detailedBotModal block ends with:
#               )}
#             </div>
#           </div>
#         )}
# Wait, actually there's a 
#                   </div>
#                 </>
#               )}
#             </div>
#           </div>
#         )}
# Let's find it.
text = text.replace('                  </div>\n                </>\n              )}', '                  </div>')

# also I notice the wrapper class wasn't properly fixed if the regex failed.
# Let's just hardcode it.
wrapper = r'className={`relative w-full border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up transition-all duration-300 \$\{\n                readingMode \n                   \? "max-w-2xl max-h-\[90vh\] bg-amber-50/95 dark:bg-slate-950 border-amber-200 dark:border-amber-950 text-slate-900 dark:text-slate-100"\n                   : "max-w-5xl h-\[88vh\] md:h-\[82vh\] max-h-\[88vh\] md:max-h-\[82vh\] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 md:grid md:grid-cols-\[60%_40%\]"\n              \}`}'
replacement = 'className="relative w-full border rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up transition-all duration-300 max-w-5xl h-[88vh] md:h-[82vh] max-h-[88vh] md:max-h-[82vh] bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 md:grid md:grid-cols-[60%_40%]"'
text = re.sub(wrapper, replacement, text)

with open("src/components/UserPanel.tsx", "w") as f:
    f.write(text)
print("done2")
