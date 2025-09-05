FROM python:3.10-slim

WORKDIR /app

# Cài system dependencies cần thiết để build package (numpy, pandas, uvicorn, etc)
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements và cài đặt
COPY requirements.txt .
RUN python -m pip install --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY ./app ./app
COPY ./train ./train
COPY ./models ./models

# Set environment
ENV PYTHONUNBUFFERED=1

# Expose port FastAPI
EXPOSE 8084

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8084/health || exit 1

# CMD chạy uvicorn
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8084"]
