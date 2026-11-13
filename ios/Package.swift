// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "RokuSportsGuide",
    platforms: [
        .iOS(.v16),
        .macOS(.v13)
    ],
    products: [
        .library(
            name: "RokuSportsGuide",
            targets: ["RokuSportsGuide"]
        ),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "RokuSportsGuide",
            path: "RokuSportsGuide"
        ),
    ]
)
