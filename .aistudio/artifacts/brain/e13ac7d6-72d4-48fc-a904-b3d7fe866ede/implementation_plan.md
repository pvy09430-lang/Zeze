# Kế Hoạch Triển Khai: Nâng Cấp Hệ Thống Bảng Tin, Pop-up Bot Mới Tự Động, Lọc Tag Đa Năng & Tinh Chỉnh Giao Diện

Dựa trên yêu cầu chi tiết và phản hồi xác nhận từ người dùng, kế hoạch sau đây tối ưu hóa trải nghiệm đọc và tương tác cho cổng chia sẻ Bot GL & Futa, đồng thời tuân thủ nghiêm ngặt **Quy tắc bảo toàn dữ liệu (Zero-Data-Deletion Policy)**.

---

## 1. Mục Tiêu & Phạm Vi Công Việc

### A. Hệ Thống Pop-up Thông Báo Bot Mới Tự Động (Thay thế thông báo cũ)
- **Tự động quét bot mới**: Lọc danh sách các bot được thêm/cập nhật trong vòng **7 ngày** gần nhất (`Date.now() - createdAt <= 7 * 24 * 3600 * 1000`).
- **Pop-up chào mừng**: Tự động hiển thị khi người dùng vào trang với lời mời thân thiện: *"🎉 Bot mới ra mắt trong tuần, bạn có muốn thử trải nghiệm ngay không?"*.
- **Thông tin trên Pop-up**:
  - Ảnh đại diện/thumbnail của bot với hiệu ứng bo góc tinh tế.
  - Tên bot in nghiêng sắc sảo, thể loại (`🌸 GL` hoặc `🔵 Futa`), lời nhắn tác giả và đầy đủ các tag.
  - Nút bấm *"Trải Nghiệm Ngay / Chat Ngay"* (chuyển hướng trực tiếp) và nút *"Xem Chi Tiết"*.
  - Nút *"Đóng"* ghi nhớ phiên truy cập (`sessionStorage`) để không gây phiền toái khi chuyển qua lại các tab.
- **Biểu tượng chuông thông báo**: Đặt trên thanh điều hướng để người đọc có thể bấm mở lại danh sách bot mới bất kỳ lúc nào.

### B. Bảng Tin Tác Giả Tự Đăng (Gắn liền dưới phần Tài khoản)
- **Vị trí hiển thị**: Chuyển bảng tin tin tức do tác giả đăng về **ngay dưới khối Tài khoản hiện tại (Cột bên trái)**.
- **Bình luận gắn liền liền mạch**: Mỗi bài tin tức tích hợp trực tiếp khu vực thảo luận bên dưới (không chia nửa component, không dùng drawer tách rời):
  - Hiển thị nội dung tin tức, ảnh minh họa (nếu có), lượt tim, số lượng bình luận.
  - Nút bấm mở/thu gọn bình luận ngay dưới bài đăng.
  - Form nhập bình luận và danh sách phản hồi từ độc giả + phản hồi chính thức của tác giả (với huy hiệu Tác Giả).
- **Phân quyền Đăng & Xóa**:
  - Toàn bộ nút *"Đăng bản tin mới"* và *"Xóa bản tin"* được đặt **độc quyền bên trong Mục Tác Giả (`AdminPanel`)**.
  - Người dùng thông thường chỉ có quyền đọc, thả tim và bình luận.
  - Nút xóa trong mục tác giả được kết nối trực tiếp với API `/api/announcements/:id`, đảm bảo xóa thật, cập nhật state tức thời và đồng bộ Firestore.

