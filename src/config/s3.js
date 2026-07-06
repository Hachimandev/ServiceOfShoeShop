const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({
  region: process.env.AWS_S3_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const uploadToS3 = async (fileBuffer, fileName, mimetype) => {
  const bucketName = process.env.AWS_S3_BUCKET;
  const key = `chat-images/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: fileBuffer,
    ContentType: mimetype,
  });

  await s3Client.send(command);
  
  return `https://${bucketName}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${key}`;
};

module.exports = {
  s3Client,
  uploadToS3
};
