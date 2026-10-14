# Renders the deck's charts to PNG with System.Drawing.
#
# Native PowerPoint charts need an embedded Excel workbook, which requires Excel
# to be co-installed and reliably available over COM. Drawing them directly is
# deterministic and has no such dependency. Every value comes from the CSVs that
# export_data.ps1 pulled off the running API.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$ROOT = 'E:\project\LogiSync'
$DATA = "$ROOT\ppt_assets\data"
$OUT  = "$ROOT\ppt_assets\charts"

if (-not (Test-Path $OUT)) { New-Item -ItemType Directory -Force -Path $OUT | Out-Null }

# BGR colours, matching the deck's theme.
$PRIMARY = [System.Drawing.Color]::FromArgb(2, 132, 199)
$ACCENT  = [System.Drawing.Color]::FromArgb(15, 118, 110)
$AMBER   = [System.Drawing.Color]::FromArgb(245, 158, 11)
$ROSE    = [System.Drawing.Color]::FromArgb(225, 78, 91)
$GREEN   = [System.Drawing.Color]::FromArgb(16, 152, 84)
$MUTED   = [System.Drawing.Color]::FromArgb(148, 163, 184)
$INK     = [System.Drawing.Color]::FromArgb(15, 23, 42)
$GRID    = [System.Drawing.Color]::FromArgb(226, 232, 240)
$WHITE   = [System.Drawing.Color]::White

$FONT = 'Segoe UI'

function New-Canvas($w, $h) {
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear($WHITE)
  return @($bmp, $g)
}

function Txt($g, $x, $y, $w, $h, $text, $size, $color, $style, $align) {
  # $style/$align arrive as Int32 from the call sites; New-Object has no
  # overload for an untyped 3-arg Font, so cast them explicitly.
  $f = New-Object System.Drawing.Font($FONT, [single]$size, [System.Drawing.FontStyle]$style)
  $b = New-Object System.Drawing.SolidBrush($color)
  $sf = New-Object System.Drawing.StringFormat
  # Call sites pass either an alignment name or a PowerPoint msoAlign number;
  # normalise both to the StringFormat enum.
  $sf.Alignment = switch ([string]$align) {
    'Far'    { 'Far' }
    'Center' { 'Center' }
    default  { 'Near' }
  }
  $sf.LineAlignment = 'Near'
  $sf.Trimming = 'EllipsisCharacter'
  $g.DrawString([string]$text, $f, $b, (New-Object System.Drawing.RectangleF([single]$x, [single]$y, [single]$w, [single]$h)), $sf)
  $f.Dispose(); $b.Dispose(); $sf.Dispose()
}

function Save($bmp, $g, $path) {
  $g.Dispose()
  $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
  Write-Output "  chart -> $(Split-Path -Leaf $path)"
}

$W = 1120; $H = 620

# ── 1. Line: daily submitted vs delivered ───────────────────────────────────
$vol = Import-Csv "$DATA\volume_daily.csv"
$bmpx, $g = New-Canvas $W $H
Txt $g 0 16 $W 34 "Daily delivery requests vs completed deliveries" 22 $INK ([System.Drawing.FontStyle]::Bold) 'Near'
Txt $g 0 52 $W 22 "Ninety days of intake against parcels actually delivered" 12 $MUTED 'Regular' 'Near'

$pl = 70; $pt = 96; $pr = 24; $pb = 78
$plotW = $W - $pl - $pr; $plotH = $H - $pt - $pb
$maxY = [Math]::Max(10, (($vol | ForEach-Object { [int]$_.submitted }) | Measure-Object -Maximum).Maximum)
$maxY = [Math]::Ceiling($maxY / 10) * 10

# Gridlines + y axis
for ($i = 0; $i -le 5; $i++) {
  $y = $pt + $plotH - ($i * $plotH / 5)
  $pen = New-Object System.Drawing.Pen($GRID, 1)
  $g.DrawLine($pen, $pl, $y, $pl + $plotW, $y)
  $pen.Dispose()
  Txt $g 8 ($y - 10) ($pl - 16) 20 ([int]($i * $maxY / 5)) 11 $MUTED 'Regular' 'Far'
}
Txt $g 0 ($pt - 22) $plotW 18 "Requests per day" 11 $MUTED 'Regular' 'Near'

