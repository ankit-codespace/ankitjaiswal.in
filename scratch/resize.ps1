Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$InputPath,
        [string]$OutputPath,
        [int]$Width,
        [int]$Height
    )
    $src = [System.Drawing.Image]::FromFile($InputPath)
    $dest = New-Object System.Drawing.Bitmap($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    
    $g.DrawImage($src, 0, 0, $Width, $Height)
    
    $dest.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $dest.Dispose()
    $src.Dispose()
}

Resize-Image -InputPath "C:\Users\LENOVO-PC\Downloads\ilovenotepad_store_assets_backup\ilovenotepad_logo_premium.png" -OutputPath "c:\Users\LENOVO-PC\Documents\Ankit Jaiswal Portfolio\Ankit Jaiswal Portfolio\ankitjaiswal.in\artifacts\website\public\icons\icon-192.png" -Width 192 -Height 192
Resize-Image -InputPath "C:\Users\LENOVO-PC\Downloads\ilovenotepad_store_assets_backup\ilovenotepad_logo_premium.png" -OutputPath "c:\Users\LENOVO-PC\Documents\Ankit Jaiswal Portfolio\Ankit Jaiswal Portfolio\ankitjaiswal.in\artifacts\website\public\icons\icon-512.png" -Width 512 -Height 512
