#!/bin/bash
# WechselPlaner Web Deploy Script
# Usage: bash deploy-web.sh

set -e

echo "1/5 Exporting web build..."
npx expo export --platform web

echo "2/5 Patching index.html..."
sed -i 's|<link rel="icon" href="/favicon.ico" /></head>|<link rel="icon" href="/favicon.ico" />\n<link rel="manifest" href="/manifest.json" />\n<link rel="apple-touch-icon" href="/icon-192.png" />\n</head>|' dist/index.html

echo "3/5 Copying fonts to /fonts/..."
mkdir -p dist/fonts
find dist/assets -name "*.ttf" -exec cp {} dist/fonts/ \;
cp public/MaterialCommunityIcons.ttf dist/fonts/ 2>/dev/null || true

echo "4/5 Fixing @expo font paths in JS bundle..."
# Replace deep @expo paths with flat /fonts/ paths
find dist/_expo -name "*.js" -exec sed -i 's|/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/|/fonts/|g' {} \;

echo "5/5 Deploying to Vercel..."
cd dist && vercel deploy --prod --yes

echo "Done! https://wechselplaner.vercel.app"
