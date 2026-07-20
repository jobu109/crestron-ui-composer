param(
  [string]$OldVersion = "0.9.0",
  [string]$NewVersion = "1.0.0"
)
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$wix = Join-Path $root ".tools\wix.exe"
$sourcePublish = Join-Path $root "dist\win-x64"
$work = Join-Path $env:TEMP ("CrestronUiComposer-UpgradeTest-" + [guid]::NewGuid().ToString("N"))
$oldPublish = Join-Path $work "old"
$newPublish = Join-Path $work "new"
$oldMsi = Join-Path $work "old.msi"
$newMsi = Join-Path $work "new.msi"
$installFolderName = "Crestron UI Composer Upgrade Test"
$installFolder = Join-Path $env:LOCALAPPDATA $installFolderName
$testUpgradeCode = "F87E4ADB-F5DE-4E13-989C-279265B76E08"
$userDataFolder = Join-Path $env:LOCALAPPDATA "CrestronUiComposer"
$userMarker = Join-Path $userDataFolder ("installer-upgrade-test-" + [guid]::NewGuid().ToString("N") + ".json")

function Build-TestMsi([string]$publish, [string]$version, [string]$output) {
  & $wix build (Join-Path $root "installer\Package.wxs") -arch x64 `
    -d "AppVersion=$version" `
    -d "ProductName=Crestron UI Composer Upgrade Test" `
    -d "UpgradeCode=$testUpgradeCode" `
    -d "InstallFolderName=$installFolderName" `
    -d "RegistryKey=Software\CrestronUiComposer\UpgradeTest" `
    -d "FileAssociationRoot=Software\CrestronUiComposer\UpgradeTest\Classes" `
    -d "PublishDir=$publish" `
    -d "IconPath=$root\CrestronUiComposer\Assets\CrestronUIEditor.ico" `
    -intermediatefolder (Join-Path $work ("obj-" + $version)) -out $output
  if ($LASTEXITCODE -ne 0) { throw "WiX failed while building test MSI $version." }
}

function Invoke-Msi([string]$arguments) {
  $process = Start-Process msiexec.exe -ArgumentList $arguments -PassThru -WindowStyle Hidden
  if (-not $process.WaitForExit(60000)) {
    try { $process.Kill($true) } catch {}
    throw "msiexec timed out after 60 seconds: $arguments"
  }
  if ($process.ExitCode -notin 0, 1641, 3010) { throw "msiexec failed with exit code $($process.ExitCode): $arguments" }
}

try {
  if (-not (Test-Path $wix)) { throw "WiX was not found. Run build-installer.ps1 first." }
  if (-not (Test-Path (Join-Path $sourcePublish "CrestronUiComposer.exe"))) { throw "Desktop publish was not found. Run build-desktop.ps1 first." }
  New-Item -ItemType Directory -Force -Path $oldPublish, $newPublish, $userDataFolder | Out-Null
  # Installer upgrade semantics do not require compressing the entire 50+ MB
  # publish twice. Use representative application and web payload files.
  Set-Content (Join-Path $oldPublish "CrestronUiComposer.exe") "test executable $OldVersion"
  Set-Content (Join-Path $newPublish "CrestronUiComposer.exe") "test executable $NewVersion"
  New-Item -ItemType Directory -Force -Path (Join-Path $oldPublish "Web"), (Join-Path $newPublish "Web") | Out-Null
  Copy-Item (Join-Path $sourcePublish "Web\editor.html") (Join-Path $oldPublish "Web\editor.html") -Force
  Copy-Item (Join-Path $sourcePublish "Web\editor.html") (Join-Path $newPublish "Web\editor.html") -Force
  Set-Content (Join-Path $oldPublish "upgrade-test-version.txt") "old-$OldVersion"
  Set-Content (Join-Path $newPublish "upgrade-test-version.txt") "new-$NewVersion"
  Build-TestMsi $oldPublish $OldVersion $oldMsi
  Build-TestMsi $newPublish $NewVersion $newMsi

  Invoke-Msi "/i `"$oldMsi`" /qn /norestart"
  if ((Get-Content (Join-Path $installFolder "upgrade-test-version.txt") -Raw).Trim() -ne "old-$OldVersion") { throw "The baseline MSI did not install the expected files." }
  Set-Content $userMarker '{"preserve":true}'

  Invoke-Msi "/i `"$newMsi`" /qn /norestart"
  if ((Get-Content (Join-Path $installFolder "upgrade-test-version.txt") -Raw).Trim() -ne "new-$NewVersion") { throw "The upgrade did not replace the installed files." }
  if (-not (Test-Path $userMarker)) { throw "The upgrade removed application user data." }
  if (-not (Test-Path (Join-Path $installFolder "CrestronUiComposer.exe"))) { throw "The upgraded application executable is missing." }

  Invoke-Msi "/x `"$newMsi`" /qn /norestart"
  if (Test-Path (Join-Path $installFolder "CrestronUiComposer.exe")) { throw "The test installation did not uninstall cleanly." }
  if (-not (Test-Path $userMarker)) { throw "Uninstall removed application user data." }
  Write-Host "PASS installer upgrade $OldVersion -> $NewVersion; application files upgraded and user data preserved."
}
finally {
  if (Test-Path $userMarker) { Remove-Item -LiteralPath $userMarker -Force }
  if (Test-Path $newMsi) {
    $cleanup = Start-Process msiexec.exe -ArgumentList "/x `"$newMsi`" /qn /norestart" -PassThru -WindowStyle Hidden
    [void]$cleanup.WaitForExit(60000)
  }
  if (Test-Path $work) { Remove-Item -LiteralPath $work -Recurse -Force }
}
