$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$packageGameRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$packageZipPath=Join-Path (Split-Path $packageGameRoot -Parent) 'DenTinh-v0.2-20261031.zip'
if(Test-Path -LiteralPath $packageZipPath){throw ('Goi da ton tai, khong ghi de: '+$packageZipPath)}
$packageFiles=@(Get-ChildItem -LiteralPath $packageGameRoot -File -Force | Where-Object {$_.Extension -in @('.html','.js','.css','.json','.svg','.md','.bat','.ps1') -or $_.Name -eq '.gitignore'} | Where-Object {$_.Name -notmatch '^(credentials|secrets|\.env)'})
foreach($packageFolder in @('assets','tools','Unity')){
  $packageFiles+=Get-ChildItem -LiteralPath (Join-Path $packageGameRoot $packageFolder) -File -Recurse -Force | Where-Object {
    $packageRelative=[IO.Path]::GetRelativePath($packageGameRoot,$_.FullName).Replace('\','/')
    $packageRelative -notmatch '^Unity/(Library|Temp|Logs|Builds|Saves|UserSettings|obj)/'
  }
}
$packageFiles+=Get-Item -LiteralPath (Join-Path $packageGameRoot 'runtime\node.exe'),(Join-Path $packageGameRoot 'runtime\NODE-LICENSE.txt')
foreach($packageReport in @('test-report.json','expansion-report.json','playthrough-report.json','http-report.json','unity-core-tests.txt','unity-combat-tests.txt','browser-v02.md','v02-hoavi-firewall.jpg','v02-menu.jpg')){ $packageReportPath=Join-Path $packageGameRoot ('qa\'+$packageReport);if(Test-Path -LiteralPath $packageReportPath){$packageFiles+=Get-Item -LiteralPath $packageReportPath} }
$packageArchive=[IO.Compression.ZipFile]::Open($packageZipPath,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach($packageFile in $packageFiles){
    $packageRelative=[IO.Path]::GetRelativePath($packageGameRoot,$packageFile.FullName).Replace('\','/')
    if($packageRelative.StartsWith('../') -or [IO.Path]::IsPathRooted($packageRelative)){throw ('Duong dan ngoai project: '+$packageRelative)}
    if($packageRelative.StartsWith('runtime/') -and $packageRelative -notin @('runtime/node.exe','runtime/NODE-LICENSE.txt')){throw ('Khong dong goi du lieu rieng: '+$packageRelative)}
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($packageArchive,$packageFile.FullName,('DenTinh-v0.2/'+$packageRelative),[IO.Compression.CompressionLevel]::Optimal) | Out-Null
  }
} finally {$packageArchive.Dispose()}
$packageCheck=[IO.Compression.ZipFile]::OpenRead($packageZipPath)
try {
  $packageEntryNames=@($packageCheck.Entries | ForEach-Object {$_.FullName})
  foreach($packageNeeded in @('index.html','content.js','expansion.js','visuals.js','controls.js','assets/heroes.png','assets/key-art.png','Unity/Assets/Scripts/Core/Simulation.cs','Unity/Assets/Scripts/Runtime/DenTinhGame.cs','Unity/Assets/Editor/BuildGame.cs','runtime/node.exe')){if(('DenTinh-v0.2/'+$packageNeeded) -notin $packageEntryNames){throw ('Thieu tep: '+$packageNeeded)}}
  if($packageEntryNames -match '/runtime/(save|browser|backup)' -or $packageEntryNames -match '/Unity/(Library|Saves|Builds)/'){throw 'Goi chua du lieu rieng hoac bo nho dem'}
  [pscustomobject]@{Path=$packageZipPath;Bytes=(Get-Item -LiteralPath $packageZipPath).Length;Entries=$packageEntryNames.Count;PrivateSavesIncluded=$false;UnityPlayerIncluded=$false} | ConvertTo-Json
} finally {$packageCheck.Dispose()}
