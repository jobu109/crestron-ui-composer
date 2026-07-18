$ErrorActionPreference = "Stop"
$project = Join-Path $PSScriptRoot "CrestronUiComposer\CrestronUiComposer.csproj"
$output = Join-Path $PSScriptRoot "dist\win-x64"

dotnet publish $project `
  --configuration Release `
  --runtime win-x64 `
  --self-contained true `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  --output $output
if ($LASTEXITCODE -ne 0) { throw "dotnet publish failed with exit code $LASTEXITCODE." }

Write-Host "Desktop application published to $output"
