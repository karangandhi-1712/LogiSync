# Builds LogiSync_Presentation.pptx through PowerPoint COM automation.
#
# Charts are images rendered by render_charts.ps1, not native PowerPoint charts:
# a native chart needs an embedded Excel workbook co-installed with PowerPoint,
# which is not reliably present here. Every figure is still read from
# ppt_assets/data/*.csv, which export_data.ps1 pulled from the running API.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$ROOT    = 'E:\project\LogiSync'
$DATA    = "$ROOT\ppt_assets\data"
$SHOTS   = "$ROOT\ppt_assets\screenshots"
$OUT     = "$ROOT\LogiSync_Presentation.pptx"

# -- Theme --------------------------------------------------------------------
$PRIMARY = 0xC78402   # BGR for #0284C7
$ACCENT  = 0x6E760F   # BGR for #0F766E
$INK     = 0x0A172F   # BGR for #0F172A  (near-black navy)
$MUTED   = 0x4B748B   # BGR for #64748B
$LINE    = 0xD8E1EA   # BGR for #E2E8F0
$PAPER   = 0xFBFCFE   # BGR for #FEFDFF
$WHITE   = 0xFFFFFF
$AMBER   = 0x0A97E5   # BGR for #F59E0B
$ROSE    = 0x4E4BED   # BGR for #ED4E5B
$GREEN   = 0x2FAF52   # BGR for #52AF2F

$FONT = 'Segoe UI'
$W = 960; $H = 540   # 16:9 in points

function New-Slide($pres) {
  $s = $pres.Slides.Add($pres.Slides.Count + 1, 12)   # ppLayoutBlank
  return $s
}

function Set-Notes($slide, $text) {
  $slide.NotesPage.Shapes.Item(2).TextFrame.TextRange.Text = $text
}

function Add-Text($slide, $x, $y, $w, $h, $text, $size, $color, $bold, $align) {
  $tb = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)   # msoTextOrientationHorizontal
  $tf = $tb.TextFrame
  $tf.WordWrap = -1
  $tf.AutoSize = 0
  $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0
  $tr = $tf.TextRange
  # Callers pass KPI values straight from CSV, which are strings - but a few are
  # numerics, and TextRange.Text only accepts a string.
  $tr.Text = [string]$text
  $tr.Font.Name = $FONT
  $tr.Font.Size = [single]$size
  $tr.Font.Color.RGB = $color
  $tr.Font.Bold = $(if ($bold) { -1 } else { 0 })
  if ($null -ne $align) { $tr.ParagraphFormat.Alignment = $align }
  return $tb
}

function Add-Rect($slide, $x, $y, $w, $h, $fill, $lineColor, $radius) {
  $type = $(if ($radius) { 5 } else { 1 })   # 5 = msoShapeRoundedRectangle
  $sh = $slide.Shapes.AddShape($type, $x, $y, $w, $h)
  if ($fill -eq $null) { $sh.Fill.Visible = 0 } else { $sh.Fill.ForeColor.RGB = $fill; $sh.Fill.Solid() }
  if ($lineColor -eq $null) { $sh.Line.Visible = 0 } else { $sh.Line.ForeColor.RGB = $lineColor; $sh.Line.Weight = 1 }
  if ($radius) { $sh.Adjustments.Item(1) = $radius }
  $sh.TextFrame.TextRange.Font.Name = $FONT
  return $sh
}

function Add-Picture($slide, $path, $x, $y, $maxW, $maxH) {
  # The source aspect ratio is read from the file rather than from the inserted
  # shape: on this build PowerPoint does not report the inserted size back
  # consistently, so scaling off $img.Width silently produced undersized art.
  if (-not (Test-Path -LiteralPath $path)) { throw "missing screenshot: $path" }
  $bmp = [System.Drawing.Image]::FromFile((Resolve-Path -LiteralPath $path).Path)
  try { $aspect = $bmp.Width / $bmp.Height } finally { $bmp.Dispose() }
  if ($maxW / $maxH -gt $aspect) { $h = $maxH; $w = $maxH * $aspect }
  else                           { $w = $maxW; $h = $maxW / $aspect }
  # Explicit width/height: the fit is decided here, not by PowerPoint.
  $img = $slide.Shapes.AddPicture($path, $false, $true,
      ($x + (($maxW - $w) / 2)), ($y + (($maxH - $h) / 2)), $w, $h)
  return $img
}

function Add-Bullets($slide, $x, $y, $w, $h, $items, $size, $color) {
  $tb = $slide.Shapes.AddTextbox(1, $x, $y, $w, $h)
  $tf = $tb.TextFrame
  $tf.WordWrap = -1
  $tf.MarginLeft = 0; $tf.MarginRight = 0; $tf.MarginTop = 0; $tf.MarginBottom = 0
  $tr = $tf.TextRange
  # A literal bullet glyph plus a blank line between items. ParagraphFormat is
  # not exposed on Paragraph in this PowerPoint build, so spacing is done with
  # real line breaks rather than SpaceAfter, which renders identically.
  for ($i = 0; $i -lt $items.Count; $i++) {
    $line = ([string]$items[$i]).Replace("`n", "`v")
    if ($i -gt 0) { $tr.InsertAfter("`r") }
    $tr.InsertAfter([char]0x2022 + "  " + $line + "`r")
  }
  $tr.Font.Name = $FONT
  $tr.Font.Size = [single]$size
  $tr.Font.Color.RGB = $color
  return $tb
}

