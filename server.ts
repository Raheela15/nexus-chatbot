import dns from 'dns';
// Force IPv4 first to eliminate DNS/IPv6 latency hangs in Docker environments
dns.setDefaultResultOrder('ipv4first');

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '25mb' }));

  // Helper to get GoogleGenAI client with standard User-Agent header
  function getGenAIClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not set. Please configure it in your environment or the Settings > Secrets panel.'
      );
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  // Health check endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      hasApiKey: Boolean(process.env.GEMINI_API_KEY),
      model: 'gemini-3.1-flash-lite',
      speed: 'ultra-fast',
    });
  });

  // Dedicated AI Image Generation Endpoint
  app.post('/api/generate-image', async (req: Request, res: Response) => {
    try {
      const { prompt, aspectRatio = '1:1' } = req.body;
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'Image prompt is required.' });
      }

      const cleanPrompt = prompt.trim();
      const ai = getGenAIClient();

      // Attempt 1: Try Gemini image generation model
      try {
        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: { parts: [{ text: cleanPrompt }] },
          config: {
            imageConfig: {
              aspectRatio: aspectRatio as any,
            },
          },
        });

        for (const part of geminiRes.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData?.data) {
            const mime = part.inlineData.mimeType || 'image/png';
            const imageUrl = `data:${mime};base64,${part.inlineData.data}`;
            return res.json({
              imageUrl,
              prompt: cleanPrompt,
              model: 'gemini-3.1-flash-lite-image',
            });
          }
        }
      } catch (geminiError: any) {
        console.warn(
          'Gemini image model unavailable or free-tier quota 0, falling back to high-res engine:',
          geminiError?.message
        );
      }

      // Fallback: High-resolution AI Image Engine (Pollinations with deterministic seed)
      const seed = Math.floor(Math.random() * 1000000);
      let width = 1024;
      let height = 1024;
      if (aspectRatio === '16:9') {
        width = 1280;
        height = 720;
      } else if (aspectRatio === '9:16') {
        width = 720;
        height = 1280;
      } else if (aspectRatio === '4:3') {
        width = 1024;
        height = 768;
      }

      const encodedPrompt = encodeURIComponent(cleanPrompt);
      const fallbackUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

      return res.json({
        imageUrl: fallbackUrl,
        prompt: cleanPrompt,
        model: 'synthetix-diffusion-engine',
      });
    } catch (err: any) {
      console.error('Image generation error:', err);
      return res.status(500).json({
        error: err?.message || 'Failed to generate image.',
      });
    }
  });

  // Chat completions endpoint with streaming support (Server-Sent Events) and Multimodal Document Support
  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const {
        messages,
        systemInstruction,
        model = 'gemini-3.1-flash-lite',
        stream = true,
      } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required.' });
      }

      const ai = getGenAIClient();

      // Format messages into GoogleGenAI contents array with Multimodal attachments support
      const contents = messages.map(
        (m: {
          role: string;
          content: string;
          attachments?: Array<{
            name: string;
            type: string;
            mimeType: string;
            data: string;
            isImage?: boolean;
          }>;
        }) => {
          const role = m.role === 'assistant' ? 'model' : 'user';
          const parts: Array<any> = [];

          // If attachments are included (documents or images)
          if (m.attachments && Array.isArray(m.attachments)) {
            for (const att of m.attachments) {
              if (att.isImage && att.data) {
                // Remove data:image/...;base64, prefix if present
                const base64Data = att.data.includes(',')
                  ? att.data.split(',')[1]
                  : att.data;
                parts.push({
                  inlineData: {
                    mimeType: att.mimeType || 'image/jpeg',
                    data: base64Data,
                  },
                });
              } else if (att.mimeType === 'application/pdf' && att.data) {
                const base64Data = att.data.includes(',')
                  ? att.data.split(',')[1]
                  : att.data;
                parts.push({
                  inlineData: {
                    mimeType: 'application/pdf',
                    data: base64Data,
                  },
                });
              } else if (att.data) {
                // Text/code/csv/json document
                parts.push({
                  text: `\n=== ATTACHED DOCUMENT: "${att.name}" (${att.mimeType || 'text'}) ===\n${att.data}\n=== END OF DOCUMENT ===\n`,
                });
              }
            }
          }

          // Main text content
          parts.push({ text: m.content || '' });

          return {
            role,
            parts,
          };
        }
      );

      const config: Record<string, any> = {};

      if (systemInstruction && typeof systemInstruction === 'string' && systemInstruction.trim()) {
        config.systemInstruction = systemInstruction.trim();
      } else {
        config.systemInstruction =
          'You are Synthetix, a fast, highly intelligent, and direct AI assistant with multimodal understanding. If documents or code are attached, thoroughly analyze, summarize, or answer questions with high technical precision. Answer cleanly using crisp Markdown formatting without unnecessary delay.';
      }

      // Priority model list: start with selected model (default gemini-3.1-flash-lite for near-instant latency)
      const candidateModels = [
        model,
        model === 'gemini-3.1-flash-lite' ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite',
      ];

      // Streaming response via SSE
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        if (typeof (res as any).flushHeaders === 'function') {
          (res as any).flushHeaders();
        }

        let streamSucceeded = false;
        let lastError: any = null;

        for (const candidateModel of candidateModels) {
          try {
            const modelConfig = { ...config };
            if (candidateModel === 'gemini-3.8-flash') {
              modelConfig.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
            }

            const responseStream = await ai.models.generateContentStream({
              model: candidateModel,
              contents,
              config: modelConfig,
            });

            for await (const chunk of responseStream) {
              const chunkText = chunk.text || '';
              if (chunkText) {
                res.write(`data: ${JSON.stringify({ text: chunkText })}\n\n`);
                if (typeof (res as any).flush === 'function') {
                  (res as any).flush();
                }
              }
            }

            streamSucceeded = true;
            break;
          } catch (modelErr: any) {
            console.warn(`Model ${candidateModel} failed, trying fallback:`, modelErr?.message);
            lastError = modelErr;
          }
        }

        if (streamSucceeded) {
          res.write('data: [DONE]\n\n');
        } else {
          const errorMessage =
            lastError?.message ||
            'High demand on Gemini services. Please try again in a few moments.';
          res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
        }
        res.end();
        return;
      }

      // Non-streaming response fallback
      const response = await ai.models.generateContent({
        model: candidateModels[0],
        contents,
        config,
      });

      return res.json({
        text: response.text || '',
      });
    } catch (error: any) {
      console.error('API Error in /api/chat:', error);
      const status = error?.status || 500;
      return res.status(status).json({
        error:
          error?.message ||
          'Failed to process message with Gemini API. Check your connection or API key.',
      });
    }
  });

  // Mount Vite middleware in dev or static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Synthetix AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
