import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAX_INPUT_LINES = 200; // Cap the number of lines to send to GPT

export const processSegments = async (segments) => {
  console.log("📌 Preparing to send segments to GPT...");

  // Format segments with timestamps
  const segmentedText = segments
    .map(
      (segment) =>
        `[${formatTimestamp(segment.start)} - ${formatTimestamp(
          segment.end
        )}] ${segment.text}`
    )
    .join("\n");

  // Trim input to avoid GPT-4 context length issues
  const trimmedText = segmentedText
    .split("\n")
    .slice(0, MAX_INPUT_LINES)
    .join("\n");

  const payload = {
    model: "gpt-4",
    messages: [
      {
        role: "user",
        content: `Group the following transcription by topic and provide a timestamped summary for each group:\n\n${trimmedText}`,
      },
    ],
    temperature: 0.5,
    max_tokens: 3000,
  };

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      payload,
      {
        headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      }
    );

    console.log("✅ GPT response received.");
    return response.data.choices[0].message.content.trim();
  } catch (error) {
    const status = error.response?.status || "unknown";
    console.error(
      `❌ GPT-4 Request Failed [${status}]:`,
      error.response?.data || error.message
    );

    // Optional: fallback to raw segmented text
    return segmentedText;
  }
};

// Utility: Format seconds into HH:MM:SS
const formatTimestamp = (seconds) => {
  const date = new Date(0);
  date.setSeconds(seconds);
  return date.toISOString().substr(11, 8);
};
