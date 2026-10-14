$ErrorActionPreference = 'Stop'
$gameDirectory = $PSScriptRoot
$gameProfile = Join-Path $gameDirectory 'runtime\browser-profile'
$gameTemp = Join-Path $gameDirectory 'runtime\temp'
$gameCache = Join-Path $gameDirectory 'runtime\browser-cache'
New-Item -ItemType Directory -Path $gameProfile,$gameTemp,$gameCache -Force | Out-Null
$env:TEMP = $gameTemp
$env:TMP = $gameTemp
$gameNode = Join-Path $gameDirectory 'runtime\node.exe'
if (-not (Test-Path -LiteralPath $gameNode)) {
  $gameNodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($gameNodeCommand) { $gameNode = $gameNodeCommand.Source }
  else { throw 'Khong tim thay runtime\node.exe. Hay giai nen lai day du thu muc game.' }
}
$gameServer = Join-Path $gameDirectory 'tools\server.cjs'
$gamePort = 4174
$gameServerReady = $false
try {
  $gameHealth = Invoke-RestMethod -Uri "http://127.0.0.1:$gamePort/health" -TimeoutSec 2
  if ($gameHealth.game -eq 'den-tinh-v1') { $gameServerReady = $true }
} catch {}
if (-not $gameServerReady) {
  $gameListener = Get-NetTCPConnection -LocalPort $gamePort -State Listen -ErrorAction SilentlyContinue
  if ($gameListener) { throw 'Cong 4174 dang duoc ung dung khac su dung. Dong ung dung do roi mo game.' }
  $env:DENTINH_PORT = [string]$gamePort
  Start-Process -FilePath $gameNode -ArgumentList @("`"$gameServer`"") -WorkingDirectory $gameDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $gameDirectory 'runtime\server.log') -RedirectStandardError (Join-Path $gameDirectory 'runtime\server-error.log')
  for ($gameAttempt = 0; $gameAttempt -lt 30; $gameAttempt++) {
    Start-Sleep -Milliseconds 150
    try {
      $gameHealth = Invoke-RestMethod -Uri "http://127.0.0.1:$gamePort/health" -TimeoutSec 1
      if ($gameHealth.game -eq 'den-tinh-v1') { $gameServerReady = $true; break }
    } catch {}
  }
  if (-not $gameServerReady) { throw 'May chu game chua khoi dong. Kiem tra runtime\server-error.log.' }
}
$gameBrowsers = @(
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
  'C:\Program Files\Google\Chrome\Application\chrome.exe',
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$gameBrowser = $gameBrowsers | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$gameUrl = "http://127.0.0.1:$gamePort/"
if ($gameBrowser) {
  $gameArguments = @(
    "--app=$gameUrl",
    "--user-data-dir=`"$gameProfile`"",
    "--disk-cache-dir=`"$gameCache`"",
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--disable-sync',
    '--window-size=1280,760'
  )
  Start-Process -FilePath $gameBrowser -ArgumentList $gameArguments -WindowStyle Normal
} else {
  Start-Process -FilePath $gameUrl -WindowStyle Normal
}
