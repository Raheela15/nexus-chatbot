/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ChatMessage } from './components/ChatMessage';
import { Omnibar } from './components/Omnibar';
import { SettingsModal } from './components/SettingsModal';
import { Conversation, Message, Attachment, PRESET_PERSONAS } from './types/chat';
import {
  loadConversations,
  saveConversations,
  getActiveConversationId,
  setActiveConversationId,
  createNewConversation,
  updateConversation,
  deleteConversation,
  clearAllConversations,
  exportAllData,
  importData,
  generateTitleFromPrompt,
  generateId,
} from './utils/storage';
import { Sparkles, ArrowDown } from 'lucide-react';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize and load conversations from Local Storage (Read on mount)
  useEffect(() => {
    const saved = loadConversations();
    setConversations(saved);

    const savedActiveId = getActiveConversationId();
    if (savedActiveId && saved.some((c) => c.id === savedActiveId)) {
      setActiveId(savedActiveId);
    } else if (saved.length > 0) {
      setActiveId(saved[0].id);
      setActiveConversationId(saved[0].id);
    }
  }, []);

  // Sync active conversation
  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  // Auto scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [activeId]);

  // Monitor scroll position to show/hide "Scroll to bottom" button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const distanceToBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollBottom(distanceToBottom > 200);
  };

  // CRUD: Create New Conversation
  const handleNewConversation = () => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
    const newConv = createNewConversation();
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    setInput('');
  };

  // CRUD: Select Conversation
  const handleSelectConversation = (id: string) => {
    if (isGenerating && abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
    setActiveId(id);
    setActiveConversationId(id);
  };

  // CRUD: Update Title
  const handleRenameConversation = (id: string, newTitle: string) => {
    const updated = updateConversation(id, { title: newTitle });
    if (updated) {
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
      );
    }
  };

  // CRUD: Update Persona
  const handleSelectPersona = (personaId: string) => {
    if (!activeId) return;
    const persona = PRESET_PERSONAS.find((p) => p.id === personaId);
    if (!persona) return;

    updateConversation(activeId, {
      personaId,
      systemInstruction: persona.systemInstruction,
    });

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeId
          ? { ...c, personaId, systemInstruction: persona.systemInstruction }
          : c
      )
    );
  };

  // CRUD: Update Model Speed Mode
  const handleSelectModel = (modelId: string) => {
    if (!activeId) return;
    updateConversation(activeId, { model: modelId });
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, model: modelId } : c))
    );
  };

  // CRUD: Update System Instruction
  const handleUpdateSystemInstruction = (instruction: string) => {
    if (!activeId) return;
    updateConversation(activeId, { systemInstruction: instruction });
    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, systemInstruction: instruction } : c))
    );
  };

  // CRUD: Delete Conversation
  const handleDeleteConversation = (id: string) => {
    const remaining = deleteConversation(id);
    setConversations(remaining);
    if (activeId === id) {
      setActiveId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  // CRUD: Clear Current Chat Messages
  const handleClearCurrentChat = () => {
    if (!activeId) return;
    if (window.confirm('Clear all messages in this conversation?')) {
      updateConversation(activeId, { messages: [] });
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, messages: [] } : c))
      );
    }
  };

  // CRUD: Clear All Conversations
  const handleClearAll = () => {
    clearAllConversations();
    setConversations([]);
    setActiveId(null);
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  // Send Message with Gemini API Integration, Multimodal Documents, and Image Generation
  const handleSendMessage = async (
    textToSend?: string,
    attachmentsToSend?: Attachment[],
    isImageMode?: boolean
  ) => {
    const messageContent = (textToSend !== undefined ? textToSend : input).trim();
    const hasAttachments = attachmentsToSend && attachmentsToSend.length > 0;

    if (!messageContent && !hasAttachments) return;
    if (isGenerating) return;

    setInput('');

    // Ensure we have an active conversation
    let currentConv = activeConversation;
    if (!currentConv) {
      const titlePrompt = messageContent || attachmentsToSend?.[0]?.name || 'New Chat';
      const title = generateTitleFromPrompt(titlePrompt);
      currentConv = createNewConversation(title);
      setConversations([currentConv]);
      setActiveId(currentConv.id);
    } else if (currentConv.messages.length === 0) {
      // Auto-update default title on first prompt
      const titlePrompt = messageContent || attachmentsToSend?.[0]?.name || 'Chat';
      const newTitle = generateTitleFromPrompt(titlePrompt);
      updateConversation(currentConv.id, { title: newTitle });
      currentConv.title = newTitle;
    }

    const convId = currentConv.id;

    // Build user message
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: messageContent,
      createdAt: Date.now(),
      status: 'complete',
      attachments: hasAttachments ? attachmentsToSend : undefined,
    };

    // Build assistant placeholder message
    const assistantMessageId = generateId();
    const assistantPlaceholder: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: isImageMode ? 'Synthetix is generating your image...' : '',
      createdAt: Date.now(),
      status: 'streaming',
    };

    const newMessages = [...currentConv.messages, userMessage, assistantPlaceholder];

    // Optimistically update state
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? {
              ...c,
              messages: newMessages,
              updatedAt: Date.now(),
            }
          : c
      )
    );

    setIsGenerating(true);
    setTimeout(() => scrollToBottom(true), 50);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      // --- BRANCH 1: AI IMAGE GENERATION ---
      if (isImageMode) {
        const imageResponse = await fetch('/api/generate-image', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: messageContent,
            aspectRatio: '1:1',
          }),
          signal: controller.signal,
        });

        if (!imageResponse.ok) {
          const errData = await imageResponse.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to generate image.');
        }

        const imgData = await imageResponse.json();

        setConversations((prev) => {
          const next = prev.map((c) => {
            if (c.id !== convId) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: `Here is your generated image for: **${imgData.prompt}**`,
                    status: 'complete' as const,
                    modelUsed: imgData.model || 'synthetix-diffusion-engine',
                    generatedImages: [
                      {
                        url: imgData.imageUrl,
                        prompt: imgData.prompt,
                        model: imgData.model,
                      },
                    ],
                  }
                : m
            );
            return { ...c, messages: msgs, updatedAt: Date.now() };
          });
          saveConversations(next);
          return next;
        });

        setIsGenerating(false);
        abortControllerRef.current = null;
        return;
      }

      // --- BRANCH 2: TEXT & MULTIMODAL DOCUMENT STREAMING ---
      const historyPayload = newMessages
        .slice(0, -1) // omit empty assistant placeholder
        .map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: historyPayload,
          systemInstruction: currentConv.systemInstruction,
          model: currentConv.model || 'gemini-3.1-flash-lite',
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: Failed to get response from Gemini`
        );
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on this browser.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

          const dataStr = trimmedLine.replace(/^data:\s*/, '');
          if (dataStr === '[DONE]') {
            break;
          }

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              accumulatedContent += parsed.text;

              // Update the assistant message in conversation
              setConversations((prev) =>
                prev.map((c) => {
                  if (c.id !== convId) return c;
                  const msgs = c.messages.map((m) =>
                    m.id === assistantMessageId
                      ? { ...m, content: accumulatedContent, status: 'streaming' as const }
                      : m
                  );
                  return { ...c, messages: msgs, updatedAt: Date.now() };
                })
              );
              scrollToBottom(true);
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              console.warn('SSE parsing warning:', e);
            }
          }
        }
      }

      // Generation completed successfully
      setConversations((prev) => {
        const next = prev.map((c) => {
          if (c.id !== convId) return c;
          const msgs = c.messages.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: accumulatedContent || 'No response generated.',
                  status: 'complete' as const,
                  modelUsed: currentConv.model || 'gemini-3.1-flash-lite',
                }
              : m
          );
          return { ...c, messages: msgs, updatedAt: Date.now() };
        });
        saveConversations(next);
        return next;
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User clicked stop
        setConversations((prev) => {
          const next = prev.map((c) => {
            if (c.id !== convId) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: m.content || '(Generation stopped by user)',
                    status: 'complete' as const,
                  }
                : m
            );
            return { ...c, messages: msgs, updatedAt: Date.now() };
          });
          saveConversations(next);
          return next;
        });
      } else {
        console.error('Chat error:', err);
        const errorMessage = err?.message || 'Failed to connect to Gemini API.';
        setConversations((prev) => {
          const next = prev.map((c) => {
            if (c.id !== convId) return c;
            const msgs = c.messages.map((m) =>
              m.id === assistantMessageId
                ? {
                    ...m,
                    content: '',
                    status: 'error' as const,
                    error: errorMessage,
                  }
                : m
            );
            return { ...c, messages: msgs, updatedAt: Date.now() };
          });
          saveConversations(next);
          return next;
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // Retry last generation
  const handleRetry = () => {
    if (!activeConversation || isGenerating) return;
    const msgs = activeConversation.messages;
    if (msgs.length === 0) return;

    let lastUserMessageIndex = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserMessageIndex = i;
        break;
      }
    }

    if (lastUserMessageIndex === -1) return;

    const lastPrompt = msgs[lastUserMessageIndex].content;
    const lastAttachments = msgs[lastUserMessageIndex].attachments;
    const trimmed = msgs.slice(0, lastUserMessageIndex);

    updateConversation(activeConversation.id, { messages: trimmed });
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversation.id ? { ...c, messages: trimmed } : c))
    );

    // Re-send
    handleSendMessage(lastPrompt, lastAttachments);
  };

  // Export current conversation to Markdown
  const handleExportMarkdown = () => {
    if (!activeConversation) return;
    let md = `# ${activeConversation.title}\n\n`;
    md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

    activeConversation.messages.forEach((m) => {
      const sender = m.role === 'user' ? 'User' : 'Synthetix AI';
      md += `### ${sender}\n\n${m.content}\n\n`;
      if (m.generatedImages && m.generatedImages.length > 0) {
        m.generatedImages.forEach((img) => {
          md += `![${img.prompt}](${img.url})\n\n`;
        });
      }
    });

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${activeConversation.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Export all conversations JSON
  const handleExportJSON = () => {
    const jsonStr = exportAllData();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `synthetix_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Trigger file input for Import
  const handleImportTrigger = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Handle file import
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importData(content);
        if (success) {
          const reloaded = loadConversations();
          setConversations(reloaded);
          if (reloaded.length > 0) {
            setActiveId(reloaded[0].id);
          }
          alert('Conversations imported successfully!');
        } else {
          alert('Failed to import conversations. Please check the JSON format.');
        }
      }
    };
    reader.readAsText(file);
  };

  const hasMessages = Boolean(activeConversation && activeConversation.messages.length > 0);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#f4f4f5]">
      {/* Hidden File Input for Data Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />

      {/* Responsive Collapsible Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onClearAll={handleClearAll}
        onOpenSettings={() => setSettingsOpen(true)}
        onExport={handleExportJSON}
        onImport={handleImportTrigger}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
      />

      {/* Main Conversation Canvas Area */}
      <main className="flex-1 flex flex-col h-full min-w-0 relative">
        {/* Top Navigation Bar */}
        <Header
          conversation={activeConversation}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onRename={(newTitle) => activeId && handleRenameConversation(activeId, newTitle)}
          onClearCurrentChat={handleClearCurrentChat}
          onSelectPersona={handleSelectPersona}
          onSelectModel={handleSelectModel}
          onOpenSettings={() => setSettingsOpen(true)}
          onExportMarkdown={handleExportMarkdown}
        />

        {/* Message Feed / Canvas */}
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-4 md:px-6 py-4"
        >
          <div className="max-w-3xl mx-auto w-full">
            {!hasMessages ? (
              /* Empty State Landing Screen */
              <div className="min-h-[50vh] flex flex-col items-center justify-center text-center px-4 py-12">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6366f1] via-[#4f46e5] to-[#3b82f6] flex items-center justify-center text-white shadow-xl shadow-[#6366f1]/25 mb-6">
                  <Sparkles className="w-8 h-8" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-[#f4f4f5] mb-3">
                  Synthetix Intelligence
                </h1>
                <p className="text-sm sm:text-base text-[#a1a1aa] max-w-lg leading-relaxed mb-6">
                  Fast, multimodal AI assistant powered by Google Gemini. Supports voice commands, document reading, and AI image generation.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] text-[#c7c4d7]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>Model: <strong className="text-amber-300">{activeConversation?.model || 'gemini-3.1-flash-lite'}</strong></span>
                    <span className="text-amber-400 font-medium">⚡ Ultra-Fast</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] text-[#c7c4d7]">
                    🎙️ Voice Dictation
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] text-[#c7c4d7]">
                    📄 PDF & Code Reader
                  </div>
                  <div className="px-3 py-1.5 rounded-full bg-[#18181b] border border-[#27272a] text-fuchsia-300">
                    🎨 AI Image Generator
                  </div>
                </div>
              </div>
            ) : (
              /* Message Thread */
              <div className="pb-6">
                {activeConversation?.messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    isStreaming={message.status === 'streaming'}
                    onRetry={message.status === 'error' ? handleRetry : undefined}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Scroll To Bottom Button */}
        {showScrollBottom && (
          <button
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-28 right-8 z-20 p-2 rounded-full bg-[#18181b] hover:bg-[#27272a] border border-[#3f3f46] text-[#f4f4f5] shadow-lg transition-all duration-150 animate-bounce"
            title="Scroll to bottom"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Floating Input Omnibar */}
        <Omnibar
          input={input}
          setInput={setInput}
          onSend={handleSendMessage}
          onStop={handleStopGeneration}
          isGenerating={isGenerating}
          showSuggestions={!hasMessages}
        />
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        activeConversation={activeConversation}
        onUpdateSystemInstruction={handleUpdateSystemInstruction}
        onClearAll={handleClearAll}
        onExport={handleExportJSON}
        onImport={handleImportTrigger}
      />
    </div>
  );
}
