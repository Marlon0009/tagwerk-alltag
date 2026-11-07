import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const server = spawn(process.execPath, ["server.mjs"], {
  env: { ...process.env, PORT: "5192" },
});
await new Promise((resolve) => server.stdout.once("data", resolve));
const browser = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "msedge",
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto("http://localhost:5192/");
  const bar = page.getByRole("button", { name: "Tagesübersicht öffnen" });
  await bar.click();
  await page.waitForFunction(
    () => document.querySelector("dialog").style.transform === "",
  );
  const grip = page.getByRole("button", { name: "Tagesübersicht schließen" });
  const bounds = await grip.boundingBox(),
    x = bounds.x + bounds.width / 2,
    y = bounds.y + 14;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + 85, { steps: 8 });
  const displacement = await page
    .locator("dialog")
    .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42);
  assert.ok(displacement >= 80 && displacement <= 90, "Blatt folgt dem Zeiger");
  await page.mouse.move(x, y + 12, { steps: 6 });
  await page.mouse.up();
  await page.waitForFunction(
    () =>
      document.querySelector("dialog").open &&
      !document.querySelector("dialog").style.transform,
  );
  await grip.click();
  await page.locator("dialog").waitFor({ state: "hidden" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByLabel("Menü öffnen").click();
  assert.equal(
    await page
      .locator("dialog")
      .evaluate((el) => getComputedStyle(el).transform),
    "none",
  );
  assert.equal(
    await page.locator("dialog [aria-current=page]").innerText(),
    "Tagebuch",
  );
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addStyleTag({ content: "html{font-size:200%}" });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  console.log(
    "OK: Ziehen, Richtungswechsel, Schließen, reduzierte Bewegung und 200 % Schrift",
  );
} finally {
  server.kill();
  await browser.close();
}
