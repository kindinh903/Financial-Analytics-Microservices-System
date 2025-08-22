FROM python:3.11-slim

WORKDIR /app

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better cache
COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy toàn bộ mã nguồn vào container
COPY . .

# Đảm bảo PYTHONPATH để import được src/app/*
ENV PYTHONPATH=/app/src

# Expose port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8081/health || exit 1

# Chạy FastAPI bằng Uvicorn, chỉ định đúng module main
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8081", "--reload", "--root-path", "/api"]