import { chromium } from "playwright";

const browser = await chromium.launch({ headless: false, slowMo: 200 });
const page = await browser.newPage();
await page.goto("http://localhost:3000");
await page.waitForLoadState("networkidle");

// Click "Find my perfect experience"
await page.click("button:has-text('Find my perfect experience')");
await page.waitForTimeout(800);

// Click "Couple" — enabled WHO button
await page.locator("button:enabled:has-text('💑 Couple')").click();
console.log("Clicked Couple");

// Helper: wait for loading to stop and get visible option buttons
async function waitAndGetOptions() {
  // Wait for loading dots to disappear (loading state ends)
  await page.waitForFunction(
    () => !document.querySelector(".animate-bounce"),
    { timeout: 15000 }
  );
  await page.waitForTimeout(300);
  const btns = await page.$$eval(
    "div.flex.flex-wrap button.rounded-full:not([disabled])",
    els => els.map(b => b.textContent?.trim()).filter(Boolean)
  );
  return btns;
}

async function clickOption(text) {
  const btn = page.locator(`button.rounded-full:not([disabled]):has-text("${text}")`).first();
  if (await btn.count() > 0) {
    console.log(`Clicking: ${text}`);
    await btn.click();
    return true;
  }
  return false;
}

// Round 1
const opts1 = await waitAndGetOptions();
console.log("Round 1 options:", opts1);

// Click Adventure or similar
const adventureOpt = opts1.find(o => /adventure|thrill|activ/i.test(o));
if (adventureOpt) {
  await clickOption(adventureOpt);
} else if (opts1[0]) {
  await clickOption(opts1[0]);
}

// Round 2
const opts2 = await waitAndGetOptions();
console.log("Round 2 options:", opts2);

// Click Speed/buggy/wheels
const speedOpt = opts2.find(o => /speed|buggy|wheel|quad|land/i.test(o));
if (speedOpt) {
  await clickOption(speedOpt);
} else if (opts2[0]) {
  await clickOption(opts2[0]);
}

// Round 3
const opts3 = await waitAndGetOptions();
console.log("Round 3 options:", opts3);
if (opts3[0]) await clickOption(opts3[0]);

// Round 4
const opts4 = await waitAndGetOptions();
console.log("Round 4 options:", opts4);
if (opts4[0]) await clickOption(opts4[0]);

// Round 5 — should be specific recommendation by now
const opts5 = await waitAndGetOptions();
console.log("Round 5 options:", opts5);

// Check for media
const images = await page.$$eval("img[alt]", imgs => imgs.map(i => ({ src: i.src, alt: i.alt })));
const iframes = await page.$$eval("iframe", frames => frames.map(f => f.src));
const waButtons = await page.$$eval("a[href*='wa.me']", links => links.length);

console.log("\n=== RESULTS ===");
console.log("Tour images:", images.length, images.map(i => i.src.slice(0, 80)));
console.log("Video iframes:", iframes.length, iframes);
console.log("WhatsApp buttons:", waButtons);

// Wait for images to finish loading
await page.waitForLoadState("networkidle").catch(() => {});
await page.waitForTimeout(2000);
await page.screenshot({ path: "/tmp/tenerify-media-test.png", fullPage: true });
console.log("Screenshot: /tmp/tenerify-media-test.png");

await browser.close();
