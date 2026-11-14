$ErrorActionPreference='Stop'
if(-not $env:ALLUSERSPROFILE){$env:ALLUSERSPROFILE=[Environment]::GetFolderPath('CommonApplicationData')}
$unityProjectPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\Unity'))
$unityCandidates=@('E:\Tools\Unity\6000.3.27f1\Editor\Unity.exe','C:\Program Files\Unity\Hub\Editor\6000.3.27f1\Editor\Unity.exe')
$unityEditorPath=$unityCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if(-not $unityEditorPath){Write-Host 'Chua co Unity Editor 6000.3.27f1. Doc Unity\README_VI.md de cai va kich hoat Unity Personal.';exit 2}
$unityLogDir=Join-Path $unityProjectPath 'Logs';New-Item -ItemType Directory -Path $unityLogDir -Force | Out-Null
$unityTempDir=Join-Path $unityProjectPath 'Temp';New-Item -ItemType Directory -Path $unityTempDir -Force | Out-Null
$env:TEMP=$unityTempDir;$env:TMP=$unityTempDir
$unityBuildArgs=@('-batchmode','-nographics','-quit','-projectPath',('"'+$unityProjectPath+'"'),'-executeMethod','DenTinh.Editor.BuildGame.BuildWindows','-logFile',('"'+(Join-Path $unityLogDir 'build-windows.log')+'"'))
$unityBuildProcess=Start-Process -FilePath $unityEditorPath -ArgumentList $unityBuildArgs -WindowStyle Hidden -PassThru
$unityBuildProcess.WaitForExit()
if($unityBuildProcess.ExitCode -ne 0){Write-Host ('Unity build loi '+$unityBuildProcess.ExitCode+'. Xem '+(Join-Path $unityLogDir 'build-windows.log'));if($unityBuildProcess.ExitCode -eq 198){Write-Host 'Can dang nhap va kich hoat license trong Unity Hub.'};exit $unityBuildProcess.ExitCode}
Write-Host ('Da build: '+(Join-Path $unityProjectPath 'Builds\Windows\DenTinh.exe'))
