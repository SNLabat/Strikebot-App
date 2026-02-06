'use client';

import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TIER_CONFIGS, AVAILABLE_MODELS, ChatbotConfig, TierName, BillingPeriod, AddOn, AppSettings, ChatMessage, ChatSession } from '@/types/chatbot';
import TierSelector from '@/components/TierSelector';
import AddOnsSelector from '@/components/AddOnsSelector';
import ChatbotSettings from '@/components/ChatbotSettings';
import ThemeCustomizer from '@/components/ThemeCustomizer';
import WidgetSettings from '@/components/WidgetSettings';
import KnowledgeBaseEditor from '@/components/KnowledgeBaseEditor';
import PluginPreview from '@/components/PluginPreview';
import AppSidebar from '@/components/AppSidebar';
import ChatTester from '@/components/ChatTester';
import { Download, Bot, Settings, Palette, MessageSquare, Eye, PlusCircle, Database, Menu, FlaskConical } from 'lucide-react';

type TabId = 'tier' | 'addons' | 'settings' | 'knowledge' | 'theme' | 'widget' | 'chat' | 'preview';

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 'medium',
  showTimestamps: true,
  soundEnabled: true,
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>('tier');
  const [isGenerating, setIsGenerating] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>('monthly');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // App settings (persisted to localStorage)
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  // Chat testing state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [currentMessages, setCurrentMessages] = useState<ChatMessage[]>([]);

  // Load settings and chat sessions from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('strikebot-app-settings');
      if (savedSettings) {
        setAppSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      }
      const savedSessions = localStorage.getItem('strikebot-chat-sessions');
      if (savedSessions) {
        setChatSessions(JSON.parse(savedSessions));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save settings to localStorage
  const handleSettingsChange = useCallback((newSettings: AppSettings) => {
    setAppSettings(newSettings);
    try {
      localStorage.setItem('strikebot-app-settings', JSON.stringify(newSettings));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save chat sessions to localStorage
  const saveSessions = useCallback((sessions: ChatSession[]) => {
    setChatSessions(sessions);
    try {
      localStorage.setItem('strikebot-chat-sessions', JSON.stringify(sessions));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Save current messages to active session
  const handleMessagesChange = useCallback((messages: ChatMessage[]) => {
    setCurrentMessages(messages);

    if (messages.length === 0) return;

    const title = messages[0]?.content.slice(0, 50) || 'New Chat';
    const now = new Date().toISOString();

    setChatSessions((prev) => {
      let updated: ChatSession[];
      if (activeChatId) {
        const exists = prev.some((s) => s.id === activeChatId);
        if (exists) {
          updated = prev.map((s) =>
            s.id === activeChatId
              ? { ...s, messages, title, updatedAt: now }
              : s
          );
        } else {
          updated = [{ id: activeChatId, title, messages, createdAt: now, updatedAt: now }, ...prev];
        }
      } else {
        const newId = uuidv4();
        setActiveChatId(newId);
        updated = [{ id: newId, title, messages, createdAt: now, updatedAt: now }, ...prev];
      }

      // Limit to 50 sessions
      updated = updated.slice(0, 50);
      try {
        localStorage.setItem('strikebot-chat-sessions', JSON.stringify(updated));
      } catch {
        // Ignore
      }
      return updated;
    });
  }, [activeChatId]);

  // Chat session management
  const handleSelectChat = useCallback((id: string) => {
    // Save current messages first if there's an active chat
    const session = chatSessions.find((s) => s.id === id);
    if (session) {
      setActiveChatId(id);
      setCurrentMessages(session.messages);
      setActiveTab('chat');
    }
  }, [chatSessions]);

  const handleDeleteChat = useCallback((id: string) => {
    const updated = chatSessions.filter((s) => s.id !== id);
    saveSessions(updated);
    if (activeChatId === id) {
      setActiveChatId(null);
      setCurrentMessages([]);
    }
  }, [chatSessions, activeChatId, saveSessions]);

  const handleClearAllChats = useCallback(() => {
    saveSessions([]);
    setActiveChatId(null);
    setCurrentMessages([]);
  }, [saveSessions]);

  const handleNewChat = useCallback(() => {
    setActiveChatId(null);
    setCurrentMessages([]);
    setActiveTab('chat');
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
    a.download = `strikebot-chat-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, [currentMessages]);

  const [config, setConfig] = useState<ChatbotConfig>({
    id: uuidv4(),
    name: 'My Chatbot',
    tier: 'starter',
    billingPeriod: 'monthly',
    addOns: [],
    model: 'gpt-4o-mini',
    apiKey: '',
    apiEndpoint: 'https://api.openai.com/v1',
    theme: {
      primaryColor: '#3B82F6',
      secondaryColor: '#1E40AF',
      backgroundColor: '#FFFFFF',
      textColor: '#1F2937',
      mode: 'light',
    },
    widget: {
      position: 'bottom-right',
      welcomeMessage: 'Hello! How can I help you today?',
      placeholder: 'Type your message...',
      iconUrl: '',
    },
    limits: {
      messageCreditsPerMonth: TIER_CONFIGS.starter.features.messageCreditsPerMonth,
      storageLimitMB: TIER_CONFIGS.starter.features.storageLimitMB,
      linkTrainingLimit: TIER_CONFIGS.starter.features.linkTrainingLimit === 'unlimited'
        ? null
        : TIER_CONFIGS.starter.features.linkTrainingLimit,
    },
    features: {
      apiAccess: TIER_CONFIGS.starter.features.apiAccess,
      analytics: TIER_CONFIGS.starter.features.analytics,
      autoRetrain: TIER_CONFIGS.starter.features.autoRetrain,
      modelAccess: TIER_CONFIGS.starter.features.modelAccess,
    },
    knowledgeBase: {
      sitemapUrls: [],
      pageUrls: [],
      textEntries: [],
      qaEntries: [],
      fileReferences: [],
    },
    systemPrompt: '',
    fallbackMessage: '',
    conversationStarters: [],
    createdAt: new Date().toISOString(),
  });

  const handleTierChange = (tier: TierName) => {
    const tierConfig = TIER_CONFIGS[tier];
    const availableModels = AVAILABLE_MODELS.filter(
      m => m.tier === tier || m.tier === 'starter'
    );
    const currentModelAvailable = availableModels.some(m => m.id === config.model);

    setConfig({
      ...config,
      tier,
      model: currentModelAvailable ? config.model : availableModels[0].id,
      limits: {
        messageCreditsPerMonth: tierConfig.features.messageCreditsPerMonth,
        storageLimitMB: tierConfig.features.storageLimitMB,
        linkTrainingLimit: tierConfig.features.linkTrainingLimit === 'unlimited'
          ? null
          : tierConfig.features.linkTrainingLimit,
      },
      features: {
        apiAccess: tierConfig.features.apiAccess,
        analytics: tierConfig.features.analytics,
        autoRetrain: tierConfig.features.autoRetrain,
        modelAccess: tierConfig.features.modelAccess,
      },
    });
  };

  const handleBillingPeriodChange = (period: BillingPeriod) => {
    setBillingPeriod(period);
    setConfig({
      ...config,
      billingPeriod: period,
    });
  };

  const handleAddOnsChange = (addOns: AddOn[]) => {
    setConfig({
      ...config,
      addOns,
    });
  };

  const handleGeneratePlugin = async () => {
    if (!config.apiKey) {
      alert('Please enter an API key before generating the plugin.');
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-plugin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate plugin');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `strikebot-${config.name.toLowerCase().replace(/\s+/g, '-')}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating plugin:', error);
      alert('Failed to generate plugin. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const tabs = [
    { id: 'tier' as TabId, label: 'Plan', icon: Bot },
    { id: 'addons' as TabId, label: 'Add-Ons', icon: PlusCircle },
    { id: 'settings' as TabId, label: 'Settings', icon: Settings },
    { id: 'knowledge' as TabId, label: 'Knowledge', icon: Database },
    { id: 'theme' as TabId, label: 'Theme', icon: Palette },
    { id: 'widget' as TabId, label: 'Widget', icon: MessageSquare },
    { id: 'chat' as TabId, label: 'Chat Tester', icon: FlaskConical },
    { id: 'preview' as TabId, label: 'Preview', icon: Eye },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Sidebar */}
      <AppSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as TabId)}
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
      <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {/* Hamburger Menu Button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
              <Bot className="w-8 h-8 text-orange-500" />
              <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600">
                Strikebot Builder
              </h1>
            </div>
            <button
              onClick={handleGeneratePlugin}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 via-orange-600 to-orange-700 text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-orange-500/50"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">{isGenerating ? 'Generating...' : 'Download Plugin'}</span>
              <span className="sm:hidden">{isGenerating ? '...' : 'Download'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation - scrollable on mobile */}
        <nav className="flex space-x-1 bg-slate-800/50 backdrop-blur-lg p-1 rounded-lg mb-8 border border-slate-700/50 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all flex-shrink-0 flex-1 justify-center whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-orange-500/20 via-orange-600/20 to-orange-700/20 text-white shadow-lg border border-orange-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Tab Content */}
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-xl shadow-lg border border-slate-700/50 p-6">
          {activeTab === 'tier' && (
            <TierSelector
              selectedTier={config.tier}
              onTierChange={handleTierChange}
              billingPeriod={billingPeriod}
              onBillingPeriodChange={handleBillingPeriodChange}
            />
          )}
          {activeTab === 'addons' && (
            <AddOnsSelector
              selectedAddOns={config.addOns}
              onAddOnsChange={handleAddOnsChange}
            />
          )}
          {activeTab === 'settings' && (
            <ChatbotSettings
              config={config}
              onConfigChange={setConfig}
            />
          )}
          {activeTab === 'knowledge' && (
            <KnowledgeBaseEditor
              config={config}
              onConfigChange={setConfig}
            />
          )}
          {activeTab === 'theme' && (
            <ThemeCustomizer
              config={config}
              onConfigChange={setConfig}
            />
          )}
          {activeTab === 'widget' && (
            <WidgetSettings
              config={config}
              onConfigChange={setConfig}
            />
          )}
          {activeTab === 'chat' && (
            <ChatTester
              config={config}
              settings={appSettings}
              messages={currentMessages}
              onMessagesChange={handleMessagesChange}
            />
          )}
          {activeTab === 'preview' && (
            <PluginPreview config={config} />
          )}
        </div>

        {/* Current Configuration Summary */}
        <div className="mt-8 bg-slate-800/50 backdrop-blur-lg rounded-xl p-6 border border-slate-700/50">
          <h3 className="text-lg font-semibold text-white mb-4">Configuration Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-400">Plan</p>
              <p className="font-medium text-white">
                {TIER_CONFIGS[config.tier].displayName} ({config.billingPeriod})
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Monthly Price</p>
              <p className="font-medium text-white">
                ${config.billingPeriod === 'monthly'
                  ? TIER_CONFIGS[config.tier].pricing.monthly
                  : TIER_CONFIGS[config.tier].pricing.annualMonthly}
                {config.addOns.length > 0 && (
                  <span className="text-green-400">
                    {' '}+ ${config.addOns.reduce((sum, a) => sum + a.price, 0)}
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Model</p>
              <p className="font-medium text-white">
                {AVAILABLE_MODELS.find(m => m.id === config.model)?.name || config.model}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Message Credits</p>
              <p className="font-medium text-white">
                {config.limits.messageCreditsPerMonth.toLocaleString()}
                {config.addOns.some(a => a.type === 'extra_messages') && (
                  <span className="text-green-400">
                    {' '}+ {config.addOns.filter(a => a.type === 'extra_messages').reduce((sum, a) => sum + (a.value || 0), 0).toLocaleString()}
                  </span>
                )}
                /month
              </p>
            </div>
          </div>
          {config.addOns.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-sm text-slate-400 mb-2">Active Add-Ons:</p>
              <div className="flex flex-wrap gap-2">
                {config.addOns.map(addOn => (
                  <span key={addOn.id} className="px-3 py-1 bg-orange-500/20 text-orange-300 rounded-full text-sm">
                    {addOn.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
