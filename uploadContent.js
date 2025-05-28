// uploadContent.js
import AWS from "aws-sdk";

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BUCKET_NAME;

export const uploadContent = async (event) => {
  try {
    const { fileName, fileType, fileId } = JSON.parse(event.body);
    const fileKey = `${fileId}-${fileName}`;

    try {
      await s3
        .headObject({
          Bucket: BUCKET_NAME,
          Key: fileKey,
        })
        .promise();

      console.log("✅ File already exists in S3, skipping upload.");

      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ uploadUrl: null, fileId, alreadyExists: true }),
      };
    } catch (err) {
      if (err.code !== "NotFound") throw err;
    }

    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Expires: 60 * 5,
      ContentType: fileType,
    };

    const uploadUrl = await s3.getSignedUrlPromise("putObject", s3Params);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ uploadUrl, fileId, alreadyExists: false }),
    };
  } catch (error) {
    console.error("❌ Error generating upload URL:", error.message);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message: error.message }),
    };
  }
};