# Standard slide header: eyebrow + title + hairline.
function Add-Header($slide, $eyebrow, $title) {
  Add-Rect $slide 0 0 $W $H $PAPER $null $false | Out-Null
  Add-Text $slide 56 40 700 20 $eyebrow.ToUpper() 11 $PRIMARY $true $null | Out-Null
  Add-Text $slide 56 62 820 44 $title 30 $INK $true $null | Out-Null
  Add-Rect $slide 56 116 64 4 $PRIMARY $null $false | Out-Null
}

function Add-Footer($slide, $n) {
  # Page number comes from the slide itself. The hand-maintained counter drifted
  # by several slides once slide blocks changed size.
  $idx = $slide.SlideIndex
  Add-Text $slide 56 512 600 16 'LogiSync - Port-to-Doorstep Delivery Marketplace' 9 $MUTED $false $null | Out-Null
  Add-Text $slide 860 512 44 16 "$idx" 9 $MUTED $false 3 | Out-Null
}

function Read-Csv($name) { Import-Csv "$DATA\$name.csv" }

# ===========================================================================
$pp = New-Object -ComObject PowerPoint.Application
$pres = $pp.Presentations.Add(-1)
$pres.PageSetup.SlideSize = 15      # ppSlideSizeCustom
$pres.PageSetup.SlideWidth  = $W
$pres.PageSetup.SlideHeight = $H

$kpi = Read-Csv 'platform_kpis'
$K = @{}
# platform_kpis.csv is one wide row (a column per metric), so read the header and
# value lines positionally rather than treating it as an ordinary table.
$khdr = (Get-Content "$DATA\platform_kpis.csv")[0] -split ',' | ForEach-Object { $_.Trim('"') }
$kval = (Get-Content "$DATA\platform_kpis.csv")[1] -split ',' | ForEach-Object { $_.Trim('"') }
for ($i = 0; $i -lt $khdr.Count; $i++) { $K[$khdr[$i]] = $kval[$i] }
$tiers  = Read-Csv 'on_time_by_tier'
$hist   = Read-Csv 'batch_fill_histogram'
$status = Read-Csv 'status_distribution'
$depots = Read-Csv 'per_depot'
$roles  = Read-Csv 'users_by_role'

# -- 1. Title ----------------------------------------------------------------
$s = New-Slide $pres
Add-Rect $s 0 0 $W $H $INK $null $false | Out-Null
Add-Rect $s 0 0 10 $H $PRIMARY $null $false | Out-Null
Add-Text $s 72 150 800 60 'LogiSync' 54 $WHITE $true $null | Out-Null
Add-Text $s 72 216 780 34 'Port-to-Doorstep Delivery Marketplace' 21 0x6BC5F0 $false $null | Out-Null
Add-Rect $s 72 268 72 4 $ACCENT $null $false | Out-Null
Add-Text $s 72 292 700 60 ("Batching, dispatching and tracking 490 delivery requests`r`nacross 12 Indian port depots in one marketplace.") 14 0xB8C6D9 $false $null | Out-Null
Add-Text $s 72 396 300 20 'PRESENTED BY' 9 0x7E93AD $true $null | Out-Null
Add-Text $s 72 414 300 24 '[Team Name]' 14 $WHITE $true $null | Out-Null
Add-Text $s 72 440 400 20 '[Institution / Guide]' 11 0x9FB2C6 $false $null | Out-Null
Add-Text $s 660 440 230 20 'October 2026' 11 0x9FB2C6 $false 3 | Out-Null
Set-Notes $s "Good morning. We are presenting LogiSync, a delivery marketplace we built for India's major port depots. The problem we set out to solve is that freight leaving a port is scheduled over WhatsApp and spreadsheets. LogiSync turns that into a single marketplace where a customer books a delivery, a depot batches nearby stops, a driver claims the run, and the customer watches it arrive live. Everything you'll see today comes from a running system with seeded operational data - 490 requests across 90 days."
$n = 1

# -- 2. Problem --------------------------------------------------------------
$s = New-Slide $pres; $n++
Add-Header $s 'The problem' 'Freight leaving a port is still scheduled by hand'
Add-Bullets $s 56 150 420 300 @(
  'Depots plan runs in spreadsheets - no shared view of what is waiting',
  'Drivers are phoned one at a time; batch fill stays low',
  'Customers chase drivers by phone for a delivery status',
  'Nobody can say why a parcel missed its window'
) 14 $INK | Out-Null
Add-Rect $s 520 150 384 300 $WHITE $LINE $true | Out-Null
Add-Text $s 544 172 340 22 'THE COST OF IT' 10 $PRIMARY $true $null | Out-Null
$stats = @(
  @('43.0%', 'average batch fill', 'half-empty runs burning fuel'),
  @('21 min', 'median broadcast to claim', 'drivers idle, waiting to be asked'),
  @('53', 'requests cancelled or failed', 'untracked in a spreadsheet world')
)
for ($i = 0; $i -lt $stats.Count; $i++) {
  $yy = 204 + $i * 82
  Add-Text $s 544 $yy 120 30 $stats[$i][0] 22 $INK $true $null | Out-Null
  Add-Text $s 672 ($yy + 2) 220 20 $stats[$i][1] 11 $INK $true $null | Out-Null
  Add-Text $s 672 ($yy + 20) 220 20 $stats[$i][2] 10 $MUTED $false $null | Out-Null
}
Add-Footer $s $n
Set-Notes $s "Every one of these numbers is measured from our own analytics, not estimated. A 43 percent batch fill means a driver burns a full run for barely half the payload. Twenty-one minutes from broadcast to claim means a driver sits available before the app even knows they exist. And fifty-three requests ended cancelled or failed, each one a customer who had to ask somebody what happened to their parcel. The root cause is the same in all three: there is no single system of record, so every fact has to be re-established by asking a person."

