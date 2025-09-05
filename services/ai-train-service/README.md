📘 AI Train Service
AI Train Service là microservice chịu trách nhiệm huấn luyện mô hình dự đoán giá crypto/stock dựa trên dữ liệu nến (OHLCV) và sentiment (Fear & Greed Index).
Kết quả huấn luyện sẽ được lưu dưới dạng model.pkl + meta.json và đẩy lên MinIO để các service khác (ví dụ: ai-predict-service) có thể sử dụng.

🚀 Tính năng
Fetch dữ liệu nến từ Binance API.
Merge dữ liệu sentiment từ Fear & Greed Index (FNG).
Huấn luyện mô hình cho từng symbol và interval.
Lưu dữ liệu train ra .csv (tuỳ chọn để debug/trace).
Đẩy model lên MinIO để phục vụ inference.
📂 Cấu trúc thư mục
services/
└── ai-train-service/
    ├── app/
    │   ├── app.py               # Script chính để train all symbols/intervals
    │   ├── train_one.py         # Hàm train cho 1 symbol-interval
    │   ├── fetch_data.py        # Fetch dữ liệu OHLCV từ Binance
    │   ├── sentiment_fng.py     # Lấy và xử lý dữ liệu sentiment
    │   ├── config.py            # Cấu hình (env, MinIO, intervals, symbols)
    │   └── minio_client.py      # Client kết nối MinIO
    ├── requirements.txt
    ├── Dockerfile
    └── README.md
⚙️ Cấu hình
Sử dụng biến môi trường (hoặc .env):

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=models

# Symbols & intervals
SYMBOL_WHITELIST=BTCUSDT,ETHUSDT
INTERVALS=1m,5m,15m,1h,1d

# Tùy chọn
TRAIN_INTERVAL=1h   # Nếu muốn chỉ train 1 interval
DATA_PATH=./data/hist


# Chạy local

Cài dependencies:
pip install -r requirements.txt

Chạy train:
python app/app.py


Models sau khi train sẽ được lưu ở:
Local: ./models/{symbol}_{interval}/
MinIO: bucket ${MINIO_BUCKET}