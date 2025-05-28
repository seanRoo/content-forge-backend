// generatePosts.js
import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const generatePosts = async (event) => {
  try {
    const { id, text } = JSON.parse(event.body);

    if (!id || !text) {
      console.warn("⚠️ Missing required 'id' or 'text' in request.");
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing id or text" }),
      };
    }

    const prompt = `
You're a real person on X with a knack for witty, smart, or casual commentary. You're reacting to interesting audio content — a podcast, video, or conversation — and sharing a few standout thoughts.

TASK:
Write **3 original X posts** that sound like your own off-the-cuff reactions to what you just heard. The tweets should:
- Feel authentic and human (not polished or robotic)
- Skip overuse of quotes or overly formal language
- Reflect your opinions, takeaways, or reactions — smart, funny, or curious
- Fit within **280 characters**
- Avoid hashtags, links, emojis, or mentions

RESPONSE FORMAT:
Return only a **JSON array** of tweet objects formatted like:
{ summary: "...", content: "..." }

TRANSCRIPT SNIPPET:
${text.slice(0, 3000)}
`;

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 700,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    const raw = response.data.choices[0].message.content;

    // Extract content from possible markdown-wrapped response
    const match = raw.match(/```json([\s\S]*?)```|(\[.*\])/);
    let jsonString = match ? match[1] || match[2] : raw;

    jsonString = jsonString
      .replace(/“|”/g, '"')
      .replace(/‘|’/g, "'")
      .replace(/\uFEFF/g, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (err) {
      console.error("❌ Failed to parse GPT response:", jsonString);
      return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ summary: null, tweets: [] }),
      };
    }

    // Support legacy GPT responses and ensure data is always an array
    const tweets = Array.isArray(parsed) ? parsed : [];
    const summaryPost = tweets.find((t) => t.summary);
    const summary = summaryPost?.summary || null;

    return {
      statusCode: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ summary, tweets }),
    };
  } catch (err) {
    console.error("❌ Post generation failed:", err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
