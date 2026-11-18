$ErrorActionPreference='Stop'
$OutputEncoding=[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding($false)
$gameRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$coreCompiler='C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if(-not(Test-Path -LiteralPath $coreCompiler)){throw 'Can .NET Framework C# compiler hoac Unity Editor de chay kiem tra loi.'}
Push-Location -LiteralPath $gameRoot
try {
  New-Item -ItemType Directory -Path 'qa' -Force | Out-Null
  $coreSources=@('Unity\Assets\Scripts\Core\QuynhKunCombat.cs','Unity\Assets\Scripts\Core\Ait01Combat.cs','Unity\Assets\Scripts\Core\Definitions.cs','Unity\Assets\Scripts\Core\Simulation.cs','Unity\Assets\Scripts\Core\CatalogData.cs','Unity\Assets\Scripts\Core\ElementalCombat.cs','Unity\Assets\Scripts\Core\ShadowCombat.cs','Unity\Assets\Scripts\Core\UltimateCombat.cs','Unity\Assets\Scripts\Core\RpgSystems.cs','Unity\Assets\Scripts\Core\RpgCatalog.cs')
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
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  & $coreCompiler /nologo /utf8output /langversion:5 /target:exe /out:qa\UnityShadowTests.exe $coreSources 'Unity\Tests\ShadowTests.cs'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  $shadowOutput=& '.\qa\UnityShadowTests.exe';$shadowOutput | Out-File -LiteralPath 'qa\unity-shadow-tests.txt' -Encoding utf8;$shadowOutput
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  & $coreCompiler /nologo /utf8output /langversion:5 /target:exe /out:qa\UnityUltimateTests.exe $coreSources 'Unity\Tests\UltimateTests.cs'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  $ultimateOutput=& '.\qa\UnityUltimateTests.exe';$ultimateOutput | Out-File -LiteralPath 'qa\unity-ultimate-tests.txt' -Encoding utf8;$ultimateOutput
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  & $coreCompiler /nologo /utf8output /langversion:5 /target:exe /out:qa\UnityRpgTests.exe $coreSources 'Unity\Tests\RpgTests.cs'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  $rpgOutput=& '.\qa\UnityRpgTests.exe';$rpgOutput | Out-File -LiteralPath 'qa\unity-rpg-tests.txt' -Encoding utf8;$rpgOutput
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  & $coreCompiler /nologo /utf8output /langversion:5 /target:exe /out:qa\UnityQuynhKunTests.exe $coreSources 'Unity\Tests\QuynhKunTests.cs'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  $quynhOutput=& '.\qa\UnityQuynhKunTests.exe';$quynhOutput | Out-File -LiteralPath 'qa\v100\unity-quynhkun-tests.txt' -Encoding utf8;$quynhOutput
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  & $coreCompiler /nologo /utf8output /langversion:5 /target:exe /out:qa\UnityAit01Tests.exe $coreSources 'Unity\Tests\Ait01Tests.cs'
  if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
  $aitOutput=& '.\qa\UnityAit01Tests.exe';$aitOutput | Out-File -LiteralPath 'qa\v100\unity-ait01-tests.txt' -Encoding utf8;$aitOutput
  exit $LASTEXITCODE
} finally { Pop-Location }
