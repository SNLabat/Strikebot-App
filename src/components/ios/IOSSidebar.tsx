'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { X, Plus, Trash2, Download, MessageSquare, ChevronRight, Volume2, VolumeX, Clock } from 'lucide-react';

export interface IOSAppSettings {
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
  showTimestamps: boolean;
  soundEnabled: boolean;
}

export interface IOSChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface IOSChatSession {
  id: string;
  title: string;
  messages: IOSChatMessage[];
  createdAt: string;
  updatedAt: string;
}

interface IOSSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentStep: number;
  onStepChange: (step: number) => void;
  steps: string[];
  settings: IOSAppSettings;
  onSettingsChange: (settings: IOSAppSettings) => void;
  chatSessions: IOSChatSession[];
  activeChatId: string | null;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onClearAllChats: () => void;
  onNewChat: () => void;
  onExportChat: () => void;
}

const FONT_SIZES: { label: string; value: IOSAppSettings['fontSize'] }[] = [
  { label: 'S', value: 'small' },
  { label: 'M', value: 'medium' },
  { label: 'L', value: 'large' },
  { label: 'XL', value: 'xlarge' },
];

export default function IOSSidebar({
  isOpen,
  onClose,
  currentStep,
  onStepChange,
  steps,
  settings,
  onSettingsChange,
  chatSessions,
  activeChatId,
  onSelectChat,
  onDeleteChat,
  onClearAllChats,
  onNewChat,
  onExportChat,
}: IOSSidebarProps) {
  const [clearProgress, setClearProgress] = useState(0);
  const [isClearing, setIsClearing] = useState(false);
  const clearTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const clearStartRef = useRef<number>(0);

  const handleStepClick = (index: number) => {
    onStepChange(index);
    onClose();
  };

  // Press-and-hold to clear all chats
  const startClearHold = useCallback(() => {
    if (chatSessions.length === 0) return;
    setIsClearing(true);
    setClearProgress(0);
    clearStartRef.current = Date.now();

    clearTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - clearStartRef.current;
      const progress = Math.min((elapsed / 1500) * 100, 100);
      setClearProgress(progress);

      if (progress >= 100) {
        if (clearTimerRef.current) clearInterval(clearTimerRef.current);
        clearTimerRef.current = null;
        setIsClearing(false);
        setClearProgress(0);
        onClearAllChats();
      }
    }, 10);
  }, [chatSessions.length, onClearAllChats]);

  const cancelClearHold = useCallback(() => {
    if (clearTimerRef.current) {
      clearInterval(clearTimerRef.current);
      clearTimerRef.current = null;
    }
    setIsClearing(false);
    setClearProgress(0);
  }, []);

  useEffect(() => {
    return () => {
      if (clearTimerRef.current) clearInterval(clearTimerRef.current);
    };
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[998] transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full w-80 bg-gray-950 border-r border-gray-800 z-[999] transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-xs">S</div>
            <span className="font-semibold text-white">Strikebot iOS</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Navigation */}
          <div className="p-3">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-2 px-2">Steps</p>
            <nav className="space-y-0.5">
              {steps.map((step, i) => {
                const isActive = currentStep === i;
                return (
                  <button
                    key={step}
                    onClick={() => handleStepClick(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-900'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-[10px]">
                      {i < currentStep ? '✓' : i + 1}
                    </span>
                    {step}
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mx-3 border-t border-gray-800" />

          {/* Chat History */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-2 px-2">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Chat History</p>
              <div className="flex items-center gap-1">
                <button
                  onClick={onExportChat}
                  className="p-1 rounded hover:bg-gray-800 text-gray-600 hover:text-gray-300 transition-colors"
                  title="Export current chat"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={onNewChat}
                  className="p-1 rounded hover:bg-gray-800 text-gray-600 hover:text-blue-400 transition-colors"
                  title="New chat"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {chatSessions.length === 0 ? (
              <p className="text-xs text-gray-700 px-2 py-3 text-center">
                No test conversations yet. Go to the Chat step to start one.
              </p>
            ) : (
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {chatSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all ${
                      activeChatId === session.id
                        ? 'bg-gray-800 text-white'
                        : 'text-gray-500 hover:text-white hover:bg-gray-900'
                    }`}
                    onClick={() => onSelectChat(session.id)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{session.title}</p>
                      <p className="text-[10px] text-gray-600">{formatDate(session.updatedAt)}</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteChat(session.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 text-gray-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mx-3 border-t border-gray-800" />

          {/* Settings */}
          <div className="p-3">
            <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider mb-3 px-2">Settings</p>

            {/* Font Size */}
            <div className="px-2 mb-4">
              <p className="text-xs text-gray-500 mb-2">Font Size</p>
              <div className="flex gap-1">
                {FONT_SIZES.map((fs) => (
                  <button
                    key={fs.value}
                    onClick={() => onSettingsChange({ ...settings, fontSize: fs.value })}
                    className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-all ${
                      settings.fontSize === fs.value
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                        : 'bg-gray-800 text-gray-500 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    {fs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Timestamps Toggle */}
            <div className="px-2 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <span className="text-xs text-gray-500">Show Timestamps</span>
                </div>
                <button
                  onClick={() => onSettingsChange({ ...settings, showTimestamps: !settings.showTimestamps })}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    settings.showTimestamps ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.showTimestamps ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Sound Toggle */}
            <div className="px-2 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {settings.soundEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-gray-500" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-gray-500" />
                  )}
                  <span className="text-xs text-gray-500">Sound Notifications</span>
                </div>
                <button
                  onClick={() => onSettingsChange({ ...settings, soundEnabled: !settings.soundEnabled })}
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-700'
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.soundEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Clear All */}
        <div className="p-3 border-t border-gray-800">
          <button
            onMouseDown={startClearHold}
            onMouseUp={cancelClearHold}
            onMouseLeave={cancelClearHold}
            onTouchStart={startClearHold}
            onTouchEnd={cancelClearHold}
            disabled={chatSessions.length === 0}
            className={`relative w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all overflow-hidden ${
              chatSessions.length === 0
                ? 'bg-gray-900 text-gray-700 cursor-not-allowed'
                : 'bg-gray-900 text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-gray-800 hover:border-red-500/30'
            }`}
          >
            {isClearing && (
              <div
                className="absolute inset-0 bg-red-500/20 transition-none"
                style={{ width: `${clearProgress}%` }}
              />
            )}
            <Trash2 className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">
              {isClearing ? 'Hold to clear...' : 'Hold to Clear All Chats'}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
