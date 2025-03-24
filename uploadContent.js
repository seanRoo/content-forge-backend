import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BUCKET_NAME;

export const uploadContent = async (event) => {
  try {
    const { fileName, fileType } = JSON.parse(event.body);
    const fileId = uuidv4();
    const s3Params = {
      Bucket: BUCKET_NAME,
      Key: `${fileId}-${fileName}`,
      Expires: 60 * 5, // URL valid for 5 minutes
      ContentType: fileType,
    };

    const uploadUrl = await s3.getSignedUrlPromise("putObject", s3Params);

    return {
      statusCode: 200,
      body: JSON.stringify({ uploadUrl, fileId }),
    };
  } catch (error) {
    console.log(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
