export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  mimeType: string;
  data: string; // text content or base64 data URL
  isImage?: boolean;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
  aspectRatio?: string;
  model?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  status?: 'streaming' | 'complete' | 'error';
  error?: string;
  modelUsed?: string;
  attachments?: Attachment[];
  generatedImages?: GeneratedImage[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  systemInstruction?: string;
  personaId?: string;
  model?: string;
}

export interface Persona {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemInstruction: string;
}

export interface ModelOption {
  id: string;
  name: string;
  description: string;
  badge: string;
}

export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'gemini-3.1-flash-lite',
    name: 'Gemini 3.1 Flash Lite',
    description: 'Instant responses, zero queue latency, high throughput',
    badge: '⚡ Ultra Fast',
  },
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    description: 'Balanced multimodal model with deeper reasoning',
    badge: 'Deep Reasoning',
  },
];

export const PRESET_PERSONAS: Persona[] = [
  {
    id: 'general',
    name: 'General Assistant',
    description: 'Helpful, balanced, and articulate guide for any task',
    icon: 'Sparkles',
    systemInstruction:
      'You are Synthetix, a fast and highly intelligent AI assistant. Provide immediate, accurate, and insightful answers with crisp formatting.',
  },
  {
    id: 'coder',
    name: 'Code Architect',
    description: 'Expert programmer for architecture, debugging, and clean code',
    icon: 'Code2',
    systemInstruction:
      'You are an expert senior software engineer and architect. Provide clean, secure, idiomatic, and production-ready code with concise explanations and best practices.',
  },
  {
    id: 'concise',
    name: 'Concise & Direct',
    description: 'Zero fluff, bullet points, and straight to the point answers',
    icon: 'Zap',
    systemInstruction:
      'You are a high-efficiency cognitive assistant. Give concise, razor-sharp, direct answers without unnecessary preamble or fluff. Use bullet points where appropriate.',
  },
  {
    id: 'writer',
    name: 'Creative Writer',
    description: 'Vibrant storytelling, compelling copy, and nuanced tone',
    icon: 'Feather',
    systemInstruction:
      'You are a creative writer and communication strategist. Craft compelling, engaging, well-structured, and evocative prose tailored to the requested voice.',
  },
  {
    id: 'academic',
    name: 'Academic Researcher',
    description: 'Rigorous analysis, evidence synthesis, and deep logic',
    icon: 'GraduationCap',
    systemInstruction:
      'You are an analytical researcher. Provide thorough, objective, logically structured analysis citing principles, methodology, and theoretical considerations.',
  },
];
