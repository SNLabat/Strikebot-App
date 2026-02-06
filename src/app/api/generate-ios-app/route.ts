import { NextRequest, NextResponse } from 'next/server';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';

// iOS chatbot configuration interface
interface iOSChatbotConfig {
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
  conversationStarters?: string[];
  fallbackMessage?: string;
  knowledgeBase?: {
    sitemapUrls?: string[];
    pageUrls?: string[];
    textEntries?: Array<{ title: string; content: string }>;
    qaEntries?: Array<{ question: string; answer: string }>;
    fileReferences?: Array<{ name: string; type: string }>;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config: iOSChatbotConfig = body.config;

    if (!config) {
      return NextResponse.json(
        { error: 'Configuration is required' },
        { status: 400 }
      );
    }

    if (!config.chatbotName || !config.apiKey || !config.model) {
      return NextResponse.json(
        { error: 'Chatbot name, API key, and model are required' },
        { status: 400 }
      );
    }

    // Create ZIP archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));

    const templateDir = path.join(process.cwd(), 'src/lib/ios-template');
    const sourceDir = path.join(templateDir, 'StrikebotChatbot');

    // Sanitize chatbot name for display
    const chatbotName = (config.chatbotName || 'My Chatbot')
      .replace(/[<>&"']/g, '')
      .trim()
      .slice(0, 64) || 'My Chatbot';

    // Sanitize for filename
    const filenameSafe = chatbotName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // --- Xcode project file ---
    try {
      const pbxproj = fs.readFileSync(
        path.join(templateDir, 'project.pbxproj'),
        'utf-8'
      );
      archive.append(pbxproj, {
        name: 'StrikebotChatbot/StrikebotChatbot.xcodeproj/project.pbxproj',
      });
    } catch (err) {
      console.error('Failed to read project.pbxproj:', err);
      return NextResponse.json(
        { error: 'Template project file not found' },
        { status: 500 }
      );
    }

    // --- Swift source files ---
    const swiftFiles = [
      'StrikebotApp.swift',
      'AppState.swift',
      'ChatMessage.swift',
      'ChatService.swift',
      'ChatView.swift',
      'ChatBubbleView.swift',
      'ChatInputView.swift',
      'SettingsManager.swift',
      'ChatHistoryManager.swift',
      'SidebarView.swift',
    ];

    for (const file of swiftFiles) {
      try {
        const content = fs.readFileSync(path.join(sourceDir, file), 'utf-8');
        archive.append(content, {
          name: `StrikebotChatbot/StrikebotChatbot/${file}`,
        });
      } catch (err) {
        console.error(`Failed to read ${file}:`, err);
        return NextResponse.json(
          { error: `Template file ${file} not found` },
          { status: 500 }
        );
      }
    }

    // --- Compile Knowledge Base into System Instructions ---
    const enrichedConfig = { ...config };
    enrichedConfig.systemInstructions = compileSystemInstructions(config);

    // --- Generated StrikebotConfig.json ---
    const configJson = JSON.stringify(enrichedConfig, null, 2);
    archive.append(configJson, {
      name: 'StrikebotChatbot/StrikebotChatbot/StrikebotConfig.json',
    });

    // --- Info.plist with chatbot name injected ---
    try {
      let infoPlist = fs.readFileSync(
        path.join(sourceDir, 'Info.plist'),
        'utf-8'
      );
      infoPlist = infoPlist.replace(/\{\{CHATBOT_NAME\}\}/g, chatbotName);
      archive.append(infoPlist, {
        name: 'StrikebotChatbot/StrikebotChatbot/Info.plist',
      });
    } catch {
      // Fallback Info.plist
      const fallbackPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDisplayName</key>
  <string>${chatbotName}</string>
</dict>
</plist>`;
      archive.append(fallbackPlist, {
        name: 'StrikebotChatbot/StrikebotChatbot/Info.plist',
      });
    }

    // --- Asset Catalog ---
    const assetFiles = [
      'Assets.xcassets/Contents.json',
      'Assets.xcassets/AppIcon.appiconset/Contents.json',
      'Assets.xcassets/AccentColor.colorset/Contents.json',
    ];

    for (const assetFile of assetFiles) {
      try {
        const content = fs.readFileSync(
          path.join(sourceDir, assetFile),
          'utf-8'
        );
        archive.append(content, {
          name: `StrikebotChatbot/StrikebotChatbot/${assetFile}`,
        });
      } catch {
        // Minimal fallback
        archive.append('{"info":{"author":"xcode","version":1}}', {
          name: `StrikebotChatbot/StrikebotChatbot/${assetFile}`,
        });
      }
    }

    // --- README ---
    const readme = generateReadme(config, chatbotName);
    archive.append(readme, {
      name: 'StrikebotChatbot/README.md',
    });

    // Finalize and return
    await archive.finalize();
    const buffer = Buffer.concat(chunks);

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="strikebot-ios-${filenameSafe}.zip"`,
      },
    });
  } catch (error) {
    console.error('Error generating iOS app:', error);
    return NextResponse.json(
      { error: 'Failed to generate iOS app' },
      { status: 500 }
    );
  }
}

