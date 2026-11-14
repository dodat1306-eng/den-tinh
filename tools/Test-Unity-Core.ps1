$ErrorActionPreference='Stop'
$OutputEncoding=[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
$gameRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$coreCompiler='C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(-not(Test-Path -LiteralPath $coreCompiler)){throw 'Can .NET Framework C# compiler hoac Unity Editor de chay kiem tra loi.'}
Push-Location -LiteralPath $gameRoot
try {
  New-Item -ItemType Directory -Path 'qa' -Force | Out-Null
  $coreSources=@('Unity\Assets\Scripts\Core\Definitions.cs','Unity\Assets\Scripts\Core\Simulation.cs','Unity\Assets\Scripts\Core\CatalogData.cs','Unity\Assets\Scripts\Core\ElementalCombat.cs')
  & $coreCompiler /nologo /utf8output /langversion:5 /target:exe /out:qa\UnityCoreTests.exe $coreSources 'Unity\Tests\SimulationTests.cs'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  $coreOutput=& '.\qa\UnityCoreTests.exe';$coreOutput | Out-File -LiteralPath 'qa\unity-core-tests.txt' -Encoding utf8;$coreOutput
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  & $coreCompiler /nologo /utf8output /langversion:5 /target:exe /out:qa\UnityCombatTests.exe $coreSources 'Unity\Tests\CombatPlaythrough.cs'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  $combatOutput=& '.\qa\UnityCombatTests.exe';$combatOutput | Out-File -LiteralPath 'qa\unity-combat-tests.txt' -Encoding utf8;$combatOutput
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  & $coreCompiler /nologo /utf8output /langversion:5 /target:exe /out:qa\UnityElementalTests.exe $coreSources 'Unity\Tests\ElementalTests.cs'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  $elementalOutput=& '.\qa\UnityElementalTests.exe';$elementalOutput | Out-File -LiteralPath 'qa\unity-elemental-tests.txt' -Encoding utf8;$elementalOutput
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  & $coreCompiler /nologo /utf8output /langversion:5 /target:exe /out:qa\UnityWorldTests.exe $coreSources 'Unity\Tests\WorldDestructionTests.cs'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  $worldOutput=& '.\qa\UnityWorldTests.exe';$worldOutput | Out-File -LiteralPath 'qa\unity-world-tests.txt' -Encoding utf8;$worldOutput
  exit $LASTEXITCODE
} finally { Pop-Location }
