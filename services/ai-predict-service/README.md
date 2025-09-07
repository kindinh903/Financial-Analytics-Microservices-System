Lưu ý: Model sẽ được lấy ở local tại folder ./models trước, nếu không tồn tại sẽ lấy ở minio. 
- Cần kiểm tra kết nối đến minio
- Chạy ai-train-service trước để SETUP DŨE LIỆU model trong minio

## 1. Hướng dẫn sử dụng API

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