### C. Tinh Chỉnh Bảng Xếp Hạng & Bỏ Mục "Tất Cả"
- **Bỏ bảng xếp hạng bên ngoài**: Loại bỏ hoàn toàn khối Top Trending / Bảng Xếp Hạng Lượt Xem ở đầu danh sách bot chính. Bảng xếp hạng chỉ hiển thị độc quyền khi người dùng chọn tab **"🏆 Bảng Xếp Hạng"** (`LeaderboardView`).
- **Xóa mục "Tất cả"**: Loại bỏ tab "🌟 Tất Cả Bot". Tab mặc định khi mở trang là **"🌸 Bot Thuần GL"**. Các tab điều hướng chính gồm:
  1. `🌸 Bot Thuần GL (Girls Love)`
  2. `🔵 Bot Futa AI (Specialty)`
  3. `🏆 Bảng Xếp Hạng`
  4. `💌 Gửi Góp Ý / Feedback`
  5. `💡 Đề Xuất Ý Tưởng`
  6. `⭐ Bot Đã Lưu`

### D. Tinh Chỉnh Typography Tên Bot & Hiển Thị Đầy Đủ Tag
- **Tên Bot In Nghiêng Sắc Sảo**: Áp dụng font chữ in nghiêng cao cấp (`font-serif italic font-bold tracking-wide text-[18px] sm:text-[22px] text-slate-900 dark:text-slate-50 group-hover:text-pink-600 transition-colors drop-shadow-xs`), tạo cảm giác sắc nét, thanh thoát như tiểu thuyết cao cấp.
- **Hiển thị 100% Tag**: Gỡ bỏ hoàn toàn mọi giới hạn cắt tag (`.slice(0, 4)` hay `.slice(0, 3)`). Tất cả các tag mà tác giả gắn vào bài viết sẽ được hiển thị đầy đủ, tự động xuống dòng mượt mà.
- **Định dạng Tag**: Nhỏ gọn, nghiêng, thanh lịch (`font-serif italic text-[11px] px-2.5 py-0.5 rounded-full`).

### E. Bỏ Phần Sắp Xếp & Bổ Sung Bộ Lọc Tag Đa Năng (Bao Gồm & Loại Trừ)
- **Bỏ phần sắp xếp**: Bỏ dropdown sắp xếp và thanh nút phân loại ("Mới nhất", "A-Z", v.v.). Mặc định danh sách bot luôn ưu tiên các bot mới nhất lên đầu.
- **Bộ Lọc Tag Thông Minh**:
  - **Ô tìm kiếm tag**: Gõ từ khóa để lọc nhanh các tag trong kho tag hiện có.
  - **Cơ chế 3 trạng thái cho từng tag**:
    - *Chưa chọn* (Mặc định): Tag hiển thị bình thường, nền nhẹ.
    - *Bao gồm (+)*: Bot bắt buộc phải có tag này (hiển thị màu xanh ngọc / hồng nổi bật với dấu `+`).
    - *Loại trừ (-)*: Bot không được chứa tag này / những tag không muốn xuất hiện (hiển thị màu đỏ gạch chân với dấu `-` hoặc `⊘`).
  - **Thanh trạng thái bộ lọc**: Hiển thị danh sách các tag đang bao gồm (+) và đang loại trừ (-), kèm nút [×] để gỡ nhanh từng tag hoặc nút *"Xóa tất cả lọc tag"*.

### F. Nâng Cấp Phần Đề Xuất Ý Tưởng (Ideas & Requests)
- **Ý tưởng mới nhất lên đầu**: Sắp xếp danh sách đề cử theo thời gian đăng giảm dần (`createdAt` descending).
- **Khu vực bình luận thu gọn thông minh**:
  - Khi đóng (mặc định): Thu gọn lại, chỉ hiển thị số lượng bình luận (ví dụ: `💬 Bình luận (5) ▼`).
  - Khi mở: Mở rộng hiển thị danh sách các bình luận và khung nhập bình luận trực tiếp bên trong thẻ ý tưởng, kèm nút `▲ Thu gọn bình luận`.

---

## 2. Kế Hoạch Thay Đổi Files Cụ Thể

### 1. `src/components/NewBotWeeklyModal.tsx` (Tạo mới)
- Modal pop-up tự động xuất hiện khi có bot mới trong 7 ngày.
- Thiết kế hình ảnh bìa bot, tên bot in nghiêng sắc sảo, nút "Trải nghiệm ngay" / "Xem chi tiết".
- Hỗ trợ cuộn ngang nếu có nhiều hơn 1 bot mới, lưu trạng thái tắt vào `sessionStorage`.

