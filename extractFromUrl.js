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
    const ffmpegPath = "/opt/bin/ffmpeg";

    // Extend PATH so yt-dlp can find ffmpeg
    const env = {
      ...process.env,
      PATH: `${ffmpegDir}:${process.env.PATH}`,
    };

    const cookiesPath = "/tmp/yt-cookies.txt";
    const command = `${ytDlpPath} \
  --cookies "${cookiesPath}" \
  --ffmpeg-location ${ffmpegPath} \
  --no-cache-dir \
  -x --audio-format mp3 \
  --user-agent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36" \
  -o "${audioPath}" "${url}"`;

    await s3
      .getObject({
        Bucket: process.env.BUCKET_NAME,
        Key: "yt-cookies.txt",
      })
      .promise()
      .then((data) => {
        fs.writeFileSync("/tmp/yt-cookies.txt", data.Body);
        console.log("📄 Cookie file contents:\n" + data.Body.toString());
      });

    console.log("▶️ Running yt-dlp command:", command);
    console.log("✅ yt-dlp file exists:", fs.existsSync("/tmp/yt-cookies.txt"));
    console.log(
      "📏 yt-dlp file size:",
      fs.statSync("/tmp/yt-cookies.txt").size
    );
    console.log("🔍 Checking ffmpeg exists:", fs.existsSync("/opt/bin/ffmpeg"));
    console.log("🔍 ffmpeg stat:", fs.statSync("/opt/bin/ffmpeg"));

    try {
      execSync(command, { stdio: "inherit", env });
    } catch (execError) {
      console.error(
        "❌ yt-dlp error:",
        execError.stderr?.toString() || execError.message
      );
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "yt-dlp command failed: " + execError.message,
        }),
      };
    }

    if (!fs.existsSync(audioPath)) {
      throw new Error("yt-dlp did not produce expected output file.");
    }

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

    console.log("✅ Upload to S3 complete:", s3Key);

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
