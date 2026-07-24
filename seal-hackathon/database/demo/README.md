# Main Flow Demo Import

Module này cho phép coordinator nạp lại dữ liệu demo từ giao diện web:

`Dashboard → Import Data`

Mỗi nút tương ứng với một trạng thái chính của Main Flow. Khi import, backend
đọc đúng script được đóng gói trong thư mục này và tự dịch toàn bộ các mốc
`DATETIME2` từ timeline mẫu sang ngày hiện tại theo múi giờ
`Asia/Ho_Chi_Minh` (mốc mặc định là 09:00).

## Các kịch bản

| Nhóm | Nút trên giao diện | Script |
| --- | --- | --- |
| 01 Event Configuration | Reset demo | `01_event_configuration/00_event_configuration_base.sql` |
| 02 Team Formation & Submission | Registration open | `02_team_formation_submission_management/01_registration_open_team_formation.sql` |
| 02 Team Formation & Submission | Qualifier submission open | `02_team_formation_submission_management/02_round1_submission_open.sql` |
| 03 Scoring, Promotion & Publish | Qualifier scoring open | `03_scoring_promotion_publish/01_scoring_open_judge_ready.sql` |
| 03 Scoring, Promotion & Publish | Qualifier ready to finalize | `03_scoring_promotion_publish/02_ready_for_finalize_promote_publish.sql` |
| 03 Scoring, Promotion & Publish | Final round open | `03_scoring_promotion_publish/03_advance_to_final_after_promotion.sql` |
| 04 Awards | Final ready to publish | `04_awards/01_final_ready_for_award_publish.sql` |

Các script được chọn cố định ở backend, không nhận đường dẫn SQL tùy ý từ
trình duyệt. Trước khi chạy, backend cũng kiểm tra script thuộc Main Flow của
event `SEAL Summer 2026`.

## Cấu hình

Profile dev đã bật module:

```properties
app.demo.enabled=true
app.demo.script-root=../database/demo
app.demo.zone-id=Asia/Ho_Chi_Minh
```

Có thể ghi đè bằng biến môi trường:

```text
DEMO_ENABLED=true
DEMO_SCRIPT_ROOT=../database/demo
DEMO_ZONE_ID=Asia/Ho_Chi_Minh
```

Profile production mặc định tắt (`DEMO_ENABLED=false`). Chỉ bật trong môi
trường demo đã được bảo vệ quyền coordinator và có backup dữ liệu.

## Cách demo liên tục

1. Đăng nhập bằng tài khoản coordinator.
2. Mở `Import Data`.
3. Chọn đúng trạng thái cần trình diễn.
4. Xác nhận import.
5. Thực hiện flow trên web.
6. Khi cần quay lại từ đầu, chọn `Reset demo`.

Import bắt đầu bằng bước khôi phục phạm vi event seed: mọi event được tạo thêm
ngoài `SEAL Spring 2026` và `SEAL Summer 2026` sẽ bị xóa cùng dữ liệu phụ thuộc.
Sau đó script tương ứng sẽ làm sạch và dựng lại teams, registrations,
submissions, scores, rankings, notifications và awards của Summer 2026. Hộp
thoại xác nhận sẽ hiển thị trước khi có thay đổi. Vì vậy kết quả tương đương
việc quay lại database seed trước khi chạy file demo, mà không cần chạy lại
thủ công toàn bộ SQL hoặc khởi động lại backend giữa các bước.

Các script dùng `SET NOCOUNT ON` trong lúc dựng snapshot. Backend luôn chạy
`SET NOCOUNT OFF` trên cùng connection trong khối `finally` trước khi trả
connection về pool, kể cả khi import thất bại. Việc này ngăn các thao tác JPA
sau import bị lỗi ngẫu nhiên khi insert bản ghi có identity/generated key.
