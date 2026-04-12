import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_TIMEOUT = 15000; // 15s
const MAX_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function getResponse(message) {
  const payload = {
    model: "openai/gpt-oss-20b:free",
    messages: [
      { role: "user", content: message }
    ],
  };

  let attempt = 0;
  while (attempt < MAX_ATTEMPTS) {
    attempt += 1;
    try {
      console.log(`[openAi] attempt ${attempt} -> sending request`);
      const response = await axios.request({
        method: "POST",
        url: OPENROUTER_URL,
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        data: payload,
        timeout: DEFAULT_TIMEOUT,
      });

      const content = response?.data?.choices?.[0]?.message?.content;
      console.log('[openAi] response content:', content);
      return content;
    } catch (error) {
      const status = error?.response?.status;
      const code = error?.code || (status ? String(status) : 'unknown');
      console.error(`[openAi] attempt ${attempt} failed:`, error?.response?.data || error.message || error);

      // If we've exhausted attempts, rethrow
      if (attempt >= MAX_ATTEMPTS) {
        console.error('[openAi] max attempts reached, throwing error');
        throw error;
      }

      // Exponential backoff before retrying
      const backoffMs = 500 * Math.pow(2, attempt - 1);
      console.log(`[openAi] retrying in ${backoffMs}ms (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
      await sleep(backoffMs);
      // loop will retry
    }
  }

  // Should never reach here, but throw defensively
  throw new Error('openAi.getResponse: unexpected flow');
}