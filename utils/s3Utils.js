import AWS from "aws-sdk";
import { markAsFailed } from "./dynamoDbUtils.js";

const S3 = new AWS.S3();
const BUCKET_NAME = process.env.BUCKET_NAME;

export const fetchFileFromS3 = async (fileKey, id) => {
  try {
    const file = await S3.getObject({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    }).promise();
    console.log("✅ File successfully fetched from S3");
    return file;
  } catch (err) {
    console.error("❌ S3 Fetch Error:", err.message);
    await markAsFailed(id, `S3 Fetch Error: ${err.message}`);
    return null;
  }
};
