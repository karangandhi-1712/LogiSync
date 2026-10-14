# -- Analytics slides --------------------------------------------------------
# Charts are pre-rendered by render_charts.ps1 (System.Drawing) rather than
# native PowerPoint charts: a native chart needs an embedded Excel workbook
# co-installed with PowerPoint, which is not reliably present. The source values
# are the same CSVs either way.

function Chart-Slide($n, $chartPng, $title, $eyebrow, $caption, $notes) {
  $s = New-Slide $pres
  Add-Header $s $eyebrow $title
  Add-Picture $s "$ROOT\ppt_assets\charts\$chartPng" 56 138 588 332 | Out-Null
  Add-Rect $s 56 480 588 28 $WHITE $LINE $true | Out-Null
  Add-Text $s 68 487 566 16 $caption 9 $MUTED $false $null | Out-Null
  Add-Footer $s $n
  Set-Notes $s $notes
}

Chart-Slide $n 'chart_volume.png' 'Ninety days of delivery volume' 'Analytics 1 of 2' `
  'Daily intake against completed deliveries, 90 days' `
  "Ninety days of intake against completed deliveries. The shape is the point: steady weekday volume with a visibly lighter weekend, and the gap between the two lines is work still in flight. Four hundred and ninety submitted, three hundred and seventy-six delivered."

$n++
Chart-Slide $n 'chart_ontime.png' 'On-time rate, by priority tier' 'Analytics 2 of 2' `
  'This chart read 0% for every tier until the timezone bug was fixed' `
  "This is the chart we were asked about, so let us be blunt about it. It used to show zero percent for all three tiers. There were two causes and both were real. The window a customer picks is their local clock while every timestamp we stored was UTC, so an evening delivery was scored against the wrong hour. And the booking form defaulted to a ten-to-six window that had already closed for anyone ordering after six in the evening. Fixed, it reads ninety-two point six overall. Express sits below standard at eighty-nine versus ninety-four, which is honest and worth seeing."

$n++
$s = New-Slide $pres; $n++
Add-Header $s 'Analytics' 'Outcome and headroom'
Add-Picture $s "$ROOT\ppt_assets\charts\chart_outcome.png" 56 138 424 306 | Out-Null
Add-Picture $s "$ROOT\ppt_assets\charts\chart_batchfill.png" 496 138 408 306 | Out-Null
Add-Rect $s 56 456 848 42 $WHITE $LINE $true | Out-Null
Add-Text $s 72 467 816 22 "76.7% delivered   |   average batch fill 43.0%   |   110 batches carry a single stop - the clearest headroom in the system" 10 $INK $false 1 | Out-Null
Add-Footer $s $n
Set-Notes $s "Outcome on the left, headroom on the right. Roughly three quarters of everything that entered the marketplace was delivered. But the batch fill chart is the roadmap: a hundred and ten batches carry a single stop, each of which is a driver paid a full run for one parcel. We group by geography, so those are genuinely scattered stops, and a wider departure window would let several share a run. That is a configuration change, not a rewrite."

$n++
$s = New-Slide $pres; $n++
Add-Header $s 'Analytics' 'Where the volume is'
Add-Picture $s "$ROOT\ppt_assets\charts\chart_depots.png" 56 138 624 332 | Out-Null
Add-Rect $s 700 138 204 332 $WHITE $LINE $true | Out-Null
Add-Text $s 716 156 172 20 'TAKEAWAY' 9 $PRIMARY $true $null | Out-Null
Add-Bullets $s 716 182 172 260 @(
  "Volume is spread evenly`nacross 12 depots",
  "Visakhapatnam leads on`nrequest count",
  "V.O. Chidambaranar has`nthe most active drivers",
  "Per-depot on-time varies`nfrom 64% to 88%"
) 10 $INK | Out-Null
Add-Footer $s $n
Set-Notes $s "Finally, where the work actually is. Volume is spread fairly evenly across the twelve depots rather than concentrated, which is what makes the marketplace model work at all. One thing worth flagging honestly: per-depot on-time varies quite a bit, from sixty-four percent at V.O. Chidambaranar up to eighty-eight at Visakhapatnam. That is not noise - it tracks driver availability and route density per depot, and it tells you which depot to put the batching fix in first."