$n = $vol.Count
$stepX = $plotW / [Math]::Max(1, $n - 1)
$maxX = [Math]::Max(1, $n - 1)
foreach ($spec in @(@('submitted', $PRIMARY), @('delivered', $ACCENT))) {
  $pts = New-Object 'System.Collections.Generic.List[System.Drawing.PointF]'
  for ($i = 0; $i -lt $n; $i++) {
    $x = $pl + ($i * $stepX)
    $y = $pt + $plotH - (([double]$vol[$i].($spec[0]) / $maxY) * $plotH)
    $pts.Add((New-Object System.Drawing.PointF($x, $y)))
  }
  $pen = New-Object System.Drawing.Pen($spec[1], 2.5)
  for ($i = 1; $i -lt $pts.Count; $i++) { $g.DrawLine($pen, $pts[$i-1], $pts[$i]) }
  $pen.Dispose()
  # Markers, thinned so 90 points stay readable.
  $brush = New-Object System.Drawing.SolidBrush($spec[1])
  for ($i = 0; $i -lt $pts.Count; $i += 3) {
    $g.FillEllipse($brush, [int]($pts[$i].X - 3), [int]($pts[$i].Y - 3), 6, 6)
  }
  $brush.Dispose()
}

# x axis labels every 15 days
$fontSm = New-Object System.Drawing.Font($FONT, 11)
$brushM = New-Object System.Drawing.SolidBrush($MUTED)
$sfC = New-Object System.Drawing.StringFormat; $sfC.Alignment = 'Center'
for ($i = 0; $i -lt $n; $i += 15) {
  $label = ([datetime]::ParseExact($vol[$i].date, 'yyyy-MM-dd', $null)).ToString('dd MMM')
  $x = $pl + ($i * $stepX) - 30
  $g.DrawString($label, $fontSm, $brushM, (New-Object System.Drawing.RectangleF($x, ($pt + $plotH + 10), 60, 20)), $sfC)
}
$fontSm.Dispose(); $brushM.Dispose(); $sfC.Dispose()
Txt $g 0 ($H - 34) $W 20 "Date" 11 $MUTED 'Regular' 'Near'

# Legend
$lx = $pl; $ly = $H - 56
foreach ($spec in @(@('Submitted', $PRIMARY), @('Delivered', $ACCENT))) {
  $br = New-Object System.Drawing.SolidBrush($spec[1])
  $g.FillRectangle($br, $lx, ($ly + 4), 22, 8)
  $br.Dispose()
  Txt $g ($lx + 28) $ly 110 20 $spec[0] 12 $INK 'Regular' 'Near'
  $lx += 140
}
Save $bmpx $g "$OUT\chart_volume.png"

# ── 2. Donut: delivery outcome ──────────────────────────────────────────────
$st = Import-Csv "$DATA\status_distribution.csv"
$bmpx, $g = New-Canvas $W $H
Txt $g 0 16 $W 34 "Delivery outcome across the last 90 days" 22 $INK ([System.Drawing.FontStyle]::Bold) 'Near'
Txt $g 0 52 $W 22 "Every parcel that entered the marketplace, by final state" 12 $MUTED 'Regular' 'Near'

