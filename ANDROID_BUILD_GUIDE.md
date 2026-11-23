# S&S Racing — Android APK & Auto-Release Guide

**Created by SAYOD AND SUBHON (S&S STUDIOS)**

---

## Automatic GitHub Release (Simplest APK Download)

This project includes an automated GitHub Actions workflow at `.github/workflows/android-apk-release.yml`.

1. **Export / Push this project to a GitHub repository** (e.g., via AI Studio's **Save to GitHub** or `git push origin main`).
2. GitHub Actions automatically:
   - Builds the Vite + Three.js production game bundle
   - Generates the Capacitor Android project
   - Compiles **`SS-Racing-debug.apk`** and signed **`SS-Racing-release.apk`**
   - Publishes both APKs to your repository's **Releases** page!
3. Open your GitHub repository → **Releases** on your Android phone, tap **`SS-Racing-release.apk`** to download, and tap **Install**.

*(You can also trigger a fresh build anytime from **Actions → Build & Auto-Release Android APK → Run workflow**.)*

---

## Option 2: Instant Install on Android via Browser (PWA)

1. Open the hosted game URL in **Chrome for Android**.
2. Tap **Install Android App** on the menu (or Chrome `⋮` → **Add to Home screen**).
3. Launch **S&S Racing** from your Android home screen in fullscreen mode.

---

## Option 3: Local Android Studio / Gradle Build

```bash
npm install
npm run build
npm install @capacitor/cli@8 @capacitor/android@8
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug
```
Output APK: `android/app/build/outputs/apk/debug/app-debug.apk`
