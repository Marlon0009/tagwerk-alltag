import { entry, date } from "./core.mjs";
export function health(rows, existing) {
  if (!Array.isArray(rows)) throw Error("Liste mit Messungen erwartet.");
  let out = [],
    skip = 0;
  for (let r of rows) {
    let units = {
      Schritte: "count",
      Gewicht: "kg",
      Training: "min",
      Schlaf: "min",
    };
    if (
      !Object.hasOwn(units, r.type) ||
      r.unit !== units[r.type] ||
      !r.source ||
      !r.id ||
      !Number.isFinite(r.value) ||
      r.value < 0 ||
      ![r.start, r.end].every(
        (v) =>
          typeof v === "string" &&
          /(Z|[+-]\d\d:\d\d)$/.test(v) &&
          Number.isFinite(Date.parse(v)),
      ) ||
      Date.parse(r.end) < Date.parse(r.start)
    )
      throw Error("Ungültige Messung, Einheit oder Zeitzone.");
    let id = "health:" + r.source + ":" + r.id;
    if (
      [...existing, ...out].some(
        (e) =>
          e.id === id ||
          (e.origin &&
            e.type === r.type &&
            ((Date.parse(e.rawStart) < Date.parse(r.end) &&
              Date.parse(e.rawEnd) > Date.parse(r.start)) ||
              (Date.parse(e.rawStart) === Date.parse(r.start) &&
                Date.parse(e.rawEnd) === Date.parse(r.end)))),
      )
    ) {
      skip++;
      continue;
    }
    out.push(
      entry(r.type, r.type + " · " + r.source, {
        id,
        area: r.type === "Schlaf" ? "Schlaf & Energie" : "Training",
        day: date(new Date(r.start)),
        value: r.value,
        unit: r.unit,
        origin: r.source,
        rawStart: r.start,
        rawEnd: r.end,
        note: r.start + " – " + r.end,
      }),
    );
  }
  return { out, skip };
}
export function calendarImport(src) {
  const blocks =
    src.replace(/\r?\n[ \t]/g, "").match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ||
    [];
  if (!blocks.length) throw Error("Keine Kalendertermine gefunden.");
  return blocks.map((b) => {
    const get = (k) =>
      b.match(new RegExp("^" + k + "(?:;[^:\\r\\n]*)?:(.*)$", "m"))?.[1].trim();
    const dt = (k) => {
      let raw = get(k);
      if (!raw) return "";
      let m = raw.match(/^(\d{4})(\d\d)(\d\d)(?:T(\d\d)(\d\d)(\d\d)(Z)?)?$/);
      if (!m) throw Error("Kalenderdatum unlesbar.");
      let local =
        m[1] +
        "-" +
        m[2] +
        "-" +
        m[3] +
        "T" +
        (m[4] || "00") +
        ":" +
        (m[5] || "00");
      if (m[7]) {
        let d = new Date(local + "Z");
        return date(d) + "T" + d.toTimeString().slice(0, 5);
      }
      return local;
    };
    if (/RRULE:|RECURRENCE-ID/.test(b))
      throw Error("Serien bitte als einzelne Termine exportieren.");
    let tz = b.match(/TZID=([^:\r\n]+)/)?.[1];
    if (tz && tz !== Intl.DateTimeFormat().resolvedOptions().timeZone)
      throw Error("Fremde Zeitzone: bitte als UTC exportieren.");
    let start = dt("DTSTART"),
      end = dt("DTEND");
    if (!get("UID") || !start) throw Error("UID oder Beginn fehlt.");
    return entry("Dienst", get("SUMMARY") || "Dienst", {
      id: "ics:" + get("UID"),
      area: "Dienst",
      day: start.slice(0, 10),
      start,
      end,
    });
  });
}
export function promptFor(o) {
  return (
    "Auftrag " +
    o.id +
    " · " +
    o.kind +
    "\nAnlass: " +
    o.reason +
    "\nZiel: " +
    o.goal +
    "\nAusgewählte Kontakte und Anlagen:\n" +
    JSON.stringify(o.people, null, 2) +
    '\nDurchsuche mein verbundenes Gmail ausschließlich zu diesen Kontakten und diesem Anlass. Lies einschlägige Verläufe. Fehlt ein Ansprechpartner, prüfe öffentliche Arbeitgeberquellen und nenne die Fundstelle. Erfinde keine Adresse. Sammle unklare Treffer als Rückfrage. Prüfe für jede Anlage die richtige und tatsächlich verfügbare Datei. Schreibe individuelles natürliches Deutsch ohne Standardfloskeln, erfundene Qualifikationen oder Nacherzählung meines Lebenslaufs. Zeige je Nachricht Empfänger, Betreff, vollständigen Text und Anlagen. Erst nach Einzelfreigabe oder Bestätigung einer konkret angezeigten Gruppe senden. Separate E-Mail je Person. Trenne Entwurf, Freigabe und bestätigten Versand. Unklaren Versand vor Wiederholung prüfen. Gib Zusammenfassung und JSON zurück: {"orderId":"' +
    o.id +
    '","results":[{"entryId":"ID aus Liste","status":"Entwurf|Freigegeben|Gesendet|Unklar|Antwort geprüft","at":"ISO-Zeit mit Zeitzone","next":"Nächster Schritt","gmailId":"bei Versand bestätigte Gmail-ID","checkedAt":"nur bei tatsächlicher Postfachprüfung"}]}.'
  );
}
export function reconcile(order, payload) {
  if (payload.orderId !== order.id || !Array.isArray(payload.results))
    throw Error("Auftrag stimmt nicht überein.");
  let people = structuredClone(order.people),
    changed = 0;
  for (let r of payload.results) {
    let p = people.find((p) => p.entryId === r.entryId);
    if (
      !p ||
      ![
        "Entwurf",
        "Freigegeben",
        "Gesendet",
        "Unklar",
        "Antwort geprüft",
      ].includes(r.status) ||
      !Number.isFinite(Date.parse(r.at)) ||
      typeof r.next !== "string" ||
      (r.status === "Gesendet" && !r.gmailId)
    )
      throw Error("ID, Zeitpunkt, Status oder Gmail-Bestätigung fehlt.");
    if (p.at && Date.parse(p.at) >= Date.parse(r.at)) continue;
    if (
      p.status === "Gesendet" &&
      ["Freigegeben", "Entwurf", "Unklar"].includes(r.status)
    )
      continue;
    Object.assign(p, {
      status: r.status,
      at: r.at,
      next: r.next,
      gmailId: r.gmailId || p.gmailId,
      checkedAt: Number.isFinite(Date.parse(r.checkedAt))
        ? r.checkedAt
        : p.checkedAt,
    });
    changed++;
  }
  return { order: { ...order, people }, changed };
}
