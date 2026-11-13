import SwiftUI

public struct GameCardView: View {
    public let game: SportsGame
    @EnvironmentObject private var tvManager: TVManager

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header: League badge, Status, and Networks
            HStack {
                Text("\(game.icon) \(game.leagueShort)")
                    .font(.caption)
                    .fontWeight(.bold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(Color(.systemGray6))
                    .cornerRadius(6)

                if game.isLive {
                    HStack(spacing: 4) {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 6, height: 6)
                        Text(game.statusText.isEmpty ? "LIVE" : game.statusText)
                            .font(.caption2)
                            .fontWeight(.heavy)
                            .foregroundColor(.red)
                    }
                    .padding(.horizontal, 7)
                    .padding(.vertical, 3)
                    .background(Color.red.opacity(0.12))
                    .cornerRadius(6)
                } else {
                    Text(game.statusText)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }

                Spacer()

                ForEach(game.networks.prefix(2), id: \.self) { net in
                    Text(net)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue.opacity(0.15))
                        .foregroundColor(.blue)
                        .cornerRadius(4)
                }
            }

            // Teams & Scores
            VStack(spacing: 8) {
                teamRow(team: game.awayTeam)
                teamRow(team: game.homeTeam)
            }

            // Watch / Open App Buttons
            if let primaryApp = game.primaryApp {
                HStack(spacing: 8) {
                    Button {
                        Task {
                            await tvManager.launchApp(appId: primaryApp.effectiveRokuId, appName: primaryApp.shortLabel)
                        }
                    } label: {
                        HStack {
                            Image(systemName: "play.fill")
                                .font(.caption)
                            Text("Open \(primaryApp.shortLabel)")
                                .fontWeight(.bold)
                            Spacer()
                            Text(tvManager.activeTv?.name ?? "On TV")
                                .font(.caption2)
                                .opacity(0.8)
                        }
                        .padding(.vertical, 10)
                        .padding(.horizontal, 14)
                        .background(primaryApp.gradient)
                        .foregroundColor(.white)
                        .cornerRadius(10)
                    }

                    ForEach(game.apps.filter { $0.key != primaryApp.key }.prefix(2)) { altApp in
                        Button {
                            Task {
                                await tvManager.launchApp(appId: altApp.effectiveRokuId, appName: altApp.shortLabel)
                            }
                        } label: {
                            Text(altApp.shortLabel)
                                .font(.caption)
                                .fontWeight(.semibold)
                                .padding(.vertical, 10)
                                .padding(.horizontal, 10)
                                .background(Color(.systemGray6))
                                .foregroundColor(.primary)
                                .cornerRadius(10)
                        }
                    }
                }
            }
        }
        .padding(14)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(16)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(game.isLive ? Color.red.opacity(0.3) : Color.clear, lineWidth: 1)
        )
    }

    private func teamRow(team: TeamInfo) -> some View {
        HStack {
            if let url = URL(string: team.logo), !team.logo.isEmpty {
                AsyncImage(url: url) { image in
                    image.resizable().scaledToFit()
                } placeholder: {
                    Color.gray.opacity(0.3)
                }
                .frame(width: 24, height: 24)
            } else {
                Text(String(team.abbreviation.prefix(3)))
                    .font(.caption2)
                    .fontWeight(.bold)
                    .frame(width: 24, height: 24)
                    .background(Color.gray.opacity(0.2))
                    .cornerRadius(4)
            }

            if let rank = team.rank {
                Text("#\(rank)")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }

            Text(team.name)
                .font(.subheadline)
                .fontWeight(.semibold)

            Spacer()

            if let score = team.score {
                Text(score)
                    .font(.headline)
                    .fontWeight(.bold)
            }
        }
    }
}
