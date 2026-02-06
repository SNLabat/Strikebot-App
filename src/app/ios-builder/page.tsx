'use client';

import { useState, useEffect, useCallback } from 'react';
import IOSSidebar, { IOSAppSettings, IOSChatMessage, IOSChatSession } from '@/components/ios/IOSSidebar';
import IOSChatTester from '@/components/ios/IOSChatTester';

// ── Types ──────────────────────────────────────────────

interface KnowledgeBase {
  sitemapUrls: string[];
  pageUrls: string[];
  textEntries: Array<{ title: string; content: string }>;
  qaEntries: Array<{ question: string; answer: string }>;
  fileReferences: Array<{ name: string; type: string }>;
}

interface iOSConfig {
  chatbotName: string;
  tier: string;
  model: string;
  apiKey: string;
  apiEndpoint: string;
  systemInstructions: string;
  theme: {
    displayMode: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
  };
  widget: {
    welcomeMessage: string;
    inputPlaceholder: string;
  };
  limits: {
    monthlyMessages: number;
    maxHistoryMessages: number;
    maxContextLength: number;
  };
  features: {
    removeBranding: boolean;
  };
  knowledgeBase: KnowledgeBase;
  fallbackMessage: string;
  conversationStarters: string[];
}

const DEFAULT_CONFIG: iOSConfig = {
  chatbotName: 'My Chatbot',
  tier: 'starter',
  model: 'gpt-4o-mini',
  apiKey: '',
  apiEndpoint: 'https://api.openai.com/v1',
  systemInstructions: 'You are a helpful assistant.',
  theme: {
    displayMode: 'light',
    primaryColor: '#2563EB',
    secondaryColor: '#1E40AF',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
  },
  widget: {
    welcomeMessage: 'Hello! How can I help you today?',
    inputPlaceholder: 'Type your message...',
  },
  limits: {
    monthlyMessages: 10000,
    maxHistoryMessages: 20,
    maxContextLength: 20000,
  },
  features: {
    removeBranding: false,
  },
  knowledgeBase: {
    sitemapUrls: [],
    pageUrls: [],
    textEntries: [],
    qaEntries: [],
    fileReferences: [],
  },
  fallbackMessage: '',
  conversationStarters: [],
};

const DEFAULT_SETTINGS: IOSAppSettings = {
  fontSize: 'medium',
  showTimestamps: true,
  soundEnabled: true,
};

const MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
];

const COLOR_PRESETS = [
  { name: 'Blue', primary: '#2563EB', secondary: '#1E40AF' },
  { name: 'Green', primary: '#059669', secondary: '#047857' },
  { name: 'Purple', primary: '#7C3AED', secondary: '#6D28D9' },
  { name: 'Red', primary: '#DC2626', secondary: '#B91C1C' },
  { name: 'Orange', primary: '#EA580C', secondary: '#C2410C' },
  { name: 'Teal', primary: '#0D9488', secondary: '#0F766E' },
];

const STEPS = ['Settings', 'Knowledge', 'Theme', 'Widget', 'Chat', 'Preview'];

// ── Main Component ─────────────────────────────────────

