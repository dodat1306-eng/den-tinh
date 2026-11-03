$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$releaseRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$releaseZip=Join-Path (Split-Path $releaseRoot -Parent) 'DenTinh-v0.5-20261103.zip'
if(Test-Path -LiteralPath $releaseZip){throw ('Goi da ton tai, khong ghi de: '+$releaseZip)}
$releaseNames=@(
  'index.html','world.js','content.js','engine.js','expansion.js','frontier.js','elemental.js',
  'mythic-content.js','ascension.js','endless.js','render.js','visuals.js','scenery.js',
  'elemental-visuals.js','ascension-visuals.js','app.js','controls.js','elemental-ui.js','ascension-ui.js',
  'style.css','expansion.css','elemental.css','ascension.css','fonts.css','icon.svg','package.json','wrangler.jsonc',
  'README.md','README-v0.4.md','CHANGELOG-v0.5.md','VALIDATION-v0.5.md','ART-v0.5.md',
  'CHOI_GAME.bat','CHOI_CHUNG_MANG.bat','Start-Game.ps1','Start-LAN.ps1',
  'runtime/node.exe','runtime/NODE-LICENSE.txt',
  'qa/ascension-report.json','qa/endless-report.json','qa/ascension-visual-report.json',
  'qa/ascension-playthrough-report.json','qa/elemental-http-report.json','qa/lan-test-report.json'
  'qa/v05-browser-checks.json','qa/v05-an-lantern.png','qa/v05-an-cast.png','qa/v05-relics.png','qa/v05-ho-tinh.png'
)
foreach($releaseFolder in @('assets','tools')){
  $releaseNames+=Get-ChildItem -LiteralPath (Join-Path $releaseRoot $releaseFolder) -File -Recurse | ForEach-Object {[IO.Path]::GetRelativePath($releaseRoot,$_.FullName).Replace('\','/')}
}
$releaseNames=@($releaseNames | Sort-Object -Unique)
$releaseArchive=[IO.Compression.ZipFile]::Open($releaseZip,[IO.Compression.ZipArchiveMode]::Create)
try{
  foreach($releaseName in $releaseNames){
    $releaseFile=[IO.Path]::GetFullPath((Join-Path $releaseRoot $releaseName))
    if(-not $releaseFile.StartsWith($releaseRoot+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)){throw 'Duong dan ngoai thu muc game'}
    if($releaseName.StartsWith('runtime/') -and $releaseName -notin @('runtime/node.exe','runtime/NODE-LICENSE.txt')){throw 'Khong dong goi save/ho so rieng'}
    if(-not(Test-Path -LiteralPath $releaseFile -PathType Leaf)){throw ('Thieu tep: '+$releaseName)}
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($releaseArchive,$releaseFile,('DenTinh-v0.5/'+$releaseName),[IO.Compression.CompressionLevel]::Optimal)|Out-Null
  }
}finally{$releaseArchive.Dispose()}
$releaseCheck=[IO.Compression.ZipFile]::OpenRead($releaseZip)
try{
  $releaseEntries=@($releaseCheck.Entries|ForEach-Object {$_.FullName})
  foreach($releaseNeeded in @('index.html','mythic-content.js','ascension.js','endless.js','ascension-visuals.js','ascension-ui.js','fonts.css','assets/fonts/NotoSans-Regular.ttf','assets/fonts/NotoSans-Bold.ttf','assets/fonts/OFL.txt','tools/server.cjs','runtime/node.exe','CHOI_GAME.bat')){
    if(('DenTinh-v0.5/'+$releaseNeeded) -notin $releaseEntries){throw ('Goi thieu: '+$releaseNeeded)}
  }
  if($releaseEntries -match '/runtime/(save|browser|backup|qa|credentials)' -or $releaseEntries -match '/\.env'){throw 'Goi co du lieu rieng'}
  $releaseManifest=[ordered]@{version='0.5.0';zip=$releaseZip;bytes=(Get-Item -LiteralPath $releaseZip).Length;sha256=(Get-FileHash -LiteralPath $releaseZip -Algorithm SHA256).Hash;files=$releaseEntries.Count;privateSavesIncluded=$false;deployed=$false;unityPlayerIncluded=$false}
  $releaseManifest|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $releaseRoot 'runtime\v05-release-manifest.json') -Encoding utf8
  $releaseManifest|ConvertTo-Json
}finally{$releaseCheck.Dispose()}
