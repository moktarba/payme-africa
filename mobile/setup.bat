@echo off
cd /d "%~dp0"
echo.
echo  PayMe Africa - Setup mobile
echo  ============================
echo.

echo [1/2] Installation packages de base...
call npm install --legacy-peer-deps
if errorlevel 1 ( echo ERREUR etape 1 & exit /b 1 )

echo.
echo [2/2] Installation packages Expo (versions SDK compatibles)...
call npx expo install expo-status-bar expo-secure-store expo-sqlite expo-haptics expo-clipboard expo-sharing react-native-safe-area-context react-native-screens react-native-gesture-handler react-native-reanimated react-native-svg @expo/vector-icons babel-preset-expo -- --legacy-peer-deps
if errorlevel 1 ( echo ERREUR etape 2 & exit /b 1 )

echo.
echo  Installation terminee !
echo  Lancez: npm start
echo.
