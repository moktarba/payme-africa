@echo off
cd /d "%~dp0"
echo.
echo  PayMe Africa - Lancement
echo  =========================
echo.

IF NOT EXIST node_modules (
  echo  [Install] Premier lancement - installation des dependances...
  call npm install --legacy-peer-deps
  echo.
)

echo  Choisissez le mode de lancement:
echo.
echo  [1] Navigateur web  (http://localhost:8081)
echo  [2] Telephone       (Expo Go - scanner QR code)
echo  [3] Telephone + Web (les deux en meme temps)
echo  [4] Android Studio emulateur
echo.
set /p choix=Votre choix (1/2/3/4):

if "%choix%"=="1" (
  echo.
  echo  Lancement en mode WEB...
  echo  Ouverture automatique dans votre navigateur
  echo.
  npx expo start --web
)

if "%choix%"=="2" (
  echo.
  echo  Lancement Expo Go...
  echo  Installez "Expo Go" sur votre telephone si ce n'est pas fait
  echo  Scannez le QR code qui apparait
  echo.
  npx expo start
)

if "%choix%"=="3" (
  echo.
  echo  Lancement complet...
  npx expo start --web
)

if "%choix%"=="4" (
  echo.
  echo  Lancement emulateur Android...
  npx expo start --android
)
