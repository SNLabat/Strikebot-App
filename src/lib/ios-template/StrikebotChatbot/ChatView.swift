import SwiftUI

struct ChatView: View {
    @EnvironmentObject var appState: AppState
    @State private var messages: [ChatMessage] = []
    @State private var inputText = ""
    @State private var isLoading = false
    @State private var scrollToBottom = false
    @FocusState private var isInputFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Chat messages
                messageList

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
            .navigationTitle(appState.config.chatbotName)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
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
        .onAppear {
            addWelcomeMessage()
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
                            textColor: appState.theme.textColor
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
            }
        }
    }

    private func clearChat() {
        messages.removeAll()
        addWelcomeMessage()
    }
}
