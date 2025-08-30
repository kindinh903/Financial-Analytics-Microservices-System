
FROM python:3.10-slim
WORKDIR /app

# Copy all source code
COPY ./app ./app
COPY ./train ./train
COPY ./data ./data

# Set environment variables (nếu cần)
ENV PYTHONUNBUFFERED=1

# Expose port
EXPOSE 8084

# Command to run FastAPI app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8084", "--reload"]
