import SwiftUI

// MARK: - Configuration Types

struct StrikebotConfig: Codable {
    let chatbotName: String
    let tier: String
    let model: String
    let apiKey: String
    let apiEndpoint: String
    let systemInstructions: String
    let theme: ThemeConfig
    let widget: WidgetConfig
    let limits: LimitsConfig
    let features: FeaturesConfig
    let conversationStarters: [String]?
    let fallbackMessage: String?

    struct ThemeConfig: Codable {
        let displayMode: String
        let primaryColor: String
        let secondaryColor: String
        let backgroundColor: String
        let textColor: String
    }

    struct WidgetConfig: Codable {
        let welcomeMessage: String
        let inputPlaceholder: String
    }

    struct LimitsConfig: Codable {
        let monthlyMessages: Int
        let maxHistoryMessages: Int
        let maxContextLength: Int
    }

    struct FeaturesConfig: Codable {
        let removeBranding: Bool
    }
}

// MARK: - App State

class AppState: ObservableObject {
    @Published var config: StrikebotConfig
    @Published var theme: ThemeState
    let chatService: ChatService

    init() {
        guard let url = Bundle.main.url(forResource: "StrikebotConfig", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let config = try? JSONDecoder().decode(StrikebotConfig.self, from: data)
        else {
            fatalError("Failed to load StrikebotConfig.json from app bundle")
        }

        self.config = config
        self.theme = ThemeState(from: config.theme)
        self.chatService = ChatService(config: config)
    }
}

// MARK: - Theme State

struct ThemeState {
    let primaryColor: Color
    let secondaryColor: Color
    let backgroundColor: Color
    let textColor: Color
    let isDarkMode: Bool

    init(from themeConfig: StrikebotConfig.ThemeConfig) {
        self.primaryColor = Color(hex: themeConfig.primaryColor) ?? .blue
        self.secondaryColor = Color(hex: themeConfig.secondaryColor) ?? .blue.opacity(0.8)
        self.backgroundColor = Color(hex: themeConfig.backgroundColor) ?? Color(.systemBackground)
        self.textColor = Color(hex: themeConfig.textColor) ?? .primary
        self.isDarkMode = themeConfig.displayMode.lowercased() == "dark"
    }
}

// MARK: - Color Hex Extension

extension Color {
    init?(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        guard hexSanitized.count == 6 else { return nil }

        var rgb: UInt64 = 0
        guard Scanner(string: hexSanitized).scanHexInt64(&rgb) else { return nil }

        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b)
    }
}