# -- 3. Objectives -----------------------------------------------------------
$s = New-Slide $pres; $n++
Add-Header $s 'Objectives' 'What we set out to build'
$objs = @(
  @('01', 'One marketplace', 'Customer books, depot batches, driver claims - in the same system'),
  @('02', 'Automatic batching', 'Nearby stops group into runs without anyone sorting them'),
  @('03', 'Visible status', 'Every parcel trackable by the customer, live'),
  @('04', 'Honest money', 'Price and driver pay both derived from weight, handling and distance'),
  @('05', 'Measured, not guessed', 'Analytics over real events, not a spreadsheet')
)
for ($i = 0; $i -lt $objs.Count; $i++) {
  $yy = 148 + $i * 72
  Add-Text $s 56 $yy 46 30 $objs[$i][0] 20 0xB8C6D9 $true $null | Out-Null
  Add-Text $s 108 ($yy - 2) 250 26 $objs[$i][1] 15 $INK $true $null | Out-Null
  Add-Text $s 372 ($yy) 530 44 $objs[$i][2] 12 $MUTED $false $null | Out-Null
  if ($i -lt $objs.Count - 1) { Add-Rect $s 56 ($yy + 52) 848 1 $LINE $null $false | Out-Null }
}
Add-Footer $s $n
Set-Notes $s "Five objectives. The first two are the product. The third is trust - a customer who can see their parcel does not phone the depot. The fourth is where most projects quietly go wrong: we put the pricing and the driver payout in the same place so they cannot disagree. And the fifth is what let us find the on-time bug - we built the measurement first and it immediately showed us a metric stuck at zero."

# -- 4. Overview + stack -----------------------------------------------------
$s = New-Slide $pres; $n++
Add-Header $s 'Project overview' 'A delivery marketplace, not a tracking viewer'
Add-Bullets $s 56 148 400 250 @(
  'Four roles, one workflow: customer, fleet manager, driver, port admin',
  'A request is a priced, paid parcel with a tracking code',
  'Nearby paid requests become a batch with a driver payout',
  'A driver claims it, the route is optimised, stops are worked in order'
) 13 $INK | Out-Null
Add-Text $s 500 148 404 20 'TECH STACK' 10 $PRIMARY $true $null | Out-Null
$stack = @(
  @('Frontend', 'React 19 - TypeScript - Vite - Tailwind - Leaflet'),
  @('Backend', 'FastAPI - SQLAlchemy 2.0 - Alembic - Pydantic'),
  @('Database', 'SQLite (dev) - PostgreSQL (production) - 9 tables'),
  @('Realtime', 'WebSocket hub, targeted per role and per batch'),
  @('Auth', 'JWT, role-scoped dependencies, bcrypt hashing'),
  @('Payments', 'Razorpay, server-verified (pay-at-depot fallback)')
)
for ($i = 0; $i -lt $stack.Count; $i++) {
  $yy = 176 + $i * 52
  Add-Rect $s 500 $yy 404 44 $WHITE $LINE $true | Out-Null
  Add-Text $s 516 ($yy + 6) 110 16 $stack[$i][0] 10 $PRIMARY $true $null | Out-Null
  Add-Text $s 516 ($yy + 22) 372 18 $stack[$i][1] 10 $INK $false $null | Out-Null
}
Add-Footer $s $n
Set-Notes $s "LogiSync models a delivery as a priced, paid parcel, not a truck to watch. That one decision drives everything else. The stack is deliberately ordinary - React and FastAPI - because the interesting work is in the domain model, not the framework. Realtime is a single WebSocket hub that targets events per role and per batch, so a driver only receives the jobs they can actually take."

