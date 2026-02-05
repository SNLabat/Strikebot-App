'use client';

import { useState } from 'react';

// ── Types ──────────────────────────────────────────────

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

const STEPS = ['Settings', 'Theme', 'Widget', 'Preview'];

// ── Main Component ─────────────────────────────────────

export default function iOSBuilderPage() {
  const [config, setConfig] = useState<iOSConfig>(DEFAULT_CONFIG);
  const [currentStep, setCurrentStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const updateConfig = (path: string, value: any) => {
    setConfig((prev) => {
      const parts = path.split('.');
      const newConfig = JSON.parse(JSON.stringify(prev));
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
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
              S
            </div>
            <h1 className="text-lg font-semibold">Strikebot iOS Builder</h1>
          </div>
          <a href="/" className="text-sm text-gray-400 hover:text-white transition">
            &larr; Back to WordPress Builder
          </a>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((step, i) => (
            <button
              key={step}
              onClick={() => setCurrentStep(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
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
              {step}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form Panel */}
          <div className="lg:col-span-3">
            <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
              {currentStep === 0 && (
                <SettingsStep config={config} updateConfig={updateConfig} />
              )}
              {currentStep === 1 && (
                <ThemeStep config={config} updateConfig={updateConfig} />
              )}
              {currentStep === 2 && (
                <WidgetStep config={config} updateConfig={updateConfig} />
              )}
              {currentStep === 3 && (
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

          {/* iPhone Preview */}
          <div className="lg:col-span-2">
            <div className="sticky top-8">
              <PhonePreview config={config} />
            </div>
          </div>
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

// ── Step 2: Theme ──────────────────────────────────────

function ThemeStep({
  config,
  updateConfig,
}: {
  config: iOSConfig;
  updateConfig: (path: string, value: any) => void;
}) {
  const applyPreset = (preset: (typeof COLOR_PRESETS)[0]) => {
    updateConfig('theme.primaryColor', preset.primary);
    updateConfig('theme.secondaryColor', preset.secondary);
  };

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-semibold mb-4">Theme</h2>

      {/* Display Mode */}
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

      {/* Color Presets */}
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

      {/* Custom Colors */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Primary Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.theme.primaryColor}
              onChange={(e) => updateConfig('theme.primaryColor', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={config.theme.primaryColor}
              onChange={(e) => updateConfig('theme.primaryColor', e.target.value)}
              className="input flex-1"
            />
          </div>
        </Field>
        <Field label="Secondary Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.theme.secondaryColor}
              onChange={(e) => updateConfig('theme.secondaryColor', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={config.theme.secondaryColor}
              onChange={(e) => updateConfig('theme.secondaryColor', e.target.value)}
              className="input flex-1"
            />
          </div>
        </Field>
        <Field label="Background Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.theme.backgroundColor}
              onChange={(e) => updateConfig('theme.backgroundColor', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={config.theme.backgroundColor}
              onChange={(e) => updateConfig('theme.backgroundColor', e.target.value)}
              className="input flex-1"
            />
          </div>
        </Field>
        <Field label="Text Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={config.theme.textColor}
              onChange={(e) => updateConfig('theme.textColor', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
            />
            <input
              type="text"
              value={config.theme.textColor}
              onChange={(e) => updateConfig('theme.textColor', e.target.value)}
              className="input flex-1"
            />
          </div>
        </Field>
      </div>
    </div>
  );
}

// ── Step 3: Widget ─────────────────────────────────────

function WidgetStep({
  config,
  updateConfig,
}: {
  config: iOSConfig;
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

// ── Step 4: Preview ────────────────────────────────────

function PreviewStep({ config }: { config: iOSConfig }) {
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

        <SummarySection title="Theme">
          <SummaryItem label="Display Mode" value={config.theme.displayMode} />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400 w-32">Colors</span>
            <div className="flex gap-1">
              {[
                config.theme.primaryColor,
                config.theme.secondaryColor,
                config.theme.backgroundColor,
                config.theme.textColor,
              ].map((color, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded border border-gray-600"
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </SummarySection>

        <SummarySection title="Chat Settings">
          <SummaryItem label="Welcome Message" value={config.widget.welcomeMessage} />
          <SummaryItem label="Placeholder" value={config.widget.inputPlaceholder} />
          <SummaryItem
            label="Branding"
            value={config.features.removeBranding ? 'Hidden' : 'Shown'}
          />
        </SummarySection>

        <SummarySection title="Limits">
          <SummaryItem
            label="History Messages"
            value={config.limits.maxHistoryMessages.toString()}
          />
          <SummaryItem
            label="Context Length"
            value={config.limits.maxContextLength.toLocaleString() + ' chars'}
          />
        </SummarySection>

        <div className="p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
          <h3 className="text-sm font-medium text-blue-400 mb-2">
            What you&apos;ll get
          </h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>&#10003; Complete Xcode project (.xcodeproj)</li>
            <li>&#10003; SwiftUI chatbot interface</li>
            <li>&#10003; Pre-configured with your settings</li>
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

      {/* Phone Frame */}
      <div className="relative w-[280px] h-[560px] rounded-[40px] border-4 border-gray-700 bg-gray-900 overflow-hidden shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-gray-900 rounded-b-2xl z-10" />

        {/* Screen */}
        <div
          className="absolute inset-[2px] rounded-[36px] overflow-hidden flex flex-col"
          style={{ backgroundColor: bg }}
        >
          {/* Status Bar */}
          <div className="h-[44px] flex items-end justify-center pb-1">
            <span className="text-[10px] font-semibold" style={{ color: text }}>
              9:41
            </span>
          </div>

          {/* Nav Bar */}
          <div
            className="px-4 py-2 flex items-center gap-2 border-b"
            style={{ borderColor: isDark ? '#374151' : '#E5E7EB' }}
          >
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: primary }}
            />
            <span className="text-sm font-semibold" style={{ color: text }}>
              {config.chatbotName || 'My Chatbot'}
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-hidden px-3 py-3 space-y-2">
            {/* Welcome message */}
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

            {/* Sample user message */}
            <div className="flex justify-end">
              <div
                className="max-w-[75%] px-3 py-2 rounded-2xl rounded-br-sm text-xs text-white"
                style={{ backgroundColor: primary }}
              >
                What can you help me with?
              </div>
            </div>

            {/* Sample assistant reply */}
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

          {/* Input Bar */}
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

          {/* Branding */}
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

          {/* Home Indicator */}
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
