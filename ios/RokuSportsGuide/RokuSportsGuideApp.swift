import SwiftUI

@main
struct RokuSportsGuideApp: App {
    @StateObject private var tvManager = TVManager()

    var body: some Scene {
        WindowGroup {
            GuideView()
                .environmentObject(tvManager)
        }
    }
}
