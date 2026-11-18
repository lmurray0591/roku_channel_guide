import SwiftUI

public struct GuideView: View {
    @EnvironmentObject private var tvManager: TVManager
    @Environment(\.scenePhase) private var scenePhase
    @State private var games: [SportsGame] = []
    @State private var isLoading: Bool = true
    @State private var searchText: String = ""
    @State private var selectedSport: String = "all"
    @State private var selectedFilter: String = "all" // all, live, today
    @State private var showingTvSheet: Bool = false
    @State private var showingRemoteSheet: Bool = false
    @State private var showingVoiceSheet: Bool = false

    private let sports = [
        ("all", "All"),
        ("nfl", "🏈 NFL"),
        ("ncaaf", "🏈 NCAAF"),
        ("epl", "⚽ EPL"),
        ("ucl", "⚽ UCL"),
        ("nba", "🏀 NBA"),
        ("nhl", "🏒 NHL"),
        ("ncaam", "🏀 NCAAM"),
        ("pga", "⛳ Golf")
    ]

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // TV Status Header Bar
                HStack(spacing: 8) {
                    Button {
                        showingTvSheet = true
                    } label: {
                        HStack(spacing: 6) {
                            Circle()
                                .fill(tvManager.activeTv?.isOnline == true ? Color.green : Color.orange)
                                .frame(width: 8, height: 8)
                            Text(tvManager.activeTv?.name ?? "Connect TV")
                                .font(.subheadline)
                                .fontWeight(.bold)
                                .foregroundColor(.primary)
                            Image(systemName: "chevron.down")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color(.secondarySystemBackground))
                        .cornerRadius(20)
                    }

                    Spacer()

                    Button {
                        showingVoiceSheet = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "mic.fill")
                            Text("Voice")
                                .fontWeight(.semibold)
                        }
                        .font(.caption)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.red.opacity(0.15))
                        .foregroundColor(.red)
                        .cornerRadius(20)
                    }

                    Button {
                        showingRemoteSheet = true
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: "gamecontroller.fill")
                            Text("Remote")
                                .fontWeight(.semibold)
                        }
                        .font(.caption)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.blue)
                        .foregroundColor(.white)
                        .cornerRadius(20)
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, 8)

                // Sports Filter Chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(sports, id: \.0) { item in
                            Button {
                                selectedSport = item.0
                            } label: {
                                Text(item.1)
                                    .font(.caption)
                                    .fontWeight(.bold)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(selectedSport == item.0 ? Color.blue : Color(.secondarySystemBackground))
                                    .foregroundColor(selectedSport == item.0 ? .white : .primary)
                                    .cornerRadius(16)
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 6)
                }

                // Games Feed
                if isLoading && games.isEmpty {
                    Spacer()
                    ProgressView("Loading sports schedule...")
                    Spacer()
                } else if filteredGames.isEmpty {
                    Spacer()
                    VStack(spacing: 8) {
                        Text("🏟️")
                            .font(.system(size: 40))
                        Text("No matching games found")
                            .font(.headline)
                        Text("Try selecting another sport filter.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            let live = filteredGames.filter { $0.isLive }
                            let upcoming = filteredGames.filter { $0.isUpcoming }
                            let finalGames = filteredGames.filter { $0.isFinal }

                            if !live.isEmpty {
                                sectionHeader(title: "Live Now (\(live.count))", isLive: true)
                                ForEach(live) { game in
                                    GameCardView(game: game)
                                }
                            }

                            if !upcoming.isEmpty {
                                sectionHeader(title: "Upcoming Today & Slate (\(upcoming.count))")
                                ForEach(upcoming) { game in
                                    GameCardView(game: game)
                                }
                            }

                            if !finalGames.isEmpty {
                                sectionHeader(title: "Recent Finals (\(finalGames.count))")
                                ForEach(finalGames.prefix(8)) { game in
                                    GameCardView(game: game)
                                }
                            }
                        }
                        .padding(.horizontal)
                        .padding(.bottom, 24)
                    }
                    .refreshable {
                        await reloadGames()
                    }
                }
            }
            .navigationTitle("Roku Sports Guide")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Search teams, leagues, channels")
            .sheet(isPresented: $showingTvSheet) {
                TVManagerSheet()
            }
            .sheet(isPresented: $showingRemoteSheet) {
                RemoteSheet()
            }
            .sheet(isPresented: $showingVoiceSheet) {
                NativeVoiceSheet()
            }
            .overlay(alignment: .top) {
                if let toast = tvManager.toastMessage {
                    Text(toast)
                        .font(.caption)
                        .fontWeight(.bold)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Color(.systemGray6))
                        .foregroundColor(.primary)
                        .cornerRadius(20)
                        .shadow(radius: 6)
                        .transition(.move(edge: .top).combined(with: .opacity))
                        .padding(.top, 4)
                }
            }
            .task {
                await reloadGames()
            }
            .onChange(of: scenePhase) { newPhase in
                if newPhase == .active {
                    Task {
                        await tvManager.refreshActiveTvStatus()
                    }
                }
            }
        }
    }

    private var filteredGames: [SportsGame] {
        games.filter { game in
            if selectedSport != "all" && game.leagueId != selectedSport {
                return false
            }
            if !searchText.isEmpty {
                let q = searchText.lowercased()
                let match = game.title.lowercased().contains(q)
                    || game.awayTeam.name.lowercased().contains(q)
                    || game.homeTeam.name.lowercased().contains(q)
                    || game.networks.joined(separator: " ").lowercased().contains(q)
                if !match { return false }
            }
            return true
        }
    }

    private func sectionHeader(title: String, isLive: Bool = false) -> some View {
        HStack {
            if isLive {
                Circle()
                    .fill(Color.red)
                    .frame(width: 8, height: 8)
            }
            Text(title)
                .font(.subheadline)
                .fontWeight(.bold)
            Spacer()
        }
        .padding(.top, 8)
    }

    private func reloadGames() async {
        isLoading = true
        async let tvCheck: Void = tvManager.refreshActiveTvStatus()
        let fetched = await SportsAPIService.shared.fetchAllGames()
        _ = await tvCheck
        self.games = fetched
        self.isLoading = false
    }
}