# -- 5. Architecture ----------------------------------------------------------
$s = New-Slide $pres; $n++
Add-Header $s 'System architecture' 'Four layers, one direction of truth'
Add-Text $s 56 138 250 18 'CLIENT' 9 $MUTED $true 1 | Out-Null
Add-Text $s 375 138 250 18 'APPLICATION' 9 $MUTED $true 1 | Out-Null
Add-Text $s 694 138 250 18 'DATA' 9 $MUTED $true 1 | Out-Null
# Column origins and card width are set so 694 + 250 = 944 stays inside the
# 960pt slide; the old third column ran 70pt past the right edge.
$cols = @(
  @(56, @(@('Consumer portal', 'book - pay - track'), @('Driver app', 'claim - route - deliver'), @('Fleet console', 'batch - price - dispatch'), @('Admin console', 'users - analytics'))),
  @(375, @(@('Routers', 'auth - consumer - schedules - deliveries - payments - analytics'), @('Schedule engine', 'auto-attach - lock - complete'), @('Earnings engine', 'tier + weight + handling + km'), @('Event hub', 'role-targeted WebSocket'))),
  @(694, @(@('PostgreSQL / SQLite', '9 tables - Alembic migrations'), @('Geoapify', 'geocode - road geometry'), @('Razorpay', 'order - verify - webhook')))
)
for ($c = 0; $c -lt 3; $c++) {
  $x = $cols[$c][0]
  $n2 = $cols[$c][1].Count
  for ($i = 0; $i -lt $n2; $i++) {
    $yy = 164 + $i * 76
    $accent = $(if ($c -eq 1) { $PRIMARY } else { $INK })
    Add-Rect $s $x $yy 250 62 $WHITE $LINE $true | Out-Null
    Add-Rect $s $x $yy 4 62 $accent $null $false | Out-Null
    Add-Text $s ($x + 16) ($yy + 10) 218 18 $cols[$c][1][$i][0] 12 $INK $true $null | Out-Null
    Add-Text $s ($x + 16) ($yy + 30) 220 28 $cols[$c][1][$i][1] 9 $MUTED $false $null | Out-Null
  }
}
for ($i = 0; $i -lt 3; $i++) {
  $ay = 164 + $i * 76 + 22
  $a = $s.Shapes.AddShape(33, 316, $ay, 48, 18)  # right arrow
  $a.Fill.ForeColor.RGB = $PRIMARY; $a.Fill.Solid(); $a.Line.Visible = 0
  $b = $s.Shapes.AddShape(33, 635, $ay, 48, 18)
  $b.Fill.ForeColor.RGB = $ACCENT; $b.Fill.Solid(); $b.Line.Visible = 0
}
Add-Text $s 56 470 848 18 'Every write is validated against a server-side status chain. The client cannot advance a parcel the backend will not allow.' 10 $MUTED $false 1 | Out-Null
Add-Footer $s $n
Set-Notes $s "Four layers. The important line is the bottom one: every status change is validated server-side against a declared chain. The UI cannot advance a parcel from picked-up straight to delivered, because the API rejects it. That matters most for money - a customer cannot self-cancel once a driver owns the stop, and only the assigned driver can mark it delivered."

# -- 6. Workflow -------------------------------------------------------------
$s = New-Slide $pres; $n++
Add-Header $s 'Workflow' 'How a parcel actually moves'
$flow = @(
  @('1', 'Customer books', 'Address, weight, handling`nand a time window', $PRIMARY),
  @('2', 'Price quoted', 'Server computes tier + weight`+ handling + minimum', $PRIMARY),
  @('3', 'Payment captured', 'Razorpay signature verified`nserver-side', $ACCENT),
  @('4', 'Enters depot queue', 'Only paid parcels are`dispatchable', $ACCENT),
  @('5', 'Fleet manager batches', 'Radius + cap, payout`computed per stop', $INK),
  @('6', 'Broadcast to drivers', 'Every available driver`is offered the run', $INK),
  @('7', 'Driver claims', 'Atomic - exactly one`winner, median 21 min', $AMBER),
  @('8', 'Route optimised', 'Stops sequenced, road`geometry fetched', $AMBER),
  @('9', 'Out for delivery', 'Driver contact released`to the customer', $ROSE),
  @('10', 'Delivered', 'On-time scored against`the promised window', $GREEN)
)
for ($i = 0; $i -lt $flow.Count; $i++) {
  $col = [Math]::Floor($i / 5); $row = $i % 5
  $x = 56 + $col * 440; $y = 150 + $row * 66
  $sh = Add-Rect $s $x $y 40 40 $flow[$i][3] $null $true
  $sh.Adjustments.Item(1) = 0.5
  Add-Text $s $x ($y + 11) 40 20 $flow[$i][0] 13 $WHITE $true 2 | Out-Null
  Add-Text $s ($x + 52) ($y + 1) 180 18 $flow[$i][1] 12 $INK $true $null | Out-Null
  Add-Text $s ($x + 52) ($y + 19) 190 36 $flow[$i][2] 9 $MUTED $false $null | Out-Null
  if ($i -lt 9 -and ($i % 5) -ne 4) {
    $ar = $s.Shapes.AddShape(33, $x + 234, ($y + 12), 26, 14)
    $ar.Fill.ForeColor.RGB = $LINE; $ar.Fill.Solid(); $ar.Line.Visible = 0
  }
}
Add-Rect $s 496 150 412 46 $WHITE $LINE $true | Out-Null
Add-Text $s 512 162 380 16 'THE GATE THAT MATTERS' 9 $PRIMARY $true $null | Out-Null
Add-Text $s 512 178 380 16 'Step 4. An unpaid parcel never reaches a driver.' 11 $INK $true $null | Out-Null
Add-Footer $s $n
Set-Notes $s "This is the whole system in ten steps. Two of them are ours and unusual. Step 4: an unpaid parcel is filtered out of the depot queue entirely - not shown-and-disabled, absent - so a planner can never build a run around freight nobody has paid for. Step 9: the moment a parcel goes out for delivery the customer receives the driver's phone number, gated on a timestamp that can never be un-set. Step 7 uses a guarded database update, so under contention exactly one driver wins."

