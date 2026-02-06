import SwiftUI

class SettingsManager: ObservableObject {
    @AppStorage("sb_fontSize") var fontSize: String = "medium"
    @AppStorage("sb_showTimestamps") var showTimestamps: Bool = true
    @AppStorage("sb_soundEnabled") var soundEnabled: Bool = true

    var fontSizeValue: CGFloat {
        switch fontSize {
        case "small": return 14
        case "large": return 20
        case "xlarge": return 24
        default: return 17
        }
    }

    var timestampFontSize: CGFloat {
        switch fontSize {
        case "small": return 9
        case "large": return 13
        case "xlarge": return 15
        default: return 11
        }
    }

    var fontSizeLabel: String {
        switch fontSize {
        case "small": return "Small"
        case "large": return "Large"
        case "xlarge": return "X-Large"
        default: return "Medium"
        }
    }
}
