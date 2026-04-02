"""Cliente de MinIO para leer imagenes privadas de obras."""

from io import BytesIO

from minio import Minio

from config import settings


minio_client = Minio(
    endpoint=f"{settings.MINIO_ENDPOINT}:{settings.MINIO_PORT}",
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_USE_SSL,
)


def get_object_bytes(object_key: str) -> BytesIO:
    """Descarga un objeto privado de MinIO y lo retorna como stream en memoria."""
    response = minio_client.get_object(settings.MINIO_BUCKET_OBRAS, object_key)
    try:
        return BytesIO(response.read())
    finally:
        response.close()
        response.release_conn()
