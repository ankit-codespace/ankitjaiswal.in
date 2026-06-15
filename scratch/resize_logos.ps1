Add-Type -AssemblyName System.Drawing

function Resize-Image {
    param (
        [string]$sourcePath,
        [string]$destPath,
        [int]$width,
        [int]$height
    )
    $srcImage = [System.Drawing.Image]::FromFile($sourcePath)
    $destBitmap = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($destBitmap)
    
    # Configure high quality resizing
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    
    # Draw original image scaled to new dimensions
    $g.DrawImage($srcImage, 0, 0, $width, $height)
    
    $destBitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $g.Dispose()
    $destBitmap.Dispose()
    $srcImage.Dispose()
}

$source = "store-assets/ilovenotepad_logo_premium.png"
$buildDir = "notepad-win/build/appx"

if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir -Force
}

Resize-Image -sourcePath $source -destPath "$buildDir/StoreLogo.png" -width 50 -height 50
Resize-Image -sourcePath $source -destPath "$buildDir/Square150x150Logo.png" -width 150 -height 150
Resize-Image -sourcePath $source -destPath "$buildDir/Square44x44Logo.png" -width 44 -height 44
Resize-Image -sourcePath $source -destPath "$buildDir/Wide310x150Logo.png" -width 310 -height 150

Write-Output "Successfully generated all 4 required AppX logo assets."
