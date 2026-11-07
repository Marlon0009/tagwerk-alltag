import test from "node:test";
import assert from "node:assert/strict";
import { drafts, shiftTimes, groqHints } from "../everyday.mjs";
test("Verschieben referenziert die benannte Aufgabe und das lokale Zieldatum", () => {
  const [p] = drafts("Verschiebe Entwurf auf morgen", "2026-12-31");
  assert.deepEqual(
    [p.kind, p.title, p.day],
    ["Aufgabe verschieben", "Entwurf", "2027-01-01"],
  );
});
test("Alltagssatz ergibt sechs getrennte Aktionen über den Jahreswechsel", () => {
  const rows = drafts(
    "Creme drauf, 2 Seiten von Beispielbuch gelesen, 1 Folge Beispielserie, neue Creme gekauft Gesicht Feuchtigkeit, übermorgen und den Tag danach Arbeit Nachtschicht",
    "2026-12-30",
  );
  assert.deepEqual(
    rows.map((r) => r.type),
    ["Pflegeroutine", "Lesen", "Serie", "Pflegeprodukt", "Dienst", "Dienst"],
  );
  assert.deepEqual(
    rows.slice(-2).map((r) => r.day),
    ["2027-01-01", "2027-01-02"],
  );
  assert.equal(rows[1].value, 2);
  assert.equal(rows[2].value, 1);
  assert.equal(rows[3].title, "Creme Gesicht Feuchtigkeit");
  assert.deepEqual(shiftTimes(rows[4].day, "22:00", "06:00"), {
    start: "2027-01-01T22:00",
    end: "2027-01-02T06:00",
  });
  assert.throws(() => shiftTimes(rows[4].day, "", "06:00"));
});
test("Einzelwerte und Lernfortsetzung bleiben erhalten", () => {
  assert.equal(drafts("Gewicht 96,4 kg")[0].value, 96.4);
  assert.equal(
    drafts("35 Minuten IU gelernt, morgen mit Abschnitt 2 weitermachen").length,
    1,
  );
  assert.equal(drafts("Aufgabe Entwurf erledigt")[0].title, "Entwurf");
});
test("Groq akzeptiert ausschließlich erlaubte Kategorien mit passender Anzahl", async (t) => {
  const response = (categories) =>
    new Response(
      JSON.stringify({
        choices: [
          { message: { content: JSON.stringify({ kategorien: categories }) } },
        ],
      }),
    );
  const stub = t.mock.method(globalThis, "fetch", async (url, opts) => {
    assert.equal(new URL(url).hostname, "api.groq.com");
    assert.equal(opts.headers.Authorization, "Bearer test");
    assert.match(opts.body, /Buch/);
    return response(["Lesen"]);
  });
  assert.deepEqual(await groqHints("Buch", "test", "modell"), ["Lesen"]);
  stub.mock.mockImplementation(async () => response(["Löschen"]));
  await assert.rejects(groqHints("Buch", "test", "modell"));
  stub.mock.mockImplementation(async () => new Response("", { status: 429 }));
  await assert.rejects(groqHints("Buch", "test", "modell"), /429/);
});
