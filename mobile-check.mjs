import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// iPhone 14 viewport
await page.setViewportSize({ width: 390, height: 844 });
await page.goto("https://tenerify.vercel.app");
await page.waitForLoadState("networkidle");
await page.screenshot({ path: "/tmp/mobile-hero.png", fullPage: false });

// WHO screen
await page.click("button:has-text('Find my perfect experience')");
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/mobile-who.png" });

// Chat screen
const whoButtons = await page.$$("button.rounded-full:not([disabled])");
if (whoButtons[1]) await whoButtons[1].click();
await page.waitForSelector(".animate-bounce", { timeout: 5000 }).catch(() => {});
await page.waitForFunction(() => !document.querySelector(".animate-bounce"), { timeout: 15000 });
await page.waitForTimeout(500);
await page.screenshot({ path: "/tmp/mobile-chat.png" });

await browser.close();
console.log("done");
