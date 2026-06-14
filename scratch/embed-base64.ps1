$pngPath = "c:\Users\LENOVO-PC\Documents\Ankit Jaiswal Portfolio\Ankit Jaiswal Portfolio\ankitjaiswal.in\artifacts\website\public\icons\icon-192.png"
$svgPath = "c:\Users\LENOVO-PC\Documents\Ankit Jaiswal Portfolio\Ankit Jaiswal Portfolio\ankitjaiswal.in\artifacts\website\public\icons\notepad-favicon.svg"

if (Test-Path $pngPath) {
    $bytes = [System.IO.File]::ReadAllBytes($pngPath)
    $base64 = [Convert]::ToBase64String($bytes)
    
    $svgContent = @"
<svg viewBox="0 0 192 192" xmlns="http://www.w3.org/2000/svg">
  <image href="data:image/png;base64,$base64" x="0" y="0" width="192" height="192" />
</svg>
"@
    
    [System.IO.File]::WriteAllText($svgPath, $svgContent)
    Write-Host "Successfully embedded base64 in SVG!"
} else {
    Write-Error "Source PNG not found at $pngPath"
}
