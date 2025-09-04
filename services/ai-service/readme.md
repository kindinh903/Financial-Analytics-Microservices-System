# AI Prediction Service Documentation

## Tổng quan

Service này cung cấp các API dự đoán giá tài sản tài chính (crypto) dựa trên dữ liệu nến (OHLCV) và sentiment. Service sử dụng FastAPI, các model ML (LightGBM/XGBoost/RandomForest), và hỗ trợ huấn luyện lại model từ dữ liệu lịch sử.

---

## Cấu trúc thư mục

```
ai-service/
├── app.py
├── requirements.txt
├── app/
│   ├── main.py         # Entry point cho FastAPI service
│   ├── predictor.py    # Logic dự đoán giá tiếp theo
│   ├── config.py       # Cấu hình symbol, interval, v.v.
│   ├── sentiment_fng.py# Xử lý sentiment FNG
│   ├── model_store.py  # Lưu/tải model
│   └── ...             # Các module phụ trợ khác
├── train/
│   ├── train_all.py    # Huấn luyện model cho tất cả symbol/interval
│   ├── train_one.py    # Huấn luyện model cho một symbol/interval
│   ├── utils.py        # Hỗ trợ xử lý dữ liệu
│   └── ...             # Các script train khác
└── data/
    └── hist/           # Lưu file CSV lịch sử giá
```

---

## Các API chính

### 1. Health Check

- **Endpoint:** `/health`
- **Method:** `GET`
- **Trả về:** `"OK"`

### 2. Dự đoán giá tiếp theo

- **Endpoint:** `/predict`
- **Method:** `POST`
- **Request Body:**
    ```json
    {
      "data": [ { "symbol": "...", "interval": "...", "open": ..., "close": ..., ... } ],
      "model_dir": "models"
    }
    ```
- **Trả về:**
    ```json
    {
      "status": "success",
      "result": {
        "symbol": "...",
        "interval": "...",
        "last_close": ...,
        "predicted_next_close": ...,
        "trend": "UP|DOWN",
        "change_percent": ...
      }
    }
    ```

---

## Quy trình hoạt động

1. **Nhận dữ liệu OHLCV từ client** qua API `/predict`.
2. **Tiền xử lý dữ liệu**: Tạo các feature kỹ thuật, sentiment, lag features.
3. **Tải model đã huấn luyện** từ thư mục model tương ứng.
4. **Dự đoán giá tiếp theo** dựa trên dữ liệu mới nhất.
5. **Trả về kết quả dự đoán** (giá, xu hướng, phần trăm thay đổi).

---

## Huấn luyện lại model:

- **Script:** `train/train_all.py`
- **Chức năng:** Tự động fetch dữ liệu từ Binance, merge sentiment, lưu file CSV, và huấn luyện model cho từng symbol/interval.
- **Chạy lệnh:**
    ```bash
    PYTHONPATH=. python3 train/train_all.py
    ```
- **Kết quả:** Model được lưu tại `models/{symbol}_{interval}/model.pkl`.

---

## Yêu cầu cài đặt
```
fastapi
uvicorn
pandas
requests
pydantic
u8darts[prophet]
scikit-learn
joblib
python-dotenv
```

Cài đặt:
```bash
pip install -r requirements.txt
```
