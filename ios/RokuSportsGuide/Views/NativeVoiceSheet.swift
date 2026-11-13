import SwiftUI

public struct NativeVoiceSheet: View {
    @ObservedObject var voiceManager = VoiceSpeechManager.shared
    @EnvironmentObject var tvManager: TVManager
    @Environment(\.dismiss) var dismiss

    public var body: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("🎙️ Native Voice Assistant")
                        .font(.headline)
                    Text("Speak naturally — auto-executes on silence")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                Spacer()
                Button("Done") {
                    voiceManager.stopListening()
                    dismiss()
                }
                .fontWeight(.bold)
            }
            .padding(.top)

            Spacer()

            // Pulsing Orb Indicator
            ZStack {
                if voiceManager.isListening {
                    Circle()
                        .stroke(Color.red.opacity(0.4), lineWidth: 3)
                        .frame(width: 140, height: 140)
                        .scaleEffect(voiceManager.isListening ? 1.2 : 0.8)
                        .animation(.easeInOut(duration: 1.2).repeatForever(autoreverses: true), value: voiceManager.isListening)

                    Circle()
                        .stroke(Color.red.opacity(0.6), lineWidth: 2)
                        .frame(width: 110, height: 110)
                }

                Button {
                    if voiceManager.isListening {
                        voiceManager.stopListening()
                    } else {
                        startVoice()
                    }
                } label: {
                    Circle()
                        .fill(LinearGradient(colors: [.red, .orange], startPoint: .topLeading, endPoint: .bottomTrailing))
                        .frame(width: 80, height: 80)
                        .shadow(color: .red.opacity(0.5), radius: 10)
                        .overlay {
                            Image(systemName: "mic.fill")
                                .font(.system(size: 32))
                                .foregroundColor(.white)
                        }
                }
            }

            VStack(spacing: 8) {
                Text(voiceManager.statusMessage)
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundColor(voiceManager.isListening ? .red : .blue)

                if !voiceManager.transcript.isEmpty {
                    Text("\"\(voiceManager.transcript)\"")
                        .font(.body)
                        .fontWeight(.medium)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }
            }
            .frame(minHeight: 50)

            Spacer()

            // Helpful Prompt Examples
            VStack(alignment: .leading, spacing: 6) {
                Text("EXAMPLE COMMANDS:")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.secondary)
                Text("• \"Turn TV on\" or \"Turn TV off\"")
                    .font(.caption)
                Text("• \"Go to Knicks game\" or \"Watch the Chiefs\"")
                    .font(.caption)
                Text("• \"Open ESPN\" or \"Open Peacock\"")
                    .font(.caption)
                Text("• \"Mute TV\" or \"Go Home\"")
                    .font(.caption)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
        .padding()
        .onAppear {
            startVoice()
        }
        .onDisappear {
            voiceManager.stopListening()
        }
    }

    private func startVoice() {
        voiceManager.startListening { command in
            executeVoiceCommand(command)
        }
    }

    private func executeVoiceCommand(_ raw: String) {
        let lower = raw.lowercased()
        tvManager.showToast("🎙️ \"\(raw)\"")

        guard let ip = tvManager.activeTv?.ip else {
            tvManager.showToast("⚠️ No TV connected. Select TV first.")
            dismiss()
            return
        }

        Task {
            if lower.contains("turn on") || lower.contains("wake") {
                _ = try? await RokuService.shared.sendKey(ip: ip, key: "PowerOn")
            } else if lower.contains("turn off") || lower.contains("shut down") {
                _ = try? await RokuService.shared.sendKey(ip: ip, key: "PowerOff")
            } else if lower.contains("mute") {
                _ = try? await RokuService.shared.sendKey(ip: ip, key: "VolumeMute")
            } else if lower.contains("home") {
                _ = try? await RokuService.shared.sendKey(ip: ip, key: "Home")
            } else if lower.contains("espn") {
                _ = try? await RokuService.shared.launchApp(ip: ip, appId: "34376")
            } else if lower.contains("peacock") {
                _ = try? await RokuService.shared.launchApp(ip: ip, appId: "593099")
            } else if lower.contains("prime") {
                _ = try? await RokuService.shared.launchApp(ip: ip, appId: "13")
            } else if lower.contains("netflix") {
                _ = try? await RokuService.shared.launchApp(ip: ip, appId: "12")
            }
            await MainActor.run {
                dismiss()
            }
        }
    }
}
