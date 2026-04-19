# Returns "OK" if any MySQL service is running, otherwise empty.
# Used by scripts\server-init.bat.
$svc = Get-Service -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -like '*MySQL*' -or $_.DisplayName -like '*MySQL*' } |
  Where-Object { $_.Status -eq 'Running' } |
  Select-Object -First 1

if ($svc) { Write-Output "OK" }
