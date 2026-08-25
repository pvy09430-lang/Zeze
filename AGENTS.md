# CRITICAL PRESERVATION POLICIES (QUY TẮC BẢO TOÀN DỮ LIỆU)

This project has strict rules about data retention and integrity. All developers and AI agents MUST adhere to these policies:

## 1. Zero-Data-Deletion Policy (Không tự ý xóa dữ liệu)
- **DO NOT TRUNCATE OR DELETE USER DATA:** Under any circumstances, you are strictly forbidden from writing code or executing scripts that automatically delete, trim, or overwrite user contributions.
- **DATA TYPES PROTECTED:**
  - **Lượt click (Clicks & Interactions):** Must never be reset or cleared.
  - **Bình luận & Phản hồi (Comments & Replies):** All comments and nested replies must be preserved permanently.
  - **Ý tưởng & Yêu cầu (Bot Requests & User Ideas):** Bot requests, upvotes, and developer replies must remain fully intact.
  - **Lượt truy cập & Lượt xem (Views & Visits):** Views on individual bots and global analytics must be preserved.
  - **Nhật ký truy cập (Visitor/Activity Logs):** Activity logs must be stored and restored seamlessly. The memory limit is set to 2,000 logs and must not be reduced.

## 2. Cloud Storage & Caching Guidelines (Đồng bộ đám mây & Bộ đệm)
- **Cloudinary Integration:** Always verify `isCloudinaryConfigured` before processing image uploads. Fall back gracefully to base64 compression if credentials are empty or invalid.
- **Views Buffer:** Do not perform direct Firestore writes per view increment. Always buffer views in `viewsBuffer` and flush them periodically (every 3 minutes) to Firestore to conserve quota.
- **Consolidated mainState Loading:** Prefer loading the single consolidated `appData/mainState` document on startup to save reads, but keep the individual collection backup merging path active as an automated fallback.
- **Throttled Backups:** Keep cloud backup write frequencies throttled (Visitor logs every 5 minutes, mainState every 2 minutes) to ensure high-performance, cost-efficient, and fail-safe database operations.
