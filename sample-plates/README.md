# Ảnh biển số mẫu để test OCR

Bộ ảnh biển số xe máy VN **sạch, rõ** — đã kiểm tra OCR đọc đúng 100%. Dùng để test tính năng
"chụp ảnh biển số → OCR" ở tab **Check-in** (owner) hoặc mục **dự phòng Checkout** (khách mất/hết pin).

## Cách dùng
1. Đăng nhập `owner1 / 123456` → **Vận hành (Check-in)**.
2. Bước 2 "Biển số xe" → bấm vùng **Tải ảnh biển số** → chọn 1 file trong thư mục này.
3. Đợi OCR (~2–5s) → biển số tự điền vào ô. Sửa lại nếu cần.

## File có sẵn (SVG — mở/upload trực tiếp được)
| File | OCR đọc ra |
|------|-----------|
| `bien-59-V1-793.79.svg` | 59V1-793.79 |
| `bien-29-X3-112.78.svg` | 29X3-112.78 |
| `bien-51-F8-234.56.svg` | 51F8-234.56 |
| `bien-60-B2-555.99.svg` | 60B2-555.99 |

## Muốn ảnh PNG (raster, giống ảnh chụp)?
Mở `generate.html` bằng trình duyệt → có sẵn các mẫu + ô nhập tự tạo biển bất kỳ → bấm **Tải PNG**.

## Mẹo để OCR đọc tốt (ảnh chụp thật)
- Chụp **thẳng**, đủ sáng, **không lóa**, biển chiếm phần lớn khung nhưng **không sát mép quá**.
- Biển xe máy VN 2 dòng đọc tốt nhất. Biển 1 dòng (ô tô) ngoài phạm vi MVP.
- OCR là hỗ trợ — luôn **kiểm tra & sửa** ô biển số trước khi xác nhận.
