# Đề xuất giao diện doanh thu từ Mentor

## 3.1 Trang /admin/mentor-bookings

- **Bảng đơn đặt lịch** (học cùng / tư vấn)
- **Lọc theo**: loại (session/consultation), mentor, khoảng thời gian
- **Thống kê**:
  - Tổng doanh thu
  - Số đơn tư vấn (consultation)
  - Số đơn học cùng (session)
  - Phân chia: Platform 20%, Mentor 80%

## 3.2 Cấu trúc dữ liệu

**Collection `mentorBookings`**:
- `userId`: ID người đặt
- `mentorId`: ID mentor
- `type`: `session` | `consultation`
- `amount`: Số tiền (VND)
- `status`: `pending` | `paid` | `completed` | `cancelled`
- `scheduledAt`: Ngày giờ hẹn
- `topic`: Chủ đề
- `paymentId`: ID thanh toán PayOS (khi tích hợp)

## 3.3 Luồng user

1. **Trang mentor detail** (`/mentors/[id]`):
   - 2 CTA rõ ràng: **"Đăng ký học cùng"** và **"Đặt lịch tư vấn"**
   - Form: chọn ngày, khung giờ, chủ đề → Thanh toán PayOS

2. **Đăng nhập** bắt buộc để đặt lịch

## 3.4 Phân chia doanh thu

- **Platform**: 20%
- **Mentor**: 80%
- Báo cáo theo mentor
- Export Excel (triển khai sau)

## 3.5 Thứ tự triển khai

1. ✅ Tạo collection `mentorBookings` và API CRUD
2. ⏳ Tích hợp PayOS cho mentor booking
3. ✅ Trang `/admin/mentor-bookings`
4. ✅ Cập nhật trang mentor detail
5. ⏳ Báo cáo phân chia 20/80 và export Excel

## Lưu ý

Doanh thu VIP và Mentor hiện chưa có dữ liệu thật (chưa có luồng thanh toán). Khi triển khai thanh toán VIP và đặt lịch Mentor, cần ghi thêm vào `revenueTransactions` với `sourceType` tương ứng:
- `mentor_session`: Học cùng
- `mentor_consultation`: Tư vấn
