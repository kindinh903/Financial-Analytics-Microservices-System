FROM python:3.11-slim

WORKDIR /app

# Copy requirements first for better cache
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn vào container
COPY . .

# Đảm bảo PYTHONPATH để import được src/app/*
ENV PYTHONPATH=/app/src

# Chạy FastAPI bằng Uvicorn, chỉ định đúng module main
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8081", "--reload"]