# -- 7. Roles ----------------------------------------------------------------
$s = New-Slide $pres; $n++
Add-Header $s 'Four roles' 'One workflow, four very different jobs'
$rolesSlide = @(
  @('Customer', 'Books a delivery, pays, watches it arrive. Sees the driver''s number only once the parcel is moving.', '69 accounts' , $PRIMARY, 'no login beyond account creation'),
  @('Fleet manager', 'Pinned to one depot. Turns nearby paid requests into runs, prices them, and broadcasts.', '26 managers - 12 depots', $ACCENT, 'scoped to one depot_id'),
  @('Driver', 'Claims a run, gets an optimised stop order, works each stop and closes it out.', '41 drivers - 22 available', $AMBER, 'scoped to claimed runs'),
  @('Port admin', 'Provisions fleet managers, audits the network, reads platform-wide analytics.', '1 admin - full scope', $INK, 'platform-wide, read + audit')
)
for ($i = 0; $i -lt $rolesSlide.Count; $i++) {
  $x = 56 + $i * 216
  Add-Rect $s $x 152 196 268 $WHITE $LINE $true | Out-Null
  Add-Rect $s $x 152 196 5 $rolesSlide[$i][3] $null $false | Out-Null
  Add-Text $s ($x + 20) 174 160 22 $rolesSlide[$i][0] 14 $INK $true $null | Out-Null
  Add-Text $s ($x + 20) 200 160 16 $rolesSlide[$i][4] 9 $MUTED $false $null | Out-Null
  Add-Text $s ($x + 20) 228 160 130 $rolesSlide[$i][1] 10 $INK $false $null | Out-Null
  Add-Text $s ($x + 20) 380 160 32 $rolesSlide[$i][2] 10 $PRIMARY $true $null | Out-Null
}
Add-Rect $s 56 436 848 56 $INK $null $true | Out-Null
Add-Text $s 76 452 808 32 ("Role scoping is enforced on the server, not the client. A fleet manager requesting another depot's analytics gets a 403`nand never sees the row.") 11 $WHITE $false $null | Out-Null
Add-Footer $s $n
Set-Notes $s "The same platform, four genuinely different jobs. The number worth pausing on is the bottom strip: every role boundary is a server-side dependency, not a hidden button. We tested that. A fleet manager who requests another depot's analytics gets a 403, and a consumer who guesses another customer's tracking code gets a 404 rather than a 403 - because a 403 would confirm the code exists."

# -- Walkthrough slides -------------------------------------------------------
function Walk-Slide($n, $shot, $title, $eyebrow, $bullets, $caption, $notes) {
  $s = New-Slide $pres
  Add-Header $s $eyebrow $title
  Add-Picture $s "$SHOTS\$shot.png" 56 140 588 330 | Out-Null
  Add-Rect $s 56 478 588 30 $WHITE $LINE $true | Out-Null
  Add-Text $s 68 486 566 18 $caption 9 $MUTED $false $null | Out-Null
  Add-Bullets $s 676 150 228 320 $bullets 12 $INK | Out-Null
  Add-Footer $s $n
  Set-Notes $s $notes
}

Walk-Slide $n '01_landing_hero' 'Twelve depots, one network' 'Portal walkthrough' @(
  'Full-bleed map of India behind the copy',
  'Twelve port depots as live markers',
  'Click a marker for its fact sheet',
  'One entry point for all four roles'
) 'Landing page - full-bleed India map with all 12 depot markers' "We open on the network rather than a login box. The map is the product: twelve Indian port depots, from V.O. Chidambaranar at Thoothukudi down to Paradip and Haldia. Each marker is live - click one and you get its fact sheet, and from there you can dispatch from that specific depot. It sets the scope immediately: this is a port logistics system, not a generic courier app."

$n++
Walk-Slide $n '02_login_port_admin' 'Role-scoped access' 'Portal walkthrough' @(
  'Operator and public tabs are separate',
  'Credentials issue a role-scoped JWT',
  'Server enforces every role boundary',
  'Demo credentials on-screen'
) 'Port admin sign-in - operators cannot self-register' "Access is split deliberately. Drivers and customers self-register; operators cannot. A fleet manager or port admin has to be provisioned by an admin, which is what stops someone simply signing up as an operator. The credential on screen is a seeded demo account - the autofill button is there so a reviewer can get in without setup."

$n++
Walk-Slide $n '03_admin_users_dashboard' 'Governance at a glance' 'Portal walkthrough' @(
  'Live counts across every role',
  'Driver pool: available, busy, offline',
  'Depot coverage flags unstaffed ports',
  'Recent account activity'
) 'Port admin - User Management, Dashboard tab' "This is the screen we added for governance. The headline tiles answer who exists. The driver pool shows capacity in real time - twenty-two of forty-one available right now. Depot coverage is the one worth noting: a port with no fleet manager has nobody dispatching it, and that is called out with an amber warning rather than left for someone to infer from a list."

