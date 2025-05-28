// textProcessing.js

import axios from "axios";
import { markAsFailed } from "./utils/dynamoDbUtils.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const processTextFile = async (file, id) => {
  try {
    const fileContent = file.Body.toString("utf-8");

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "user", content: `Summarize: ${fileContent}` }],
      },
      { headers: { Authorization: `Bearer ${OPENAI_API_KEY}` } }
    );

    const processedText = response.data.choices[0].message.content.trim();
    console.log("✅ Text processing successful");
    return { processedText, segments: null };
  } catch (err) {
    console.error("❌ Text Processing Error:", err.message);
    await markAsFailed(id, `Text Processing Error: ${err.message}`);
    return { processedText: null, segments: null };
  }
};
