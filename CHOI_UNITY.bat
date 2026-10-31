@echo off
cd /d "%~dp0"
if exist "%~dp0Unity\Builds\Windows\DenTinh.exe" (
  start "Den Tinh Unity" "%~dp0Unity\Builds\Windows\DenTinh.exe"
) else (
  echo Chua co ban Unity .exe da build.
  echo Cai va kich hoat Unity trong Hub, sau do chay BUILD_UNITY.bat.
  echo Xem huong dan: Unity\README_VI.md
  echo Ban trinh duyet 0.2 choi ngay bang CHOI_GAME.bat.
  pause
)