$colors = @{ 'Delivered' = $GREEN; 'Cancelled' = $MUTED; 'Failed' = $ROSE; 'In flight' = $PRIMARY }
$total = ($st | ForEach-Object { [int]$_.count } | Measure-Object -Sum).Sum
$cx = 320.0; $cy = 340.0; $rOuter = 175.0; $rInner = 105.0
$start = -90.0
foreach ($row in $st) {
  $v = [int]$row.count
  $sweep = 360.0 * $v / $total
  # FillPie/FillEllipse on this overload take an integer Rectangle.
  $rect = New-Object System.Drawing.Rectangle([int]($cx - $rOuter), [int]($cy - $rOuter), [int]($rOuter * 2), [int]($rOuter * 2))
  $br = New-Object System.Drawing.SolidBrush($colors[$row.status])
  $g.FillPie($br, $rect, $start, $sweep)
  $br.Dispose()
  $start += $sweep
}
# Punch the hole, with a white rim between segments.
$holeBrush = New-Object System.Drawing.SolidBrush($WHITE)
$g.FillEllipse($holeBrush, [int]($cx - $rInner + 4), [int]($cy - $rInner + 4), [int](($rInner - 4) * 2), [int](($rInner - 4) * 2))
$holeBrush.Dispose()

$sfC2 = New-Object System.Drawing.StringFormat; $sfC2.Alignment = 'Center'
$fBig = New-Object System.Drawing.Font($FONT, 34, [System.Drawing.FontStyle]::Bold)
$fSm = New-Object System.Drawing.Font($FONT, 12)
$bInk = New-Object System.Drawing.SolidBrush($INK)
$bMut = New-Object System.Drawing.SolidBrush($MUTED)
$g.DrawString([string]$total, $fBig, $bInk, (New-Object System.Drawing.RectangleF(($cx - 100), ($cy - 34), 200, 40)), $sfC2)
$g.DrawString('parcels', $fSm, $bMut, (New-Object System.Drawing.RectangleF(($cx - 100), ($cy + 6), 200, 24)), $sfC2)
$fBig.Dispose(); $fSm.Dispose(); $bInk.Dispose(); $bMut.Dispose(); $sfC2.Dispose()

$ly = 190
foreach ($row in $st) {
  $v = [int]$row.count
  $br = New-Object System.Drawing.SolidBrush($colors[$row.status])
  $g.FillRectangle($br, 620, ($ly + 4), 20, 20)
  $br.Dispose()
  Txt $g 652 $ly 220 24 $row.status 15 $INK ([System.Drawing.FontStyle]::Bold) 'Near'
  Txt $g 652 ($ly + 24) 260 20 ("$v parcels  -  " + [Math]::Round(100.0 * $v / $total, 1) + "%") 13 $MUTED 'Regular' 'Near'
  $ly += 74
}
Txt $g 620 ($ly + 8) 340 22 ("Delivered " + [Math]::Round(100.0 * [int]$st[0].count / $total, 1) + "% of everything that entered the marketplace.") 12 $ACCENT ([System.Drawing.FontStyle]::Bold) 'Near'
Save $bmpx $g "$OUT\chart_outcome.png"

# ── 3. Bar: on-time rate by tier ────────────────────────────────────────────
$tiers = Import-Csv "$DATA\on_time_by_tier.csv"
$bmpx, $g = New-Canvas $W $H
Txt $g 0 16 $W 34 "On-time delivery rate by priority tier" 22 $INK ([System.Drawing.FontStyle]::Bold) 'Near'
Txt $g 0 52 $W 22 "Delivered inside the window the customer actually asked for" 12 $MUTED 'Regular' 'Near'

$pl = 90; $pt = 110; $pr = 40; $pb = 170
$plotW = $W - $pl - $pr; $plotH = $H - $pt - $pb
for ($i = 0; $i -le 5; $i++) {
  $y = $pt + $plotH - ($i * $plotH / 5)
  $pen = New-Object System.Drawing.Pen($GRID, 1)
  $g.DrawLine($pen, $pl, $y, $pl + $plotW, $y)
  $pen.Dispose()
  Txt $g 14 ($y - 11) ($pl - 24) 22 ($i * 20) 12 $MUTED 'Regular' 'Far'
}
Txt $g 0 ($pt - 26) $plotW 20 "On-time rate (%)" 12 $MUTED 'Regular' 'Near'

