import Foundation

class ChatService: ObservableObject {
    private let apiKey: String
    private let apiEndpoint: String
    private let model: String
    private let systemInstructions: String
    private let maxHistoryMessages: Int
    private let maxContextLength: Int

    @Published var isLoading = false
    @Published var errorMessage: String?

    init(config: StrikebotConfig) {
        self.apiKey = config.apiKey
        self.apiEndpoint = config.apiEndpoint
        self.model = config.model
        self.systemInstructions = config.systemInstructions
        self.maxHistoryMessages = config.limits.maxHistoryMessages
        self.maxContextLength = config.limits.maxContextLength
    }

    // MARK: - Send Message

    @MainActor
    func sendMessage(_ userMessage: String, history: [ChatMessage]) async -> String? {
        isLoading = true
        errorMessage = nil

        defer { isLoading = false }

        do {
            let response = try await performAPICall(userMessage: userMessage, history: history)
            return response
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    // MARK: - API Call

    private func performAPICall(userMessage: String, history: [ChatMessage]) async throws -> String {
        let endpoint = apiEndpoint.hasSuffix("/")
            ? "\(apiEndpoint)chat/completions"
            : "\(apiEndpoint)/chat/completions"

        guard let url = URL(string: endpoint) else {
            throw ChatError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.timeoutInterval = 60

        let messages = buildMessages(userMessage: userMessage, history: history)

        let body: [String: Any] = [
            "model": model,
            "messages": messages.map { ["role": $0.role, "content": $0.content] },
            "temperature": 0.7
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw ChatError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if let errorBody = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let error = errorBody["error"] as? [String: Any],
               let message = error["message"] as? String {
                throw ChatError.apiError(statusCode: httpResponse.statusCode, message: message)
            }
            throw ChatError.apiError(statusCode: httpResponse.statusCode, message: "Unknown error")
        }

        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any],
              let content = message["content"] as? String
        else {
            throw ChatError.invalidResponse
        }

        return content.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: - Message Building

    private struct APIMessage {
        let role: String
        let content: String
    }

    private func buildMessages(userMessage: String, history: [ChatMessage]) -> [APIMessage] {
        var messages: [APIMessage] = []

        // System message
        if !systemInstructions.isEmpty {
            messages.append(APIMessage(role: "system", content: systemInstructions))
        }

        // Recent history (limited to maxHistoryMessages)
        let recentHistory = Array(history.suffix(maxHistoryMessages))
        for msg in recentHistory {
            messages.append(APIMessage(role: msg.role.rawValue, content: msg.content))
        }

        // Current user message
        messages.append(APIMessage(role: "user", content: userMessage))

        // Trim context if too long
        var totalLength = messages.reduce(0) { $0 + $1.content.count }
        while totalLength > maxContextLength && messages.count > 2 {
            messages.remove(at: 1) // Remove oldest non-system message
            totalLength = messages.reduce(0) { $0 + $1.content.count }
        }

        return messages
    }

    // MARK: - Errors

    enum ChatError: LocalizedError {
        case invalidURL
        case apiError(statusCode: Int, message: String)
        case invalidResponse

        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "Invalid API endpoint URL"
            case .apiError(let code, let message):
                return "API error (\(code)): \(message)"
            case .invalidResponse:
                return "Could not parse the API response"
            }
        }
    }
}
