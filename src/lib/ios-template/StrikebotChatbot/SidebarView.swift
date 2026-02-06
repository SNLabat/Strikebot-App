import SwiftUI
import AudioToolbox

struct SidebarView: View {
    @EnvironmentObject var appState: AppState
    @ObservedObject var settings: SettingsManager
    @ObservedObject var history: ChatHistoryManager
    @Binding var isOpen: Bool
    let onNewChat: () -> Void
    let onLoadChat: (UUID) -> Void

    // Long-press clear all state
    @State private var clearProgress: CGFloat = 0
    @State private var clearTimer: Timer?
    @State private var isClearPressed = false

    private let clearDuration: TimeInterval = 1.5

    var body: some View {
        ZStack(alignment: .leading) {
            // Backdrop
            if isOpen {
                Color.black.opacity(0.4)
                    .ignoresSafeArea()
                    .onTapGesture { withAnimation(.easeInOut(duration: 0.25)) { isOpen = false } }
                    .transition(.opacity)
            }

            // Sidebar panel
            HStack(spacing: 0) {
                VStack(alignment: .leading, spacing: 0) {
                    // Header
                    sidebarHeader

                    Divider()

                    // New Chat button
                    newChatButton

                    Divider()

                    // Chat History
                    chatHistorySection

                    Divider()

                    // Settings
                    settingsSection

                    Divider()

                    // Clear All
                    clearAllSection
                }
                .frame(width: 300)
                .background(Color(.systemBackground))

                Spacer()
            }
            .offset(x: isOpen ? 0 : -320)
            .animation(.easeInOut(duration: 0.25), value: isOpen)
        }
    }

    // MARK: - Header

    private var sidebarHeader: some View {
        HStack {
            Circle()
                .fill(appState.theme.primaryColor)
                .frame(width: 12, height: 12)
            Text(appState.config.chatbotName)
                .font(.headline)
                .lineLimit(1)
            Spacer()
            Button(action: { withAnimation(.easeInOut(duration: 0.25)) { isOpen = false } }) {
                Image(systemName: "xmark")
                    .font(.body)
                    .foregroundColor(.secondary)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    // MARK: - New Chat

    private var newChatButton: some View {
        Button(action: {
            onNewChat()
            withAnimation(.easeInOut(duration: 0.25)) { isOpen = false }
        }) {
            HStack {
                Image(systemName: "plus.message")
                    .foregroundColor(appState.theme.primaryColor)
                Text("New Chat")
                    .foregroundColor(.primary)
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
    }

    // MARK: - Chat History

    private var chatHistorySection: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("CHAT HISTORY")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
                .padding(.horizontal, 16)
                .padding(.top, 12)
                .padding(.bottom, 6)

            if history.sessions.isEmpty {
                Text("No saved conversations")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 8)
            } else {
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(history.sessions) { session in
                            chatSessionRow(session)
                        }
                    }
                }
            }
        }
        .frame(maxHeight: .infinity)
    }

    private func chatSessionRow(_ session: SavedChat) -> some View {
        Button(action: {
            onLoadChat(session.id)
            withAnimation(.easeInOut(duration: 0.25)) { isOpen = false }
        }) {
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(session.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundColor(.primary)
                        .lineLimit(1)
                    Spacer()
                    Text(session.formattedDate)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                Text(session.lastMessagePreview)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive) {
                history.deleteSession(id: session.id)
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    // MARK: - Settings

    private var settingsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("SETTINGS")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
                .padding(.horizontal, 16)
                .padding(.top, 12)

            // Font Size
            HStack {
                Image(systemName: "textformat.size")
                    .foregroundColor(.secondary)
                    .frame(width: 20)
                Text("Font Size")
                    .font(.subheadline)
                Spacer()
                HStack(spacing: 4) {
                    ForEach(["small", "medium", "large", "xlarge"], id: \.self) { size in
                        Button(action: { settings.fontSize = size }) {
                            Text(sizeLabel(size))
                                .font(.caption2)
                                .fontWeight(settings.fontSize == size ? .bold : .regular)
                                .foregroundColor(settings.fontSize == size ? .white : .primary)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(
                                    settings.fontSize == size
                                        ? appState.theme.primaryColor
                                        : Color(.systemGray5)
                                )
                                .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                    }
                }
            }
            .padding(.horizontal, 16)

            // Show Timestamps
            Toggle(isOn: $settings.showTimestamps) {
                HStack {
                    Image(systemName: "clock")
                        .foregroundColor(.secondary)
                        .frame(width: 20)
                    Text("Timestamps")
                        .font(.subheadline)
                }
            }
            .tint(appState.theme.primaryColor)
            .padding(.horizontal, 16)

            // Sound
            Toggle(isOn: $settings.soundEnabled) {
                HStack {
                    Image(systemName: "speaker.wave.2")
                        .foregroundColor(.secondary)
                        .frame(width: 20)
                    Text("Sound")
                        .font(.subheadline)
                }
            }
            .tint(appState.theme.primaryColor)
            .padding(.horizontal, 16)
            .padding(.bottom, 12)
        }
    }

    private func sizeLabel(_ size: String) -> String {
        switch size {
        case "small": return "S"
        case "medium": return "M"
        case "large": return "L"
        case "xlarge": return "XL"
        default: return "M"
        }
    }

    // MARK: - Clear All (Press and Hold)

    private var clearAllSection: some View {
        VStack(spacing: 6) {
            Button(action: {}) {
                HStack {
                    Image(systemName: "trash")
                        .foregroundColor(.red.opacity(0.8))
                    Text("Clear All Chats")
                        .font(.subheadline)
                        .foregroundColor(.red.opacity(0.8))
                    Spacer()
                    Text("Hold")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if !isClearPressed {
                            isClearPressed = true
                            startClearTimer()
                        }
                    }
                    .onEnded { _ in
                        cancelClearTimer()
                    }
            )

            // Progress bar
            if isClearPressed {
                GeometryReader { geo in
                    ZStack(alignment: .leading) {
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color(.systemGray5))
                            .frame(height: 4)
                        RoundedRectangle(cornerRadius: 2)
                            .fill(Color.red)
                            .frame(width: geo.size.width * clearProgress, height: 4)
                            .animation(.linear(duration: 0.01), value: clearProgress)
                    }
                }
                .frame(height: 4)
                .padding(.horizontal, 16)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
    }

    private func startClearTimer() {
        clearProgress = 0
        let interval: TimeInterval = 0.01
        let step = CGFloat(interval / clearDuration)
        clearTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { timer in
            clearProgress += step
            if clearProgress >= 1.0 {
                timer.invalidate()
                clearTimer = nil
                isClearPressed = false
                clearProgress = 0
                // Haptic feedback
                let generator = UINotificationFeedbackGenerator()
                generator.notificationOccurred(.success)
                // Clear all
                history.clearAll()
            }
        }
    }

    private func cancelClearTimer() {
        clearTimer?.invalidate()
        clearTimer = nil
        isClearPressed = false
        clearProgress = 0
    }
}