// Compile knowledge base entries into the system instructions
function compileSystemInstructions(config: iOSChatbotConfig): string {
  const parts: string[] = [];

  // Start with the user's original system instructions
  if (config.systemInstructions?.trim()) {
    parts.push(config.systemInstructions.trim());
  }

  const kb = config.knowledgeBase;
  if (!kb) return parts.join('\n\n');

  const kbSections: string[] = [];

  // Text entries
  if (kb.textEntries && kb.textEntries.length > 0) {
    const textBlock = kb.textEntries
      .map((entry) => `### ${entry.title}\n${entry.content}`)
      .join('\n\n');
    kbSections.push(textBlock);
  }

  // Q&A pairs
  if (kb.qaEntries && kb.qaEntries.length > 0) {
    const qaBlock = kb.qaEntries
      .map((entry) => `Q: ${entry.question}\nA: ${entry.answer}`)
      .join('\n\n');
    kbSections.push(`## Frequently Asked Questions\n\n${qaBlock}`);
  }

  // Page URLs as reference
  if (kb.pageUrls && kb.pageUrls.length > 0) {
    const urlBlock = kb.pageUrls
      .map((url) => `- ${url}`)
      .join('\n');
    kbSections.push(`## Reference URLs\nThe following URLs contain relevant information you should be aware of:\n${urlBlock}`);
  }

  // Sitemap URLs as reference
  if (kb.sitemapUrls && kb.sitemapUrls.length > 0) {
    const sitemapBlock = kb.sitemapUrls
      .map((url) => `- ${url}`)
      .join('\n');
    kbSections.push(`## Sitemap Sources\nContent from these sitemaps has been used to train this chatbot:\n${sitemapBlock}`);
  }

  // File references
  if (kb.fileReferences && kb.fileReferences.length > 0) {
    const fileBlock = kb.fileReferences
      .map((f) => `- ${f.name} (${f.type})`)
      .join('\n');
    kbSections.push(`## Reference Documents\n${fileBlock}`);
  }

  // Add knowledge base section if there's any content
  if (kbSections.length > 0) {
    parts.push(
      '---\n\n# Knowledge Base\n\nUse the following information to answer questions accurately. ' +
      'When a user asks something covered by this knowledge base, prioritize this information in your response. ' +
      'If the user asks something not covered here, use your general knowledge but let them know if you\'re unsure.\n\n' +
      kbSections.join('\n\n')
    );
  }

  // Fallback message
  if (config.fallbackMessage?.trim()) {
    parts.push(
      `If you cannot answer a question based on the provided knowledge base or your general knowledge, respond with: "${config.fallbackMessage.trim()}"`
    );
  }

  return parts.join('\n\n');
}

function generateReadme(config: iOSChatbotConfig, name: string): string {
  return `# ${name} - iOS Chatbot

Generated by Strikebot iOS Builder.

## Setup

1. Open \`StrikebotChatbot.xcodeproj\` in Xcode
2. Select your development team in Signing & Capabilities
3. Connect your iOS device or select a simulator
4. Press Cmd+R to build and run

## Configuration

Your chatbot is pre-configured with these settings:

- **Model**: ${config.model}
- **API Endpoint**: ${config.apiEndpoint}
- **Theme**: ${config.theme.displayMode} mode
- **Monthly Message Limit**: ${config.limits.monthlyMessages.toLocaleString()}

## Customization

To modify settings after generation, edit \`StrikebotChatbot/StrikebotConfig.json\`.

The configuration file controls:
- AI model and API endpoint
- Theme colors and display mode
- Welcome message and placeholder text
- Message limits and context length
- Conversation starters
- Fallback message

## Features

- **Hamburger Menu**: Tap the menu icon to open the sidebar
- **Chat History**: Previous conversations are automatically saved and accessible from the sidebar
- **Settings**: Adjust font size, toggle timestamps, and enable/disable sound notifications
- **Conversation Starters**: Pre-configured quick-start prompts shown on new chats
- **Clear All Chats**: Press and hold the "Clear All Chats" button in the sidebar (1.5s) to delete all history

## Requirements

- Xcode 15.0+
- iOS 16.0+ deployment target
- Apple Developer account (for device installation)

## Support

Visit strikebot.io for documentation and support.
`;
}
