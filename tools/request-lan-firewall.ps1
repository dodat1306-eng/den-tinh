$ErrorActionPreference = 'Stop'
$gameRoot = Split-Path $PSScriptRoot -Parent
$gameFirewallScript = Join-Path $PSScriptRoot 'enable-lan-firewall.ps1'
@{ Success = $null; State = 'WaitingForWindowsApproval' } | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $gameRoot 'runtime\lan-firewall-status.json') -Encoding UTF8
$gameAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($gameAdmin) { & $gameFirewallScript }
else {
  $gameArguments = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "`"$gameFirewallScript`"")
  Start-Process -FilePath "$env:WINDIR\System32\WindowsPowerShell\v1.0\powershell.exe" -Verb RunAs -WindowStyle Hidden -ArgumentList $gameArguments
}
