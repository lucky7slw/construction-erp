const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3000/projects/new');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'screenshot.png', fullPage: true });

  console.log('Screenshot saved to screenshot.png');

  await browser.close();
})();