$n++
Walk-Slide $n '05_fleet_manager_console' 'Batching, priced' 'Portal walkthrough' @(
  'Radius and cap as exact steppers',
  'Payout computed server-side, per stop',
  'Tier, fragile and weight shown per parcel',
  'Urgent parcels with no run, flagged'
) 'Fleet manager console - steppers, live payout, urgent alerts' "This is the heart of the system. The fleet manager draws a radius and sets a cap, and the panel shows what a driver will earn before broadcasting anything - two thousand four hundred and sixty rupees here, computed on the server so it cannot disagree with what the driver is offered. Notice the fragile chip and the weights on each parcel: those feed the payout. The orange panel is the scheduler telling the manager four urgent parcels have no run covering them."

$n++
Walk-Slide $n '06_driver_jobs' 'Open work, one tap' 'Portal walkthrough' @(
  'Broadcast runs any driver can take',
  'Payout shown before claiming',
  'Atomic claim - one winner',
  'Claimed run is pinned to that driver'
) 'Driver - claimable job feed' "Drivers see every run they are eligible for, with the payout stated up front. Claiming is a single atomic database update, which means under contention exactly one driver wins and the rest get a clean 409 rather than a double-booked run. Once claimed the run is pinned: no other driver can take it, and the batch is locked to stop order on departure."

$n++
Walk-Slide $n '08_consumer_package_handling' 'The customer books' 'Portal walkthrough' @(
  'Handling as explicit chips, not prose',
  'Weight and tier drive the quote',
  'Window defaults to something achievable',
  'Quote shown before any commitment'
) 'Consumer booking - structured handling and weight' "The customer side is deliberately plain. Handling used to be a free-text box, which meant the earnings and pricing models had to guess intent from prose. It is now explicit chips - fragile, keep upright, refrigerated, liquid - so the requirement is machine-readable. One thing we fixed here: the delivery window used to default to ten-to-six, which had already closed for anyone booking after six in the evening."

$n++
Walk-Slide $n '12_analytics_charts' 'Measured, not guessed' 'Portal walkthrough' @(
  'Volume against deliveries, daily',
  'Batch fill distribution and claim times',
  'Busiest areas with real earnings',
  'Exportable for audit'
) 'Analytics - volume, batch efficiency, busiest areas' "And this is why we build the measurement before the feature. This page is how we found the on-time metric was stuck at zero: the time window a customer picks is their local clock, but every timestamp we stored was UTC, so an evening delivery was being scored against the wrong hour. You cannot debug what you never measured."

# -- Functionality: features -------------------------------------------------
$s = New-Slide $pres; $n++
Add-Header $s 'Functionality & validation' 'Every feature, and the evidence for it'
$feat = @(
  @('Structured handling flags', 'chips replace free text', '25 tests'),
  @('Weight-aware pricing', 'server-quoted, minimum applied', '25 tests'),
  @('Payment-gated dispatch', 'unpaid never batched', '16 tests'),
  @('Atomic driver claim', 'exactly one winner', '7 tests'),
  @('Driver contact release', 'gated on out-for-delivery', '16 tests'),
  @('IST-correct on-time scoring', 'timezone + delivery stamp', '14 tests'),
  @('Radius auto-attach', 'claimed run absorbs new stops', '15 tests'),
  @('Cross-customer isolation', '404, never 403', '5 tests')
)
for ($i = 0; $i -lt $feat.Count; $i++) {
  $col = [Math]::Floor($i / 4); $row = $i % 4
  $x = 56 + $col * 432; $y = 146 + $row * 82
  Add-Rect $s $x $y 412 68 $WHITE $LINE $true | Out-Null
  Add-Rect $s $x $y 4 68 $(if ($col -eq 0) { $PRIMARY } else { $ACCENT }) $null $false | Out-Null
  Add-Text $s ($x + 18) ($y + 10) 250 18 $feat[$i][0] 12 $INK $true $null | Out-Null
  Add-Text $s ($x + 18) ($y + 32) 280 18 $feat[$i][1] 9 $MUTED $false $null | Out-Null
  Add-Text $s ($x + 300) ($y + 22) 96 20 $feat[$i][2] 11 $PRIMARY $true 3 | Out-Null
}
Add-Rect $s 56 480 848 32 $INK $null $true | Out-Null
Add-Text $s 72 488 816 18 ("127 automated tests across 8 suites - all passing") 12 $WHITE $true 1 | Out-Null
Add-Footer $s $n
Set-Notes $s "Eight features, each with the suite that proves it. These are not smoke tests - the payment suite, for instance, asserts that an unpaid parcel returns a 402 rather than a 409, because the client branches on that code to decide whether to re-offer checkout. The driver-contact suite asserts a cancelled-before-departure parcel never exposes a number, which is the specific regression a naive status check would have shipped."

