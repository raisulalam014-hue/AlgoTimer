Add-Type -AssemblyName System.Drawing

$sizes = @(16, 32, 48, 128)
$destDir = "c:\Users\ACER\.antigravity-ide\problem-timer-extension\icons"

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

foreach ($s in $sizes) {
    $bmp = [System.Drawing.Bitmap]::new($s, $s)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # Background circle (Dark slate)
    $p1 = [System.Drawing.PointF]::new(0, 0)
    $p2 = [System.Drawing.PointF]::new($s, $s)
    $c1 = [System.Drawing.Color]::FromArgb(255, 15, 23, 42)
    $c2 = [System.Drawing.Color]::FromArgb(255, 30, 41, 59)
    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($p1, $p2, $c1, $c2)
    $pad = [float]($s * 0.05)
    $g.FillEllipse($bgBrush, $pad, $pad, [float]($s - 2 * $pad), [float]($s - 2 * $pad))

    # Outer neon ring (Electric Cyan)
    $ringThickness = [float][Math]::Max(1.5, $s * 0.08)
    $cyanPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 14, 165, 233), $ringThickness)
    $ringPad = [float]($s * 0.14)
    $g.DrawArc($cyanPen, $ringPad, $ringPad, [float]($s - 2 * $ringPad), [float]($s - 2 * $ringPad), -90.0, 290.0)

    # Top stopwatch crown
    $btnBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 56, 189, 248))
    $topW = [float][Math]::Max(2.0, $s * 0.22)
    $topH = [float][Math]::Max(2.0, $s * 0.10)
    $g.FillRectangle($btnBrush, [float](($s - $topW) / 2.0), [float]($s * 0.03), $topW, $topH)

    # Stopwatch clock hands (Rose / Pink)
    $handW = [float][Math]::Max(1.5, $s * 0.08)
    $handPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 244, 63, 94), $handW)
    $center = [float]($s / 2.0)
    $g.DrawLine($handPen, $center, $center, [float]($center + $s * 0.20), [float]($center - $s * 0.16))
    
    $secW = [float][Math]::Max(1.0, $s * 0.05)
    $secPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 255, 255, 255), $secW)
    $g.DrawLine($secPen, $center, $center, $center, [float]($center + $s * 0.24))

    # Center dot
    $dotBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 244, 63, 94))
    $dotR = [float][Math]::Max(2.0, $s * 0.12)
    $g.FillEllipse($dotBrush, [float]($center - $dotR / 2.0), [float]($center - $dotR / 2.0), $dotR, $dotR)

    $outPath = Join-Path $destDir "icon$s.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $cyanPen.Dispose()
    $handPen.Dispose()
    $secPen.Dispose()
    $bgBrush.Dispose()
    $btnBrush.Dispose()
    $dotBrush.Dispose()
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created icon: $outPath"
}
