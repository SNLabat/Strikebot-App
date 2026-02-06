import SwiftUI

struct ChatBubbleView: View {
    let message: ChatMessage
    let primaryColor: Color
    let textColor: Color
    var fontSize: CGFloat = 17
    var timestampFontSize: CGFloat = 11
    var showTimestamp: Bool = true

    var body: some View {
        HStack(alignment: .bottom, spacing: 8) {
            if message.isUser {
                Spacer(minLength: 60)
            }

            VStack(alignment: message.isUser ? .trailing : .leading, spacing: 4) {
                // Message content
                Text(message.content)
                    .font(.system(size: fontSize))
                    .foregroundColor(message.isUser ? .white : textColor)
                    .textSelection(.enabled)

                // Timestamp
                if showTimestamp {
                    Text(formatTime(message.timestamp))
                        .font(.system(size: timestampFontSize))
                        .foregroundColor(
                            message.isUser
                                ? .white.opacity(0.7)
                                : .secondary
                        )
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(bubbleBackground)
            .clipShape(ChatBubbleShape(isUser: message.isUser))

            if !message.isUser {
                Spacer(minLength: 60)
            }
        }
    }

    private var bubbleBackground: some View {
        Group {
            if message.isUser {
                LinearGradient(
                    colors: [primaryColor, primaryColor.opacity(0.85)],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            } else {
                Color(.systemGray6)
            }
        }
    }

    private func formatTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }
}

// MARK: - Bubble Shape

struct ChatBubbleShape: Shape {
    let isUser: Bool
    private let cornerRadius: CGFloat = 18

    func path(in rect: CGRect) -> Path {
        let smallCorner: CGFloat = 4

        let topLeft = isUser ? cornerRadius : cornerRadius
        let topRight = isUser ? cornerRadius : cornerRadius
        let bottomLeft = isUser ? cornerRadius : smallCorner
        let bottomRight = isUser ? smallCorner : cornerRadius

        var path = Path()

        // Start from top-left
        path.move(to: CGPoint(x: rect.minX + topLeft, y: rect.minY))

        // Top edge
        path.addLine(to: CGPoint(x: rect.maxX - topRight, y: rect.minY))
        path.addArc(
            center: CGPoint(x: rect.maxX - topRight, y: rect.minY + topRight),
            radius: topRight,
            startAngle: .degrees(-90),
            endAngle: .degrees(0),
            clockwise: false
        )

        // Right edge
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - bottomRight))
        path.addArc(
            center: CGPoint(x: rect.maxX - bottomRight, y: rect.maxY - bottomRight),
            radius: bottomRight,
            startAngle: .degrees(0),
            endAngle: .degrees(90),
            clockwise: false
        )

        // Bottom edge
        path.addLine(to: CGPoint(x: rect.minX + bottomLeft, y: rect.maxY))
        path.addArc(
            center: CGPoint(x: rect.minX + bottomLeft, y: rect.maxY - bottomLeft),
            radius: bottomLeft,
            startAngle: .degrees(90),
            endAngle: .degrees(180),
            clockwise: false
        )

        // Left edge
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY + topLeft))
        path.addArc(
            center: CGPoint(x: rect.minX + topLeft, y: rect.minY + topLeft),
            radius: topLeft,
            startAngle: .degrees(180),
            endAngle: .degrees(270),
            clockwise: false
        )

        return path
    }
}
