import AWS from "aws-sdk";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import FormData from "form-data";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const S3 = new AWS.S3();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;

export const processContent = async (event) => {
  try {
    console.log("Received event:", JSON.stringify(event));
    const { fileId, fileName } = JSON.parse(event.body);
    const fileKey = `${fileId}-${fileName}`;
    const fileType = fileName.split(".").pop();

    console.log("Fetching file from S3 with key:", fileKey);

    const file = await S3.getObject({
      Bucket: BUCKET_NAME,
      Key: fileKey,
    }).promise();

    console.log("File fetched successfully.");

    let processedText;

    if (fileType === "txt") {
      console.log("Processing text file...");
      const fileContent = file.Body.toString("utf-8");

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "user",
              content: `Extract key insights and summarize the following text:\n\n${fileContent}`,
            },
          ],
          max_tokens: 1500,
          temperature: 0.5,
        },
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("OpenAI Text Processing Successful:", response.data);
      processedText = response.data.choices[0].message.content.trim();
    } else if (["mp3", "wav", "mpeg"].includes(fileType)) {
      console.log("Processing audio file...");

      const formData = new FormData();
      formData.append("file", file.Body, {
        filename: fileName,
        contentType: "audio/mpeg", // Adjust if the file is .wav or .mp3
      });
      formData.append("model", "whisper-1");
      formData.append("language", "en"); // Optional, specify if you know the language

      const audioResponse = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            ...formData.getHeaders(),
          },
        }
      );

      console.log("OpenAI Audio Transcription Successful:", audioResponse.data);
      processedText = audioResponse.data.text.trim();
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Unsupported file type." }),
      };
    }

    // Save processed result to DynamoDB
    const item = {
      id: uuidv4(),
      fileId,
      originalFileName: fileName,
      processedText,
      timestamp: new Date().toISOString(),
    };

    await dynamoDb.put({ TableName: TABLE_NAME, Item: item }).promise();

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Content processed and stored successfully",
        item,
      }),
    };
  } catch (error) {
    console.log("Error occurred:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
