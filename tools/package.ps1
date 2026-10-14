$ErrorActionPreference = 'Stop'
$gamePackageRoot = Split-Path $PSScriptRoot -Parent
$gameArchivePath = Join-Path (Split-Path $gamePackageRoot -Parent) 'DenTinh-v0.1.zip'
if (Test-Path -LiteralPath $gameArchivePath) {
  $gameArchivePath = Join-Path (Split-Path $gamePackageRoot -Parent) ('DenTinh-v0.1-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.zip')
}
$gamePackageFiles = @(
  'index.html','style.css','icon.svg','world.js','engine.js','render.js','app.js',
  'CHOI_GAME.bat','Start-Game.ps1','README.md',
  'tools\server.cjs','tools\test.cjs','tools\playthrough.cjs','tools\http-test.cjs',
  'runtime\node.exe','runtime\NODE-LICENSE.txt'
)
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$gameArchiveStream = [System.IO.File]::Open($gameArchivePath,[System.IO.FileMode]::CreateNew)
$gameArchiveZip = [System.IO.Compression.ZipArchive]::new($gameArchiveStream,[System.IO.Compression.ZipArchiveMode]::Create,$false)
try {
  foreach ($gamePackageFile in $gamePackageFiles) {
    $gamePackageSource = Join-Path $gamePackageRoot $gamePackageFile
    if (-not (Test-Path -LiteralPath $gamePackageSource)) { throw "Missing package file: $gamePackageFile" }
    $gamePackageEntry = 'DenTinh/' + $gamePackageFile.Replace('\','/')
    [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($gameArchiveZip,$gamePackageSource,$gamePackageEntry,[System.IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {
  $gameArchiveZip.Dispose()
  $gameArchiveStream.Dispose()
}
$gameArchiveCheck = [System.IO.Compression.ZipFile]::OpenRead($gameArchivePath)
try {
  if ($gameArchiveCheck.Entries.Count -ne $gamePackageFiles.Count) { throw 'ZIP entry count mismatch' }
  if ($gameArchiveCheck.Entries.FullName -contains 'DenTinh/runtime/save.json') { throw 'ZIP must not contain player save' }
} finally { $gameArchiveCheck.Dispose() }
Get-Item -LiteralPath $gameArchivePath | Select-Object FullName,@{Name='SizeMB';Expression={[math]::Round($_.Length/1MB,2)}}