### 2. `src/components/AuthorNewsfeedWidget.tsx` (Tạo mới hoặc tái cấu trúc từ Announcement)
- Hiển thị danh sách các bản tin chính thức do tác giả đăng, đặt tại cột trái ngay dưới thẻ Tài khoản người dùng.
- Tích hợp trực tiếp danh sách bình luận và ô nhập bình luận gắn liền dưới từng bài tin.
- Không có nút đăng/xóa ở giao diện người dùng (chỉ người xem bình thường).

### 3. `src/components/AdminPanel.tsx`
- Tích hợp đầy đủ khối **"Quản Lý Bản Tin & Thông Báo Tác Giả"** trong giao diện tác giả:
  - Form đăng bản tin (Tiêu đề, Nội dung, Link ảnh đính kèm).
  - Danh sách bản tin đã đăng kèm ngày tháng, số tim, số bình luận.
  - Nút **"Xóa Bản Tin"** màu đỏ với hộp thoại xác nhận, gọi endpoint `DELETE /api/announcements/:id` kèm mã `passcode` tác giả.

### 4. `src/components/UserPanel.tsx`
- Loại bỏ tab `"All"` (đặt mặc định `"GL"`).
- Loại bỏ khối Top Trending / Bảng xếp hạng lượt xem ở trang chủ danh mục bot.
- Tích hợp `NewBotWeeklyModal` và nút chuông báo bot mới.
- Tích hợp `AuthorNewsfeedWidget` dưới thẻ Profile tài khoản bên cột trái.
- Xóa bỏ dropdown sắp xếp và thanh quick sort buttons.
- Thêm bộ lọc tag đa năng: `selectedTags` (bao gồm) và `excludedTags` (loại trừ).
- Cập nhật logic `getFilteredBots` kiểm tra cả điều kiện bao gồm lẫn loại trừ.
- Sửa typography tên bot thành `font-serif italic font-bold tracking-wide ...`.
- Hiển thị đầy đủ 100% tags của bot (xóa bỏ `.slice(0, 4)`).

### 5. `src/components/MasonryRequestsView.tsx`
- Sắp xếp ý tưởng theo `createdAt` mới nhất lên đầu.
- Cải tiến phần bình luận thành nút thu gọn hiển thị số bình luận khi đóng, mở ra xem và gửi bình luận khi bấm mở.

### 6. `src/components/AboutAuthor.tsx` & `src/components/LeaderboardView.tsx`
- Gỡ bỏ các hàm `.slice(...)` ở phần hiển thị tag để bảo đảm mọi nơi đều hiển thị đủ tag như bài đăng.

---

## 3. Xác Minh & Kiểm Thử
1. **Kiểm tra Pop-up bot mới**: Xác minh pop-up tự động hiện khi có bot trong 7 ngày, đóng mở trơn tru.
2. **Kiểm tra Bảng tin tác giả**: Đăng bài tin mới trong mục tác giả, kiểm tra hiển thị dưới phần tài khoản và thử gửi bình luận liền mạch.
3. **Kiểm tra Quyền xóa tác giả**: Thử xóa bản tin trong AdminPanel, xác nhận bài tin biến mất vĩnh viễn khỏi server và giao diện.
4. **Kiểm tra Lọc Tag**: Chọn 2 tag bao gồm, 1 tag loại trừ, xác nhận danh sách bot lọc chính xác tuyệt đối.
5. **Kiểm tra Typography & Tag đầy đủ**: Quan sát tên bot in nghiêng đẹp mắt và toàn bộ tag được hiển thị trọn vẹn.
6. **Kiểm tra Bảo toàn dữ liệu**: Đảm bảo toàn bộ lượt click, bình luận, góp ý và lượt xem bot không bị ảnh hưởng.
