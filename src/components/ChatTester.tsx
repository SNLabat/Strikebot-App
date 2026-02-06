'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, ArrowDown, Copy, Check, Bot, User, Loader2, RotateCcw } from 'lucide-react';
import { ChatbotConfig, AppSettings, ChatMessage } from '@/types/chatbot';
import { v4 as uuidv4 } from 'uuid';

interface ChatTesterProps {
  config: ChatbotConfig;
  settings: AppSettings;
  messages: ChatMessage[];
  onMessagesChange: (messages: ChatMessage[]) => void;
}

const FONT_SIZE_MAP: Record<AppSettings['fontSize'], string> = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
  xlarge: 'text-lg',
};

export default function ChatTester({ config, settings, messages, onMessagesChange }: ChatTesterProps) {
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
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
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
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: uuidv4(),
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
        throw new Error('No API key configured. Go to Settings tab to add one.');
      }

      const apiMessages: Array<{ role: string; content: string }> = updatedMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      if (config.systemPrompt) {
        apiMessages.unshift({ role: 'system', content: config.systemPrompt });
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

      const assistantMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
      };

      onMessagesChange([...updatedMessages, assistantMessage]);
      playSound();
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: uuidv4(),
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

  const handleReset = () => {
    onMessagesChange([]);
  };

  const fontSizeClass = FONT_SIZE_MAP[settings.fontSize];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-2xl font-bold text-white">Chat Tester</h2>
          <p className="text-slate-400 mt-1">
            Test your chatbot configuration with a live chat. Messages are sent to your configured API.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors text-sm"
          title="Reset conversation"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      {/* API Status Banner */}
      {!config.apiKey && (
        <div className="mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <p className="text-sm text-amber-400">
            No API key configured. Go to the <strong>Settings</strong> tab to add your API key before testing.
          </p>
        </div>
      )}

      {/* Chat Window */}
      <div
        className="relative rounded-xl border border-slate-700/50 overflow-hidden flex flex-col"
        style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}
      >
        {/* Chat Header */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50"
          style={{ backgroundColor: config.theme.primaryColor }}
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">{config.name}</p>
            <p className="text-white/70 text-xs">
              {isLoading ? 'Typing...' : 'Online'} &middot; {config.model}
            </p>
          </div>
        </div>

        {/* Messages Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          style={{
            backgroundColor: config.theme.mode === 'dark' ? '#1a1f2e' : '#f8fafc',
          }}
        >
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                style={{ backgroundColor: config.theme.primaryColor }}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div
                className={`px-4 py-2.5 rounded-2xl rounded-tl-sm max-w-[80%] ${fontSizeClass}`}
                style={{
                  backgroundColor: config.theme.mode === 'dark' ? '#2d3348' : '#e8ecf1',
                  color: config.theme.mode === 'dark' ? '#e2e8f0' : '#1e293b',
                }}
              >
                <p>{config.widget.welcomeMessage}</p>
              </div>
            </div>
          )}

          {/* Conversation Starters */}
          {messages.length === 0 && config.conversationStarters && config.conversationStarters.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-11">
              {config.conversationStarters.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setInput(starter);
                  }}
                  className="px-3 py-1.5 rounded-full text-xs border border-slate-600/50 text-slate-400 hover:text-white hover:border-orange-500/50 hover:bg-orange-500/10 transition-all"
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
              className={`flex gap-3 group ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                  style={{ backgroundColor: config.theme.primaryColor }}
                >
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`relative px-4 py-2.5 rounded-2xl ${fontSizeClass} ${
                    message.role === 'user'
                      ? 'rounded-tr-sm text-white'
                      : 'rounded-tl-sm'
                  }`}
                  style={
                    message.role === 'user'
                      ? { backgroundColor: config.theme.primaryColor }
                      : {
                          backgroundColor: config.theme.mode === 'dark' ? '#2d3348' : '#e8ecf1',
                          color: config.theme.mode === 'dark' ? '#e2e8f0' : '#1e293b',
                        }
                  }
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>

                  {/* Copy button */}
                  <button
                    onClick={() => copyMessage(message.content, message.id)}
                    className={`absolute -bottom-1 ${
                      message.role === 'user' ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'
                    } ml-1 mr-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity bg-slate-700/80 hover:bg-slate-600 text-slate-300`}
                    title="Copy message"
                  >
                    {copiedId === message.id ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Timestamp */}
                {settings.showTimestamps && (
                  <p className={`text-[10px] text-slate-500 mt-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                    {formatTimestamp(message.timestamp)}
                  </p>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex gap-3">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                style={{ backgroundColor: config.theme.primaryColor }}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div
                className="px-4 py-3 rounded-2xl rounded-tl-sm"
                style={{
                  backgroundColor: config.theme.mode === 'dark' ? '#2d3348' : '#e8ecf1',
                }}
              >
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
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
            className="absolute bottom-20 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-slate-700/90 hover:bg-slate-600 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
        )}

        {/* Input Area */}
        <div
          className="p-3 border-t border-slate-700/50 flex gap-2"
          style={{
            backgroundColor: config.theme.mode === 'dark' ? '#1a1f2e' : '#f0f2f5',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={config.widget.placeholder}
            disabled={isLoading}
            className={`flex-1 px-4 py-2.5 rounded-full ${fontSizeClass} outline-none disabled:opacity-50 transition-colors`}
            style={{
              backgroundColor: config.theme.mode === 'dark' ? '#2d3348' : '#ffffff',
              color: config.theme.mode === 'dark' ? '#e2e8f0' : '#1e293b',
            }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-50 transition-all hover:opacity-90 flex-shrink-0"
            style={{ backgroundColor: config.theme.primaryColor }}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-slate-700 text-white text-sm rounded-lg shadow-lg z-[1000] animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
