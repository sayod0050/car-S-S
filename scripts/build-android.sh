#!/usr/bin/env bash
set -euo pipefail

echo "=== Building S&S Racing (S&S Studios) Web Bundle ==="
npm install
npm run build

if [ ! -d "android" ]; then
  echo "=== Adding Capacitor Android Platform ==="
  npm install @capacitor/cli @capacitor/android
  npx cap add android
fi

echo "=== Syncing Assets to Android Project ==="
npx cap sync android

echo "=== Building Debug APK ==="
cd android
./gradlew assembleDebug

echo ""
echo "Debug APK generated at:"
echo "  android/app/build/outputs/apk/debug/app-debug.apk"
