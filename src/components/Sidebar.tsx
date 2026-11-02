import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Download,
  Upload,
  Sparkles,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Conversation } from '../types/chat';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
  onOpenSettings: () => void;
  onExport: () => void;
  onImport: () => void;
  isOpen: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onClearAll,
  onOpenSettings,
  onExport,
  onImport,
  isOpen,
  onCloseMobile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Filter conversations by title or messages
  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const query = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(query) ||
        c.messages.some((m) => m.content.toLowerCase().includes(query))
    );
  }, [conversations, searchQuery]);

  // Group conversations by time
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const startOfYesterday = startOfToday - oneDayMs;
    const startOfLast7Days = startOfToday - 7 * oneDayMs;

    const groups: { [key: string]: Conversation[] } = {
      Today: [],
      Yesterday: [],
      'Previous 7 Days': [],
      Older: [],
    };

    filteredConversations.forEach((conv) => {
      const time = conv.updatedAt || conv.createdAt;
      if (time >= startOfToday) {
        groups.Today.push(conv);
      } else if (time >= startOfYesterday) {
        groups.Yesterday.push(conv);
      } else if (time >= startOfLast7Days) {
        groups['Previous 7 Days'].push(conv);
      } else {
        groups.Older.push(conv);
      }
    });

    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [filteredConversations]);

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveEditing = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
    setEditTitle('');
  };

  const cancelEditing = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
    setEditTitle('');
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleteConfirmId === id) {
      onDeleteConversation(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => {
        setDeleteConfirmId((prev) => (prev === id ? null : prev));
      }, 4000);
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col w-72 bg-[#121215] border-r border-[#27272a] transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header / Brand */}
        <div className="p-4 border-b border-[#27272a]/70 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#6366f1] via-[#4f46e5] to-[#3b82f6] flex items-center justify-center text-white shadow-md shadow-[#6366f1]/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-tight text-[#f4f4f5]">Synthetix AI</h1>
              <p className="text-[11px] text-amber-400 font-mono flex items-center gap-1">
                <span>⚡</span>
                <span>Gemini 3.1 Flash Lite</span>
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-[#a1a1aa] hover:text-white hover:bg-[#27272a]"
            title="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action: New Chat Button (Create) */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewConversation();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#4f46e5] text-white text-xs font-semibold shadow-md shadow-[#6366f1]/20 transition-all duration-150 active:scale-[0.98]"
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>New Conversation</span>
            </span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-mono">
              +
            </span>
          </button>
        </div>

        {/* Search Conversations Input */}
        <div className="px-3 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-[#18181b] border border-[#27272a] rounded-lg pl-8 pr-7 py-1.5 text-xs text-[#f4f4f5] placeholder-[#71717a] focus:outline-none focus:border-[#6366f1]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#71717a] hover:text-[#f4f4f5]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation List (Read, Update, Delete) */}
        <div className="flex-1 overflow-y-auto px-2 space-y-4 py-2">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4 text-xs text-[#71717a]">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 text-[#3f3f46]" />
              <p>No conversations yet</p>
              <p className="text-[11px] text-[#52525b] mt-1">
                Start a chat to save your history
              </p>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-8 px-4 text-xs text-[#71717a]">
              <p>No chats match &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            groupedConversations.map(([groupName, items]) => (
              <div key={groupName} className="space-y-1">
                <div className="px-3 text-[11px] font-semibold text-[#71717a] uppercase tracking-wider font-mono">
                  {groupName}
                </div>

                <div className="space-y-0.5">
                  {items.map((conv) => {
                    const isActive = conv.id === activeConversationId;
                    const isEditing = conv.id === editingId;
                    const isConfirmingDelete = conv.id === deleteConfirmId;

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          onSelectConversation(conv.id);
                          onCloseMobile();
                        }}
                        className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors duration-150 ${
                          isActive
                            ? 'bg-[#1e1e24] text-[#f4f4f5] font-medium border border-[#3f3f46]/70 shadow-sm'
                            : 'text-[#a1a1aa] hover:bg-[#18181b] hover:text-[#f4f4f5]'
                        }`}
                      >
                        {/* Conversation Title / Edit form */}
                        <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-2">
                          <MessageSquare
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isActive ? 'text-[#818cf8]' : 'text-[#71717a]'
                            }`}
                          />

                          {isEditing ? (
                            <form
                              onSubmit={(e) => saveEditing(conv.id, e)}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 w-full"
                            >
                              <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                autoFocus
                                className="w-full bg-[#27272a] text-[#f4f4f5] text-xs px-2 py-0.5 rounded border border-[#6366f1] focus:outline-none"
                              />
                              <button
                                type="submit"
                                className="p-1 text-emerald-400 hover:bg-[#27272a] rounded"
                                title="Save"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditing}
                                className="p-1 text-red-400 hover:bg-[#27272a] rounded"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </form>
                          ) : (
                            <span className="truncate" title={conv.title}>
                              {conv.title}
                            </span>
                          )}
                        </div>

                        {/* Action buttons (Rename & Delete) */}
                        {!isEditing && (
                          <div
                            className={`flex items-center gap-1 ${
                              isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                            } transition-opacity flex-shrink-0`}
                          >
                            <button
                              onClick={(e) => startEditing(conv, e)}
                              className="p-1 text-[#71717a] hover:text-[#f4f4f5] hover:bg-[#27272a] rounded"
                              title="Rename chat"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>

                            <button
                              onClick={(e) => handleDeleteClick(conv.id, e)}
                              className={`p-1 rounded transition-colors ${
                                isConfirmingDelete
                                  ? 'text-red-400 bg-red-950/60 font-semibold px-1.5'
                                  : 'text-[#71717a] hover:text-red-400 hover:bg-[#27272a]'
                              }`}
                              title={isConfirmingDelete ? 'Click again to confirm delete' : 'Delete chat'}
                            >
                              {isConfirmingDelete ? (
                                <span className="text-[10px]">Delete?</span>
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-[#27272a] bg-[#0e0e11] space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#71717a] px-1 pb-1">
            <span>{conversations.length} {conversations.length === 1 ? 'chat' : 'chats'}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={onExport}
                className="p-1 text-[#a1a1aa] hover:text-white rounded hover:bg-[#18181b]"
                title="Export chats JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onImport}
                className="p-1 text-[#a1a1aa] hover:text-white rounded hover:bg-[#18181b]"
                title="Import chats JSON"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-3.5 h-3.5" />
              <span>Persona & Settings</span>
            </span>
          </button>

          {conversations.length > 0 && (
            <button
              onClick={onClearAll}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-[#71717a] hover:text-red-400 hover:bg-red-950/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear all chats</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
