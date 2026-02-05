import SwiftUI

struct ChatInputView: View {
    @Binding var text: String
    let isLoading: Bool
    let placeholder: String
    let accentColor: Color
    let onSend: () -> Void

    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 0) {
            Divider()

            HStack(alignment: .bottom, spacing: 12) {
                // Text input
                TextField(placeholder, text: $text, axis: .vertical)
                    .textFieldStyle(.plain)
                    .font(.body)
                    .lineLimit(1...5)
                    .padding(.horizontal, 16)
                    .padding(.vertical, 10)
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 22))
                    .focused($isFocused)
                    .onSubmit {
                        onSend()
                    }
                    .submitLabel(.send)

                // Send button
                Button(action: onSend) {
                    Image(systemName: isLoading ? "ellipsis" : "arrow.up.circle.fill")
                        .font(.system(size: 34))
                        .foregroundColor(canSend ? accentColor : .gray.opacity(0.4))
                        .symbolEffect(.pulse, isActive: isLoading)
                }
                .disabled(!canSend)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial)
        }
    }

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isLoading
    }
}
