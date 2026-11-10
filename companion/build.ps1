$ErrorActionPreference = 'Stop'

$project = Join-Path $PSScriptRoot 'AlgoTimer.Companion.csproj'
$output = Join-Path $PSScriptRoot 'dist'

dotnet publish $project `
  --configuration Release `
  --runtime win-x64 `
  --self-contained true `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  --output $output

if ($LASTEXITCODE -ne 0) {
  throw "Companion publish failed with exit code $LASTEXITCODE."
}

Write-Host "Built Windows companion at $(Join-Path $output 'AlgoTimer.Companion.exe')"
