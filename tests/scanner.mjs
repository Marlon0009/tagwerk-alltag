import { chromium } from "playwright";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
const server = spawn(process.execPath, ["server.mjs"], {
  env: { ...process.env, PORT: "5188" },
});
await new Promise((ok) => server.stdout.once("data", ok));
const browser = await chromium.launch({ channel: "msedge" });
try {
  const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await p.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d"),
        code = "4006381333931";
      const left = [
        "0001101",
        "0011001",
        "0010011",
        "0111101",
        "0100011",
        "0110001",
        "0101111",
        "0111011",
        "0110111",
        "0001011",
      ];
      const inverse = (x) =>
        Array.from(x, (c) => (c === "0" ? "1" : "0")).join("");
      const leftHalf = Array.from(code.slice(1, 7), (c, i) =>
        "LGLLGG"[i] === "L"
          ? left[c]
          : Array.from(inverse(left[c])).reverse().join(""),
      ).join("");
      const bits =
        "101" +
        leftHalf +
        "01010" +
        Array.from(code.slice(7), (c) => inverse(left[c])).join("") +
        "101";
      function draw() {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, 640, 360);
        ctx.fillStyle = "black";
        Array.from(bits).forEach((bit, i) => {
          if (bit === "1") ctx.fillRect(80 + i * 5, 70, 5, 220);
        });
      }
      draw();
      setInterval(draw, 100);
      return canvas.captureStream(10);
    };
  });
  await p.goto("http://localhost:5188/");
  await p.getByLabel("Scanner öffnen").click();
  await p.locator("[name=title]").waitFor({ timeout: 20000 });
  assert.equal(
    await p.locator("[name=note]").inputValue(),
    "Barcode 4006381333931",
  );
  console.log("OK: EAN-13 über simulierten Kamerastream erkannt");
} finally {
  server.kill();
  await browser.close();
}
