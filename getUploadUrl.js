import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BUCKET_NAME;

export const getUploadUrl = async (event) => {
  try {
    const { fileName, fileType } = JSON.parse(event.body);
    const fileId = uuidv4();

    const key = `${fileId}-${fileName}`;

    const params = {
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType,
      Expires: 60 * 5, // 5 minutes
    };

    const uploadUrl = s3.getSignedUrl("putObject", params);

    return {
      statusCode: 200,
      body: JSON.stringify({ uploadUrl, fileId, fileName }),
    };
  } catch (err) {
    console.error("❌ getUploadUrl error:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Failed to generate upload URL" }),
    };
  }
};
