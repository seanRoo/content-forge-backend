import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

export const saveToDynamoDB = async (
  id,
  processedText,
  segments = null,
  summary = null,
  tweets = null
) => {
  try {
    const updates = {
      status: "Completed",
      processedText,
      ...(segments && { segments }),
      ...(summary && { summary }),
      ...(tweets && { tweets }),
    };

    const updateExpressions = [];
    const ExpressionAttributeNames = {};
    const ExpressionAttributeValues = {};

    for (const [key, value] of Object.entries(updates)) {
      updateExpressions.push(`#${key} = :${key}`);
      ExpressionAttributeNames[`#${key}`] = key;
      ExpressionAttributeValues[`:${key}`] = value;
    }

    const params = {
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: "SET " + updateExpressions.join(", "),
      ExpressionAttributeNames,
      ExpressionAttributeValues,
    };

    await dynamoDb.update(params).promise();
    console.log(
      `📌 Successfully saved data for ID: ${id} (${Object.keys(updates).join(
        ", "
      )})`
    );
  } catch (err) {
    console.error("❌ DynamoDB Update Error:", err.message);
  }
};

export const markAsFailed = async (id, errorMessage) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: { id },
      UpdateExpression: "SET #status = :status, processedText = :errorMessage",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "Failed",
        ":errorMessage": errorMessage,
      },
    };
    await dynamoDb.update(params).promise();
    console.log(`❌ Marked processing as failed for ID: ${id}`);
  } catch (err) {
    console.error("❌ Failed to update DynamoDB:", err.message);
  }
};
