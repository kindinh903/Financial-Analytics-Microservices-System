FROM python:3.10-slim

WORKDIR /app

# Cài system dependencies (cho numpy, pandas, sklearn, xgboost, lightgbm)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    liblapack-dev \
    libblas-dev \
    libopenblas-dev \
    pkg-config \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*


# Tạo virtual environment trong /opt/venv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements trước (để tận dụng cache Docker)
COPY requirements.txt .

# Upgrade pip + cài packages
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY ./app ./app
COPY ./models ./models

ENV PYTHONUNBUFFERED=1

EXPOSE 8084

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8084/health || exit 1

# Start app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8084"]
