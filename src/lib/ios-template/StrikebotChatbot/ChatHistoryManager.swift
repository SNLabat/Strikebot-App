import Foundation

// MARK: - Saved Chat Models

struct SavedMessage: Codable, Identifiable {
    let id: UUID
    let role: String
    let content: String
    let timestamp: Date

    init(id: UUID = UUID(), role: String, content: String, timestamp: Date = Date()) {
        self.id = id
        self.role = role
        self.content = content
        self.timestamp = timestamp
    }
}

struct SavedChat: Identifiable, Codable {
    let id: UUID
    var title: String
    var messages: [SavedMessage]
    let createdAt: Date
    var updatedAt: Date

    init(id: UUID = UUID(), title: String, messages: [SavedMessage], createdAt: Date = Date(), updatedAt: Date = Date()) {
        self.id = id
        self.title = title
        self.messages = messages
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    var lastMessagePreview: String {
        guard let last = messages.last(where: { $0.role != "system" }) else { return "" }
        let preview = last.content.prefix(80)
        return preview.count < last.content.count ? "\(preview)..." : String(preview)
    }

    var formattedDate: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: updatedAt, relativeTo: Date())
    }
}

// MARK: - Chat History Manager

class ChatHistoryManager: ObservableObject {
    @Published var sessions: [SavedChat] = []

    private let storageKey = "strikebot_chat_sessions"

    init() {
        loadSessions()
    }

    // MARK: - Save Current Chat

    func saveChat(messages: [ChatMessage], existingId: UUID? = nil) -> UUID {
        let savedMessages = messages.map { msg in
            SavedMessage(
                role: msg.role.rawValue,
                content: msg.content,
                timestamp: msg.timestamp
            )
        }

        if let existingId = existingId, let index = sessions.firstIndex(where: { $0.id == existingId }) {
            sessions[index].messages = savedMessages
            sessions[index].updatedAt = Date()
            if sessions[index].title == "New Chat" {
                sessions[index].title = generateTitle(from: messages)
            }
            persistSessions()
            return existingId
        } else {
            let title = generateTitle(from: messages)
            let session = SavedChat(
                title: title,
                messages: savedMessages
            )
            sessions.insert(session, at: 0)
            persistSessions()
            return session.id
        }
    }

    // MARK: - Load a Saved Chat

    func loadChat(sessionId: UUID) -> [ChatMessage]? {
        guard let session = sessions.first(where: { $0.id == sessionId }) else { return nil }
        return session.messages.compactMap { saved in
            guard let role = ChatMessage.Role(rawValue: saved.role) else { return nil }
            return ChatMessage(role: role, content: saved.content, timestamp: saved.timestamp)
        }
    }

    // MARK: - Delete

    func deleteSession(id: UUID) {
        sessions.removeAll { $0.id == id }
        persistSessions()
    }

    func clearAll() {
        sessions.removeAll()
        persistSessions()
    }

    // MARK: - Persistence

    private func loadSessions() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode([SavedChat].self, from: data)
        else { return }
        sessions = decoded
    }

    private func persistSessions() {
        guard let data = try? JSONEncoder().encode(sessions) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }

    // MARK: - Title Generation

    private func generateTitle(from messages: [ChatMessage]) -> String {
        if let firstUser = messages.first(where: { $0.isUser }) {
            let title = firstUser.content.prefix(40)
            return title.count < firstUser.content.count ? "\(title)..." : String(title)
        }
        return "New Chat"
    }
}