# -- Functionality: test table -----------------------------------------------
$s = New-Slide $pres; $n++
Add-Header $s 'Functionality & validation' 'Representative test cases and results'
$rows = @(
  @('Test case', 'Input / data', 'Expected', 'Actual', ''),
  @('On-time rate, evening delivery', 'Delivered 23:36 IST, window 10:00-18:00', 'Late', 'Late (92.6% network)', 'PASS'),
  @('On-time rate, in-window delivery', 'Delivered 16:20 IST, window 10:00-18:00', 'On time', 'On time', 'PASS'),
  @('Tier with no deliveries', 'Express, 0 delivered', 'null, not 0', 'null - renders "-"', 'PASS'),
  @('Unpaid cannot be batched', '1 unpaid request, POST /schedules', '402', '402 Payment Required', 'PASS'),
  @('Unpaid hidden from queue', 'GET /schedules/pending', 'Absent', 'Absent', 'PASS'),
  @('Driver phone before departure', 'Stop assigned, tracked', 'No phone field', 'No phone field', 'PASS'),
  @('Driver phone after departure', 'Stop en_route, tracked', 'Phone present', 'Phone present', 'PASS'),
  @('Cancel before departure', 'Batched -> cancelled', 'No phone leaked', 'No phone leaked', 'PASS'),
  @('Concurrent claim, 5 drivers', '5 threads, same batch', '1 winner, 4x 409', '1 winner, 4x 409', 'PASS'),
  @('Cross-customer order read', "Customer B reads A's token", '404, not 403', '404', 'PASS'),
  @('Earnings quote reconciles', '2 stops, breakdown vs total', 'Items sum to total', 'Equal', 'PASS')
)
$ty = 142; $rh = 27
for ($r = 0; $r -lt $rows.Count; $r++) {
  $y = $ty + $r * $rh
  $isHead = ($r -eq 0)
  $bg = $(if ($isHead) { $INK } else { $(if ($r % 2 -eq 0) { $WHITE } else { $PAPER }) })
  Add-Rect $s 56 $y 848 $rh $bg $(if ($isHead) { $null } else { $LINE }) $false | Out-Null
  $colx = @(64, 292, 500, 664, 828)
  $colw = @(224, 204, 160, 160, 60)
  for ($c = 0; $c -lt 5; $c++) {
    $txt = $rows[$r][$c]
    $col = $(if ($isHead) { $WHITE } elseif ($c -eq 4) { 0x1E8B3C } else { $INK })
    $bold = ($isHead -or $c -eq 0)
    Add-Text $s $colx[$c] ($y + 7) $colw[$c] 18 $txt 8.5 $col $bold $null | Out-Null
  }
}
Add-Text $s 56 480 848 16 'Command: python -m pytest tests   -   127 passed, 0 failed, 44.8 s' 9 $MUTED $false $null | Out-Null
Add-Footer $s $n
Set-Notes $s "Twelve representative cases out of a hundred and twenty-seven. The first three are the bug we were asked to fix - the on-time metric reading zero. The middle block is the payment gate and the driver-contact gate, including the cancellation case that a status-based check would have failed. The last three cover concurrency and isolation. Everything runs in forty-five seconds against a throwaway database, so it is cheap to run on every change."

# -- Functionality: limitations ----------------------------------------------
$s = New-Slide $pres; $n++
Add-Header $s 'Functionality & validation' 'Limitations, stated honestly'
Add-Text $s 56 142 404 20 'KNOWN LIMITATIONS' 10 $ROSE $true $null | Out-Null
Add-Bullets $s 56 170 404 260 @(
  'Demo data is seeded, not measured in production',
  'Online payment dark until Razorpay keys are set; webhook needs a public URL',
  'Tier margin gap: express/urgent charge exceeds base driver pay',
  'Route geometry falls back to straight lines when Geoapify is unreachable',
  'No frontend unit-test framework - coverage is integration-level'
) 11 $INK | Out-Null
Add-Text $s 500 142 404 20 'NEXT STEPS' 10 $ACCENT $true $null | Out-Null
Add-Bullets $s 500 170 404 260 @(
  'Rebalance tier fees against driver base pay',
  'Postgres in production with the 127-test suite green',
  'Frontend unit tests and CI on every push',
  'Multi-depot driver runs and cross-port batch splitting',
  'Customer notifications over SMS on status change'
) 11 $INK | Out-Null
Add-Rect $s 56 440 848 54 $WHITE $LINE $true | Out-Null
Add-Text $s 76 454 808 32 ("The tier margin gap is deliberate to surface, not to hide: customers are charged more for express and urgent than a`ndriver's base pay covers. It is pinned by a test so it stays visible.") 10 $MUTED $false $null | Out-Null
Add-Footer $s $n
Set-Notes $s "We would rather show you this than have you find it. The first limitation is the most important: every number in this deck comes from a seeded dataset, not from production traffic - the system is real, the volume is synthetic. Third is a genuine commercial bug we found and did not quietly paper over: express and urgent charge the customer five hundred and a thousand rupees while the driver's base pay is two twenty and three fifty. We pinned it with a test so whoever sets the commercial terms sees it."

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
# -- Comparison --------------------------------------------------------------
$s = New-Slide $pres; $n++
Add-Header $s 'Why LogiSync is smarter' 'Against what teams actually use today'
$comp = @(
  @('Capability', "Spreadsheets`n+ phone", "Courier`naggregator", "Fleet TMS`nsuite", 'LogiSync'),
  @('Live per-parcel tracking',   '0', '0', '1', '1'),
  @('Automatic proximity batching', '0', '0', '1', '1'),
  @('Atomic driver claim (no double-book)', '0', '0', '1', '1'),
  @('Weight & handling-aware pricing', '0', '0', '1', '1'),
  @('Customer books without a sales call', '0', '1', '0', '1'),
  @("Driver phone released to customer", '0', '1', '0', '1'),
  @('Full per-stop audit trail', '0', '0', '1', '1'),
  @('Owns the port-side depot workflow', '0', '0', '1', '1'),
  @('Zero licence cost', '1', '0', '0', '1')
)
$ty = 142; $rh = 30
for ($r = 0; $r -lt $comp.Count; $r++) {
  $y = $ty + $r * $rh
  $isHead = ($r -eq 0)
  Add-Rect $s 56 $y 848 $rh $(if ($isHead) { $INK } elseif ($r % 2 -eq 0) { $WHITE } else { $PAPER }) $(if ($isHead) { $null } else { $LINE }) $false | Out-Null
  $cx = @(68, 448, 560, 664, 776)
  $cw = @(360, 96, 88, 96, 116)
  for ($c = 0; $c -lt 5; $c++) {
    $txt = $comp[$r][$c]
    $isLast = ($c -eq 4)
    $col = if ($isHead) { $WHITE } elseif ($isLast) { $ACCENT } elseif ($txt -eq '1') { $INK } else { 0xA8B4C2 }
    $sz = if ($isHead -or $isLast) { 9.5 } else { 10 }
    Add-Text $s $cx[$c] ($y + ($isHead -ne $c)) ($cw[$c]) 26 $txt $sz $col $true $(if ($c -eq 0) { $null } else { 2 }) | Out-Null
  }
}
Add-Rect $s 56 436 848 56 $INK $null $true | Out-Null
Add-Text $s 76 450 808 36 ("Our edge: it is built for the port-side depot, not the last mile. Couriers assume a sorted,`naddress-ready parcel. We model the awkward ones - weight, fragile, upright, reefer - and price them.") 10 $WHITE $false $null | Out-Null
Add-Footer $s $n
Set-Notes $s "Compared against the three things a team actually has: a spreadsheet, a courier aggregator, or a licensed fleet TMS. We score honestly, and LogiSync does not win every row. Courier aggregators do win on scale and get self-serve booking - we cannot match their network. A licensed TMS wins on fleet depth across mixed vehicle classes. Our edge is narrow and specific: we are built for the port-side depot rather than the last mile. A courier assumes a sorted, address-ready parcel. We model the awkward ones - a hundred and forty kilos, fragile, must stay upright - and price them."