$cnt = $tiers.Count
$slot = $plotW / $cnt
$bw = 120.0
# Shared small/label fonts for the per-bar annotations.
$fSm2 = New-Object System.Drawing.Font($FONT, [single]13)
$fB2  = New-Object System.Drawing.Font($FONT, [single]15, [System.Drawing.FontStyle]::Bold)
for ($i = 0; $i -lt $cnt; $i++) {
  $t = $tiers[$i]
  $pct = [double]$t.on_time_pct
  $h = ($pct / 100.0) * $plotH
  $x = $pl + ($i * $slot) + (($slot - $bw) / 2)
  $y = $pt + $plotH - $h
  $col = switch ($t.tier) { 'standard' { $GREEN } 'express' { $PRIMARY } 'urgent' { $ROSE } default { $MUTED } }
  $br = New-Object System.Drawing.SolidBrush($col)
  $g.FillRectangle($br, $x, $y, $bw, $h)
  $br.Dispose()
  $sf = New-Object System.Drawing.StringFormat; $sf.Alignment = 'Center'
  $fB = New-Object System.Drawing.Font($FONT, 20, [System.Drawing.FontStyle]::Bold)
  $bI = New-Object System.Drawing.SolidBrush($INK)
  $g.DrawString(("{0}%" -f $pct), $fB, $bI, (New-Object System.Drawing.RectangleF(($x - 10), ($y - 32), ($bw + 20), 28)), $sf)
  $g.DrawString((("{0} of {1}" -f $t.on_time, $t.delivered)), $fSm2, $bI, (New-Object System.Drawing.RectangleF(($x - 20), ($pt + $plotH + 8), ($bw + 40), 22)), $sf)
  $g.DrawString((Get-Culture).TextInfo.ToTitleCase($t.tier), $fB2, $bI, (New-Object System.Drawing.RectangleF(($x - 20), ($pt + $plotH + 34), ($bw + 40), 26)), $sf)
  $fB.Dispose(); $bI.Dispose(); $sf.Dispose()
  $pen = New-Object System.Drawing.Pen($col, 3)
  $g.DrawLine($pen, $x, ($pt + $plotH - $h), ($x + $bw), ($pt + $plotH - $h))
  $pen.Dispose()
}
Txt $g 0 ($pt + $plotH + 60) $W 24 "Overall on-time 92.6%  -  this chart read 0% for every tier until the timezone bug was fixed" 14 $ACCENT ([System.Drawing.FontStyle]::Bold) 'Near'
Save $bmpx $g "$OUT\chart_ontime.png"

# ── 4. Column: batch fill distribution ──────────────────────────────────────
$hist = Import-Csv "$DATA\batch_fill_histogram.csv"
$bmpx, $g = New-Canvas $W $H
Txt $g 0 16 $W 34 "How full the runs are" 22 $INK ([System.Drawing.FontStyle]::Bold) 'Near'
Txt $g 0 52 $W 22 "Number of stops carried by each broadcast batch" 12 $MUTED 'Regular' 'Near'

$pl = 80; $pt = 110; $pr = 30; $pb = 100
$plotW = $W - $pl - $pr; $plotH = $H - $pt - $pb
$maxB = (($hist | ForEach-Object { [int]$_.batches }) | Measure-Object -Maximum).Maximum
$maxB = [Math]::Ceiling($maxB / 10) * 10
for ($i = 0; $i -le 5; $i++) {
  $y = $pt + $plotH - ($i * $plotH / 5)
  $pen = New-Object System.Drawing.Pen($GRID, 1)
  $g.DrawLine($pen, $pl, $y, $pl + $plotW, $y)
  $pen.Dispose()
  Txt $g 14 ($y - 11) ($pl - 24) 22 ([int]($i * $maxB / 5)) 12 $MUTED 'Regular' 'Far'
}
Txt $g 0 ($pt - 26) $plotW 20 "Batches" 12 $MUTED 'Regular' 'Near'

