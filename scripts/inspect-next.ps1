$ErrorActionPreference = "SilentlyContinue"
$root = "C:\Users\Administrator\Desktop\my store\my-store\node_modules\next\dist"
$out = "$env:TEMP\nextfind.txt"
"=== files referencing workAsyncStorage ===" | Out-File -FilePath $out -Encoding utf8
Get-ChildItem $root -Recurse -Filter *.js |
  Select-String -Pattern "workAsyncStorage" -List |
  ForEach-Object { $_.Path } |
  Out-File -FilePath $out -Encoding utf8 -Append
"=== files mentioning conflicting public/page ===" | Out-File -FilePath $out -Encoding utf8 -Append
Get-ChildItem $root -Recurse -Filter *.js |
  Select-String -Pattern "Conflicting public|Conflicting paths|conflicting public" -List |
  ForEach-Object { $_.Path } |
  Out-File -FilePath $out -Encoding utf8 -Append
"=== done ===" | Out-File -FilePath $out -Encoding utf8 -Append
