# Returns the IPv4 address of the network adapter that has the default gateway
# (i.e. the one actually connected to the LAN/internet — skips virtual adapters
# like WSL, Hyper-V, VirtualBox, Docker that don't have a default gateway).
$result = Get-NetIPConfiguration |
  Where-Object { $_.IPv4DefaultGateway -ne $null -and $_.NetAdapter.Status -eq 'Up' } |
  Select-Object -First 1

if ($result -and $result.IPv4Address) {
  Write-Output $result.IPv4Address.IPAddress
}