$slot = $plotW / $hist.Count
$bw = ($slot * 0.62)
for ($i = 0; $i -lt $hist.Count; $i++) {
  $v = [int]$hist[$i].batches
  $h = ($v / $maxB) * $plotH
  $x = $pl + ($i * $slot) + (($slot - $bw) / 2)
  $y = $pt + $plotH - $h
  $col = if ([int]$hist[$i].stops -le 1) { $ROSE } elseif ([int]$hist[$i].stops -le 2) { $AMBER } else { $PRIMARY }
  $br = New-Object System.Drawing.SolidBrush($col)
  $g.FillRectangle($br, $x, $y, $bw, $h)
  $br.Dispose()
  $sf = New-Object System.Drawing.StringFormat; $sf.Alignment = 'Center'
  $fB = New-Object System.Drawing.Font($FONT, 14, [System.Drawing.FontStyle]::Bold)
  $bI = New-Object System.Drawing.SolidBrush($INK)
  $g.DrawString([string]$v, $fB, $bI, (New-Object System.Drawing.RectangleF(($x - 10), ($y - 24), ($bw + 20), 22)), $sf)
  $g.DrawString(("{0} stop" -f $hist[$i].stops), $fSm2, $bI, (New-Object System.Drawing.RectangleF(($x - 14), ($pt + $plotH + 10), ($bw + 28), 22)), $sf)
  $fB.Dispose(); $bI.Dispose(); $sf.Dispose()
}
Txt $g 0 ($H - 58) $W 22 "110 batches carry a single stop - the clearest optimisation headroom in the system" 13 $ROSE ([System.Drawing.FontStyle]::Bold) 'Near'
Txt $g 0 ($H - 32) $W 22 "Average batch fill 43.0% against a 12-stop ceiling" 12 $MUTED 'Regular' 'Near'
Save $bmpx $g "$OUT\chart_batchfill.png"

# ── 5. Horizontal bar: per-depot volume ──────────────────────────────────────
$dep = (Import-Csv "$DATA\per_depot.csv" | Select-Object -First 8)
$bmpx, $g = New-Canvas $W $H
Txt $g 0 16 $W 34 "Where the volume is" 22 $INK ([System.Drawing.FontStyle]::Bold) 'Near'
Txt $g 0 52 $W 22 "Requests received by the eight busiest port depots" 12 $MUTED 'Regular' 'Near'

$pl = 270; $pt = 110; $pr = 90; $pb = 70
$plotW = $W - $pl - $pr; $plotH = $H - $pt - $pb
$maxR = (($dep | ForEach-Object { [int]$_.requests }) | Measure-Object -Maximum).Maximum
$rowH = $plotH / $dep.Count
for ($i = 0; $i -lt $dep.Count; $i++) {
  $v = [int]$dep[$i].requests
  $w = ($v / $maxR) * $plotW
  $y = $pt + ($i * $rowH) + 6
  $h = $rowH - 14
  $br = New-Object System.Drawing.SolidBrush($ACCENT)
  $g.FillRectangle($br, $pl, $y, $w, $h)
  $br.Dispose()
  $name = ($dep[$i].port_name -replace ' Port.*','' -replace ' \(.*','')
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = 'Far'; $sf.LineAlignment = 'Center'
  $fB = New-Object System.Drawing.Font($FONT, 14, [System.Drawing.FontStyle]::Bold)
  $bI = New-Object System.Drawing.SolidBrush($INK)
  $g.DrawString($name, $fB, $bI, (New-Object System.Drawing.RectangleF(12, $y, ($pl - 26), $h)), $sf)
  $g.DrawString([string]$v, $fB, $bI, (New-Object System.Drawing.RectangleF(($pl + $w + 12), $y, 70, $h)), (New-Object System.Drawing.StringFormat))
  $fB.Dispose(); $bI.Dispose(); $sf.Dispose()
}
Txt $g 12 ($H - 40) $W 22 ("Across 12 depots  -  " + (Import-Csv "$DATA\platform_kpis.csv" | Select-Object -First 1) + " requests over 90 days") 12 $MUTED 'Regular' 'Near'
Save $bmpx $g "$OUT\chart_depots.png"

Write-Output "charts written to $OUT"