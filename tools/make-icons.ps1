# Draws the Water Game home-screen icons into ../icons.
# Run from anywhere:  powershell -ExecutionPolicy Bypass -File tools\make-icons.ps1
Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot '..\icons'
New-Item -ItemType Directory -Force $out | Out-Null

function C($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }

function RoundRect($x, $y, $w, $h, $r) {
  $p = New-Object System.Drawing.Drawing2D.GraphicsPath
  $d = $r * 2
  $p.AddArc($x, $y, $d, $d, 180, 90)
  $p.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
  $p.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
  $p.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
  $p.CloseFigure()
  return $p
}

# $size: output pixels. $k: how much of the canvas the artwork fills (maskable icons need a safe margin).
# $rounded: round the outer corners (plain icons) or fill edge to edge (maskable / Apple, which mask it themselves).
function Draw-Icon($size, $k, $rounded, $file) {
  $bmp = New-Object System.Drawing.Bitmap $size, $size
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::Transparent)
  $s = $size / 512.0

  # pink plastic shell
  $shellBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.PointF 0, 0), (New-Object System.Drawing.PointF 0, $size), (C '#ff6aa6'), (C '#b51a5b')
  if ($rounded) { $g.FillPath($shellBrush, (RoundRect 0 0 $size $size (110 * $s))) } else { $g.FillRectangle($shellBrush, 0, 0, $size, $size) }

  # artwork is laid out on a 512 grid, then scaled by $k around the centre
  $g.TranslateTransform($size / 2, $size / 2)
  $g.ScaleTransform($s * $k, $s * $k)
  $g.TranslateTransform(-256, -256)

  # water window
  $win = RoundRect 76 64 360 384 56
  $water = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.PointF 0, 64), (New-Object System.Drawing.PointF 0, 448), (C '#8be6f3'), (C '#1670ad')
  $g.FillPath($water, $win)
  $g.DrawPath((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(150, 255, 255, 255)), 10), $win)
  $g.SetClip($win)

  # sand floor
  $sand = New-Object System.Drawing.SolidBrush (C '#f2c66b')
  $g.FillPolygon($sand, [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF 76, 400), (New-Object System.Drawing.PointF 170, 438),
    (New-Object System.Drawing.PointF 256, 412), (New-Object System.Drawing.PointF 342, 438),
    (New-Object System.Drawing.PointF 436, 400), (New-Object System.Drawing.PointF 436, 460),
    (New-Object System.Drawing.PointF 76, 460)))

  # two pegs leaning out in a V, knobs facing the viewer
  $pegBrush = New-Object System.Drawing.SolidBrush (C '#fffaf0')
  foreach ($side in -1, 1) {
    $bx = 256 + $side * 12; $tx = 256 + $side * 92
    $g.FillPolygon($pegBrush, [System.Drawing.PointF[]]@(
      (New-Object System.Drawing.PointF ($bx - 5), 416), (New-Object System.Drawing.PointF ($tx - 13), 250),
      (New-Object System.Drawing.PointF ($tx + 13), 250), (New-Object System.Drawing.PointF ($bx + 5), 416)))
    $g.FillEllipse($pegBrush, $tx - 20, 230, 40, 38)
  }

  # rings: two stacked on each peg, one floating
  function Ring($cx, $cy, $rx, $ry, $hex, $dark) {
    $g.DrawEllipse((New-Object System.Drawing.Pen (C $dark), 20), $cx - $rx, $cy - $ry + 4, $rx * 2, $ry * 2)
    $g.DrawEllipse((New-Object System.Drawing.Pen (C $hex), 15), $cx - $rx, $cy - $ry, $rx * 2, $ry * 2)
    $g.DrawEllipse((New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(170, 255, 255, 255)), 4), $cx - $rx + 4, $cy - $ry - 3, $rx * 2 - 8, $ry * 2 - 8)
  }
  Ring 216 362 46 26 '#ffd23f' '#c79a00'
  Ring 205 330 46 26 '#ef3b3b' '#a51d1d'
  Ring 296 362 46 26 '#33c96a' '#1b8743'
  Ring 307 330 46 26 '#3b6ff0' '#1f43a8'
  $g.TranslateTransform(256, 150); $g.RotateTransform(-24)
  Ring 0 0 50 22 '#ff8a1f' '#c25800'
  $g.ResetTransform()

  $bmp.Save((Join-Path $out $file), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose(); $bmp.Dispose()
  Write-Output "wrote icons/$file"
}

Draw-Icon 192 1.0  $true  'icon-192.png'
Draw-Icon 512 1.0  $true  'icon-512.png'
Draw-Icon 512 0.78 $false 'icon-maskable-512.png'
Draw-Icon 180 0.92 $false 'apple-touch-icon.png'
Draw-Icon 32  1.0  $true  'favicon-32.png'
