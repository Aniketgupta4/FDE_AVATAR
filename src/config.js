import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '..');

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}. Check your .env file.`);
    process.exit(1);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT || 8080),
  knowledgeDir: path.join(ROOT, 'knowledge'),
  publicDir: path.join(ROOT, 'public'),
  cacheDir: path.join(ROOT, '.cache'),
  gemini: {
    apiKey: required('GEMINI_API_KEY'),
    chatModel: process.env.GEMINI_CHAT_MODEL || 'gemini-2.5-flash',
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',
  },
  livekit: {
    url: required('LIVEKIT_URL'),
    apiKey: required('LIVEKIT_API_KEY'),
    apiSecret: required('LIVEKIT_API_SECRET'),
  },
};
