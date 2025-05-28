# 🧠 ContentForge Backend

ContentForge is a serverless backend that transforms long-form content (text, audio, or video) into bite-sized, shareable formats like tweets, blogs, and sound bites. It handles transcription, smart segmentation, and AI-powered content generation using Whisper and GPT.

---

## 🚀 Features

- 🎙️ Transcribe audio/video with Whisper
- 🧠 GPT-powered topic segmentation
- ✍️ Generate:
  - Twitter/X posts
  - Blog drafts
  - Sound bites
- 🔁 Asynchronous job-based processing
- ⚡ Serverless architecture with AWS Lambda
- 🗃️ Uses DynamoDB for storage and job tracking
- 📹 URL support via `yt-dlp` and `ffmpeg`
- 🔒 Optional S3 integration for file uploads

---

## 📦 Tech Stack

- Node.js (JavaScript)
- Serverless Framework
- AWS Lambda & API Gateway
- DynamoDB
- ffmpeg & yt-dlp (via Lambda layers)
- OpenAI Whisper & GPT


