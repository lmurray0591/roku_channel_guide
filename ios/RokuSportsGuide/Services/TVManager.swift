import Foundation
import Combine

@MainActor
public final class TVManager: ObservableObject {
    @Published public var savedTvs: [RokuDevice] = []
    @Published public var activeTv: RokuDevice?
    @Published public var discoveredTvs: [RokuDevice] = []
    @Published public var isScanning: Bool = false
    @Published public var toastMessage: String?

    private let userDefaultsKey = "RokuSavedTvs_v1"
    private let activeTvKey = "RokuActiveTvIp_v1"
    private let service = RokuService.shared

    public init() {
        loadSavedTvs()
    }

    public func showToast(_ message: String) {
        self.toastMessage = message
        Task {
            try? await Task.sleep(nanoseconds: 3_000_000_000)
            if self.toastMessage == message {
                self.toastMessage = nil
            }
        }
    }

    public func loadSavedTvs() {
        if let data = UserDefaults.standard.data(forKey: userDefaultsKey),
           let decoded = try? JSONDecoder().decode([RokuDevice].self, from: data) {
            self.savedTvs = decoded
        }
        let savedActiveIp = UserDefaults.standard.string(forKey: activeTvKey)
        if let active = savedTvs.first(where: { $0.ip == savedActiveIp }) {
            self.activeTv = active
        } else {
            self.activeTv = savedTvs.first
        }
        // Ping active TV to check online status
        if let ip = activeTv?.ip {
            Task {
                await checkStatus(ip: ip)
            }
        }
    }

    public func saveTvsToDisk() {
        if let data = try? JSONEncoder().encode(savedTvs) {
            UserDefaults.standard.set(data, forKey: userDefaultsKey)
        }
        UserDefaults.standard.set(activeTv?.ip, forKey: activeTvKey)
    }

    public func selectTv(_ device: RokuDevice) {
        self.activeTv = device
        saveTvsToDisk()
        showToast("📺 Connected to \(device.name)")
        Task {
            await checkStatus(ip: device.ip)
        }
    }

    public func addOrUpdateTv(ip: String, nickname: String? = nil) async {
        let cleanIp = ip.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanIp.isEmpty else { return }

        showToast("🔍 Connecting to \(cleanIp)...")
        if let info = await service.queryDeviceInfo(ip: cleanIp) {
            var newDevice = info
            if let nick = nickname, !nick.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                newDevice.name = nick
            }
            if let idx = savedTvs.firstIndex(where: { $0.ip == cleanIp }) {
                savedTvs[idx] = newDevice
            } else {
                savedTvs.append(newDevice)
            }
            self.activeTv = newDevice
            saveTvsToDisk()
            showToast("✅ Connected to \(newDevice.name)!")
        } else {
            // Add manually even if offline right now
            let fallbackName = nickname?.isEmpty == false ? nickname! : "Roku TV"
            let manualDevice = RokuDevice(ip: cleanIp, name: fallbackName, isOnline: false)
            if !savedTvs.contains(where: { $0.ip == cleanIp }) {
                savedTvs.append(manualDevice)
            }
            self.activeTv = manualDevice
            saveTvsToDisk()
            showToast("⚠️ Added \(cleanIp) (currently offline or TV sleeping)")
        }
    }

    public func removeTv(_ device: RokuDevice) {
        savedTvs.removeAll { $0.ip == device.ip }
        if activeTv?.ip == device.ip {
            activeTv = savedTvs.first
        }
        saveTvsToDisk()
        showToast("🗑️ Removed \(device.name)")
    }

    public func checkStatus(ip: String) async {
        if let info = await service.queryDeviceInfo(ip: ip) {
            if let idx = savedTvs.firstIndex(where: { $0.ip == ip }) {
                savedTvs[idx].isOnline = true
                savedTvs[idx].name = savedTvs[idx].name.isEmpty ? info.name : savedTvs[idx].name
            }
            if activeTv?.ip == ip {
                activeTv?.isOnline = true
            }
        } else {
            if let idx = savedTvs.firstIndex(where: { $0.ip == ip }) {
                savedTvs[idx].isOnline = false
            }
            if activeTv?.ip == ip {
                activeTv?.isOnline = false
            }
        }
    }

    public func scanLocalNetwork() async {
        isScanning = true
        discoveredTvs.removeAll()
        showToast("🔍 Scanning Wi-Fi for Roku TVs...")

        // Scan common home router subnets (.1.x, .0.x)
        let candidatePrefixes = ["192.168.1", "192.168.0", "192.168.86", "10.0.0"]
        var found: [RokuDevice] = []

        for prefix in candidatePrefixes {
            // Check in batches of 20
            await withTaskGroup(of: RokuDevice?.self) { group in
                for i in 1...60 {
                    let testIp = "\(prefix).\(i)"
                    group.addTask {
                        await RokuService.shared.queryDeviceInfo(ip: testIp)
                    }
                }
                for await result in group {
                    if let dev = result {
                        found.append(dev)
                    }
                }
            }
            if !found.isEmpty { break }
        }

        self.discoveredTvs = found
        self.isScanning = false
        if found.isEmpty {
            showToast("ℹ️ No Roku TVs found on quick scan. Enter IP manually below.")
        } else {
            showToast("📺 Found \(found.count) Roku TV\(found.count > 1 ? "s" : "")!")
            for dev in found {
                if !savedTvs.contains(where: { $0.ip == dev.ip }) {
                    savedTvs.append(dev)
                }
            }
            if activeTv == nil {
                activeTv = found.first
            }
            saveTvsToDisk()
        }
    }

    /// Directly launches the requested app on the active TV
    public func launchApp(appId: String, appName: String) async {
        guard let tv = activeTv else {
            showToast("⚠️ Connect a Roku TV first")
            return
        }

        showToast("🚀 Opening \(appName) on \(tv.name)...")
        do {
            try await service.launchApp(ip: tv.ip, appId: appId)
            showToast("✅ Opened \(appName) on \(tv.name)!")
        } catch {
            showToast("⚠️ Error opening \(appName): \(error.localizedDescription)")
        }
    }

    public func sendRemoteKey(_ key: String) async {
        guard let tv = activeTv else { return }
        do {
            try await service.sendKey(ip: tv.ip, key: key)
        } catch {
            showToast("⚠️ Remote error: \(error.localizedDescription)")
        }
    }
}