export default function iOSBuilderPage() {
  const [config, setConfig] = useState<iOSConfig>(DEFAULT_CONFIG);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // App settings
  const [appSettings, setAppSettings] = useState<IOSAppSettings>(DEFAULT_SETTINGS);

  // Chat testing state
  const [chatSessions, setChatSessions] = useState<IOSChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<IOSChatMessage[]>([]);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('strikebot-ios-settings');
      if (saved) setAppSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      const sessions = localStorage.getItem('strikebot-ios-sessions');
      if (sessions) setChatSessions(JSON.parse(sessions));
    } catch { /* ignore */ }
  }, []);

  const handleSettingsChange = useCallback((s: IOSAppSettings) => {
    setAppSettings(s);
    try { localStorage.setItem('strikebot-ios-settings', JSON.stringify(s)); } catch { /* */ }
  }, []);

  const saveSessions = useCallback((sessions: IOSChatSession[]) => {
    setChatSessions(sessions);
    try { localStorage.setItem('strikebot-ios-sessions', JSON.stringify(sessions)); } catch { /* */ }
  }, []);

  const handleMessagesChange = useCallback((messages: IOSChatMessage[]) => {
    setCurrentMessages(messages);
    if (messages.length === 0) return;

    const title = messages[0]?.content.slice(0, 50) || 'New Chat';
    const now = new Date().toISOString();

    setChatSessions((prev) => {
      let updated: IOSChatSession[];
      if (activeChatId) {
        const exists = prev.some((s) => s.id === activeChatId);
        if (exists) {
          updated = prev.map((s) => s.id === activeChatId ? { ...s, messages, title, updatedAt: now } : s);
        } else {
          updated = [{ id: activeChatId, title, messages, createdAt: now, updatedAt: now }, ...prev];
        }
      } else {
        const newId = `chat-${Date.now()}`;
        setActiveChatId(newId);
        updated = [{ id: newId, title, messages, createdAt: now, updatedAt: now }, ...prev];
      }
      updated = updated.slice(0, 50);
      try { localStorage.setItem('strikebot-ios-sessions', JSON.stringify(updated)); } catch { /* */ }
      return updated;
    });
  }, [activeChatId]);

  const handleSelectChat = useCallback((id: string) => {
    const session = chatSessions.find((s) => s.id === id);
    if (session) {
      setActiveChatId(id);
      setCurrentMessages(session.messages);
      setCurrentStep(4); // Chat step
    }
  }, [chatSessions]);

  const handleDeleteChat = useCallback((id: string) => {
    const updated = chatSessions.filter((s) => s.id !== id);
    saveSessions(updated);
    if (activeChatId === id) { setActiveChatId(null); setCurrentMessages([]); }
  }, [chatSessions, activeChatId, saveSessions]);

  const handleClearAllChats = useCallback(() => {
    saveSessions([]); setActiveChatId(null); setCurrentMessages([]);
  }, [saveSessions]);

  const handleNewChat = useCallback(() => {
    setActiveChatId(null); setCurrentMessages([]); setCurrentStep(4);
  }, []);

  const handleExportChat = useCallback(() => {
    if (currentMessages.length === 0) return;
    const text = currentMessages.map((m) => {
      const time = new Date(m.timestamp).toLocaleString();
      const role = m.role === 'user' ? 'You' : 'Bot';
      return `[${time}] ${role}: ${m.content}`;
    }).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strikebot-ios-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [currentMessages]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateConfig = (path: string, value: any) => {
    setConfig((prev) => {
      const parts = path.split('.');
      const newConfig = JSON.parse(JSON.stringify(prev));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let current: any = newConfig;
      for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
      return newConfig;
    });
  };

  const handleGenerate = async () => {
    if (!config.apiKey) {
      setError('API key is required');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate-ios-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate app');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strikebot-ios-${config.chatbotName.toLowerCase().replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Sidebar */}
      <IOSSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        steps={STEPS}
        settings={appSettings}
        onSettingsChange={handleSettingsChange}
        chatSessions={chatSessions}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        onClearAllChats={handleClearAllChats}
        onNewChat={handleNewChat}
        onExportChat={handleExportChat}
      />

      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger Menu */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
              S
            </div>
            <h1 className="text-lg font-semibold">Strikebot iOS Builder</h1>
          </div>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition">
            &larr; WordPress Builder
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto scrollbar-hide">
          {STEPS.map((step, i) => (
            <button
              key={step}
              onClick={() => setCurrentStep(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                i === currentStep
                  ? 'bg-blue-600 text-white'
                  : i < currentStep
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">
                {i < currentStep ? '✓' : i + 1}
              </span>
              <span className="hidden sm:inline">{step}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form Panel */}
          <div className={currentStep === 4 ? 'lg:col-span-5' : 'lg:col-span-3'}>
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              {currentStep === 0 && (
                <SettingsStep config={config} updateConfig={updateConfig} />
              )}
              {currentStep === 1 && (
                <KnowledgeStep config={config} updateConfig={updateConfig} setConfig={setConfig} />
              )}
              {currentStep === 2 && (
                <ThemeStep config={config} updateConfig={updateConfig} />
              )}
              {currentStep === 3 && (
                <WidgetStep config={config} updateConfig={updateConfig} />
              )}
              {currentStep === 4 && (
                <IOSChatTester
                  config={config}
                  settings={appSettings}
                  messages={currentMessages}
                  onMessagesChange={handleMessagesChange}
                />
              )}
              {currentStep === 5 && (
                <PreviewStep config={config} />
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
                <button
                  onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    currentStep === 0
                      ? 'opacity-0 pointer-events-none'
                      : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                  }`}
                >
                  &larr; Previous
                </button>

                {currentStep < STEPS.length - 1 ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="px-6 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition"
                  >
                    Next &rarr;
                  </button>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="px-6 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-500 text-white transition disabled:opacity-50"
                  >
                    {isGenerating ? 'Generating...' : 'Download Xcode Project'}
                  </button>
                )}
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* iPhone Preview - hide on Chat step */}
          {currentStep !== 4 && (
            <div className="lg:col-span-2">
              <div className="sticky top-8">
                <PhonePreview config={config} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Settings ───────────────────────────────────

function SettingsStep({
  config,
  updateConfig,
}: {
  config: iOSConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateConfig: (path: string, value: any) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold mb-4">Chatbot Settings</h2>

      <Field label="Chatbot Name">
        <input
          type="text"
          value={config.chatbotName}
          onChange={(e) => updateConfig('chatbotName', e.target.value)}
          className="input"
          placeholder="My Chatbot"
        />
      </Field>

      <Field label="AI Model">
        <select
          value={config.model}
          onChange={(e) => updateConfig('model', e.target.value)}
          className="input"
        >
          {MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="API Key">
        <input
          type="password"
          value={config.apiKey}
          onChange={(e) => updateConfig('apiKey', e.target.value)}
          className="input"
          placeholder="sk-..."
        />
        <p className="text-xs text-gray-500 mt-1">
          Your API key will be embedded in the app. For production, use a proxy server.
        </p>
      </Field>

      <Field label="API Endpoint">
        <input
          type="text"
          value={config.apiEndpoint}
          onChange={(e) => updateConfig('apiEndpoint', e.target.value)}
          className="input"
          placeholder="https://api.openai.com/v1"
        />
        <p className="text-xs text-gray-500 mt-1">
          Works with any OpenAI-compatible API (Azure, local LLMs, etc.)
        </p>
      </Field>

      <Field label="System Instructions">
        <textarea
          value={config.systemInstructions}
          onChange={(e) => updateConfig('systemInstructions', e.target.value)}
          className="input min-h-[100px] resize-y"
          placeholder="You are a helpful assistant..."
          rows={4}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Max History Messages">
          <input
            type="number"
            value={config.limits.maxHistoryMessages}
            onChange={(e) =>
              updateConfig('limits.maxHistoryMessages', parseInt(e.target.value) || 20)
            }
            className="input"
            min={1}
            max={50}
          />
        </Field>
        <Field label="Max Context Length">
          <input
            type="number"
            value={config.limits.maxContextLength}
            onChange={(e) =>
              updateConfig('limits.maxContextLength', parseInt(e.target.value) || 20000)
            }
            className="input"
            min={1000}
            max={100000}
            step={1000}
          />
        </Field>
      </div>
    </div>
  );
}

// ── Step 2: Knowledge Base ─────────────────────────────

type KBTab = 'sitemap' | 'urls' | 'text' | 'qa' | 'files' | 'starters' | 'fallback';

function KnowledgeStep({
  config,
  updateConfig,
  setConfig,
}: {
  config: iOSConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateConfig: (path: string, value: any) => void;
  setConfig: React.Dispatch<React.SetStateAction<iOSConfig>>;
}) {
  const [activeKBTab, setActiveKBTab] = useState<KBTab>('sitemap');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileType, setFileType] = useState('pdf');
  const [starterText, setStarterText] = useState('');

  const kb = config.knowledgeBase;

  const KB_TABS: { id: KBTab; label: string }[] = [
    { id: 'sitemap', label: 'Sitemaps' },
    { id: 'urls', label: 'URLs' },
    { id: 'text', label: 'Text' },
    { id: 'qa', label: 'Q&A' },
    { id: 'files', label: 'Files' },
    { id: 'starters', label: 'Starters' },
    { id: 'fallback', label: 'Fallback' },
  ];

  const addSitemap = () => {
    if (!sitemapUrl.trim()) return;
    setConfig((prev) => ({
      ...prev,
      knowledgeBase: { ...prev.knowledgeBase, sitemapUrls: [...prev.knowledgeBase.sitemapUrls, sitemapUrl.trim()] },
    }));
    setSitemapUrl('');
  };

  const removeSitemap = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      knowledgeBase: { ...prev.knowledgeBase, sitemapUrls: prev.knowledgeBase.sitemapUrls.filter((_, i) => i !== index) },
    }));
  };

  const addPageUrl = () => {
    if (!pageUrl.trim()) return;
    setConfig((prev) => ({
      ...prev,
      knowledgeBase: { ...prev.knowledgeBase, pageUrls: [...prev.knowledgeBase.pageUrls, pageUrl.trim()] },
    }));
    setPageUrl('');
  };

  const removePageUrl = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      knowledgeBase: { ...prev.knowledgeBase, pageUrls: prev.knowledgeBase.pageUrls.filter((_, i) => i !== index) },
    }));
  };

  const addTextEntry = () => {
    if (!textTitle.trim() || !textContent.trim()) return;
    setConfig((prev) => ({
      ...prev,
      knowledgeBase: { ...prev.knowledgeBase, textEntries: [...prev.knowledgeBase.textEntries, { title: textTitle.trim(), content: textContent.trim() }] },
    }));
    setTextTitle(''); setTextContent('');
  };

  const removeTextEntry = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      knowledgeBase: { ...prev.knowledgeBase, textEntries: prev.knowledgeBase.textEntries.filter((_, i) => i !== index) },
    }));
  };

  const addQA = () => {
    if (!qaQuestion.trim() || !qaAnswer.trim()) return;
    setConfig((prev) => ({
      ...prev,
      knowledgeBase: { ...prev.knowledgeBase, qaEntries: [...prev.knowledgeBase.qaEntries, { question: qaQuestion.trim(), answer: qaAnswer.trim() }] },
    }));
    setQaQuestion(''); setQaAnswer('');
  };

  const removeQA = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      knowledgeBase: { ...prev.knowledgeBase, qaEntries: prev.knowledgeBase.qaEntries.filter((_, i) => i !== index) },
    }));
  };

  const addFile = () => {
    if (!fileName.trim()) return;
    setConfig((prev) => ({
      ...prev,
      knowledgeBase: { ...prev.knowledgeBase, fileReferences: [...prev.knowledgeBase.fileReferences, { name: fileName.trim(), type: fileType }] },
    }));
    setFileName('');
  };

  const removeFile = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      knowledgeBase: { ...prev.knowledgeBase, fileReferences: prev.knowledgeBase.fileReferences.filter((_, i) => i !== index) },
    }));
  };

  const addStarter = () => {
    if (!starterText.trim()) return;
    setConfig((prev) => ({
      ...prev,
      conversationStarters: [...prev.conversationStarters, starterText.trim()],
    }));
    setStarterText('');
  };

  const removeStarter = (index: number) => {
    setConfig((prev) => ({
      ...prev,
      conversationStarters: prev.conversationStarters.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold mb-1">Knowledge Base</h2>
      <p className="text-sm text-gray-400 mb-4">Configure the data sources and behavior for your chatbot.</p>

      {/* KB Tab Nav */}
      <div className="flex flex-wrap gap-1 mb-4">
        {KB_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveKBTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeKBTab === tab.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            {tab.label}
            {tab.id === 'sitemap' && kb.sitemapUrls.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-500/30 text-[10px]">{kb.sitemapUrls.length}</span>
            )}
            {tab.id === 'urls' && kb.pageUrls.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-500/30 text-[10px]">{kb.pageUrls.length}</span>
            )}
            {tab.id === 'text' && kb.textEntries.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-500/30 text-[10px]">{kb.textEntries.length}</span>
            )}
            {tab.id === 'qa' && kb.qaEntries.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-500/30 text-[10px]">{kb.qaEntries.length}</span>
            )}
            {tab.id === 'files' && kb.fileReferences.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-500/30 text-[10px]">{kb.fileReferences.length}</span>
            )}
            {tab.id === 'starters' && config.conversationStarters.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-blue-500/30 text-[10px]">{config.conversationStarters.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Sitemap URLs */}
      {activeKBTab === 'sitemap' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Add sitemap URLs to crawl for training data.</p>
          <div className="flex gap-2">
            <input value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addSitemap()} className="input flex-1" placeholder="https://example.com/sitemap.xml" />
            <button onClick={addSitemap} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition">Add</button>
          </div>
          {kb.sitemapUrls.map((url, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-300 truncate">{url}</span>
              <button onClick={() => removeSitemap(i)} className="text-gray-500 hover:text-red-400 transition text-xs ml-2">Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Page URLs */}
      {activeKBTab === 'urls' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Add specific page URLs to include as training data.</p>
          <div className="flex gap-2">
            <input value={pageUrl} onChange={(e) => setPageUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPageUrl()} className="input flex-1" placeholder="https://example.com/about" />
            <button onClick={addPageUrl} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition">Add</button>
          </div>
          {kb.pageUrls.map((url, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
              <span className="text-sm text-gray-300 truncate">{url}</span>
              <button onClick={() => removePageUrl(i)} className="text-gray-500 hover:text-red-400 transition text-xs ml-2">Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Text Entries */}
      {activeKBTab === 'text' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Add custom text content for the knowledge base.</p>
          <Field label="Title">
            <input value={textTitle} onChange={(e) => setTextTitle(e.target.value)} className="input" placeholder="Topic title" />
          </Field>
          <Field label="Content">
            <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} className="input min-h-[80px] resize-y" placeholder="Enter detailed content..." rows={3} />
          </Field>
          <button onClick={addTextEntry} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition">Add Entry</button>
          {kb.textEntries.map((entry, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200">{entry.title}</span>
                <button onClick={() => removeTextEntry(i)} className="text-gray-500 hover:text-red-400 transition text-xs">Remove</button>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entry.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* Q&A Pairs */}
      {activeKBTab === 'qa' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Add question-answer pairs for precise responses.</p>
          <Field label="Question">
            <input value={qaQuestion} onChange={(e) => setQaQuestion(e.target.value)} className="input" placeholder="What is your return policy?" />
          </Field>
          <Field label="Answer">
            <textarea value={qaAnswer} onChange={(e) => setQaAnswer(e.target.value)} className="input min-h-[60px] resize-y" placeholder="Our return policy allows..." rows={2} />
          </Field>
          <button onClick={addQA} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition">Add Q&A</button>
          {kb.qaEntries.map((entry, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-200">Q: {entry.question}</span>
                <button onClick={() => removeQA(i)} className="text-gray-500 hover:text-red-400 transition text-xs">Remove</button>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">A: {entry.answer}</p>
            </div>
          ))}
        </div>
      )}

      {/* File References */}
      {activeKBTab === 'files' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Reference files to include in your knowledge base.</p>
          <div className="flex gap-2">
            <input value={fileName} onChange={(e) => setFileName(e.target.value)} className="input flex-1" placeholder="document.pdf" />
            <select value={fileType} onChange={(e) => setFileType(e.target.value)} className="input w-28">
              <option value="pdf">PDF</option>
              <option value="txt">TXT</option>
              <option value="csv">CSV</option>
              <option value="doc">DOC</option>
              <option value="json">JSON</option>
            </select>
            <button onClick={addFile} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition">Add</button>
          </div>
          {kb.fileReferences.map((file, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-[10px] font-medium uppercase">{file.type}</span>
                <span className="text-sm text-gray-300">{file.name}</span>
              </div>
              <button onClick={() => removeFile(i)} className="text-gray-500 hover:text-red-400 transition text-xs">Remove</button>
            </div>
          ))}
        </div>
      )}

      {/* Conversation Starters */}
      {activeKBTab === 'starters' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Suggested conversation starters shown to users.</p>
          <div className="flex gap-2">
            <input value={starterText} onChange={(e) => setStarterText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addStarter()} className="input flex-1" placeholder="What services do you offer?" />
            <button onClick={addStarter} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition">Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {config.conversationStarters.map((s, i) => (
              <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 rounded-full text-sm text-gray-300">
                {s}
                <button onClick={() => removeStarter(i)} className="text-gray-500 hover:text-red-400 transition">&times;</button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Fallback Message */}
      {activeKBTab === 'fallback' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">Message shown when the chatbot cannot answer a question.</p>
          <Field label="Fallback Message">
            <textarea
              value={config.fallbackMessage}
              onChange={(e) => updateConfig('fallbackMessage', e.target.value)}
              className="input min-h-[80px] resize-y"
              placeholder="I'm sorry, I don't have information about that. Please contact our support team."
              rows={3}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

// ── Step 3: Theme ──────────────────────────────────────

function ThemeStep({
  config,
  updateConfig,
}: {
  config: iOSConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateConfig: (path: string, value: any) => void;
}) {
  const applyPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    updateConfig('theme.primaryColor', preset.primary);
    updateConfig('theme.secondaryColor', preset.secondary);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold mb-4">Theme</h2>

      <Field label="Display Mode">
        <div className="flex gap-3">
          {['light', 'dark'].map((mode) => (
            <button
              key={mode}
              onClick={() => {
                updateConfig('theme.displayMode', mode);
                if (mode === 'dark') {
                  updateConfig('theme.backgroundColor', '#111827');
                  updateConfig('theme.textColor', '#F9FAFB');
                } else {
                  updateConfig('theme.backgroundColor', '#FFFFFF');
                  updateConfig('theme.textColor', '#1F2937');
                }
              }}
              className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition ${
                config.theme.displayMode === mode
                  ? 'border-blue-500 bg-blue-600/10 text-blue-400'
                  : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {mode === 'light' ? '☀️ Light' : '🌙 Dark'}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Color Presets">
        <div className="grid grid-cols-3 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                config.theme.primaryColor === preset.primary
                  ? 'border-blue-500 bg-blue-600/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: preset.primary }}
              />
              {preset.name}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Primary Color">
          <div className="flex items-center gap-2">
            <input type="color" value={config.theme.primaryColor} onChange={(e) => updateConfig('theme.primaryColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
            <input type="text" value={config.theme.primaryColor} onChange={(e) => updateConfig('theme.primaryColor', e.target.value)} className="input flex-1" />
          </div>
        </Field>
        <Field label="Secondary Color">
          <div className="flex items-center gap-2">
            <input type="color" value={config.theme.secondaryColor} onChange={(e) => updateConfig('theme.secondaryColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
            <input type="text" value={config.theme.secondaryColor} onChange={(e) => updateConfig('theme.secondaryColor', e.target.value)} className="input flex-1" />
          </div>
        </Field>
        <Field label="Background Color">
          <div className="flex items-center gap-2">
            <input type="color" value={config.theme.backgroundColor} onChange={(e) => updateConfig('theme.backgroundColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
            <input type="text" value={config.theme.backgroundColor} onChange={(e) => updateConfig('theme.backgroundColor', e.target.value)} className="input flex-1" />
          </div>
        </Field>
        <Field label="Text Color">
          <div className="flex items-center gap-2">
            <input type="color" value={config.theme.textColor} onChange={(e) => updateConfig('theme.textColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
            <input type="text" value={config.theme.textColor} onChange={(e) => updateConfig('theme.textColor', e.target.value)} className="input flex-1" />
          </div>
        </Field>
      </div>
    </div>
  );
}

// ── Step 4: Widget ─────────────────────────────────────

function WidgetStep({
  config,
  updateConfig,
}: {
  config: iOSConfig;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateConfig: (path: string, value: any) => void;
}) {
  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold mb-4">Chat Settings</h2>

      <Field label="Welcome Message">
        <textarea
          value={config.widget.welcomeMessage}
          onChange={(e) => updateConfig('widget.welcomeMessage', e.target.value)}
          className="input min-h-[80px] resize-y"
          rows={3}
        />
      </Field>

      <Field label="Input Placeholder">
        <input
          type="text"
          value={config.widget.inputPlaceholder}
          onChange={(e) => updateConfig('widget.inputPlaceholder', e.target.value)}
          className="input"
        />
      </Field>

      <Field label="Remove Branding">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={config.features.removeBranding}
            onChange={(e) => updateConfig('features.removeBranding', e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600"
          />
          <span className="text-sm text-gray-300">
            Hide &quot;Powered by Strikebot&quot; footer
          </span>
        </label>
      </Field>
    </div>
  );
}

// ── Step 6: Preview ────────────────────────────────────

function PreviewStep({ config }: { config: iOSConfig }) {
  const kb = config.knowledgeBase;
  const totalKB = kb.sitemapUrls.length + kb.pageUrls.length + kb.textEntries.length + kb.qaEntries.length + kb.fileReferences.length;

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold mb-4">Review Configuration</h2>

      <div className="space-y-4">
        <SummarySection title="Chatbot">
          <SummaryItem label="Name" value={config.chatbotName} />
          <SummaryItem label="Model" value={config.model} />
          <SummaryItem label="API Endpoint" value={config.apiEndpoint} />
          <SummaryItem
            label="System Instructions"
            value={
              config.systemInstructions.length > 80
                ? config.systemInstructions.slice(0, 80) + '...'
                : config.systemInstructions
            }
          />
        </SummarySection>

        {totalKB > 0 && (
          <SummarySection title="Knowledge Base">
            {kb.sitemapUrls.length > 0 && <SummaryItem label="Sitemaps" value={`${kb.sitemapUrls.length} URL(s)`} />}
            {kb.pageUrls.length > 0 && <SummaryItem label="Page URLs" value={`${kb.pageUrls.length} URL(s)`} />}
            {kb.textEntries.length > 0 && <SummaryItem label="Text Entries" value={`${kb.textEntries.length} entry(ies)`} />}
            {kb.qaEntries.length > 0 && <SummaryItem label="Q&A Pairs" value={`${kb.qaEntries.length} pair(s)`} />}
            {kb.fileReferences.length > 0 && <SummaryItem label="Files" value={`${kb.fileReferences.length} file(s)`} />}
          </SummarySection>
        )}

        {config.conversationStarters.length > 0 && (
          <SummarySection title="Conversation Starters">
            <div className="flex flex-wrap gap-1.5">
              {config.conversationStarters.map((s, i) => (
                <span key={i} className="px-2.5 py-1 bg-blue-600/20 text-blue-400 rounded-full text-xs">{s}</span>
              ))}
            </div>
          </SummarySection>
        )}

        <SummarySection title="Theme">
          <SummaryItem label="Display Mode" value={config.theme.displayMode} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 w-32">Colors</span>
            <div className="flex gap-1">
              {[config.theme.primaryColor, config.theme.secondaryColor, config.theme.backgroundColor, config.theme.textColor].map((color, i) => (
                <div key={i} className="w-6 h-6 rounded border border-gray-600" style={{ backgroundColor: color }} title={color} />
              ))}
            </div>
          </div>
        </SummarySection>

        <SummarySection title="Chat Settings">
          <SummaryItem label="Welcome Message" value={config.widget.welcomeMessage} />
          <SummaryItem label="Placeholder" value={config.widget.inputPlaceholder} />
          <SummaryItem label="Branding" value={config.features.removeBranding ? 'Hidden' : 'Shown'} />
        </SummarySection>

        <SummarySection title="Limits">
          <SummaryItem label="History Messages" value={config.limits.maxHistoryMessages.toString()} />
          <SummaryItem label="Context Length" value={config.limits.maxContextLength.toLocaleString() + ' chars'} />
        </SummarySection>

        <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
          <h3 className="text-sm font-medium text-blue-400 mb-2">What you&apos;ll get</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>&#10003; Complete Xcode project (.xcodeproj)</li>
            <li>&#10003; SwiftUI chatbot interface</li>
            <li>&#10003; Pre-configured with your settings</li>
            <li>&#10003; Knowledge base configuration included</li>
            <li>&#10003; Chat history &amp; settings menu</li>
            <li>&#10003; Font size, timestamps, sound controls</li>
            <li>&#10003; Ready to build, sign, and run</li>
            <li>&#10003; iOS 16+ compatible</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ── iPhone Preview Component ───────────────────────────

function PhonePreview({ config }: { config: iOSConfig }) {
  const isDark = config.theme.displayMode === 'dark';
  const bg = config.theme.backgroundColor;
  const text = config.theme.textColor;
  const primary = config.theme.primaryColor;

  return (
    <div className="flex flex-col items-center">
      <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">
        Live Preview
      </p>

      <div className="relative w-[280px] h-[560px] rounded-[40px] border-4 border-gray-700 bg-gray-900 overflow-hidden shadow-2xl">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-gray-900 rounded-b-2xl z-10" />

        <div
          className="absolute inset-[2px] rounded-[36px] overflow-hidden flex flex-col"
          style={{ backgroundColor: bg }}
        >
          <div className="h-[44px] flex items-end justify-center pb-1">
            <span className="text-[10px] font-semibold" style={{ color: text }}>
              9:41
            </span>
          </div>

          <div
            className="px-4 py-2 flex items-center gap-2 border-b"
            style={{ borderColor: isDark ? '#374151' : '#E5E7EB' }}
          >
            {/* Hamburger icon in preview */}
            <div className="flex flex-col gap-[2px]">
              <div className="w-3 h-[1.5px] rounded" style={{ backgroundColor: text }} />
              <div className="w-3 h-[1.5px] rounded" style={{ backgroundColor: text }} />
              <div className="w-3 h-[1.5px] rounded" style={{ backgroundColor: text }} />
            </div>
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: primary }}
            />
            <span className="text-sm font-semibold" style={{ color: text }}>
              {config.chatbotName || 'My Chatbot'}
            </span>
          </div>

          <div className="flex-1 overflow-hidden px-3 py-3 space-y-2">
            <div className="flex">
              <div
                className="max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-sm text-xs"
                style={{
                  backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                  color: text,
                }}
              >
                {config.widget.welcomeMessage || 'Hello!'}
              </div>
            </div>

            {/* Conversation starters preview */}
            {config.conversationStarters.length > 0 && (
              <div className="flex flex-wrap gap-1 pl-1">
                {config.conversationStarters.slice(0, 2).map((s, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 rounded-full text-[8px] border"
                    style={{
                      borderColor: isDark ? '#374151' : '#D1D5DB',
                      color: isDark ? '#9CA3AF' : '#6B7280',
                    }}
                  >
                    {s.length > 20 ? s.slice(0, 20) + '...' : s}
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-end">
              <div
                className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-sm text-xs text-white"
                style={{ backgroundColor: primary }}
              >
                What can you help me with?
              </div>
            </div>

            <div className="flex">
              <div
                className="max-w-[75%] px-3 py-2 rounded-2xl rounded-bl-sm text-xs"
                style={{
                  backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                  color: text,
                }}
              >
                I can answer questions, help with tasks, and have conversations!
              </div>
            </div>
          </div>

          <div
            className="px-3 py-2 flex items-center gap-2 border-t"
            style={{ borderColor: isDark ? '#374151' : '#E5E7EB' }}
          >
            <div
              className="flex-1 px-3 py-1.5 rounded-full text-[10px]"
              style={{
                backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
                color: isDark ? '#9CA3AF' : '#6B7280',
              }}
            >
              {config.widget.inputPlaceholder || 'Type a message...'}
            </div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: primary }}
            >
              <span className="text-white text-[10px]">↑</span>
            </div>
          </div>

          {!config.features.removeBranding && (
            <div className="text-center py-1">
              <span
                className="text-[8px]"
                style={{ color: isDark ? '#4B5563' : '#9CA3AF' }}
              >
                Powered by Strikebot
              </span>
            </div>
          )}

          <div className="flex justify-center pb-2 pt-1">
            <div
              className="w-[100px] h-[4px] rounded-full"
              style={{ backgroundColor: isDark ? '#374151' : '#D1D5DB' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Shared Components ──────────────────────────────────

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

function SummarySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-sm text-gray-500 w-32 shrink-0">{label}</span>
      <span className="text-sm text-gray-200">{value}</span>
    </div>
  );
}
