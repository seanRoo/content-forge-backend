// transcriptionUtils.js (extended with chunking support and audio fallback)

import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { markAsFailed } from "./dynamoDbUtils.js";
import { processSegments } from "../segmentProcessing.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MAX_RETRIES = 3;
const execAsync = promisify(exec);

export const chunkAndTranscribeAudio = async (file, fileName, id) => {
  const tmpDir = "/tmp";
  const inputPath = path.join(tmpDir, fileName);
  fs.writeFileSync(inputPath, file.Body);

  const chunkPattern = path.join(tmpDir, "chunk_%03d.mp3");
  const FFMPEG_PATH = "/opt/bin/ffmpeg";

  const chunkCmd = `${FFMPEG_PATH} -i "${inputPath}" -f segment -segment_time 600 -c copy "${chunkPattern}"`;

  try {
    await execAsync(chunkCmd);
    const chunkFiles = fs
      .readdirSync(tmpDir)
      .filter((f) => f.startsWith("chunk_") && f.endsWith(".mp3"))
      .sort();

    let allSegments = [];
    let cumulativeOffset = 0;

    for (const chunkFile of chunkFiles) {
      const chunkPath = path.join(tmpDir, chunkFile);
      const formData = new FormData();
      formData.append("file", fs.createReadStream(chunkPath), chunkFile);
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");
      formData.append(
        "initial_prompt",
        "Transcribe the entire audio file from the beginning. Do not skip any portion."
      );

      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            ...formData.getHeaders(),
          },
          timeout: 300000,
        }
      );

      if (response.data?.segments) {
        const adjusted = response.data.segments.map((s) => ({
          ...s,
          start: s.start + cumulativeOffset,
          end: s.end + cumulativeOffset,
        }));
        allSegments.push(...adjusted);

        const last = adjusted[adjusted.length - 1];
        cumulativeOffset = last?.end || cumulativeOffset;
      }

      // 🧹 Clean up each chunk
      fs.unlinkSync(chunkPath);
    }

    // 🧹 Clean up original input file
    fs.unlinkSync(inputPath);

    const processedText = await processSegments(allSegments);
    return { processedText, segments: allSegments };
  } catch (err) {
    console.error("❌ Chunked transcription failed:", err.message);
    await markAsFailed(id, `Chunked transcription failed: ${err.message}`);
    return { processedText: null, segments: null };
  }
};

export const processAudioFile = async (file, fileName, id) => {
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      console.log(`🔊 Attempt ${attempt + 1}: Processing audio file...`);
      const formData = new FormData();
      formData.append("file", file.Body, { filename: fileName });
      formData.append("model", "whisper-1");
      formData.append("response_format", "verbose_json");
      formData.append(
        "initial_prompt",
        "Transcribe the entire audio file from the beginning. Do not skip any portion of the file. Provide a complete and accurate transcription."
      );

      const response = await axios.post(
        "https://api.openai.com/v1/audio/transcriptions",
        formData,
        {
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            ...formData.getHeaders(),
          },
          timeout: 300000,
        }
      );

      if (response.data.segments) {
        const segments = response.data.segments;
        const processedText = await processSegments(segments);
        return { processedText, segments };
      } else if (response.data.text) {
        return { processedText: response.data.text.trim(), segments: null };
      }
    } catch (error) {
      console.error(
        `❌ Whisper API Request Failed on attempt ${attempt + 1}:`,
        error.message
      );

      if (attempt === MAX_RETRIES - 1) {
        await markAsFailed(id, `Whisper API Failed: ${error.message}`);
        return { processedText: null, segments: null };
      }
    }
    attempt++;
  }

  return { processedText: null, segments: null };
};
