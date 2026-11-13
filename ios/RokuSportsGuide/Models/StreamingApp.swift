import Foundation
import SwiftUI

public struct StreamingApp: Identifiable, Codable, Hashable, Equatable {
    public var id: String { key }
    public var key: String
    public var name: String
    public var shortLabel: String
    public var rokuIds: [String]
    public var effectiveRokuId: String
    public var hexColor: String
    public var gradientHex: [String]
    public var networks: [String]
    public var isInstalledOnTv: Bool
    public var isEnabled: Bool

    public var color: Color {
        Color(hex: hexColor)
    }

    public var gradient: LinearGradient {
        LinearGradient(
            colors: gradientHex.map { Color(hex: $0) },
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    public init(
        key: String,
        name: String,
        shortLabel: String,
        rokuIds: [String],
        effectiveRokuId: String? = nil,
        hexColor: String,
        gradientHex: [String],
        networks: [String],
        isInstalledOnTv: Bool = false,
        isEnabled: Bool = true
    ) {
        self.key = key
        self.name = name
        self.shortLabel = shortLabel
        self.rokuIds = rokuIds
        self.effectiveRokuId = effectiveRokuId ?? (rokuIds.first ?? "")
        self.hexColor = hexColor
        self.gradientHex = gradientHex
        self.networks = networks
        self.isInstalledOnTv = isInstalledOnTv
        self.isEnabled = isEnabled
    }
}

public extension StreamingApp {
    static let defaults: [StreamingApp] = [
        StreamingApp(
            key: "espn",
            name: "ESPN",
            shortLabel: "ESPN",
            rokuIds: ["34376"],
            hexColor: "#cc0000",
            gradientHex: ["#d00000", "#8a0000"],
            networks: ["ESPN", "ESPN2", "ESPN+", "ESPNEWS", "ESPNU", "ABC", "SEC Network", "ACC Network"]
        ),
        StreamingApp(
            key: "peacock",
            name: "Peacock",
            shortLabel: "Peacock",
            rokuIds: ["593099"],
            hexColor: "#000000",
            gradientHex: ["#1f2937", "#090d16"],
            networks: ["NBC", "Peacock", "USA", "USA Network", "CNBC", "Golf Channel", "Telemundo"]
        ),
        StreamingApp(
            key: "paramount",
            name: "Paramount+",
            shortLabel: "Paramount+",
            rokuIds: ["31440", "17112", "619667"],
            hexColor: "#0064ff",
            gradientHex: ["#0064ff", "#003899"],
            networks: ["CBS", "Paramount+", "CBS Sports Network", "CBSSN", "CBS Sports Golazo"]
        ),
        StreamingApp(
            key: "fox_sports",
            name: "FOX Sports / Fox One",
            shortLabel: "FOX / Fox One",
            rokuIds: ["808732", "95307", "19977", "294688"],
            hexColor: "#002e6d",
            gradientHex: ["#003f91", "#001c42"],
            networks: ["FOX", "FS1", "FS2", "BTN", "Big Ten Network", "FOX Sports"]
        ),
        StreamingApp(
            key: "prime_video",
            name: "Prime Video",
            shortLabel: "Prime Video",
            rokuIds: ["13"],
            hexColor: "#00a8e1",
            gradientHex: ["#00a8e1", "#005f80"],
            networks: ["Prime Video", "Amazon"]
        ),
        StreamingApp(
            key: "max",
            name: "Max",
            shortLabel: "Max",
            rokuIds: ["61322"],
            hexColor: "#002be7",
            gradientHex: ["#002be7", "#00126b"],
            networks: ["TNT", "TBS", "truTV", "Max", "HBO Max", "B/R Sports"]
        ),
        StreamingApp(
            key: "apple_tv",
            name: "Apple TV",
            shortLabel: "Apple TV+",
            rokuIds: ["551012"],
            hexColor: "#333333",
            gradientHex: ["#374151", "#111827"],
            networks: ["Apple TV+", "Apple TV", "MLS Season Pass"]
        ),
        StreamingApp(
            key: "netflix",
            name: "Netflix",
            shortLabel: "Netflix",
            rokuIds: ["12"],
            hexColor: "#e50914",
            gradientHex: ["#e50914", "#8c050c"],
            networks: ["Netflix"]
        ),
        StreamingApp(
            key: "nfl",
            name: "NFL",
            shortLabel: "NFL App",
            rokuIds: ["44856", "33880"],
            hexColor: "#013369",
            gradientHex: ["#013369", "#d50a0a"],
            networks: ["NFL Network", "NFL+", "NFL RedZone"]
        ),
        StreamingApp(
            key: "youtube_tv",
            name: "YouTube TV",
            shortLabel: "YouTube TV",
            rokuIds: ["195316"],
            hexColor: "#ff0000",
            gradientHex: ["#ff0000", "#990000"],
            networks: ["CBS", "NBC", "FOX", "ABC", "ESPN", "FS1", "TNT", "TBS", "USA"]
        )
    ]
}

public extension Color {
    init(hex: String) {
        let cleanHex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: cleanHex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch cleanHex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
