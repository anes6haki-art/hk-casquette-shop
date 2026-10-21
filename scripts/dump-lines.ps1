param(
  [Parameter(Mandatory = $true)][string]$File,
  [Parameter(Mandatory = $true)][int]$Start,
  [Parameter(Mandatory = $true)][int]$End,
  [string]$Out = "$env:TEMP\dump.txt"
)
$lines = Get-Content -LiteralPath $File -Encoding UTF8
$slice = $lines[($Start - 1)..($End - 1)]
$numbered = for ($i = 0; $i -lt $slice.Count; $i++) {
  "{0,4} | {1}" -f ($Start + $i), $slice[$i]
}
$numbered | Out-File -FilePath $Out -Encoding utf8
Write-Output "wrote $Out"
