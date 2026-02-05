import SwiftUI

@main
struct StrikebotApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ChatView()
                .environmentObject(appState)
                .preferredColorScheme(appState.theme.isDarkMode ? .dark : .light)
        }
    }
}
