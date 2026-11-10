$ErrorActionPreference = 'Stop'

$registryPath = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.algotimer.companion'
if (Test-Path -LiteralPath $registryPath) {
  $confirmation = Read-Host 'Remove the AlgoTimer native messaging registration for this Windows user? (y/N)'
  if ($confirmation -notmatch '^(y|yes)$') {
    Write-Host 'No changes made.'
    exit 0
  }

  $manifestPath = (Get-Item -LiteralPath $registryPath).GetValue('')
  Remove-Item -LiteralPath $registryPath -Recurse -Force
  Write-Host 'AlgoTimer companion registration removed.'

  $allowedManifestPaths = @(
    (Join-Path $PSScriptRoot 'com.algotimer.companion.json'),
    (Join-Path (Join-Path $PSScriptRoot 'dist') 'com.algotimer.companion.json')
  ) | ForEach-Object { [System.IO.Path]::GetFullPath($_) }

  if ($manifestPath) {
    $manifestPath = [System.IO.Path]::GetFullPath([string]$manifestPath)
    if ($allowedManifestPaths -contains $manifestPath -and (Test-Path -LiteralPath $manifestPath)) {
      try {
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
        $expectedHostPath = [System.IO.Path]::GetFullPath(
          (Join-Path (Split-Path -Parent $manifestPath) 'AlgoTimer.Companion.exe')
        )
        $registeredHostPath = [System.IO.Path]::GetFullPath([string]$manifest.path)
        if ($manifest.name -eq 'com.algotimer.companion' -and $registeredHostPath -eq $expectedHostPath) {
          Remove-Item -LiteralPath $manifestPath -Force
          Write-Host 'Generated native-messaging manifest removed.'
        } else {
          Write-Warning 'Manifest was not removed because it does not match this package.'
        }
      } catch {
        Write-Warning "Manifest was not removed because it could not be verified: $($_.Exception.Message)"
      }
    } else {
      Write-Host 'Registered manifest was outside this package; it was left in place.'
    }
  }

  Write-Host 'The companion executable and package files were left in place.'
} else {
  Write-Host 'AlgoTimer companion registration was not found.'
}
