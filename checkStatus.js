import AWS from "aws-sdk";

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

export const checkStatus = async (event) => {
  try {
    const { processingId } = JSON.parse(event.body);

    const result = await dynamoDb
      .get({
        TableName: TABLE_NAME,
        Key: { id: processingId },
      })
      .promise();

    if (!result.Item) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "http://localhost:3000",
        },
        body: JSON.stringify({ message: "Processing ID not found." }),
      };
    }

    const {
      status,
      processedText,
      segments,
      summary = null,
      tweets = null,
    } = result.Item;

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "http://localhost:3000",
      },
      body: JSON.stringify({
        status,
        processedText,
        segments,
        summary,
        tweets,
      }),
    };
  } catch (error) {
    console.log("Error occurred:", error.message);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "http://localhost:3000",
      },
      body: JSON.stringify({ message: error.message }),
    };
  }
};
