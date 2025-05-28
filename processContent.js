// processContent.js

import AWS from "aws-sdk";
import { v4 as uuidv4 } from "uuid";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const sqs = new AWS.SQS();
const TABLE_NAME = process.env.TABLE_NAME;
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL;

export const processContent = async (event) => {
  console.log("🚀 processContent triggered", JSON.stringify(event)); // Log the incoming event

  try {
    const { fileId, fileName } = JSON.parse(event.body);
    const id = uuidv4();

    console.log(`📥 Received file upload request: ${fileName}, ID: ${id}`);

    const item = {
      id,
      fileId,
      originalFileName: fileName,
      status: "Pending",
      timestamp: new Date().toISOString(),
    };

    await dynamoDb.put({ TableName: TABLE_NAME, Item: item }).promise();
    console.log("✅ File status saved to DynamoDB as Pending");

    // Send a message to the SQS queue for processing
    const sqsParams = {
      MessageBody: JSON.stringify({ id, fileId, fileName }),
      QueueUrl: SQS_QUEUE_URL,
    };

    await sqs.sendMessage(sqsParams).promise();
    console.log(
      `📤 Message sent to SQS queue for processing. Processing ID: ${id}`
    );

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "http://localhost:3000" },
      body: JSON.stringify({ message: "Processing started", processingId: id }),
    };
  } catch (error) {
    console.error("❌ Error starting processing:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: error.message }),
    };
  }
};
