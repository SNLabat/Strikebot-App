'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ArrowDown, Copy, Check, Loader2, RotateCcw } from 'lucide-react';
import { IOSAppSettings, IOSChatMessage } from './IOSSidebar';

interface IOSChatTesterProps {
  config: {
    chatbotName: string;
    model: string;
    apiKey: string;
    apiEndpoint: string;
    systemInstructions: string;
    theme: {
      displayMode: string;
      primaryColor: string;
      backgroundColor: string;
      textColor: string;
    };
    widget: {
      welcomeMessage: string;
      inputPlaceholder: string;
    };
    conversationStarters?: string[];
  };
  settings: IOSAppSettings;
  messages: IOSChatMessage[];
  onMessagesChange: (messages: IOSChatMessage[]) => void;
}

const FONT_SIZE_MAP: Record<IOSAppSettings['fontSize'], string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
  xlarge: 'text-lg',
};

let idCounter = 0;
function genId() {
  return `msg-${Date.now()}-${++idCounter}`;
}

export default function IOSChatTester({ config, settings, messages, onMessagesChange }: IOSChatTesterProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const playSound = useCallback(() => {
    if (!settings.soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 800;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Audio not supported
    }
  }, [settings.soundEnabled]);

  const copyMessage = async (content: string, id: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      showToast('Copied to clipboard');
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast('Failed to copy');
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: IOSChatMessage = {
      id: genId(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesChange(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      if (!config.apiKey) {
        throw new Error('No API key configured. Go to the Settings step to add one.');
      }

      const apiMessages: Array<{ role: string; content: string }> = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (config.systemInstructions) {
        apiMessages.unshift({ role: 'system', content: config.systemInstructions });
      }

      const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: apiMessages,
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error (${response.status}): ${errText}`);
      }

      const data = await response.json();
      const assistantContent = data.choices?.[0]?.message?.content || 'No response received.';

      const assistantMessage: IOSChatMessage = {
        id: genId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      onMessagesChange([...updatedMessages, assistantMessage]);
      playSound();
    } catch (error) {
      const errorMessage: IOSChatMessage = {
        id: genId(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'An unexpected error occurred.'}`,
        timestamp: new Date().toISOString(),
      };
      onMessagesChange([...updatedMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isDark = config.theme.displayMode === 'dark';
  const primary = config.theme.primaryColor;
  const fontSizeClass = FONT_SIZE_MAP[settings.fontSize];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Chat Tester</h2>
          <p className="text-sm text-gray-400 mt-1">
            Test your chatbot live. Messages are sent to your configured API.
          </p>
        </div>
        <button
          onClick={() => onMessagesChange([])}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors text-sm"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      {!config.apiKey && (
        <div className="px-4 py-3 bg-yellow-900/20 border border-yellow-800/50 rounded-lg">
          <p className="text-sm text-yellow-400">
            No API key configured. Go to the <strong>Settings</strong> step to add your API key.
          </p>
        </div>
      )}

      {/* Chat Window */}
      <div
        className="relative rounded-xl border border-gray-800 overflow-hidden flex flex-col"
        style={{ height: 'calc(100vh - 420px)', minHeight: '350px' }}
      >
        {/* Chat Header */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-800"
          style={{ backgroundColor: primary }}
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-white text-sm font-bold">
              {config.chatbotName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{config.chatbotName}</p>
            <p className="text-white/70 text-xs">
              {isLoading ? 'Typing...' : 'Online'} &middot; {config.model}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-3"
          style={{ backgroundColor: isDark ? '#111827' : '#f8fafc' }}
        >
          {/* Welcome */}
          {messages.length === 0 && (
            <div className="flex gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: primary }}
              >
                {config.chatbotName.charAt(0).toUpperCase()}
              </div>
              <div
                className={`px-3.5 py-2 rounded-2xl rounded-tl-sm max-w-[80%] ${fontSizeClass}`}
                style={{
                  backgroundColor: isDark ? '#1f2937' : '#e8ecf1',
                  color: isDark ? '#e2e8f0' : '#1e293b',
                }}
              >
                <p>{config.widget.welcomeMessage}</p>
              </div>
            </div>
          )}

          {/* Conversation Starters */}
          {messages.length === 0 && config.conversationStarters && config.conversationStarters.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-10">
              {config.conversationStarters.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => setInput(starter)}
                  className="px-3 py-1.5 rounded-full text-xs border border-gray-700 text-gray-400 hover:text-white hover:border-blue-500/50 hover:bg-blue-500/10 transition-all"
                >
                  {starter}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-2.5 group ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                  style={{ backgroundColor: primary }}
                >
                  {config.chatbotName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className={`max-w-[80%]`}>
                <div
                  className={`relative px-3.5 py-2 rounded-2xl ${fontSizeClass} ${
                    message.role === 'user' ? 'rounded-tr-sm text-white' : 'rounded-tl-sm'
                  }`}
                  style={
                    message.role === 'user'
                      ? { backgroundColor: primary }
                      : {
                          backgroundColor: isDark ? '#1f2937' : '#e8ecf1',
                          color: isDark ? '#e2e8f0' : '#1e293b',
                        }
                  }
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>

                  <button
                    onClick={() => copyMessage(message.content, message.id)}
                    className={`absolute -bottom-1 ${
                      message.role === 'user' ? 'left-0 -translate-x-full ml-1' : 'right-0 translate-x-full mr-1'
                    } p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700/80 hover:bg-gray-600 text-gray-300`}
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {settings.showTimestamps && (
                  <p className={`text-[10px] text-gray-600 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {formatTimestamp(message.timestamp)}
                  </p>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-7 h-7 rounded-full bg-gray-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                  Y
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-2.5">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: primary }}
              >
                {config.chatbotName.charAt(0).toUpperCase()}
              </div>
              <div
                className="px-3.5 py-3 rounded-2xl rounded-tl-sm"
                style={{ backgroundColor: isDark ? '#1f2937' : '#e8ecf1' }}
              >
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom */}
        {showScrollBtn && (
          <button
            onClick={() => scrollToBottom()}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-gray-700/90 hover:bg-gray-600 text-white shadow-lg flex items-center justify-center transition-all"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
        )}

        {/* Input */}
        <div
          className="p-3 border-t border-gray-800 flex gap-2"
          style={{ backgroundColor: isDark ? '#111827' : '#f0f2f5' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.widget.inputPlaceholder}
            disabled={isLoading}
            className={`flex-1 px-4 py-2 rounded-full ${fontSizeClass} outline-none disabled:opacity-50 transition-colors`}
            style={{
              backgroundColor: isDark ? '#1f2937' : '#ffffff',
              color: isDark ? '#e2e8f0' : '#1e293b',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-all hover:opacity-90 flex-shrink-0"
            style={{ backgroundColor: primary }}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-700 text-white text-sm rounded-lg shadow-lg z-[1000] animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
