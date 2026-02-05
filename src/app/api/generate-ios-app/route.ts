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

    // --- Generated StrikebotConfig.json ---
    const configJson = JSON.stringify(config, null, 2);
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

## Requirements

- Xcode 15.0+
- iOS 16.0+ deployment target
- Apple Developer account (for device installation)

## Support

Visit strikebot.io for documentation and support.
`;
}