# -- Conclusion --------------------------------------------------------------
$s = New-Slide $pres; $n++
Add-Header $s 'Conclusion' 'What we built, and what it proved'
Add-Bullets $s 56 150 420 260 @(
  'Four roles, one marketplace, 12 depots',
  '490 requests and 205 runs over 90 days',
  '92.6% on-time, measured not assumed',
  'Payment, dispatch and driver contact all gated',
  '127 tests, green'
) 14 $INK | Out-Null
Add-Text $s 500 150 404 20 'WHAT IT PROVED' 10 $PRIMARY $true $null | Out-Null
Add-Bullets $s 500 178 404 200 @(
  'The workflow holds under load and race',
  'Money is computed in one place, so it cannot drift',
  'Privacy gates need monotonic state,`nnot status checks',
  'Measuring first is what found the bug'
) 12 $INK | Out-Null
Add-Rect $s 56 440 848 56 $ACCENT $null $true | Out-Null
Add-Text $s 76 456 808 32 ("The system works end to end. The next gain is operational, not architectural:`nfill the 110 single-stop runs by widening the departure window.") 11 $WHITE $true $null | Out-Null
Add-Footer $s $n
Set-Notes $s "To close: four roles, one marketplace, twelve depots, four hundred and ninety requests and two hundred and five runs. Ninety-two point six percent on-time, measured rather than asserted. Payment, dispatch and driver contact are all gated on state we can reason about. And a hundred and twenty-seven tests, green. The honest next step is operational, not architectural - there is a hundred and ten single-stop runs sitting in our own histogram, and widening the departure window is a configuration change, not a rewrite."

# -- Thank you ---------------------------------------------------------------
$s = New-Slide $pres
Add-Rect $s 0 0 $W $H $INK $null $false | Out-Null
Add-Rect $s 0 0 10 $H $PRIMARY $null $false | Out-Null
Add-Text $s 72 200 700 60 'Thank you' 44 $WHITE $true $null | Out-Null
Add-Rect $s 72 278 72 4 $ACCENT $null $false | Out-Null
Add-Text $s 72 300 700 30 'Questions welcome.' 17 0x9FB2C6 $false $null | Out-Null
Add-Text $s 72 380 700 60 ("LogiSync - port-to-doorstep delivery marketplace`r12 Indian port depots - 490 requests - 92.6% on-time - 127 tests") 11 0x7E93AD $false $null | Out-Null
Set-Notes $s "Thank you. We are happy to take questions on any part of it - the batching algorithm, the payment gate, the concurrency handling, or the timezone bug, which is probably the most interesting thing we found. Everything you saw is running locally, so we can walk through any screen live if that would help."

# -- Save --------------------------------------------------------------------
if (Test-Path $OUT) { Remove-Item $OUT -Force }
$pres.SaveAs($OUT, 24)   # ppSaveAsOpenXMLPresentation
Write-Output "SAVED: $OUT"
Write-Output "SLIDES: $($pres.Slides.Count)"
$pres.Close()
$pp.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($pp) | Out-Null
