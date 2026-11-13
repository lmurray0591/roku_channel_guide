# 🏈 Roku Sports Guide for iOS

There are two ways to use Roku Sports Guide constantly on your iPhone:

---

## Option 1: Instant iOS Web App (PWA) — No Xcode Required! 🚀

You can install the app directly onto your iPhone home screen in 30 seconds:

1. **Start the server on your Mac:**
   ```bash
   npm start
   ```
   The terminal will print your phone URL, e.g.:
   ```
   Phone: http://192.168.1.X:3000
   ```

2. **Open Safari on your iPhone:**
   - Go to `http://192.168.1.X:3000` (ensure your iPhone is connected to the same Wi-Fi).

3. **Add to Home Screen:**
   - Tap the **Share** button (box with upward arrow ⎋ at the bottom of Safari).
   - Scroll down and tap **"Add to Home Screen"** ➕.
   - Tap **Add** in the top right.

4. **Done!**
   - You now have a full-screen **SportsGuide** app icon on your iPhone home screen!
   - Tap any game to directly open its app (ESPN, Peacock, FOX Sports, Paramount+, Prime Video, etc.) on your TV.
   - Tap the TV status pill in the top header to switch between TVs or auto-scan your Wi-Fi for any Roku TV.

---

## Option 2: Native iOS SwiftUI App (Xcode)

For a 100% native iOS app that runs independently on your iPhone without needing your Mac running:

1. Open **Xcode** on your Mac.
2. Select **File > Open** and choose the `ios` directory (or create a new iOS App target and drag in `ios/RokuSportsGuide/`).
3. Select your iPhone as the build destination and hit **Run (⌘R)**.
4. The native app communicates directly with ESPN scoreboard APIs and any Roku TV over Wi-Fi!
