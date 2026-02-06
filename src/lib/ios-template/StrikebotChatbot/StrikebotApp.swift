import SwiftUI

@main
struct StrikebotApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var settings = SettingsManager()
    @StateObject private var chatHistory = ChatHistoryManager()

    var body: some Scene {
        WindowGroup {
            ChatView()
                .environmentObject(appState)
                .environmentObject(settings)
                .environmentObject(chatHistory)
                .preferredColorScheme(appState.theme.isDarkMode ? .dark : .light)
        }
    }
}
