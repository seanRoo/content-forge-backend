import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const s3 = new AWS.S3();
const BUCKET_NAME = process.env.BUCKET_NAME;

export const extractFromUrl = async (event) => {
  console.log("🟢 extractFromUrl invoked", { event });

  try {
    const { url } = JSON.parse(event.body);
    if (!url) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing URL" }),
      };
    }

    const fileId = uuidv4();
    const tmpDir = "/tmp";
    const audioPath = path.join(tmpDir, `${fileId}.mp3`);

    const ytDlpPath = "/opt/bin/yt-dlp";
    const ffmpegDir = "/opt/bin";

    const env = {
      ...process.env,
      PATH: `${ffmpegDir}:${process.env.PATH}`,
    };

    const command = `${ytDlpPath} -x --audio-format mp3 -o "${audioPath}" "${url}"`;
    console.log("▶️ Running yt-dlp command...");
    execSync(command, { stdio: "inherit", env });

    const fileBuffer = fs.readFileSync(audioPath);
    const s3Key = `${fileId}.mp3`;

    await s3
      .putObject({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        Body: fileBuffer,
        ContentType: "audio/mpeg",
      })
      .promise();

    return {
      statusCode: 200,
      body: JSON.stringify({ fileId }),
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    };
  } catch (err) {
    console.error("❌ Error extracting from URL:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
