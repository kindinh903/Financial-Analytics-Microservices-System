from minio import Minio

minio_client = Minio(
    "minio:9000",  # test local thì đổi thành localhost
    access_key="minioadmin",
    secret_key="minioadmin",
    secure=False
)

BUCKET_NAME = "models"

# Tạo bucket nếu chưa có
if not minio_client.bucket_exists(BUCKET_NAME):
    minio_client.make_bucket(BUCKET_NAME)
