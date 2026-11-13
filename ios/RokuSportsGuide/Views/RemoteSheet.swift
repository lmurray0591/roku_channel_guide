import SwiftUI

public struct RemoteSheet: View {
    @EnvironmentObject private var tvManager: TVManager
    @Environment(\.dismiss) private var dismiss

    public var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // TV status line
                if let tv = tvManager.activeTv {
                    Text("\(tv.name) (\(tv.ip))")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                // Power / Back / Home
                HStack(spacing: 16) {
                    remoteButton(title: "⚡ Wake", key: "PowerOn", color: .red.opacity(0.8))
                    remoteButton(title: "⬅ Back", key: "Back")
                    remoteButton(title: "🏠 Home", key: "Home")
                }

                // D-Pad
                VStack(spacing: 12) {
                    remoteButton(title: "▲ Up", key: "Up")
                        .frame(width: 88)

                    HStack(spacing: 12) {
                        remoteButton(title: "◀ Left", key: "Left")
                            .frame(width: 88)
                        remoteButton(title: "OK", key: "Select", color: .blue)
                            .frame(width: 88)
                        remoteButton(title: "Right ▶", key: "Right")
                            .frame(width: 88)
                    }

                    remoteButton(title: "▼ Down", key: "Down")
                        .frame(width: 88)
                }
                .padding(.vertical, 10)

                // Playback controls
                HStack(spacing: 16) {
                    remoteButton(title: "↺ Replay", key: "InstantReplay")
                    remoteButton(title: "⏯ Play", key: "Play")
                    remoteButton(title: "✳ Options", key: "Info")
                }

                // Volume controls
                HStack(spacing: 16) {
                    remoteButton(title: "🔉 Vol -", key: "VolumeDown")
                    remoteButton(title: "🔇 Mute", key: "VolumeMute")
                    remoteButton(title: "🔊 Vol +", key: "VolumeUp")
                }

                Spacer()
            }
            .padding()
            .navigationTitle("Roku TV Remote")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func remoteButton(title: String, key: String, color: Color = Color(.secondarySystemBackground)) -> some View {
        Button {
            Task {
                await tvManager.sendRemoteKey(key)
            }
        } label: {
            Text(title)
                .font(.subheadline)
                .fontWeight(.bold)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(color)
                .foregroundColor(color == .blue ? .white : .primary)
                .cornerRadius(12)
        }
    }
}
