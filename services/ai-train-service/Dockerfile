FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
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

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements first (for better Docker caching)
COPY requirements.txt .

# Upgrade pip and install packages
RUN pip install --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY ./app ./app
COPY ./data ./data
COPY ./models ./models

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/app

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import sys; sys.exit(0)"

# Default command - run training
CMD ["python", "-m", "app"]
