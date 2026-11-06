import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  fresh,
  demo,
  date,
  plus,
  parse,
  plan,
  entry,
  seal,
  unlock,
  migrate,
} from "../core.mjs";
import { reconcile, health, calendarImport, promptFor } from "../exchange.mjs";
test("Nachtschicht, Schlaf, feste Frist und Minimum", () => {
  let shift = parse("Dienst Freitag 22 bis Samstag 6 Uhr"),
    d = shift.end.slice(0, 10),
    s = fresh();
  assert.equal(shift.end.slice(11), "06:00");
  assert.equal(d, plus(shift.day, 1));
  s.energy = "Minimum";
  s.entries = [
    shift,
    entry("Schlaf", "Schlaf", {
      day: d,
      start: d + "T06:00",
      end: d + "T14:00",
    }),
    entry("Frist", "Abgabe", { day: d }),
    ...["A", "B"].map((t) => entry("Aufgabe", t, { day: d })),
  ];
  let p = plan(s, d, new Date(d + "T07:00"));
  assert.equal(p.tasks.length, 1);
  assert.equal(p.fixed.length, 3);
  assert.equal(p.blocks.find((e) => e.slot).slot, "14:00");
});
test("Vier weitere Schnelleingaben, unbekannter Text", () => {
  assert.equal(parse("Latzug 55 kg 3x10").reps, 10);
  assert.equal(parse("Gewicht 96,4 kg").value, 96.4);
  assert.match(
    parse("35 Minuten IU gelernt, morgen mit Abschnitt 2 weitermachen").step,
    /Abschnitt 2/,
  );
  assert.equal(
    parse("Bei Firma Beispiel nächsten Dienstag nachfassen").type,
    "Frist",
  );
  assert.equal(parse("Freier Text").type, "Notiz");
});
test("Wiedereinstieg nach Pause, Notiz bleibt erhalten", () => {
  let s = fresh(),
    e = entry("Aufgabe", "IU", {
      day: plus(date(), -7),
      step: "Abschnitt 2",
      status: "unterbrochen",
    });
  s.entries = [e];
  assert.equal(plan(s).tasks.length, 0);
  e.day = date();
  assert.equal(plan(s).tasks[0].step, "Abschnitt 2");
});
test("Teilfreigabe, Namensgleichheit, verschiedene Anlagen, idempotent", () => {
  let o = {
      id: "auftrag",
      people: [
        { entryId: "a", label: "Alex", files: "A.pdf" },
        { entryId: "b", label: "Alex", files: "B.pdf" },
        { entryId: "c", label: "Beispielfirma" },
      ],
    },
    p = {
      orderId: o.id,
      results: [
        {
          entryId: "b",
          status: "Freigegeben",
          at: "2026-10-01T12:00:00Z",
          next: "Versand prüfen",
        },
      ],
    };
  let r = reconcile(o, p);
  assert.equal(r.changed, 1);
  assert.equal(r.order.people[0].status, undefined);
  assert.equal(r.order.people[1].files, "B.pdf");
  assert.equal(reconcile(r.order, p).changed, 0);
  assert.equal(
    reconcile(r.order, {
      ...p,
      results: [{ ...p.results[0], at: "2026-09-01T12:00Z" }],
    }).changed,
    0,
  );
  assert.throws(() =>
    reconcile(o, { ...p, results: [{ ...p.results[0], status: "Gesendet" }] }),
  );
  assert.match(promptFor(o), /öffentliche Arbeitgeberquellen/);
});
test("Health zweimal und überlappende Quelle", () => {
  let rows = JSON.parse(
      fs.readFileSync(new URL("../examples/health.json", import.meta.url)),
    ),
    r = health(rows, []);
  assert.equal(r.out.length, 4);
  assert.equal(health(rows, r.out).skip, 4);
  assert.equal(health([{ ...rows[0], source: "Andere Uhr" }], r.out).skip, 1);
});
test("Kalender behält stabile UID", () => {
  let str =
    "BEGIN:VEVENT\nUID:gleich\nSUMMARY:Nacht\nDTSTART:20261204T220000\nDTEND:20261205T060000\nEND:VEVENT";
  assert.equal(calendarImport(str)[0].id, calendarImport(str)[0].id);
});
test("Verschlüsselte Sicherung, falsches Passwort, Manipulation und leere Installation", async () => {
  let s = demo(),
    b = await seal(s, "fiktives-passwort");
  await assert.rejects(unlock(b, "falsch"));
  await assert.rejects(
    unlock({ ...b, data: "AAAA" + b.data.slice(4) }, "fiktives-passwort"),
  );
  let restored = await unlock(b, "fiktives-passwort");
  assert.deepEqual(restored, s);
  assert.ok(!JSON.stringify(b).includes("Nachtschicht"));
});
test("Migration mit vorhandenen Daten", () => {
  let old = { schema: 1, entries: [entry("Notiz", "Bestand")] };
  let n = migrate(old);
  assert.deepEqual(n.entries, old.entries);
  assert.equal(n.schema, 2);
  assert.deepEqual(n.orders, []);
});
