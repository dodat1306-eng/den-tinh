param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$gameRoot = $PSScriptRoot
$gameNode = Join-Path $gameRoot 'runtime\node.exe'
$gameServer = Join-Path $gameRoot 'tools\server.cjs'
$gameServerVersion = 6
if (-not (Test-Path -LiteralPath $gameNode)) {
  $gameNodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($gameNodeCommand) { $gameNode = $gameNodeCommand.Source }
  else { throw 'Khong tim thay Node.js. Cai Node.js 22 tro len hoac dung ban ZIP co runtime\node.exe.' }
}
. (Join-Path $gameRoot 'tools\lan-info.ps1')
$gameNetwork = Get-DenTinhLanInfo
$gameHealth = $null
try { $gameHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:4174/health' -TimeoutSec 2 } catch {}
if (-not ($gameHealth.game -eq 'den-tinh-v1' -and $gameHealth.serverVersion -ge $gameServerVersion -and $gameHealth.lan)) {
  $gameWorkers = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {
    $_.ExecutablePath -eq $gameNode -and $_.CommandLine -like "*`"$gameServer`"*"
  }
  foreach ($gameWorker in $gameWorkers) { Stop-Process -Id $gameWorker.ProcessId -Force }
  $env:DENTINH_PORT = '4174'
  $env:DENTINH_HOST = '0.0.0.0'
  $env:TEMP = Join-Path $gameRoot 'runtime\temp'
  $env:TMP = $env:TEMP
  New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
  Start-Process -FilePath $gameNode -ArgumentList @("`"$gameServer`"", '--lan') -WorkingDirectory $gameRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $gameRoot 'runtime\lan-server.log') -RedirectStandardError (Join-Path $gameRoot 'runtime\lan-server-error.log')
  for ($gameAttempt = 0; $gameAttempt -lt 30; $gameAttempt++) {
    Start-Sleep -Milliseconds 150
    try {
      $gameHealth = Invoke-RestMethod -Uri 'http://127.0.0.1:4174/health' -TimeoutSec 1
      if ($gameHealth.serverVersion -ge $gameServerVersion -and $gameHealth.lan) { break }
    } catch {}
  }
  if (-not ($gameHealth.serverVersion -ge $gameServerVersion -and $gameHealth.lan)) { throw 'Chua khoi dong duoc may chu LAN. Xem runtime\lan-server-error.log.' }
}
$gameNetwork | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $gameRoot 'runtime\lan-info.json') -Encoding UTF8
Write-Output "Link cho nguoi cung mang: $($gameNetwork.Url)"
Write-Output 'Giu may nay bat va cung ket noi Wi-Fi/LAN trong khi moi nguoi choi.'
if (-not $NoBrowser) { & (Join-Path $gameRoot 'Start-Game.ps1') }
