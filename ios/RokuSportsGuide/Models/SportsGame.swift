import Foundation

public struct TeamInfo: Codable, Hashable, Equatable {
    public var id: String
    public var name: String
    public var shortName: String
    public var abbreviation: String
    public var logo: String
    public var score: String?
    public var rank: Int?
    public var record: String

    public init(
        id: String = "",
        name: String = "",
        shortName: String = "",
        abbreviation: String = "",
        logo: String = "",
        score: String? = nil,
        rank: Int? = nil,
        record: String = ""
    ) {
        self.id = id
        self.name = name
        self.shortName = shortName
        self.abbreviation = abbreviation
        self.logo = logo
        self.score = score
        self.rank = rank
        self.record = record
    }
}

public struct SportsGame: Identifiable, Codable, Hashable, Equatable {
    public var id: String
    public var espnId: String
    public var leagueId: String
    public var leagueName: String
    public var leagueShort: String
    public var icon: String
    public var title: String
    public var shortTitle: String
    public var dateString: String
    public var isLive: Bool
    public var isUpcoming: Bool
    public var isFinal: Bool
    public var statusText: String
    public var awayTeam: TeamInfo
    public var homeTeam: TeamInfo
    public var networks: [String]
    public var apps: [StreamingApp]

    public var primaryApp: StreamingApp? {
        apps.first
    }

    public init(
        id: String,
        espnId: String,
        leagueId: String,
        leagueName: String,
        leagueShort: String,
        icon: String,
        title: String,
        shortTitle: String,
        dateString: String,
        isLive: Bool,
        isUpcoming: Bool,
        isFinal: Bool,
        statusText: String,
        awayTeam: TeamInfo,
        homeTeam: TeamInfo,
        networks: [String],
        apps: [StreamingApp]
    ) {
        self.id = id
        self.espnId = espnId
        self.leagueId = leagueId
        self.leagueName = leagueName
        self.leagueShort = leagueShort
        self.icon = icon
        self.title = title
        self.shortTitle = shortTitle
        self.dateString = dateString
        self.isLive = isLive
        self.isUpcoming = isUpcoming
        self.isFinal = isFinal
        self.statusText = statusText
        self.awayTeam = awayTeam
        self.homeTeam = homeTeam
        self.networks = networks
        self.apps = apps
    }
}
