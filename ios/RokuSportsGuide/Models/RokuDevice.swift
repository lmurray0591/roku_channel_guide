import Foundation

public struct RokuDevice: Identifiable, Codable, Hashable, Equatable {
    public var id: String { ip }
    public var ip: String
    public var name: String
    public var modelName: String
    public var vendorName: String
    public var isTv: Bool
    public var isOnline: Bool
    public var lastSeen: Date?

    public init(
        ip: String,
        name: String,
        modelName: String = "Roku TV",
        vendorName: String = "Roku",
        isTv: Bool = true,
        isOnline: Bool = true,
        lastSeen: Date? = Date()
    ) {
        self.ip = ip
        self.name = name
        self.modelName = modelName
        self.vendorName = vendorName
        self.isTv = isTv
        self.isOnline = isOnline
        self.lastSeen = lastSeen
    }
}

public struct RokuAppItem: Identifiable, Codable, Hashable, Equatable {
    public var id: String
    public var name: String
    public var type: String
    public var version: String

    public init(id: String, name: String, type: String = "appl", version: String = "") {
        self.id = id
        self.name = name
        self.type = type
        self.version = version
    }
}
