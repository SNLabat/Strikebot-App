import SwiftUI
import AudioToolbox

struct ChatView: View {
    @EnvironmentObject var appState: AppState
    @EnvironmentObject var settings: SettingsManager
    @EnvironmentObject var chatHistory: ChatHistoryManager
    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""
    @State private var isLoading = false
    @State private var scrollToBottom = false
    @State private var showSidebar = false
    @State private var currentSessionId: UUID?
    @State private var showStarters = true
    @FocusState private var isInputFocused: Bool

    var body: some View {
        ZStack {
            // Main content
            NavigationStack {
                VStack(spacing: 0) {
                    // Chat messages
                    messageList

                    // Conversation starters
                    if showStarters && messages.count <= 1,
                       let starters = appState.config.conversationStarters, !starters.isEmpty {
                        conversationStartersView(starters)
                    }

                    // Error banner
                    if let error = appState.chatService.errorMessage {
                        errorBanner(error)
                    }

                    // Input bar
                    ChatInputView(
                        text: $inputText,
                        isLoading: isLoading,
                        placeholder: appState.config.widget.inputPlaceholder,
                        accentColor: appState.theme.primaryColor,
                        onSend: sendMessage
                    )
                    .focused($isInputFocused)

                    // Branding
                    if !appState.config.features.removeBranding {
                        brandingFooter
                    }
                }
                .background(appState.theme.backgroundColor)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .navigationBarLeading) {
                        Button(action: {
                            withAnimation(.easeInOut(duration: 0.25)) {
                                showSidebar = true
                            }
                        }) {
                            Image(systemName: "line.3.horizontal")
                                .font(.title3)
                                .foregroundColor(appState.theme.primaryColor)
                        }
                    }
                    ToolbarItem(placement: .principal) {
                        HStack(spacing: 8) {
                            Circle()
                                .fill(appState.theme.primaryColor)
                                .frame(width: 10, height: 10)
                            Text(appState.config.chatbotName)
                                .font(.headline)
                                .foregroundColor(appState.theme.textColor)
                        }
                    }
                    ToolbarItem(placement: .navigationBarTrailing) {
                        Button(action: clearChat) {
                            Image(systemName: "trash")
                                .foregroundColor(appState.theme.primaryColor)
                        }
                    }
                }
            }

            // Sidebar overlay
            SidebarView(
                settings: settings,
                history: chatHistory,
                isOpen: $showSidebar,
                onNewChat: startNewChat,
                onLoadChat: loadSavedChat
            )
            .environmentObject(appState)
        }
        .onAppear {
            addWelcomeMessage()
        }
    }

    // MARK: - Conversation Starters

    private func conversationStartersView(_ starters: [String]) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(starters, id: \.self) { starter in
                    Button(action: {
                        inputText = starter
                        showStarters = false
                        sendMessage()
                    }) {
                        Text(starter)
                            .font(.system(size: max(settings.fontSizeValue - 3, 12)))
                            .foregroundColor(appState.theme.primaryColor)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(appState.theme.primaryColor.opacity(0.1))
                            .clipShape(RoundedRectangle(cornerRadius: 18))
                            .overlay(
                                RoundedRectangle(cornerRadius: 18)
                                    .stroke(appState.theme.primaryColor.opacity(0.3), lineWidth: 1)
                            )
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
        }
    }

    // MARK: - Message List

    private var messageList: some View {
        ScrollViewReader { proxy in
            ScrollView {
                LazyVStack(spacing: 12) {
                    ForEach(messages) { message in
                        ChatBubbleView(
                            message: message,
                            primaryColor: appState.theme.primaryColor,
                            textColor: appState.theme.textColor,
                            fontSize: settings.fontSizeValue,
                            timestampFontSize: settings.timestampFontSize,
                            showTimestamp: settings.showTimestamps
                        )
                        .id(message.id)
                    }

                    if isLoading {
                        typingIndicator
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .onChange(of: messages.count) { _ in
                withAnimation(.easeOut(duration: 0.3)) {
                    if let lastMessage = messages.last {
                        proxy.scrollTo(lastMessage.id, anchor: .bottom)
                    }
                }
            }
            .onChange(of: isLoading) { loading in
                if loading {
                    withAnimation(.easeOut(duration: 0.3)) {
                        if let lastMessage = messages.last {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Typing Indicator

    private var typingIndicator: some View {
        HStack(spacing: 4) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(appState.theme.primaryColor.opacity(0.6))
                    .frame(width: 8, height: 8)
                    .scaleEffect(isLoading ? 1.0 : 0.5)
                    .animation(
                        .easeInOut(duration: 0.6)
                            .repeatForever()
                            .delay(Double(index) * 0.2),
                        value: isLoading
                    )
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: - Error Banner

    private func errorBanner(_ message: String) -> some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundColor(.orange)
            Text(message)
                .font(.caption)
                .foregroundColor(.secondary)
            Spacer()
            Button("Dismiss") {
                appState.chatService.errorMessage = nil
            }
            .font(.caption)
            .foregroundColor(appState.theme.primaryColor)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(Color(.systemGray6))
    }

    // MARK: - Branding Footer

    private var brandingFooter: some View {
        Text("Powered by Strikebot")
            .font(.caption2)
            .foregroundColor(.secondary)
            .padding(.vertical, 4)
    }

    // MARK: - Actions

    private func addWelcomeMessage() {
        let welcome = ChatMessage(
            role: .assistant,
            content: appState.config.widget.welcomeMessage
        )
        messages.append(welcome)
    }

    private func sendMessage() {
        let text = inputText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, !isLoading else { return }

        showStarters = false
        let userMessage = ChatMessage(role: .user, content: text)
        messages.append(userMessage)
        inputText = ""
        isLoading = true

        Task {
            let response = await appState.chatService.sendMessage(text, history: messages)
            isLoading = false

            if let response = response {
                let assistantMessage = ChatMessage(role: .assistant, content: response)
                messages.append(assistantMessage)

                // Play sound if enabled
                if settings.soundEnabled {
                    AudioServicesPlaySystemSound(1007)
                }

                // Auto-save to history
                currentSessionId = chatHistory.saveChat(
                    messages: messages,
                    existingId: currentSessionId
                )
            }
        }
    }

    private func clearChat() {
        // Save current chat before clearing if it has user messages
        if messages.contains(where: { $0.isUser }) {
            _ = chatHistory.saveChat(messages: messages, existingId: currentSessionId)
        }
        messages.removeAll()
        currentSessionId = nil
        showStarters = true
        addWelcomeMessage()
    }

    private func startNewChat() {
        // Save current if it has content
        if messages.contains(where: { $0.isUser }) {
            _ = chatHistory.saveChat(messages: messages, existingId: currentSessionId)
        }
        messages.removeAll()
        currentSessionId = nil
        showStarters = true
        addWelcomeMessage()
    }

    private func loadSavedChat(sessionId: UUID) {
        // Save current first
        if messages.contains(where: { $0.isUser }) {
            _ = chatHistory.saveChat(messages: messages, existingId: currentSessionId)
        }

        if let loaded = chatHistory.loadChat(sessionId: sessionId) {
            messages = loaded
            currentSessionId = sessionId
            showStarters = false
        }
    }
}
