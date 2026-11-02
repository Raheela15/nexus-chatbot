import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Please use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return res.status(500).json({
      error: 'Gemini API key is not configured. Please add GEMINI_API_KEY to your Vercel Project Settings > Environment Variables, then redeploy.',
    });
  }

  const { messages, systemInstruction, model = 'gemini-3.1-flash-lite', stream = false } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Messages array is required and must not be empty.' });
  }

  const ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build-vercel',
      },
    },
  });

  const formattedContents = messages.map((m: { role: string; content: string }) => {
    const role = m.role === 'assistant' ? 'model' : 'user';
    return {
      role,
      parts: [{ text: m.content || '' }],
    };
  });

  const defaultSystemPrompt =
    systemInstruction ||
    'You are an intelligent, helpful, and friendly AI assistant powered by Google Gemini. Provide clear, accurate, well-formatted answers with markdown and syntax-highlighted code blocks when appropriate.';

  const selectedModel = model === 'gemini-3.8-flash' ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite';
  const modelsToTry = selectedModel === 'gemini-3.1-flash-lite'
    ? ['gemini-3.1-flash-lite', 'gemini-3.8-flash']
    : ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  // Streaming SSE Mode (if client requested stream)
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    for (const candidate of modelsToTry) {
      try {
        const config: any = { systemInstruction: defaultSystemPrompt };
        if (candidate === 'gemini-3.8-flash') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const streamResponse = await ai.models.generateContentStream({
          model: candidate,
          contents: formattedContents,
          config,
        });

        let chunkCount = 0;
        for await (const chunk of streamResponse) {
          const text = chunk.text;
          if (text) {
            res.write(`data: ${JSON.stringify({ text })}\n\n`);
            chunkCount++;
          }
        }

        if (chunkCount > 0) {
          res.write('data: [DONE]\n\n');
          return res.end();
        }
      } catch (err: any) {
        console.warn(`Vercel streaming error on ${candidate}:`, err.message || err);
      }
    }

    res.write(`data: ${JSON.stringify({ error: 'Unable to stream response from Gemini API.' })}\n\n`);
    res.write('data: [DONE]\n\n');
    return res.end();
  }

  // Standard JSON Mode (optimal for Vercel serverless functions)
  let lastError: any = null;
  for (const candidate of modelsToTry) {
    try {
      const config: any = { systemInstruction: defaultSystemPrompt };
      if (candidate === 'gemini-3.8-flash') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      }

      const response = await ai.models.generateContent({
        model: candidate,
        contents: formattedContents,
        config,
      });

      const text = response.text || '';
      return res.status(200).json({
        text,
        model: candidate,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      lastError = err;
      console.warn(`Vercel model ${candidate} failed:`, err.message || err);
    }
  }

  return res.status(500).json({
    error: lastError?.message || 'Failed to generate response from Gemini API. Please check your GEMINI_API_KEY.',
  });
}
