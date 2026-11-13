import SwiftUI

public struct TVManagerSheet: View {
    @EnvironmentObject private var tvManager: TVManager
    @Environment(\.dismiss) private var dismiss

    @State private var manualIp: String = ""
    @State private var manualNickname: String = ""

    public var body: some View {
        NavigationStack {
            List {
                // Active TV
                Section("Active TV") {
                    if let active = tvManager.activeTv {
                        HStack {
                            Circle()
                                .fill(active.isOnline ? Color.green : Color.orange)
                                .frame(width: 10, height: 10)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(active.name)
                                    .fontWeight(.bold)
                                Text("\(active.ip) • \(active.modelName)")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                            Spacer()
                            Text(active.isOnline ? "Connected" : "Standby")
                                .font(.caption2)
                                .fontWeight(.semibold)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(active.isOnline ? Color.green.opacity(0.15) : Color.orange.opacity(0.15))
                                .foregroundColor(active.isOnline ? .green : .orange)
                                .cornerRadius(6)
                        }
                    } else {
                        Text("No TV selected. Pick a TV below.")
                            .foregroundColor(.secondary)
                    }
                }

                // My Saved TVs
                Section("My Saved TVs") {
                    if tvManager.savedTvs.isEmpty {
                        Text("No saved TVs yet. Scan or add one below.")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(tvManager.savedTvs) { tv in
                            HStack {
                                Circle()
                                    .fill(tv.ip == tvManager.activeTv?.ip ? Color.blue : Color.gray.opacity(0.5))
                                    .frame(width: 8, height: 8)
                                VStack(alignment: .leading, spacing: 2) {
                                    HStack {
                                        Text(tv.name)
                                            .fontWeight(tv.ip == tvManager.activeTv?.ip ? .bold : .regular)
                                        if tv.ip == tvManager.activeTv?.ip {
                                            Text("(Active)")
                                                .font(.caption2)
                                                .foregroundColor(.blue)
                                        }
                                    }
                                    Text(tv.ip)
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                            }
                            .contentShape(Rectangle())
                            .onTapGesture {
                                tvManager.selectTv(tv)
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    tvManager.removeTv(tv)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                }

                // Auto-Scan Wi-Fi
                Section("Find TVs on Wi-Fi") {
                    Button {
                        Task {
                            await tvManager.scanLocalNetwork()
                        }
                    } label: {
                        HStack {
                            Image(systemName: "antenna.radiowaves.left.and.right")
                            Text(tvManager.isScanning ? "Scanning Wi-Fi..." : "Scan Wi-Fi for Roku TVs")
                                .fontWeight(.semibold)
                            if tvManager.isScanning {
                                Spacer()
                                ProgressView()
                            }
                        }
                    }
                    .disabled(tvManager.isScanning)

                    if !tvManager.discoveredTvs.isEmpty {
                        ForEach(tvManager.discoveredTvs) { tv in
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(tv.name)
                                        .fontWeight(.semibold)
                                    Text("\(tv.ip) • \(tv.modelName)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                Button("+ Connect") {
                                    tvManager.selectTv(tv)
                                }
                                .buttonStyle(.borderedProminent)
                                .font(.caption)
                            }
                        }
                    }
                }

                // Add TV by IP
                Section("Add TV by IP Address") {
                    TextField("Roku IP Address (e.g. 192.168.1.50)", text: $manualIp)
                        .keyboardType(.numbersAndPunctuation)
                        .autocorrectionDisabled()

                    TextField("Nickname (e.g. Living Room TV)", text: $manualNickname)

                    Button("Connect to TV") {
                        Task {
                            await tvManager.addOrUpdateTv(ip: manualIp, nickname: manualNickname)
                            manualIp = ""
                            manualNickname = ""
                        }
                    }
                    .disabled(manualIp.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .navigationTitle("Manage Roku TVs")
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
}
