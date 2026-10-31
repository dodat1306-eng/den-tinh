$ErrorActionPreference='Stop'
$gameRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$coreCompiler='C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(-not(Test-Path -LiteralPath $coreCompiler)){throw 'Can .NET Framework C# compiler hoac Unity Editor de chay kiem tra loi.'}
Push-Location -LiteralPath $gameRoot
try {
  New-Item -ItemType Directory -Path 'qa' -Force | Out-Null
  $coreSources=@('Unity\Assets\Scripts\Core\Definitions.cs','Unity\Assets\Scripts\Core\Simulation.cs','Unity\Assets\Scripts\Core\CatalogData.cs')
  & $coreCompiler /nologo /utf8output /langversion:5 /target:exe /out:qa\UnityCoreTests.exe $coreSources 'Unity\Tests\SimulationTests.cs'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  & '.\qa\UnityCoreTests.exe' | Tee-Object -FilePath 'qa\unity-core-tests.txt'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  & $coreCompiler /nologo /utf8output /langversion:5 /target:exe /out:qa\UnityCombatTests.exe $coreSources 'Unity\Tests\CombatPlaythrough.cs'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  & '.\qa\UnityCombatTests.exe' | Tee-Object -FilePath 'qa\unity-combat-tests.txt'
  exit $LASTEXITCODE
} finally { Pop-Location }
