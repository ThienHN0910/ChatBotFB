import axios from 'axios';
import config from '../config';

/**
 * Generate an answer using Google Generative Language (Gemini) REST endpoint.
 * Combines system prompt, retrieved context and user question.
 */
export async function generateAnswer(
  systemPrompt: string,
  contexts: string[],
  question: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY || config.googleApiKey;
  if (!apiKey) throw new Error('Missing GOOGLE_API_KEY in environment');

  const prompt = `${systemPrompt}\n\nContext:\n${contexts.join('\n\n---\n\n')}\n\nUser: ${question}\n\nTrả lời:`;

  const url = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generate?key=${apiKey}`;

  try {
    const res = await axios.post(
      url,
      {
        prompt: { text: prompt },
        temperature: 0.2,
        maxOutputTokens: 512
      },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const data = res.data || {};
    // support multiple possible response shapes
    const candidate = data?.candidates?.[0]?.content || data?.output?.[0]?.content || data?.choices?.[0]?.text || data?.text;
    return (candidate && String(candidate).trim()) || 'Trùm Động chưa biết trả lời câu này, thử hỏi khác đi nhé 🎮';
  } catch (err: any) {
    console.error('generateAnswer error:', err?.response?.data || err.message);
    throw new Error('AI generation failed');
  }
}

export default { generateAnswer };
