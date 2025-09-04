# AI Prediction Service - Báo cáo & Hướng dẫn sử dụng

## 1. Hướng dẫn train model

Bạn có thể train lại các model dự đoán giá cho từng cặp coin và khung thời gian bằng script `train_all.py`.

### Các bước thực hiện:
  pip install -r requirements.txt
1. **Thay đổi danh sách symbol và interval**  
   - Mở file `app/config.py`
   - Sửa các biến `SYMBOL_WHITELIST` và `INTERVALS` để chọn các cặp coin + interval muốn train.

2. **Chạy train model**
   - Mở terminal tại thư mục `ai-service`
   - Chạy lệnh:
     ```bash
     PYTHONPATH=. python train/train_all.py
     ```
   - Các model sau khi train sẽ được lưu vào thư mục `models/` và tự động upload lên MinIO (nếu cấu hình MinIO đúng).

**Lưu ý:**  
- Nếu không chạy lại train, bạn vẫn có thể sử dụng các model đã có sẵn trong thư mục `models/` trên máy.

---

## 2. Danh sách các symbol và interval được hỗ trợ

- **Symbol (cặp coin):**
  - BTCUSDT
  - ETHUSDT
  - BNBUSDT
  - SOLUSDT
  - ADAUSDT
  - XRPUSDT
  - DOGEUSDT
  - DOTUSDT
  - LTCUSDT

- **Interval (khung thời gian):**
  - 1m, 3m, 5m, 15m, 30m
  - 1h, 2h, 4h, 6h, 8h, 12h
  - 1d, 3d, 1w, 1M

Bạn có thể thay đổi các giá trị này trong file [config.py](http://_vscodecontentref_/0) để mở rộng hoặc thu hẹp phạm vi dự đoán.

--


## 3. Hướng dẫn sử dụng API

### Dự đoán giá tiếp theo
POST /predict
Content-Type: application/json

{
  "data": [
    {
      "symbol": "BTCUSDT",
      "interval": "1m",
      "open": ...,
      "high": ...,
      "low": ...,
      "close": ...,
      "volume": ...,
      "close_time": ...
    },
    ...
  ]
}
data: danh sách các cây nến OHLCV (ít nhất 25 nến gần nhất).
Kết quả trả về:

{
  "status": "success",
  "result": {
    "symbol": "BTCUSDT",
    "interval": "1m",
    "last_close": 108310.0,
    "predicted_next_close": 108315.5,
    "trend": "UP",
    "change_percent": 0.51
  }
}

Flow hoạt động khi gọi API /predict của ai-prediction service như sau:

- Client gửi request POST /predict

  - Dữ liệu gửi lên gồm danh sách các cây nến OHLCV (ít nhất 20-25 nến), mỗi nến có các trường: symbol, interval, open, high, low, close, volume, close_time.

- FastAPI nhận request

  - Hàm predict trong main.py nhận dữ liệu, chuyển thành DataFrame.

- Kiểm tra dữ liệu đầu vào

  - Nếu thiếu trường symbol hoặc interval, trả về lỗi 400.
  - Nếu thiếu trường datetime, sẽ tự tạo từ close_time.

- Tiến hành dự đoán

  - Gọi hàm predict_next_close trong predictor.py.
  - Hàm này sẽ:
    - Merge dữ liệu sentiment FNG vào OHLCV.
    - Tiền xử lý, tạo các feature kỹ thuật.
    - Load model và meta phù hợp từ thư mục model (hoặc tải từ MinIO nếu chưa có).
    - Chuẩn bị dữ liệu đầu vào cho model.
    - Dự đoán giá close tiếp theo.

- Trả về kết quả
  - Kết quả gồm: symbol, interval, last_close, predicted_next_close, trend (UP/DOWN), change_percent.
  - Trả về dạng JSON cho client.