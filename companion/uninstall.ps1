$ErrorActionPreference = 'Stop'

$registryPath = 'HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.algotimer.companion'
if (Test-Path -LiteralPath $registryPath) {
  $confirmation = Read-Host 'Remove the AlgoTimer native messaging registration for this Windows user? (y/N)'
  if ($confirmation -notmatch '^(y|yes)$') {
    Write-Host 'No changes made.'
    exit 0
  }
  Remove-Item -LiteralPath $registryPath -Recurse -Force
  Write-Host 'AlgoTimer companion registration removed. The published files were left in place.'
} else {
  Write-Host 'AlgoTimer companion registration was not found.'
}
