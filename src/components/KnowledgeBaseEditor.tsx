'use client';

import { useState } from 'react';
import {
  Database,
  Globe,
  FileText,
  HelpCircle,
  MessageCircle,
  Upload,
  Sparkles,
  AlertTriangle,
  X
} from 'lucide-react';
import { ChatbotConfig } from '@/types/chatbot';

interface KnowledgeBaseEditorProps {
  config: ChatbotConfig;
  onConfigChange: (config: ChatbotConfig) => void;
}

type TabType = 'system' | 'sitemap' | 'urls' | 'text' | 'qa' | 'files' | 'starters' | 'fallback';

export default function KnowledgeBaseEditor({ config, onConfigChange }: KnowledgeBaseEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('system');

  // Temporary input states for each section
  const [systemPrompt, setSystemPrompt] = useState(config.systemPrompt || '');
  const [sitemapUrl, setSitemapUrl] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaAnswer, setQaAnswer] = useState('');
  const [starter, setStarter] = useState('');
  const [fallbackMessage, setFallbackMessage] = useState(config.fallbackMessage || '');

  const kb = config.knowledgeBase || {
    sitemapUrls: [],
    pageUrls: [],
    textEntries: [],
    qaEntries: [],
    fileReferences: [],
  };

  const updateConfig = (updates: Partial<ChatbotConfig>) => {
    onConfigChange({ ...config, ...updates });
  };

  const updateKnowledgeBase = (updates: Partial<typeof kb>) => {
    updateConfig({
      knowledgeBase: { ...kb, ...updates },
    });
  };

  // System Prompt handlers
  const handleSystemPromptChange = (value: string) => {
    setSystemPrompt(value);
    updateConfig({ systemPrompt: value });
  };

  // Sitemap URLs handlers
  const handleAddSitemapUrl = () => {
    if (sitemapUrl.trim()) {
      updateKnowledgeBase({
        sitemapUrls: [...kb.sitemapUrls, sitemapUrl.trim()],
      });
      setSitemapUrl('');
    }
  };

  const handleRemoveSitemapUrl = (index: number) => {
    updateKnowledgeBase({
      sitemapUrls: kb.sitemapUrls.filter((_, i) => i !== index),
    });
  };

  // Page URLs handlers
  const handleAddPageUrl = () => {
    if (pageUrl.trim()) {
      updateKnowledgeBase({
        pageUrls: [...kb.pageUrls, pageUrl.trim()],
      });
      setPageUrl('');
    }
  };

  const handleRemovePageUrl = (index: number) => {
    updateKnowledgeBase({
      pageUrls: kb.pageUrls.filter((_, i) => i !== index),
    });
  };

  // Text Content handlers
  const handleAddTextEntry = () => {
    if (textTitle.trim() && textContent.trim()) {
      updateKnowledgeBase({
        textEntries: [
          ...kb.textEntries,
          { title: textTitle.trim(), content: textContent.trim() },
        ],
      });
      setTextTitle('');
      setTextContent('');
    }
  };

  const handleRemoveTextEntry = (index: number) => {
    updateKnowledgeBase({
      textEntries: kb.textEntries.filter((_, i) => i !== index),
    });
  };

  // Q&A Pairs handlers
  const handleAddQaPair = () => {
    if (qaQuestion.trim() && qaAnswer.trim()) {
      updateKnowledgeBase({
        qaEntries: [
          ...kb.qaEntries,
          { question: qaQuestion.trim(), answer: qaAnswer.trim() },
        ],
      });
      setQaQuestion('');
      setQaAnswer('');
    }
  };

  const handleRemoveQaPair = (index: number) => {
    updateKnowledgeBase({
      qaEntries: kb.qaEntries.filter((_, i) => i !== index),
    });
  };

  // Conversation Starters handlers
  const handleAddStarter = () => {
    if (starter.trim()) {
      updateConfig({
        conversationStarters: [
          ...(config.conversationStarters || []),
          starter.trim(),
        ],
      });
      setStarter('');
    }
  };

  const handleRemoveStarter = (index: number) => {
    updateConfig({
      conversationStarters: (config.conversationStarters || []).filter(
        (_, i) => i !== index
      ),
    });
  };

  // Fallback Message handlers
  const handleFallbackMessageChange = (value: string) => {
    setFallbackMessage(value);
    updateConfig({ fallbackMessage: value });
  };

  const TabButton = ({ tab, label, icon: Icon }: { tab: TabType; label: string; icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
        activeTab === tab
          ? 'border-orange-500 text-orange-400'
          : 'border-slate-700 text-slate-400 hover:text-slate-300'
      }`}
    >
      {Icon}
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Database className="w-6 h-6 text-orange-400" />
          <h2 className="text-2xl font-bold text-white">Knowledge Base Configuration</h2>
        </div>
        <p className="text-slate-400">
          Configure the information your chatbot will use to answer questions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-700 flex flex-wrap gap-1">
        <TabButton tab="system" label="System Prompt" icon={<Sparkles className="w-4 h-4" />} />
        <TabButton tab="sitemap" label="Sitemaps" icon={<Globe className="w-4 h-4" />} />
        <TabButton tab="urls" label="Page URLs" icon={<FileText className="w-4 h-4" />} />
        <TabButton tab="text" label="Text Content" icon={<FileText className="w-4 h-4" />} />
        <TabButton tab="qa" label="Q&A Pairs" icon={<HelpCircle className="w-4 h-4" />} />
        <TabButton tab="files" label="File References" icon={<Upload className="w-4 h-4" />} />
        <TabButton tab="starters" label="Conversation Starters" icon={<MessageCircle className="w-4 h-4" />} />
        <TabButton tab="fallback" label="Fallback Message" icon={<AlertTriangle className="w-4 h-4" />} />
      </div>

      {/* Tab Content */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
        {/* System Prompt Tab */}
        {activeTab === 'system' && (
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                System Prompt
              </label>
              <p className="text-slate-400 text-sm mb-4">
                Define how your chatbot should behave and respond. This instruction set will guide all AI responses.
              </p>
              <textarea
                value={systemPrompt}
                onChange={(e) => handleSystemPromptChange(e.target.value)}
                placeholder="You are a helpful customer support assistant. Be polite, concise, and always try to solve problems..."
                className="w-full h-48 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-slate-500 text-xs mt-2">
                {systemPrompt.length} characters
              </p>
            </div>
          </div>
        )}

        {/* Sitemap URLs Tab */}
        {activeTab === 'sitemap' && (
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Sitemap URLs
              </label>
              <p className="text-slate-400 text-sm mb-4">
                Add XML sitemap URLs to automatically crawl and index your website content.
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="url"
                  value={sitemapUrl}
                  onChange={(e) => setSitemapUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSitemapUrl()}
                  placeholder="https://example.com/sitemap.xml"
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={handleAddSitemapUrl}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {kb.sitemapUrls.length === 0 ? (
                  <p className="text-slate-500 text-sm">No sitemaps added yet</p>
                ) : (
                  kb.sitemapUrls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-700/30 border border-slate-600 rounded p-3"
                    >
                      <span className="text-slate-300 text-sm break-all">{url}</span>
                      <button
                        onClick={() => handleRemoveSitemapUrl(index)}
                        className="text-slate-400 hover:text-red-400 transition-colors ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Page URLs Tab */}
        {activeTab === 'urls' && (
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Page URLs
              </label>
              <p className="text-slate-400 text-sm mb-4">
                Add specific page URLs to train your chatbot on that content.
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="url"
                  value={pageUrl}
                  onChange={(e) => setPageUrl(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddPageUrl()}
                  placeholder="https://example.com/about"
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={handleAddPageUrl}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {kb.pageUrls.length === 0 ? (
                  <p className="text-slate-500 text-sm">No page URLs added yet</p>
                ) : (
                  kb.pageUrls.map((url, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-700/30 border border-slate-600 rounded p-3"
                    >
                      <span className="text-slate-300 text-sm break-all">{url}</span>
                      <button
                        onClick={() => handleRemovePageUrl(index)}
                        className="text-slate-400 hover:text-red-400 transition-colors ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Text Content Tab */}
        {activeTab === 'text' && (
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Text Content
              </label>
              <p className="text-slate-400 text-sm mb-4">
                Add custom text content for your chatbot to reference when answering questions.
              </p>
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  placeholder="Content title or topic"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter the content text here..."
                  className="w-full h-32 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={handleAddTextEntry}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded transition-colors"
                >
                  Add Content
                </button>
              </div>
              <div className="space-y-2">
                {kb.textEntries.length === 0 ? (
                  <p className="text-slate-500 text-sm">No text content added yet</p>
                ) : (
                  kb.textEntries.map((entry, index) => (
                    <div
                      key={index}
                      className="bg-slate-700/30 border border-slate-600 rounded p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-white font-medium">{entry.title}</h4>
                        <button
                          onClick={() => handleRemoveTextEntry(index)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-slate-300 text-sm line-clamp-2">{entry.content}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Q&A Pairs Tab */}
        {activeTab === 'qa' && (
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Q&A Pairs
              </label>
              <p className="text-slate-400 text-sm mb-4">
                Add frequently asked questions with their answers to train your chatbot.
              </p>
              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  value={qaQuestion}
                  onChange={(e) => setQaQuestion(e.target.value)}
                  placeholder="Question"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <textarea
                  value={qaAnswer}
                  onChange={(e) => setQaAnswer(e.target.value)}
                  placeholder="Answer"
                  className="w-full h-28 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={handleAddQaPair}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded transition-colors"
                >
                  Add Q&A Pair
                </button>
              </div>
              <div className="space-y-2">
                {kb.qaEntries.length === 0 ? (
                  <p className="text-slate-500 text-sm">No Q&A pairs added yet</p>
                ) : (
                  kb.qaEntries.map((entry, index) => (
                    <div
                      key={index}
                      className="bg-slate-700/30 border border-slate-600 rounded p-3"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="text-orange-400 font-medium text-sm">Q: {entry.question}</h4>
                        <button
                          onClick={() => handleRemoveQaPair(index)}
                          className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-slate-300 text-sm">A: {entry.answer}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* File References Tab */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                File References
              </label>
              <div className="bg-slate-700/30 border border-slate-600 rounded p-4 mb-4">
                <div className="flex gap-3 mb-3">
                  <Upload className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-white font-medium mb-1">Files managed in WordPress</h4>
                    <p className="text-slate-400 text-sm">
                      File uploads and management are handled through the Strikebot WordPress plugin after installation. Your chatbot will automatically index uploaded files.
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-white font-medium mb-3">Supported file types:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { type: 'PDF', icon: '📄' },
                    { type: 'TXT', icon: '📝' },
                    { type: 'CSV', icon: '📊' },
                    { type: 'DOCX', icon: '📋' },
                  ].map((file) => (
                    <div
                      key={file.type}
                      className="bg-slate-700/30 border border-slate-600 rounded p-3 flex items-center gap-2"
                    >
                      <span className="text-lg">{file.icon}</span>
                      <span className="text-slate-300 font-medium">{file.type}</span>
                    </div>
                  ))}
                </div>
              </div>
              {kb.fileReferences.length > 0 && (
                <div className="mt-6">
                  <h4 className="text-white font-medium mb-3">Referenced files:</h4>
                  <div className="space-y-2">
                    {kb.fileReferences.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between bg-slate-700/30 border border-slate-600 rounded p-3"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <div>
                            <p className="text-slate-300 text-sm">{file.name}</p>
                            <p className="text-slate-500 text-xs">{file.type}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Conversation Starters Tab */}
        {activeTab === 'starters' && (
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Conversation Starters
              </label>
              <p className="text-slate-400 text-sm mb-4">
                Suggest initial questions that users can click to start conversations with your chatbot.
              </p>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={starter}
                  onChange={(e) => setStarter(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddStarter()}
                  placeholder="E.g., How do I reset my password?"
                  className="flex-1 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={handleAddStarter}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium px-4 py-2 rounded transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="space-y-2">
                {(config.conversationStarters || []).length === 0 ? (
                  <p className="text-slate-500 text-sm">No conversation starters added yet</p>
                ) : (
                  (config.conversationStarters || []).map((text, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-slate-700/30 border border-slate-600 rounded p-3"
                    >
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                        <span className="text-slate-300 text-sm">{text}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveStarter(index)}
                        className="text-slate-400 hover:text-red-400 transition-colors ml-2"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Fallback Message Tab */}
        {activeTab === 'fallback' && (
          <div className="space-y-4">
            <div>
              <label className="block text-white font-medium mb-2">
                Fallback Message
              </label>
              <p className="text-slate-400 text-sm mb-4">
                This message will be displayed when the chatbot cannot find a suitable answer in the knowledge base.
              </p>
              <textarea
                value={fallbackMessage}
                onChange={(e) => handleFallbackMessageChange(e.target.value)}
                placeholder="I apologize, but I couldn't find an answer to your question. Please contact our support team..."
                className="w-full h-40 bg-slate-700/50 border border-slate-600 rounded text-white placeholder-slate-500 p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-slate-500 text-xs mt-2">
                {fallbackMessage.length} characters
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-slate-700/30 border border-slate-600 rounded p-4">
        <h3 className="text-white font-medium mb-3">Knowledge Base Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-slate-500 text-xs">Sitemaps</p>
            <p className="text-white text-lg font-bold">{kb.sitemapUrls.length}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Pages</p>
            <p className="text-white text-lg font-bold">{kb.pageUrls.length}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Text Entries</p>
            <p className="text-white text-lg font-bold">{kb.textEntries.length}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Q&A Pairs</p>
            <p className="text-white text-lg font-bold">{kb.qaEntries.length}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Files</p>
            <p className="text-white text-lg font-bold">{kb.fileReferences.length}</p>
          </div>
          <div>
            <p className="text-slate-500 text-xs">Starters</p>
            <p className="text-white text-lg font-bold">{config.conversationStarters?.length || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
