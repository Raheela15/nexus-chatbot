import React, { useState } from 'react';
import { X, Sparkles, Sliders, Download, Upload, Trash2, Check } from 'lucide-react';
import { Conversation, PRESET_PERSONAS } from '../types/chat';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeConversation: Conversation | null;
  onUpdateSystemInstruction: (instruction: string) => void;
  onClearAll: () => void;
  onExport: () => void;
  onImport: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  activeConversation,
  onUpdateSystemInstruction,
  onClearAll,
  onExport,
  onImport,
}) => {
  const [instruction, setInstruction] = useState(
    activeConversation?.systemInstruction || PRESET_PERSONAS[0].systemInstruction
  );
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateSystemInstruction(instruction);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#18181b] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#27272a]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#818cf8]" />
            <h3 className="font-semibold text-sm text-[#f4f4f5]">Chatbot Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Active Model Info */}
          <div className="p-3.5 rounded-xl bg-[#121215] border border-[#27272a] flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-[#f4f4f5] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#6366f1]" />
                <span>Google Gemini 3.8 Flash</span>
              </div>
              <p className="text-[11px] text-[#71717a] mt-0.5">
                Low-latency, multimodal intelligence via official GenAI SDK
              </p>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
              Active
            </span>
          </div>

          {/* System Instruction */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#c7c4d7]">
              System Instruction for Current Conversation
            </label>
            <p className="text-[11px] text-[#71717a]">
              Direct how Gemini should behave, structure responses, and tailor its answers.
            </p>
            <textarea
              rows={4}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              className="w-full bg-[#121215] border border-[#27272a] focus:border-[#6366f1] rounded-xl p-3 text-xs text-[#f4f4f5] placeholder-[#71717a] resize-none focus:outline-none"
              placeholder="e.g. You are a helpful assistant..."
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-medium transition-colors"
              >
                {saved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
                <span>{saved ? 'Saved!' : 'Save System Instruction'}</span>
              </button>
            </div>
          </div>

          {/* Data Management Section */}
          <div className="pt-3 border-t border-[#27272a] space-y-3">
            <div className="text-xs font-semibold text-[#c7c4d7]">Data & Local Storage</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onExport}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#121215] border border-[#27272a] hover:bg-[#27272a] text-xs text-[#f4f4f5] transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-[#818cf8]" />
                <span>Export History</span>
              </button>
              <button
                type="button"
                onClick={onImport}
                className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#121215] border border-[#27272a] hover:bg-[#27272a] text-xs text-[#f4f4f5] transition-colors"
              >
                <Upload className="w-3.5 h-3.5 text-[#818cf8]" />
                <span>Import Backup</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all saved conversations? This cannot be undone.')) {
                  onClearAll();
                  onClose();
                }
              }}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 text-xs text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete All Saved Chats</span>
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[#27272a] bg-[#121215] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-[#27272a] hover:bg-[#3f3f46] text-[#f4f4f5] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
