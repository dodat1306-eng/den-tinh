@echo off
set "UNITY_EDITOR=E:\Tools\Unity\6000.3.27f1\Editor\Unity.exe"
if not exist "%UNITY_EDITOR%" set "UNITY_EDITOR=C:\Program Files\Unity\Hub\Editor\6000.3.27f1\Editor\Unity.exe"
if exist "%UNITY_EDITOR%" (
  start "Den Tinh Unity" "%UNITY_EDITOR%" -projectPath "%~dp0Unity"
) else (
  echo Chua co Unity Editor. Doc Unity\README_VI.md de cai va kich hoat.
  echo Bo cai da tai: E:\Tools\UnityDownloads\UnitySetup64-6000.3.27f1.exe
  pause
)
