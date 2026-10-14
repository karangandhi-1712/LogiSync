// Screenshots of the running portal, driven with the demo dataset.
// Logs in through the real UI (not by injecting a token) so the captures show
// what a person actually sees, including the role-specific sign-in screens.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = 'E:\\project\\LogiSync\\ppt_assets\\screenshots';
const BASE = 'http://localhost:5173';

const CREDS = {
  port_admin:    { email: 'admin@logisync.ai',     pass: 'Admin@123' },
  fleet_manager: { email: 'manager@logisync.ai',  pass: 'Manager@123' },
  driver:        { email: 'driver@logisync.ai',   pass: 'Driver@123' },
  consumer:      { email: 'customer@logisync.ai', pass: 'Customer@123' },
};

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });
  console.log('  shot:', name);
}

async function signIn(page, role, target) {
  const c = CREDS[role];
  await page.goto(`${BASE}/login/${role}`, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  // The operator login puts the form on the right; pick the visible text field.
  const email = page.locator('input[type="text"]:visible').first();
  const pass = page.locator('input[type="password"]:visible').first();
  await email.fill(c.email);
  await pass.fill(c.pass);
  await page.getByRole('button', { name: /Enter Command Center/i }).first()
    .click({ force: true, timeout: 15000 });
  await sleep(3500);
  if (target) {
    await page.goto(`${BASE}${target}`, { waitUntil: 'domcontentloaded' });
    await sleep(3500);
  }
}

/** Any step may fail; a missed screenshot must not abandon the whole run. */
async function step(name, fn) {
  try { await fn(); }
  catch (e) { console.log(`  (${name} skipped: ${String(e.message).split('\n')[0].slice(0, 70)})`); }
}

(async () => {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  // This machine already has Chromium builds on disk from an earlier Playwright
  // install; the npm package here expects a newer build than the one present.
  // Reuse what exists rather than pulling another ~150 MB.
  const PW_BROWSERS = path.join(process.env.USERPROFILE || '', 'AppData', 'Local', 'ms-playwright');
  let executablePath;
  if (fs.existsSync(PW_BROWSERS)) {
    const dir = fs.readdirSync(PW_BROWSERS)
      .filter(d => d.startsWith('chromium-'))
      .sort()
      .reverse();
    for (const d of dir) {
      const exe = path.join(PW_BROWSERS, d, 'chrome-win64', 'chrome.exe');
      if (fs.existsSync(exe)) { executablePath = exe; break; }
    }
  }
  console.log(executablePath ? `using chromium: ${executablePath}` : 'using bundled chromium');

  const browser = await chromium.launch(
    executablePath ? { executablePath, channel: undefined } : {}
  );
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  page.on('pageerror', () => {}); // ignore app console noise

  // First-run welcome + guided tour overlays intercept every click and blur the
  // page behind them. Mark them seen up front rather than dismissing each.
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem('logisync-welcome-seen', 'true');
      localStorage.setItem('logisync-tutorial-completed', 'true');
      localStorage.setItem('logisync-tutorial', 'false');
    } catch (e) { /* storage unavailable */ }
  });

  console.log('capturing...');

  // 1. Marketing landing — full-bleed India map hero
  await step('landing', async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await sleep(4000);
    await shot(page, '01_landing_hero');
  });

  // 2. Port admin sign-in (operator console, "back to sign in" bottom-left)
  await step('login', async () => {
    await page.goto(`${BASE}/login/port_admin`, { waitUntil: 'domcontentloaded' });
    await sleep(3000);
    await shot(page, '02_login_port_admin');
  });

  // 3. Port admin — User Management dashboard tab
  await step('admin-dash', async () => {
    await signIn(page, 'port_admin', '/admin/users');
    await sleep(2000);
    await shot(page, '03_admin_users_dashboard');
  });

  // 4. Port admin — Users tab (rosters)
  await step('admin-rosters', async () => {
    await page.getByRole('tab', { name: /^Users$/i }).first()
      .click({ force: true, timeout: 8000 });
    await sleep(1600);
    await shot(page, '04_admin_users_rosters');
  });

  // 5. Fleet manager console — schedule creator with steppers + earnings
  await step('fm', async () => {
    await signIn(page, 'fleet_manager', '/fleet-manage');
    await sleep(3000);
    await shot(page, '05_fleet_manager_console');
  });

  // 6. Driver — jobs feed
  await step('driver-jobs', async () => {
    await signIn(page, 'driver', '/jobs');
    await sleep(2500);
    await shot(page, '06_driver_jobs');
  });

  // 7. Driver — home
  await step('driver-home', async () => {
    await page.goto(`${BASE}/home`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await shot(page, '07_driver_home');
  });

  // 8. Consumer — booking, package & handling step
  await step('consumer-book', async () => {
    await signIn(page, 'consumer', '/consumer/book');
    await sleep(2500);
    await page.getByRole('button', { name: /^Continue$/i }).first().click({ force: true });
    await sleep(1200);
    await page.getByRole('button', { name: /^Continue$/i }).first().click({ force: true });
    await sleep(1800);
    for (const label of ['Fragile', 'Keep upright']) {
      try {
        await page.getByRole('button', { name: new RegExp(label, 'i') }).first()
          .click({ force: true, timeout: 3000 });
        await sleep(600);
      } catch (e) { /* chip absent */ }
    }
    await sleep(900);
    await shot(page, '08_consumer_package_handling');
  });

  // 9. Consumer — review & pay
  await step('consumer-pay', async () => {
    await page.getByRole('button', { name: /Review\s*&?\s*pay/i }).first()
      .click({ force: true, timeout: 8000 });
    await sleep(2500);
    await shot(page, '09_consumer_review_pay');
  });

  // 10. Consumer — orders list
  await step('consumer-orders', async () => {
    await page.goto(`${BASE}/consumer/orders`, { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await shot(page, '10_consumer_orders');
  });

  // 11. Analytics — tier breakdown
  await step('analytics', async () => {
    await signIn(page, 'port_admin', '/analytics');
    await sleep(4000);
    await shot(page, '11_analytics');
  });

  // 12. Analytics — scrolled to charts
  await step('analytics-charts', async () => {
    await page.mouse.wheel(0, 950);
    await sleep(2200);
    await shot(page, '12_analytics_charts');
  });

  await browser.close();
  console.log('done ->', OUT);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });