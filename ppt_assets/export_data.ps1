# Pulls real figures out of the running demo API into CSV, for the deck.
# Nothing here is hand-typed: every number comes from an endpoint response.

$ErrorActionPreference = 'Stop'
$API = 'http://localhost:8010'
$OUT = 'E:\project\LogiSync\ppt_assets\data'

function Login($email, $pass) {
  $r = Invoke-RestMethod -Method Post -Uri "$API/api/auth/login" -ContentType 'application/json' `
    -Body (@{identifier=$email; password=$pass} | ConvertTo-Json)
  return @{ Authorization = "Bearer $($r.access_token)" }
}

$admin = Login 'admin@logisync.ai' 'Admin@123'

# ── 1. Daily volume, 90 days ────────────────────────────────────────────────
$vol = Invoke-RestMethod "$API/api/analytics/delivery/volume?period=90d" -Headers $admin
$rows = for ($i = 0; $i -lt $vol.dates.Count; $i++) {
  [pscustomobject]@{
    date       = $vol.dates[$i]
    submitted  = $vol.submitted[$i]
    delivered  = $vol.delivered[$i]
    cancelled  = $vol.cancelled[$i]
    failed     = $vol.failed[$i]
  }
}
$rows | Export-Csv "$OUT\volume_daily.csv" -NoTypeInformation

# ── 2. On-time rate by tier ────────────────────────────────────────────────
$k = Invoke-RestMethod "$API/api/analytics/delivery/kpis?period=90d" -Headers $admin
$tierRows = foreach ($t in @('standard','express','urgent')) {
  $s = $k.on_time_rate_by_tier.$t
  [pscustomobject]@{
    tier        = $t
    delivered   = $s.delivered
    measured    = $s.measured
    on_time     = $s.on_time
    on_time_pct = $s.on_time_pct
  }
}
$tierRows | Export-Csv "$OUT\on_time_by_tier.csv" -NoTypeInformation

# ── 3. Batch fill histogram ────────────────────────────────────────────────
$b = Invoke-RestMethod "$API/api/analytics/delivery/batches?period=90d" -Headers $admin
$b.stop_count_histogram | Select-Object stops, batches | Export-Csv "$OUT\batch_fill_histogram.csv" -NoTypeInformation

# ── 4. Per-depot overview ──────────────────────────────────────────────────
$ports = Invoke-RestMethod "$API/api/analytics/delivery/ports?period=90d" -Headers $admin
$ports.ports | Sort-Object -Property requests -Descending |
  Select-Object port_name, requests, delivered, on_time_pct, active_drivers |
  Export-Csv "$OUT\per_depot.csv" -NoTypeInformation

# ── 5. Platform KPIs ───────────────────────────────────────────────────────
[pscustomobject]@{
  total_requests          = $k.total_requests
  total_schedules         = $k.total_schedules
  completed_schedules     = $k.completed_schedules
  delivered               = $k.delivered
  failed                  = $k.failed
  cancelled               = $k.cancelled
  pending                 = $k.pending
  avg_time_to_claim_min   = $k.avg_time_to_claim_min
  avg_batch_fill_pct      = $k.avg_batch_fill_pct
  on_time_rate_overall    = $k.on_time_rate_overall
  drivers_total           = $k.drivers_total
  drivers_available_now   = $k.drivers_available_now
  driver_utilisation_pct  = $k.driver_utilisation_pct
} | Export-Csv "$OUT\platform_kpis.csv" -NoTypeInformation

# ── 6. Status distribution (from the analytics-side volume totals) ─────────
$tot = ($vol.submitted | Measure-Object -Sum).Sum
$statusRows = @(
  [pscustomobject]@{ status = 'Delivered'; count = ($vol.delivered  | Measure-Object -Sum).Sum }
  [pscustomobject]@{ status = 'Cancelled'; count = ($vol.cancelled  | Measure-Object -Sum).Sum }
  [pscustomobject]@{ status = 'Failed';    count = ($vol.failed     | Measure-Object -Sum).Sum }
  [pscustomobject]@{ status = 'In flight'; count = $tot - ($vol.delivered | Measure-Object -Sum).Sum - ($vol.cancelled | Measure-Object -Sum).Sum - ($vol.failed | Measure-Object -Sum).Sum }
)
$statusRows | Export-Csv "$OUT\status_distribution.csv" -NoTypeInformation

# ── 7. Fleet / user counts from the admin roster ───────────────────────────
$users = Invoke-RestMethod "$API/api/admin/users" -Headers $admin
$users | Group-Object role | ForEach-Object {
  [pscustomobject]@{ role = $_.Name; users = $_.Count; active = ($_.Group | Where-Object { $_.is_active }).Count }
} | Export-Csv "$OUT\users_by_role.csv" -NoTypeInformation

# ── Console summary ─────────────────────────────────────────────────────────
Write-Output "EXTRACTED (all from the live demo API at $API)"
Write-Output "  requests=$($k.total_requests)  batches=$($k.total_schedules)  on_time=$($k.on_time_rate_overall)%  avg_fill=$($k.avg_batch_fill_pct)%"
Write-Output "  drivers=$($k.drivers_total)  users_total=$($users.Count)"
Write-Output "  files -> volume_daily, on_time_by_tier, batch_fill_histogram, per_depot, platform_kpis, status_distribution, users_by_role"