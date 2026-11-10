$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
  throw 'The AlgoTimer companion installer supports Windows only.'
}

$extensionId = Read-Host 'Enter the AlgoTimer extension ID from chrome://extensions'
if ($extensionId -notmatch '^[a-p]{32}$') {
  throw 'The extension ID must be the 32-character ID shown by Chrome.'
}

$hostPath = Join-Path $PSScriptRoot 'AlgoTimer.Companion.exe'
if (-not (Test-Path -LiteralPath $hostPath)) {
  $hostPath = Join-Path (Join-Path $PSScriptRoot 'dist') 'AlgoTimer.Companion.exe'
}
if (-not (Test-Path -LiteralPath $hostPath)) {
  throw 'Companion executable not found. Extract the full package or run .\build.ps1 first.'
}

$hostPath = (Resolve-Path -LiteralPath $hostPath).Path
$manifestPath = Join-Path (Split-Path -Parent $hostPath) 'com.algotimer.companion.json'
$manifest = @{
  name = 'com.algotimer.companion'
  description = 'AlgoTimer Windows native companion'
  path = $hostPath
  type = 'stdio'
  allowed_origins = @("chrome-extension://$extensionId/")
} | ConvertTo-Json -Depth 4
[System.IO.File]::WriteAllText($manifestPath, $manifest, [System.Text.UTF8Encoding]::new($false))

$registryPath = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.algotimer.companion'
New-Item -Path $registryPath -Force | Out-Null
Set-Item -Path $registryPath -Value $manifestPath

Write-Host 'AlgoTimer companion registered for the current Windows user.'
Write-Host 'Reload AlgoTimer in chrome://extensions, then open its settings to confirm connection.'
