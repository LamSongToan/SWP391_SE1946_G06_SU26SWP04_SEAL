# Business Flows — SEAL Hackathon Management System

## BF-01 — Account Registration & Approval Flow

### Actors
- Team Member
- Team Leader
- Event Coordinator

### Flow
1. Người dùng đăng ký tài khoản trên hệ thống.
2. Hệ thống lưu tài khoản với trạng thái `PendingApproval`.
3. Coordinator xem danh sách tài khoản chờ duyệt.
4. Coordinator approve hoặc reject tài khoản.
5. Nếu được approve → tài khoản chuyển sang `Active`.
6. Người dùng có thể tham gia các chức năng của event.

---

## BF-02 — Event Configuration Flow

### Actors
- Event Coordinator

### Flow
1. Coordinator tạo Hackathon Event.
2. Tạo các Tracks trong event.
3. Tạo các Rounds cho từng event.
4. Thiết lập deadline nộp bài.
5. Thiết lập rubric và scoring criteria.
6. Hệ thống lưu cấu hình event.

---

## BF-03 — Team Formation Flow

### Actors
- Team Leader
- Team Member

### Flow
1. Team Leader tạo đội thi.
2. Team Leader gửi lời mời cho thành viên.
3. Team Member nhận và chấp nhận lời mời.
4. Hệ thống thêm thành viên vào team.
5. Team Leader đăng ký track cho team.

---

## BF-04 — Mentor & Judge Assignment Flow

### Actors
- Event Coordinator
- Mentor
- Judge

### Flow
1. Coordinator phân công mentor theo track.
2. Coordinator phân công judge theo round/track.
3. Judge truy cập danh sách submission được assign.
4. Mentor theo dõi và hỗ trợ các team trong track.

---

## BF-05 — Submission Management Flow

### Actors
- Team Leader

### Flow
1. Team Leader chọn round cần nộp bài.
2. Nhập GitHub repository link.
3. Nhập demo link và report link.
4. Hệ thống kiểm tra tính hợp lệ của URL.
5. Hệ thống lưu submission và timestamp.
6. Sau deadline, submission bị khóa.

---

## BF-06 — Evaluation & Scoring Flow

### Actors
- Judge

### Flow
1. Judge mở submission được phân công.
2. Hệ thống hiển thị rubric chấm điểm.
3. Judge nhập điểm theo từng criterion.
4. Judge finalize điểm.
5. Hệ thống lưu score của từng judge.

---

## BF-07 — Ranking & Promotion Flow

### Actors
- Event Coordinator
- System

### Flow
1. Hệ thống tổng hợp điểm từ các judges.
2. Tính weighted score cho từng submission.
3. Xếp hạng theo track/round.
4. Xác định top N teams thăng vòng.
5. Hệ thống lưu ranking results.

---

## BF-08 — Elimination & Audit Flow

### Actors
- Event Coordinator

### Flow
1. Coordinator chọn team/submission vi phạm.
2. Nhập lý do loại.
3. Hệ thống cập nhật trạng thái `Eliminated`.
4. Hệ thống ghi audit log.
5. Hệ thống có thể tính lại ranking nếu cần.

---

## BF-09 — Result Publishing Flow

### Actors
- Event Coordinator
- Team Members

### Flow
1. Coordinator publish kết quả cuộc thi.
2. Hệ thống hiển thị rankings.
3. Hiển thị promotion results.
4. Export kết quả ra CSV/Excel nếu cần.

---

## BF-10 — Research & Reliability Analysis Flow (RBL)

### Actors
- Researcher
- Event Coordinator

### Flow
1. Hệ thống thu thập dữ liệu scoring.
2. Phân tích variance giữa các judges.
3. Tính ICC / Krippendorff’s Alpha.
4. Hiển thị analytics dashboard.
5. Export anonymized dataset phục vụ nghiên cứu.