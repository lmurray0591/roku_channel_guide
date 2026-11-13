import Foundation

public final class RokuService: Sendable {
    public static let shared = RokuService()
    private let session: URLSession

    public init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 2.5
        config.timeoutIntervalForResource = 3.5
        self.session = URLSession(configuration: config)
    }

    /// Directly launches a Roku app on the TV (instant and reliable)
    public func launchApp(ip: String, appId: String) async throws {
        guard let url = URL(string: "http://\(ip):8060/launch/\(appId)") else {
            throw URLError(.badURL)
        }

        // 1. Try waking the TV first in background
        _ = try? await sendKey(ip: ip, key: "PowerOn")

        // 2. Launch the app directly
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        let (_, response) = try await session.data(for: request)
        if let httpRes = response as? HTTPURLResponse, (200...299).contains(httpRes.statusCode) || httpRes.statusCode == 204 {
            return
        }
    }

    /// Sends a remote control keypress to the Roku TV
    public func sendKey(ip: String, key: String) async throws {
        guard let url = URL(string: "http://\(ip):8060/keypress/\(key)") else {
            throw URLError(.badURL)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        _ = try await session.data(for: request)
    }

    /// Queries device info (friendly name, model, power mode) from the TV
    public func queryDeviceInfo(ip: String) async -> RokuDevice? {
        guard let url = URL(string: "http://\(ip):8060/query/device-info") else { return nil }
        do {
            let (data, response) = try await session.data(from: url)
            guard let httpRes = response as? HTTPURLResponse, (200...299).contains(httpRes.statusCode) else {
                return nil
            }
            guard let xml = String(data: data, encoding: .utf8) else { return nil }

            let name = extractXMLTag("user-device-name", from: xml)
                ?? extractXMLTag("friendly-device-name", from: xml)
                ?? extractXMLTag("default-device-name", from: xml)
                ?? "Roku TV"
            let model = extractXMLTag("model-name", from: xml) ?? "Roku"
            let vendor = extractXMLTag("vendor-name", from: xml) ?? "TCL"
            let isTv = extractXMLTag("is-tv", from: xml)?.lowercased() == "true"

            return RokuDevice(
                ip: ip,
                name: name,
                modelName: model,
                vendorName: vendor,
                isTv: isTv,
                isOnline: true,
                lastSeen: Date()
            )
        } catch {
            return nil
        }
    }

    /// Queries list of installed apps on the TV
    public func queryInstalledApps(ip: String) async -> [RokuAppItem] {
        guard let url = URL(string: "http://\(ip):8060/query/apps") else { return [] }
        do {
            let (data, response) = try await session.data(from: url)
            guard let httpRes = response as? HTTPURLResponse, (200...299).contains(httpRes.statusCode) else {
                return []
            }
            guard let xml = String(data: data, encoding: .utf8) else { return [] }
            return parseAppsXML(xml)
        } catch {
            return []
        }
    }

    // Helper to extract XML tags
    private func extractXMLTag(_ tag: String, from text: String) -> String? {
        let pattern = "<\(tag)>([^<]+)</\(tag)>"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive),
              let match = regex.firstMatch(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count)),
              let range = Range(match.range(at: 1), in: text) else {
            return nil
        }
        return String(text[range]).trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func parseAppsXML(_ text: String) -> [RokuAppItem] {
        var items: [RokuAppItem] = []
        let pattern = "<app\\s+id=\"([^\"]+)\"[^>]*>([^<]+)</app>"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: .caseInsensitive) else {
            return items
        }
        let matches = regex.matches(in: text, options: [], range: NSRange(location: 0, length: text.utf16.count))
        for m in matches {
            if let idRange = Range(m.range(at: 1), in: text),
               let nameRange = Range(m.range(at: 2), in: text) {
                let id = String(text[idRange])
                let name = String(text[nameRange]).trimmingCharacters(in: .whitespacesAndNewlines)
                items.append(RokuAppItem(id: id, name: name))
            }
        }
        return items
    }
}
