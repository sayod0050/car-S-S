# Street Rush 3D — Android APK & Installation Guide

**Street Rush 3D** runs immediately in any mobile browser or as an installable fullscreen Android Progressive Web App (PWA), and is also pre-configured with **Capacitor** (`capacitor.config.ts`) so you can compile standalone **Debug** and **Release** `.apk` files in Android Studio.

---

## Option 1: Instant Install on Android (PWA — Zero Build Required)

1. Open the hosted game URL in **Chrome for Android**.
2. Tap the **Install App** button on the Title Screen (or tap Chrome's `⋮` menu → **Add to Home screen** / **Install app**).
3. Launch **Street Rush 3D** from your Android home screen — it runs fullscreen with offline caching and persistent saves.

---

## Option 2: Build Native Android APK (Debug & Release)

### Prerequisites
- **Node.js 20+** and `npm`
- **Android Studio** (with Android SDK Platform 34+ & Build-Tools installed)
- **Java JDK 17+**

### Step 1 — Build the Web Bundle
```bash
npm install
npm run build
```

### Step 2 — Add Capacitor Android Platform (First Time Only)
```bash
npm install @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
```

### Step 3 — Build the Debug APK (For Testing)
```bash
cd android
./gradlew assembleDebug
```
Output APK location:
`android/app/build/outputs/apk/debug/app-debug.apk`

Install directly onto a USB-connected Android phone (with USB Debugging enabled):
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Step 4 — Build a Release-Ready Signed APK
1. Generate a signing keystore (once):
   ```bash
   keytool -genkey -v -keystore street-rush-release.keystore -alias streetrush -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Open `android/` in **Android Studio** (`npx cap open android`).
3. Go to **Build → Generate Signed Bundle / APK → APK**, select `street-rush-release.keystore`, and choose **release**.
4. Or build via Gradle after configuring `signingConfigs.release` in `android/app/build.gradle`:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
Output APK location:
`android/app/build/outputs/apk/release/app-release.apk`

### Step 5 — Install the APK Manually on Android
1. Copy `app-debug.apk` or `app-release.apk` to your phone's **Downloads** folder.
2. Open **Files** on Android and tap the `.apk` file.
3. If prompted, enable **Allow from this source** for your file manager.
4. Tap **Install** and launch **Street Rush 3D**.
