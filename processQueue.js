import { fetchFileFromS3 } from "./utils/s3Utils.js";
import { processTextFile } from "./textProcessing.js";
import {
  chunkAndTranscribeAudio,
  processAudioFile,
} from "./utils/transcriptionUtils.js";
import { saveToDynamoDB, markAsFailed } from "./utils/dynamoDbUtils.js";

export const processQueue = async (event) => {
  console.log("🚀 processQueue triggered");

  try {
    for (const record of event.Records) {
      const message = JSON.parse(record.body);
      const { id, fileId, fileName } = message;

      console.log(`📥 Processing started for ID: ${id}, File: ${fileName}`);

      const fileKey = `${fileId}-${fileName}`;
      const file = await fetchFileFromS3(fileKey, id);
      if (!file) continue;

      const fileSizeInBytes = file.ContentLength || file.Body.length;

      let processedText = "";
      let segments = null;

      if (fileName.endsWith(".txt")) {
        processedText = await processTextFile(file, id);
      } else if (fileSizeInBytes > 25 * 1024 * 1024) {
        ({ processedText, segments } = await chunkAndTranscribeAudio(
          file,
          fileName,
          id
        ));
      } else {
        ({ processedText, segments } = await processAudioFile(
          file,
          fileName,
          id
        ));
      }

      if (processedText) {
        await saveToDynamoDB(id, processedText, segments);
      } else {
        await markAsFailed(id, "No processed text found.");
      }
    }

    return { statusCode: 200 };
  } catch (error) {
    console.error("❌ General Error in processQueue:", error.message);
    return { statusCode: 500 };
  }
};
