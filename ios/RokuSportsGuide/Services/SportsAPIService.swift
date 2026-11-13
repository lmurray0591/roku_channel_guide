import Foundation

public final class SportsAPIService: Sendable {
    public static let shared = SportsAPIService()
    private let session = URLSession.shared

    private let leagues: [(id: String, name: String, shortName: String, icon: String, url: String)] = [
        ("nfl", "NFL", "NFL", "🏈", "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"),
        ("ncaaf", "College Football", "NCAAF", "🏈", "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=80"),
        ("epl", "Premier League", "EPL", "⚽", "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard"),
        ("ucl", "Champions League", "UCL", "⚽", "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard"),
        ("nba", "NBA", "NBA", "🏀", "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard"),
        ("nhl", "NHL", "NHL", "🏒", "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard"),
        ("ncaam", "College Basketball", "NCAAM", "🏀", "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?limit=50"),
        ("pga", "PGA Tour", "PGA Golf", "⛳", "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard")
    ]

    public func fetchAllGames() async -> [SportsGame] {
        await withTaskGroup(of: [SportsGame].self) { group in
            for league in leagues {
                group.addTask {
                    await self.fetchLeagueGames(league: league)
                }
            }
            var all: [SportsGame] = []
            for await games in group {
                all.append(contentsOf: games)
            }
            // Sort: Live games first, then upcoming, then final
            return all.sorted { a, b in
                if a.isLive != b.isLive { return a.isLive && !b.isLive }
                if a.isUpcoming != b.isUpcoming { return a.isUpcoming && !b.isUpcoming }
                return a.dateString < b.dateString
            }
        }
    }

    private func fetchLeagueGames(league: (id: String, name: String, shortName: String, icon: String, url: String)) async -> [SportsGame] {
        guard let url = URL(string: league.url) else { return [] }
        do {
            let (data, response) = try await session.data(from: url)
            guard let httpRes = response as? HTTPURLResponse, (200...299).contains(httpRes.statusCode) else {
                return []
            }
            guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let events = json["events"] as? [[String: Any]] else {
                return []
            }

            return events.compactMap { parseEvent($0, league: league) }
        } catch {
            return []
        }
    }

    private func parseEvent(_ ev: [String: Any], league: (id: String, name: String, shortName: String, icon: String, url: String)) -> SportsGame? {
        guard let id = ev["id"] as? String else { return nil }
        let title = (ev["name"] as? String) ?? "Game"
        let shortTitle = (ev["shortName"] as? String) ?? title
        let dateStr = (ev["date"] as? String) ?? ""

        guard let competitions = ev["competitions"] as? [[String: Any]],
              let comp = competitions.first else {
            return nil
        }

        let statusObj = (comp["status"] as? [String: Any]) ?? [:]
        let typeObj = (statusObj["type"] as? [String: Any]) ?? [:]
        let stateStr = (typeObj["state"] as? String) ?? "pre"
        let statusText = (typeObj["shortDetail"] as? String) ?? (typeObj["detail"] as? String) ?? ""

        let isLive = stateStr == "in"
        let isUpcoming = stateStr == "pre"
        let isFinal = stateStr == "post" || (typeObj["completed"] as? Bool == true)

        let competitors = (comp["competitors"] as? [[String: Any]]) ?? []
        let awayDict = competitors.first(where: { ($0["homeAway"] as? String) == "away" }) ?? competitors.last ?? [:]
        let homeDict = competitors.first(where: { ($0["homeAway"] as? String) == "home" }) ?? competitors.first ?? [:]

        let awayTeam = parseTeam(awayDict, isPre: isUpcoming)
        let homeTeam = parseTeam(homeDict, isPre: isUpcoming)

        var networks: [String] = []
        if let broadcasts = comp["broadcasts"] as? [[String: Any]] {
            for b in broadcasts {
                if let names = b["names"] as? [String] {
                    networks.append(contentsOf: names)
                }
            }
        }
        if networks.isEmpty, let bStr = ev["broadcast"] as? String {
            networks.append(bStr)
        }

        // Map networks to streaming apps
        let apps = mapNetworksToApps(networks, leagueId: league.id)

        return SportsGame(
            id: "\(league.id)-\(id)",
            espnId: id,
            leagueId: league.id,
            leagueName: league.name,
            leagueShort: league.shortName,
            icon: league.icon,
            title: title,
            shortTitle: shortTitle,
            dateString: dateStr,
            isLive: isLive,
            isUpcoming: isUpcoming,
            isFinal: isFinal,
            statusText: statusText,
            awayTeam: awayTeam,
            homeTeam: homeTeam,
            networks: networks,
            apps: apps
        )
    }

    private func parseTeam(_ dict: [String: Any], isPre: Bool) -> TeamInfo {
        let team = (dict["team"] as? [String: Any]) ?? [:]
        let name = (team["displayName"] as? String) ?? (team["name"] as? String) ?? "TBD"
        let shortName = (team["shortDisplayName"] as? String) ?? name
        let abbr = (team["abbreviation"] as? String) ?? ""
        let logo = (team["logo"] as? String) ?? ""
        let score = isPre ? nil : (dict["score"] as? String)
        let rank = (dict["curatedRank"] as? [String: Any])?["current"] as? Int

        return TeamInfo(
            id: (team["id"] as? String) ?? "",
            name: name,
            shortName: shortName,
            abbreviation: abbr,
            logo: logo,
            score: score,
            rank: (rank != nil && rank! <= 25) ? rank : nil,
            record: ""
        )
    }

    private func mapNetworksToApps(_ networks: [String], leagueId: String) -> [StreamingApp] {
        var matchedKeys = Set<String>()
        let netString = networks.joined(separator: " ").uppercased()

        if netString.contains("PEACOCK") { matchedKeys.insert("peacock") }
        if netString.contains("NBC") || netString.contains("USA") {
            matchedKeys.insert("peacock")
            matchedKeys.insert("youtube_tv")
        }
        if netString.contains("ESPN") || netString.contains("ABC") || netString.contains("ACC") || netString.contains("SEC") {
            matchedKeys.insert("espn")
            matchedKeys.insert("youtube_tv")
        }
        if netString.contains("FOX") || netString.contains("FS1") || netString.contains("BTN") {
            matchedKeys.insert("fox_sports")
            matchedKeys.insert("youtube_tv")
        }
        if netString.contains("PARAMOUNT") || netString.contains("CBS") {
            matchedKeys.insert("paramount")
            matchedKeys.insert("youtube_tv")
        }
        if netString.contains("PRIME") || netString.contains("AMAZON") {
            matchedKeys.insert("prime_video")
        }
        if netString.contains("APPLE") || netString.contains("MLS") {
            matchedKeys.insert("apple_tv")
        }
        if netString.contains("TNT") || netString.contains("MAX") || netString.contains("TBS") {
            matchedKeys.insert("max")
            matchedKeys.insert("youtube_tv")
        }
        if netString.contains("NFL") {
            matchedKeys.insert("nfl")
        }

        // League defaults if no network found
        if matchedKeys.isEmpty {
            if leagueId == "epl" { matchedKeys.insert("peacock") }
            else if leagueId == "ucl" { matchedKeys.insert("paramount") }
            else if leagueId == "ncaaf" || leagueId == "ncaam" { matchedKeys.insert("espn") }
            else if leagueId == "nfl" { matchedKeys.insert("nfl"); matchedKeys.insert("fox_sports") }
            else if leagueId == "nba" { matchedKeys.insert("espn") }
        }

        let defaults = StreamingApp.defaults
        return matchedKeys.compactMap { key in
            defaults.first(where: { $0.key == key })
        }
    }
}
