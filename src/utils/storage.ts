import { Conversation, Message, PRESET_PERSONAS } from '../types/chat';

const STORAGE_KEY = 'synthetix_conversations_v1';
const ACTIVE_CONV_KEY = 'synthetix_active_conv_id';

/**
 * Generate a random UUID-like ID
 */
export function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'conv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9);
}

/**
 * Load all conversations from LocalStorage
 */
export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to load conversations from localStorage:', err);
    return [];
  }
}

/**
 * Save all conversations to LocalStorage
 */
export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (err) {
    console.error('Failed to save conversations to localStorage:', err);
  }
}

/**
 * Get active conversation ID from LocalStorage
 */
export function getActiveConversationId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_CONV_KEY);
  } catch {
    return null;
  }
}

/**
 * Set active conversation ID in LocalStorage
 */
export function setActiveConversationId(id: string): void {
  try {
    localStorage.setItem(ACTIVE_CONV_KEY, id);
  } catch (err) {
    console.error('Failed to set active conversation ID:', err);
  }
}

/**
 * Create a new conversation (CRUD: Create)
 */
export function createNewConversation(
  title = 'New Chat',
  personaId = 'general',
  initialMessage?: Message
): Conversation {
  const persona = PRESET_PERSONAS.find((p) => p.id === personaId) || PRESET_PERSONAS[0];
  const now = Date.now();
  const newConv: Conversation = {
    id: generateId(),
    title,
    createdAt: now,
    updatedAt: now,
    messages: initialMessage ? [initialMessage] : [],
    personaId: persona.id,
    systemInstruction: persona.systemInstruction,
    model: 'gemini-3.1-flash-lite',
  };

  const list = loadConversations();
  const updated = [newConv, ...list];
  saveConversations(updated);
  setActiveConversationId(newConv.id);
  return newConv;
}

/**
 * Update an existing conversation (CRUD: Update)
 */
export function updateConversation(
  id: string,
  updater: Partial<Conversation> | ((prev: Conversation) => Conversation)
): Conversation | null {
  const list = loadConversations();
  const index = list.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const current = list[index];
  const updated =
    typeof updater === 'function' ? updater(current) : { ...current, ...updater, updatedAt: Date.now() };

  list[index] = updated;
  saveConversations(list);
  return updated;
}

/**
 * Rename a conversation (CRUD: Update Title)
 */
export function renameConversation(id: string, newTitle: string): boolean {
  const trimmed = newTitle.trim();
  if (!trimmed) return false;
  const result = updateConversation(id, { title: trimmed });
  return !!result;
}

/**
 * Delete a conversation by ID (CRUD: Delete)
 */
export function deleteConversation(id: string): Conversation[] {
  const list = loadConversations();
  const filtered = list.filter((c) => c.id !== id);
  saveConversations(filtered);

  const activeId = getActiveConversationId();
  if (activeId === id) {
    if (filtered.length > 0) {
      setActiveConversationId(filtered[0].id);
    } else {
      localStorage.removeItem(ACTIVE_CONV_KEY);
    }
  }

  return filtered;
}

/**
 * Clear all conversations (CRUD: Delete All)
 */
export function clearAllConversations(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_CONV_KEY);
  } catch (err) {
    console.error('Failed to clear conversations:', err);
  }
}

/**
 * Export conversation data as JSON string
 */
export function exportAllData(): string {
  const data = {
    app: 'Synthetix AI Chatbot',
    exportedAt: new Date().toISOString(),
    conversations: loadConversations(),
  };
  return JSON.stringify(data, null, 2);
}

/**
 * Import conversations from JSON string
 */
export function importData(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    if (data && Array.isArray(data.conversations)) {
      const existing = loadConversations();
      // Deduplicate by ID
      const map = new Map<string, Conversation>();
      for (const item of existing) {
        map.set(item.id, item);
      }
      for (const item of data.conversations) {
        if (item.id && item.title && Array.isArray(item.messages)) {
          map.set(item.id, item);
        }
      }
      const merged = Array.from(map.values()).sort((a, b) => b.updatedAt - a.updatedAt);
      saveConversations(merged);
      if (merged.length > 0 && !getActiveConversationId()) {
        setActiveConversationId(merged[0].id);
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to parse import JSON:', err);
    return false;
  }
}

/**
 * Generate a smart title from the user's first prompt
 */
export function generateTitleFromPrompt(prompt: string): string {
  const clean = prompt.trim().replace(/^["']|["']$/g, '');
  if (clean.length <= 36) return clean;
  return clean.slice(0, 36) + '...';
}
