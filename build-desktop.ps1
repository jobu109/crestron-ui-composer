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

$requiredFiles = @(
  (Join-Path $output "CrestronUiComposer.exe"),
  (Join-Path $output "Web\editor.html"),
  (Join-Path $output "Web\editor.js"),
  (Join-Path $output "Web\components.manifest.json"),
  (Join-Path $output "Packaging\cr-com-lib.js"),
  (Join-Path $output "Packaging\ch5-webxpanel.js")
)
$missingFiles = @($requiredFiles | Where-Object { -not (Test-Path -LiteralPath $_) })
if ($missingFiles.Count) {
  throw "Desktop publish is incomplete. Missing required application files:`n$($missingFiles -join "`n")"
}

Write-Host "Desktop application published to $output"
