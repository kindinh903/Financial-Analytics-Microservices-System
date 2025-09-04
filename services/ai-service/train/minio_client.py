from minio import Minio

minio_client = Minio(
    "localhost:9000",  # dùng tên service Docker network
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)

BUCKET_NAME = "models"

# Tạo bucket nếu chưa có
if not minio_client.bucket_exists(BUCKET_NAME):
    minio_client.make_bucket(BUCKET_NAME)
