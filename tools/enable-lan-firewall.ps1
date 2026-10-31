$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path $PSScriptRoot -Parent
$gameStatusPath = Join-Path $gameRoot 'runtime\lan-firewall-status.json'
try {
  . (Join-Path $PSScriptRoot 'lan-info.ps1')
  $gameNetwork = Get-DenTinhLanInfo
  $gameNode = Join-Path $gameRoot 'runtime\node.exe'
  if (-not (Test-Path -LiteralPath $gameNode)) { throw 'Khong tim thay runtime\node.exe.' }
  $gameRuleName = 'DenTinh-LAN-4174'
  $gameRule = Get-NetFirewallRule -Name $gameRuleName -ErrorAction SilentlyContinue
  if ($gameRule) {
    $gameRule | Set-NetFirewallRule -Enabled True -Direction Inbound -Action Allow -Profile Private,Public -Protocol TCP -LocalPort 4174 -Program $gameNode -LocalAddress $gameNetwork.IP -RemoteAddress $gameNetwork.Subnet -InterfaceAlias $gameNetwork.InterfaceAlias -EdgeTraversalPolicy Block
  } else {
    New-NetFirewallRule -Name $gameRuleName -DisplayName 'Den Tinh - LAN TCP 4174' -Description 'Allow this game from the current LAN subnet only.' -Enabled True -Direction Inbound -Action Allow -Profile Private,Public -Protocol TCP -LocalPort 4174 -Program $gameNode -LocalAddress $gameNetwork.IP -RemoteAddress $gameNetwork.Subnet -InterfaceAlias $gameNetwork.InterfaceAlias -EdgeTraversalPolicy Block | Out-Null
  }
  @{ Success = $true; Rule = $gameRuleName; IP = $gameNetwork.IP; Subnet = $gameNetwork.Subnet; Interface = $gameNetwork.InterfaceAlias; Port = 4174 } | ConvertTo-Json | Set-Content -LiteralPath $gameStatusPath -Encoding UTF8
} catch {
  @{ Success = $false; Error = $_.Exception.Message } | ConvertTo-Json | Set-Content -LiteralPath $gameStatusPath -Encoding UTF8
  exit 1
}
