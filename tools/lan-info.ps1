function Get-DenTinhLanInfo {
  $gameConnection = Get-NetIPConfiguration | Where-Object {
    $_.IPv4DefaultGateway -and $_.NetAdapter.Status -eq 'Up' -and $_.IPv4Address
  } | Sort-Object { $_.IPv4Interface.InterfaceMetric } | Select-Object -First 1
  if (-not $gameConnection) { throw 'Khong tim thay ket noi Wi-Fi/LAN dang hoat dong.' }
  $gameAddress = $gameConnection.IPv4Address | Where-Object { $_.IPAddress -notlike '169.254.*' } | Select-Object -First 1
  if (-not $gameAddress) { throw 'Ket noi hien tai chua co dia chi IPv4.' }
  $gameIp = $gameAddress.IPAddress
  $gamePrefix = [int]$gameAddress.PrefixLength
  $gameIpBytes = [System.Net.IPAddress]::Parse($gameIp).GetAddressBytes()
  $gameNetworkBytes = for ($gameOctet = 0; $gameOctet -lt 4; $gameOctet++) {
    $gameBits = [math]::Max(0, [math]::Min(8, $gamePrefix - 8 * $gameOctet))
    $gameMask = if ($gameBits -eq 0) { 0 } else { [int](256 - [math]::Pow(2, 8 - $gameBits)) }
    $gameIpBytes[$gameOctet] -band $gameMask
  }
  [pscustomobject]@{
    IP = $gameIp
    Subnet = ($gameNetworkBytes -join '.') + '/' + $gamePrefix
    InterfaceAlias = $gameConnection.InterfaceAlias
    InterfaceIndex = $gameConnection.InterfaceIndex
    Url = "http://${gameIp}:4174/"
  }
}
