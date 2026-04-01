const { Client } = require('minio');
const { env } = require('../config/env');

const minioClient = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

async function ensureBucketExists() {
  const exists = await minioClient.bucketExists(env.MINIO_BUCKET_OBRAS);
  if (!exists) {
    await minioClient.makeBucket(env.MINIO_BUCKET_OBRAS);
  }
}

module.exports = {
  minioClient,
  ensureBucketExists,
};
