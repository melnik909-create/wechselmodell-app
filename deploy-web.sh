#!/usr/bin/env bash
# WechselPlaner Web Deploy Script
# Usage: bash deploy-web.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

is_wsl() {
  grep -qi microsoft /proc/version 2>/dev/null
}

echo "1/5 Exporting web build..."
cd "$ROOT_DIR"
npm run build:web

echo "2/5 Patching index.html (PWA tags)..."
if [[ -f dist/index.html ]]; then
  sed -i 's|<link rel="icon" href="/favicon.ico" /></head>|<link rel="icon" href="/favicon.ico" />\n<link rel="manifest" href="/manifest.json" />\n<link rel="apple-touch-icon" href="/icon-192.png" />\n</head>|' dist/index.html || true
fi

echo "3/5 Copying fonts to /fonts/..."
mkdir -p dist/fonts
if [[ -d dist/assets ]]; then
  find dist/assets -name "*.ttf" -exec cp {} dist/fonts/ \; || true
fi
cp public/MaterialCommunityIcons.ttf dist/fonts/ 2>/dev/null || true

echo "4/5 Fixing @expo font paths in JS bundle..."
if [[ -d dist/_expo ]]; then
  find dist/_expo -name "*.js" -exec sed -i 's|/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/|/fonts/|g' {} \; || true
fi

echo "5/5 Deploying to Vercel..."
if is_wsl && command -v wslpath >/dev/null 2>&1 && command -v cmd.exe >/dev/null 2>&1; then
  WIN_DIST="$(wslpath -w "$ROOT_DIR/dist")"
  cmd.exe /c "cd /d $WIN_DIST && vercel deploy --prod --yes"
else
  (cd dist && vercel deploy --prod --yes)
fi

echo "Done! https://wechselplaner.vercel.app"
