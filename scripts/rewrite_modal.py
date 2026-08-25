import re

with open("detailed_comments_old.txt", "r") as f:
    text = f.read()

# I want to replace the whole right side div:
# <div className="flex-1 h-[58%] md:h-full flex flex-col justify-between p-5 md:p-6 space-y-4 overflow-hidden bg-slate-50/30 dark:bg-slate-950/20">
# Wait, the user asked to change CSS Grid:
# "refactor layout để sử dụng CSS grid phân tách rõ rệt: cột bên trái (chiếm 60%) hiển thị thông tin hình ảnh/hệ thống, cột bên phải (chiếm 40%) là khung bình luận và trả lời."
