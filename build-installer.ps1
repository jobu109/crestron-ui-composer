param([string]$Version = "1.0.0")
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$version = $Version
$publish = Join-Path $root "dist\win-x64"
$installerOutput = Join-Path $root "dist\installer"
$wix = Join-Path $root ".tools\wix.exe"

Stop-Process -Name CrestronUiComposer -Force -ErrorAction SilentlyContinue
& (Join-Path $root "build-desktop.ps1")
if ($LASTEXITCODE -ne 0) { throw "Desktop publish failed with exit code $LASTEXITCODE." }
if (-not (Test-Path $wix)) {
  dotnet tool install --tool-path (Join-Path $root ".tools") wix --version 5.0.2
}
New-Item -ItemType Directory -Force -Path $installerOutput | Out-Null
& $wix build `
  (Join-Path $root "installer\Package.wxs") `
  -arch x64 `
  -d "AppVersion=$version" `
  -d "ProductName=Crestron UI Composer" `
  -d "UpgradeCode=A7090F35-A6F2-47ED-A9F2-D0A839D49788" `
  -d "InstallFolderName=Crestron UI Composer" `
  -d "RegistryKey=Software\CrestronUiComposer" `
  -d "FileAssociationRoot=Software\Classes" `
  -d "PublishDir=$publish" `
  -d "IconPath=$root\CrestronUiComposer\Assets\CrestronUIEditor.ico" `
  -intermediatefolder (Join-Path $root "installer\obj") `
  -out (Join-Path $installerOutput "CrestronUiComposer-$version-win-x64.msi")

Compress-Archive -Path (Join-Path $publish "*") -DestinationPath (Join-Path $installerOutput "CrestronUiComposer-$version-portable.zip") -Force
Write-Host "Installer and portable package created in $installerOutput"
