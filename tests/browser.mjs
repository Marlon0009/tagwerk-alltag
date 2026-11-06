import { chromium } from "playwright";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
const server = spawn(process.execPath, ["server.mjs"], {
  env: { ...process.env, PORT: "5179" },
  stdio: ["ignore", "pipe", "inherit"],
});
await new Promise((ok) => server.stdout.once("data", ok));
const b = await chromium.launch({
  channel: process.env.BROWSER_CHANNEL || "msedge",
});
let errors = [];
const base = "http://localhost:5179",
  ctx = await b.newContext({
    viewport: { width: 375, height: 812 },
    reducedMotion: "reduce",
  }),
  p = await ctx.newPage();
p.on("pageerror", (e) => errors.push(e.message));
const button = (name) => p.getByRole("button", { name, exact: true }),
  click = (n) => button(n).click(),
  fill = (name, v) => p.locator('dialog [name="' + name + '"]').fill(v);
async function settings() {
  if (await p.locator("dialog[open]").count()) await click("Schließen");
  await p.locator(".mobile").getByText("Bereiche").click();
  await click("Einstellungen & Sicherung");
}
async function quick(t) {
  await click("Schnelleingabe");
  await fill("text", t);
  await click("Eingabe prüfen");
  await click("Eintrag speichern");
}
try {
  await p.goto(base);
  await click("Beispiel · Einrichten");
  await fill("goals", "IU-Hausarbeit");
  await click("Meinen Tag öffnen");
  await quick("Latzug 55 kg 3x10");
  await p.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((ok) =>
        navigator.serviceWorker.addEventListener("controllerchange", ok, {
          once: true,
        }),
      );
  });
  await ctx.setOffline(true);
  await p.reload();
  await p.locator(".mobile").getByText("Bereiche").click();
  await p.locator(".areaGrid").getByText("Training", { exact: true }).click();
  await p.getByRole("button", { name: /Latzug · zuletzt 55 kg/ }).waitFor();
  console.log("OK: Latzug nach Offline-Neustart");
  await ctx.setOffline(false);
  await settings();
  await click("Datei sichern");
  await fill("pw", "fiktives-testpasswort");
  let dl = p.waitForEvent("download");
  await click("Datei verschlüsseln");
  let backup = await readFile(await (await dl).path(), "utf8");
  assert.ok(!backup.includes("Latzug"));
  await settings();
  await click("Wiederherstellen");
  await p.locator("[name=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await fill("pw", "falsch");
  await click("Vorschau prüfen");
  await p.getByRole("alert").waitFor();
  await click("Schließen");
  console.log("OK: falsches Passwort abgewiesen");
  await settings();
  await click("Google Drive");
  await p.route("https://accounts.google.com/gsi/client", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: "window.google={accounts:{oauth2:{initTokenClient:config=>({requestAccessToken:()=>config.callback({access_token:'simuliert',expires_in:3600})})}}}",
    }),
  );
  await p.route("https://www.googleapis.com/upload/**", (route) =>
    route.abort(),
  );
  await fill("client", "fiktiv.apps.googleusercontent.com");
  await fill("pw", "fiktives-testpasswort");
  await click("Google-Freigabe öffnen");
  await p.getByText(/Für diese Sitzung freigegeben/).waitFor();
  await click("Jetzt sichern");
  await p.getByText("Letzte bestätigte Sicherung: Noch nie").waitFor();
  await p
    .locator("dialog")
    .getByText(/fetch|Netzwerk/i)
    .waitFor();
  await click("Sitzung trennen");
  await click("Schließen");
  console.log("OK: abgebrochener Upload ohne Erfolgsstatus");
  await p.locator(".mobile").getByText("Bereiche").click();
  await p.locator(".areaGrid").getByText("Haare & Kopfhaut").click();
  await click("Eintrag");
  await fill("title", "Fiktive Beobachtung");
  await fill("note", "Frage zur Verträglichkeit");
  await click("Eintrag speichern");
  await click("Termin vorbereiten");
  await p.locator("dialog input[type=checkbox]").check();
  await click("Zusammenfassung prüfen");
  let summary = await p.locator("[name=summary]").inputValue();
  assert.match(summary, /Verträglichkeit/);
  assert.doesNotMatch(summary, /Latzug|Hausarbeit/);
  console.log("OK: Arztübersicht auf ausgewählte Kopfhauteinträge begrenzt");
  await click("Schließen");
  await p.setViewportSize({ width: 320, height: 640 });
  await p.locator(".mobile").getByText("Heute").click();
  await p.addStyleTag({ content: "body{font-size:24px}" });
  assert.ok(
    await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  );
  await click("Schnelleingabe");
  await click("Schließen");
  console.log("OK: 320 Pixel, vergrößerte Schrift, Dialog bedienbar");
  const clean = await b.newContext(),
    cp = await clean.newPage();
  await cp.goto(base);
  await cp.locator("aside").getByText("Einstellungen").click();
  await cp
    .getByRole("button", { name: "Wiederherstellen", exact: true })
    .click();
  await cp.locator("[name=file]").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backup),
  });
  await cp.locator("[name=pw]").fill("fiktives-testpasswort");
  await cp.getByText("Vorschau prüfen", { exact: true }).click();
  await cp.getByText("Diesen Stand wiederherstellen").click();
  await cp.reload();
  await cp.locator("aside").getByText("Training", { exact: true }).click();
  await cp.getByRole("button", { name: /Latzug · zuletzt 55 kg/ }).waitFor();
  console.log("OK: leere Installation aus Datei wiederhergestellt");
  await cp.evaluate(async () => {
    const db = await new Promise((ok) => {
      const request = indexedDB.open("tagwerk", 1);
      request.onsuccess = () => ok(request.result);
    });
    await new Promise((ok) => {
      const tx = db.transaction("data", "readwrite");
      tx.objectStore("data").put(
        {
          schema: 1,
          entries: [
            {
              id: "altbestand",
              day: "2026-10-01",
              title: "Alte Notiz",
              area: "Studium",
              type: "Notiz",
            },
          ],
        },
        "current",
      );
      tx.oncomplete = ok;
    });
    db.close();
  });
  await cp.reload();
  await cp.locator("aside").getByText("Verlauf", { exact: true }).click();
  await cp.getByRole("button", { name: /Alte Notiz/ }).click();
  await cp.getByRole("button", { name: "Bearbeiten", exact: true }).click();
  await cp.locator("[name=note]").fill("Nach Update bearbeitet");
  await cp.getByRole("button", { name: "Eintrag speichern" }).click();
  await cp.getByText("Eintrag gespeichert", { exact: true }).waitFor();
  console.log("OK: IndexedDB-Altbestand nach Migration bearbeitbar");
  await cp.locator("aside").getByText("Karriere", { exact: true }).click();
  await cp.getByRole("button", { name: "E-Mail-Auftrag", exact: true }).click();
  for (const [name, value] of Object.entries({
    people: "Firma Beispiel",
    goal: "Entwurf",
    reason: "Anfrage",
  }))
    await cp.locator('[name="' + name + '"]').fill(value);
  await cp.getByText("Auftrag erstellen", { exact: true }).click();
  await cp.evaluate(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: () =>
          Promise.reject(new DOMException("Abgelehnt", "NotAllowedError")),
      },
    }),
  );
  await cp.getByText("Auftrag kopieren", { exact: true }).click();
  await cp
    .getByRole("alert")
    .getByText(/Text ausgewählt/)
    .waitFor();
  console.log("OK: abgelehnte Zwischenablage mit manueller Kopierauswahl");
  assert.deepEqual(errors, []);
} finally {
  await b.close();
  server.kill();
}
