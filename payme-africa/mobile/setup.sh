#!/bin/bash
set -e
cd "$(dirname "$0")"

echo ""
echo " PayMe Africa - Setup mobile"
echo " ============================"
echo ""

echo "[1/2] Installation packages de base..."
npm install --legacy-peer-deps

echo ""
echo "[2/2] Installation packages Expo (versions SDK compatibles)..."
npx expo install \
  expo-status-bar \
  expo-secure-store \
  expo-sqlite \
  expo-haptics \
  expo-clipboard \
  expo-sharing \
  react-native-safe-area-context \
  react-native-screens \
  react-native-gesture-handler \
  react-native-reanimated \
  react-native-svg \
  @expo/vector-icons \
  babel-preset-expo \
  -- --legacy-peer-deps

echo ""
echo " ✅ Installation terminée !"
echo " Lancez: npm start"
echo ""
