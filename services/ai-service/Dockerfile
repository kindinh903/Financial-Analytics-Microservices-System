
FROM python:3.10-slim
WORKDIR /app

# system deps (darts may need build tools)
RUN apt-get update && apt-get install -y build-essential git curl && apt-get clean

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

COPY . /app
ENV PYTHONPATH=/app

EXPOSE 8084
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8084", "--ws", "auto"]
