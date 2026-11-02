import React, { useState } from 'react';
import { Message, Attachment, GeneratedImage } from '../types/chat';
import { MarkdownRenderer } from './MarkdownRenderer';
import {
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  AlertTriangle,
  Sparkles,
  User,
  Download,
  FileText,
  FileCode,
  FileSpreadsheet,
  Image as ImageIcon,
  ExternalLink,
  Maximize2,
  X,
} from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onRetry?: () => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming = false,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const isUser = message.role === 'user';
  const isError = message.status === 'error' || Boolean(message.error);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message.content);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getAttachmentIcon = (att: Attachment) => {
    if (att.isImage) return <ImageIcon className="w-4 h-4 text-blue-400" />;
    if (att.name.endsWith('.csv') || att.name.endsWith('.xlsx'))
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    if (
      att.name.endsWith('.py') ||
      att.name.endsWith('.js') ||
      att.name.endsWith('.ts') ||
      att.name.endsWith('.tsx') ||
      att.name.endsWith('.json')
    )
      return <FileCode className="w-4 h-4 text-amber-400" />;
    return <FileText className="w-4 h-4 text-indigo-400" />;
  };

  const handleDownloadImage = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'synthetix_generated_image.jpg';
    a.target = '_blank';
    a.click();
  };

  const wordCount = message.content ? message.content.trim().split(/\s+/).length : 0;
  const timeFormatted = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isUser) {
    return (
      <div className="flex justify-end my-4 px-2 sm:px-0">
        <div className="flex items-start gap-3 max-w-[85%] sm:max-w-[75%] flex-row-reverse group">
          {/* User Avatar */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#27272a] border border-[#3f3f46] flex items-center justify-center text-[#e4e1e6] shadow-sm mt-0.5">
            <User className="w-4 h-4 text-[#c0c1ff]" />
          </div>

          <div className="flex flex-col items-end w-full">
            {/* Attached Documents / Images */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap justify-end gap-2 mb-2 w-full">
                {message.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 p-2 rounded-xl bg-[#18181b] border border-[#3f3f46]/80 text-xs text-[#f4f4f5] shadow-sm"
                  >
                    {att.isImage ? (
                      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-[#3f3f46] bg-black">
                        <img
                          src={att.data}
                          alt={att.name}
                          className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => setPreviewImageUrl(att.data)}
                        />
                      </div>
                    ) : (
                      getAttachmentIcon(att)
                    )}
                    <div className="flex flex-col text-left">
                      <span className="font-medium truncate max-w-[150px]">{att.name}</span>
                      <span className="text-[10px] text-[#71717a] font-mono">
                        {formatFileSize(att.size)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bubble */}
            {message.content && (
              <div className="relative px-4 py-3 rounded-2xl rounded-tr-sm bg-[#1e1e24] border border-[#2e2e38] text-[#f4f4f5] shadow-md selection:bg-[#6366f1]/40 leading-relaxed text-[15px]">
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              </div>
            )}

            {/* Turn Meta & Actions */}
            <div className="flex items-center gap-2 mt-1.5 text-[11px] text-[#71717a] opacity-0 group-hover:opacity-100 transition-opacity">
              <span>{timeFormatted}</span>
              <span>•</span>
              <button
                onClick={handleCopy}
                className="hover:text-[#f4f4f5] flex items-center gap-1 transition-colors"
                title="Copy prompt"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Full Image Preview Modal */}
        {previewImageUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
            onClick={() => setPreviewImageUrl(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh]">
              <img
                src={previewImageUrl}
                alt="Enlarged preview"
                className="max-h-[85vh] rounded-xl object-contain shadow-2xl border border-[#27272a]"
              />
              <button
                onClick={() => setPreviewImageUrl(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Assistant Message Turn
  return (
    <div className="flex justify-start my-6 px-2 sm:px-0 group">
      <div className="flex items-start gap-3 sm:gap-4 max-w-full w-full">
        {/* Gemini Spark Avatar */}
        <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6366f1] via-[#4f46e5] to-[#3b82f6] flex items-center justify-center text-white shadow-md shadow-[#6366f1]/20 mt-1">
          <Sparkles className="w-4 h-4 animate-pulse" />
        </div>

        {/* Assistant Content Container */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-semibold text-sm text-[#f4f4f5] tracking-tight">Synthetix</span>
            <span className="text-[11px] px-2 py-0.5 rounded-full font-mono bg-[#18181b] border border-[#27272a] text-[#818cf8] flex items-center gap-1">
              <span className="text-amber-400">⚡</span>
              <span>{message.modelUsed || 'gemini-3.1-flash-lite'}</span>
            </span>
            <span className="text-xs text-[#71717a]">{timeFormatted}</span>
          </div>

          {/* Error State */}
          {isError ? (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/50 text-red-200 my-2">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-red-300">Generation Error</p>
                  <p className="text-red-200/90 leading-relaxed">
                    {message.error || message.content || 'Unable to generate response.'}
                  </p>
                  {onRetry && (
                    <button
                      onClick={onRetry}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-900/60 hover:bg-red-800 text-white transition-colors border border-red-700/50"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retry response</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-[15px] text-[#f4f4f5] leading-relaxed break-words space-y-4">
              {/* Generated AI Images */}
              {message.generatedImages && message.generatedImages.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-3">
                  {message.generatedImages.map((img, i) => (
                    <div
                      key={i}
                      className="relative group/img rounded-2xl overflow-hidden border border-[#27272a] bg-[#121215] shadow-lg"
                    >
                      <img
                        src={img.url}
                        alt={img.prompt}
                        referrerPolicy="no-referrer"
                        className="w-full aspect-square object-cover transition-transform duration-300 group-hover/img:scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col justify-between p-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setPreviewImageUrl(img.url)}
                            className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black"
                            title="View Fullscreen"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownloadImage(img.url, `synthetix_image_${i}.jpg`)}
                            className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black"
                            title="Download Image"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs text-white line-clamp-2 bg-black/40 backdrop-blur-sm p-2 rounded-lg">
                          <span className="font-semibold text-fuchsia-300">Prompt: </span>
                          <span>{img.prompt}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {message.content ? (
                <MarkdownRenderer content={message.content} />
              ) : isStreaming ? (
                <div className="flex items-center gap-2 py-2 text-sm text-[#a1a1aa]">
                  <span className="w-2 h-2 rounded-full bg-[#6366f1] animate-ping" />
                  <span>Synthetix is thinking...</span>
                </div>
              ) : null}

              {/* Pulsing typing cursor at text frontier */}
              {isStreaming && <span className="stream-cursor" />}
            </div>
          )}

          {/* Assistant Actions Bar */}
          {!isStreaming && !isError && (message.content || (message.generatedImages && message.generatedImages.length > 0)) && (
            <div className="flex items-center gap-3 mt-3 pt-2 text-xs text-[#71717a] border-t border-[#27272a]/40">
              {message.content && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 hover:text-[#f4f4f5] transition-colors p-1 rounded"
                  title="Copy response"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}

              {message.content && (
                <button
                  onClick={handleSpeak}
                  className={`flex items-center gap-1 transition-colors p-1 rounded ${
                    isSpeaking ? 'text-[#818cf8]' : 'hover:text-[#f4f4f5]'
                  }`}
                  title={isSpeaking ? 'Stop speech' : 'Read aloud'}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5 animate-pulse text-[#818cf8]" />
                      <span className="text-[#818cf8]">Stop</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Read</span>
                    </>
                  )}
                </button>
              )}

              {onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1 hover:text-[#f4f4f5] transition-colors p-1 rounded"
                  title="Regenerate response"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Regenerate</span>
                </button>
              )}

              {wordCount > 0 && (
                <span className="text-[#52525b] ml-auto font-mono text-[11px]">
                  {wordCount} words
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full Image Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img
              src={previewImageUrl}
              alt="Enlarged preview"
              className="max-h-[85vh] rounded-xl object-contain shadow-2xl border border-[#27272a]"
            />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
