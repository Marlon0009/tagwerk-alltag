export const areas = [
  "Studium",
  "Training",
  "Schlaf & Energie",
  "Karriere",
  "Ernährung",
  "Haare & Kopfhaut",
  "Geld & Verträge",
  "Wohnung",
  "Beziehungen",
  "Kreative Projekte",
  "Hautpflege",
  "Auftreten",
  "Sprache",
  "Fähigkeiten",
];
export const uid = () => crypto.randomUUID();
export function date(d = new Date()) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export function plus(day, n) {
  let d = new Date(day + "T12:00");
  d.setDate(d.getDate() + n);
  return date(d);
}
export function fresh() {
  return {
    schema: 2,
    rev: 0,
    entries: [],
    energy: "Normal",
    hidden: [],
    auto: [],
    goal: 87,
    orders: [],
    demo: false,
  };
}
export function migrate(s) {
  if (
    ![1, 2].includes(s.schema) ||
    !Array.isArray(s.entries) ||
    s.entries.some(
      (e) =>
        !e ||
        typeof e.id !== "string" ||
        typeof e.title !== "string" ||
        !/^\d{4}-\d\d-\d\d$/.test(e.day),
    ) ||
    new Set(s.entries.map((e) => e.id)).size !== s.entries.length
  )
    throw Error("Ungültiger Datenstand");
  let n = { ...fresh(), ...s, schema: 2 };
  if (
    !Array.isArray(n.orders) ||
    !Array.isArray(n.hidden) ||
    !Array.isArray(n.auto) ||
    !n.orders.every(
      (o) =>
        typeof o.id === "string" &&
        Array.isArray(o.people) &&
        o.people.every(
          (p) => typeof p.entryId === "string" && typeof p.label === "string",
        ),
    ) ||
    !Number.isInteger(n.rev) ||
    n.rev < 0 ||
    n.entries.some(
      (e) =>
        typeof e.type !== "string" ||
        typeof e.area !== "string" ||
        (e.start && typeof e.start !== "string") ||
        (e.end && typeof e.end !== "string") ||
        (e.photo &&
          !/^data:image\/(jpeg|png|webp|gif|heic|heif);base64,/.test(e.photo)),
    )
  )
    throw Error("Ungültige Einträge oder Einstellungen");
  return n;
}
export function entry(type, title, extra = {}) {
  return { id: uid(), day: date(), type, title, area: "Studium", ...extra };
}
export function demo() {
  let s = fresh(),
    d = date();
  s.demo = true;
  s.entries = [
    entry("Dienst", "Nachtschicht", {
      area: "Dienst",
      start: d + "T22:00",
      end: plus(d, 1) + "T06:00",
    }),
    entry("Aufgabe", "IU-Hausarbeit", {
      step: "Öffne den Entwurf und schreibe drei Stichpunkte für Abschnitt 2.",
      minutes: 35,
    }),
    entry("Aufgabe", "Rückentraining", {
      area: "Training",
      step: "Lege dein Trainingsbuch bereit und beginne mit dem Aufwärmen.",
      minutes: 45,
    }),
    entry("Aufgabe", "Bewerbung vorbereiten", {
      area: "Karriere",
      step: "Öffne die Stellenanzeige und markiere eine Anforderung.",
      minutes: 20,
    }),
    entry("Schlaf", "Erholung nach dem Dienst", {
      area: "Schlaf & Energie",
      start: d + "T07:00",
      end: d + "T14:00",
    }),
  ];
  return s;
}
function weekday(word) {
  let days = [
      "sonntag",
      "montag",
      "dienstag",
      "mittwoch",
      "donnerstag",
      "freitag",
      "samstag",
    ],
    n = days.indexOf(word.toLowerCase());
  return n < 0 ? date() : plus(date(), (n - new Date().getDay() + 7) % 7 || 7);
}
export function parse(t) {
  let m;
  if ((m = t.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*kg\s+(\d+)\s*[x×]\s*(\d+)$/i)))
    return entry("Training", m[1], {
      area: "Training",
      value: +m[2].replace(",", "."),
      sets: +m[3],
      reps: +m[4],
    });
  if ((m = t.match(/^gewicht\s+(\d+(?:[.,]\d+)?)\s*kg/i)))
    return entry("Gewicht", "Körpergewicht", {
      area: "Training",
      value: +m[1].replace(",", "."),
    });
  if ((m = t.match(/^(\d+)\s*minuten?\s+(.+?)\s+gelernt[, ]*(.*)/i)))
    return entry("Lernzeit", m[2], { minutes: +m[1], step: m[3] });
  if ((m = t.match(/^dienst (\w+) (\d{1,2}) bis (\w+) (\d{1,2})/i))) {
    let d = weekday(m[1]),
      days = [
        "sonntag",
        "montag",
        "dienstag",
        "mittwoch",
        "donnerstag",
        "freitag",
        "samstag",
      ],
      a = days.indexOf(m[1].toLowerCase()),
      b = days.indexOf(m[3].toLowerCase());
    if (a < 0 || b < 0 || Number(m[2]) > 23 || Number(m[4]) > 23)
      return entry("Notiz", t);
    let end = plus(
      d,
      (b - a + 7) % 7 || (Number(m[4]) <= Number(m[2]) ? 1 : 0),
    );
    return entry("Dienst", "Dienst", {
      area: "Dienst",
      day: d,
      start: d + "T" + m[2].padStart(2, "0") + ":00",
      end: end + "T" + m[4].padStart(2, "0") + ":00",
    });
  }
  if ((m = t.match(/^bei (.+?) nächsten (\w+) nachfassen/i)))
    return entry("Frist", m[1] + " nachfassen", {
      area: "Karriere",
      day: weekday(m[2]),
    });
  return entry("Notiz", t);
}
export function plan(s, d = date(), now = new Date()) {
  const fixed = s.entries.filter(
      (e) =>
        ["Dienst", "Termin", "Schlaf", "Frist"].includes(e.type) &&
        e.day <= d &&
        (e.end?.slice(0, 10) || e.day) >= d,
    ),
    tasks = s.entries
      .filter(
        (e) =>
          e.type === "Aufgabe" &&
          e.day === d &&
          !["erledigt", "pausiert"].includes(e.status),
      )
      .sort(
        (a, b) =>
          (a.due || "9999").localeCompare(b.due || "9999") ||
          Number(b.area === s.focus) - Number(a.area === s.focus),
      )
      .slice(0, s.energy === "Minimum" ? 1 : 3);
  let cursor = new Date(d + "T" + (s.demo ? "15:00" : "08:00"));
  if (!s.demo && date(now) === d && cursor < now) cursor = new Date(now);
  let blocks = fixed.map((e) => ({ ...e }));
  for (let e of s.entries.filter(
    (e) => e.type === "Aufgabe" && e.due === d && e.status !== "erledigt",
  ))
    blocks.push({ ...e, type: "Frist", title: "Frist · " + e.title });
  const night = fixed.find(
    (e) =>
      e.type === "Dienst" &&
      e.start?.slice(0, 10) < d &&
      e.end?.slice(0, 10) === d,
  );
  if (night && !fixed.some((e) => e.type === "Schlaf")) {
    let recovery = {
      ...entry("Schlaf", "Erholung einplanen", {
        day: d,
        area: "Schlaf & Energie",
      }),
      start: night.end,
      end:
        d +
        "T" +
        String(Math.min(23, Number(night.end.slice(11, 13)) + 2)).padStart(
          2,
          "0",
        ) +
        night.end.slice(13),
      suggest: true,
    };
    blocks.push(recovery);
    fixed.push(recovery);
  }
  for (const t of tasks) {
    let len =
      (s.energy === "Minimum"
        ? 5
        : t.minutes || (s.energy === "Viel Energie" ? 45 : 20)) * 60000;
    for (const f of fixed
      .filter((e) => e.start && e.end)
      .sort((a, b) => a.start.localeCompare(b.start)))
      if (cursor < new Date(f.end) && +cursor + len > +new Date(f.start))
        cursor = new Date(f.end);
    if (date(new Date(+cursor + len)) === d) {
      blocks.push({
        ...t,
        slot: cursor.toTimeString().slice(0, 5),
        suggest: !s.auto.includes(t.area),
      });
      cursor = new Date(+cursor + len + 15 * 60000);
    }
  }
  return {
    tasks,
    fixed,
    blocks: blocks.sort((a, b) =>
      (a.slot || a.start?.slice(11) || "23:59").localeCompare(
        b.slot || b.start?.slice(11) || "23:59",
      ),
    ),
  };
}
const b64 = (a) =>
    btoa(Array.from(new Uint8Array(a), (x) => String.fromCharCode(x)).join("")),
  un = (s) => Uint8Array.from(atob(s), (x) => x.charCodeAt(0));
async function key(p, salt) {
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 310000, hash: "SHA-256" },
    await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(p),
      "PBKDF2",
      false,
      ["deriveKey"],
    ),
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}
export async function seal(s, p) {
  let salt = crypto.getRandomValues(new Uint8Array(16)),
    iv = crypto.getRandomValues(new Uint8Array(12));
  return {
    format: "tagwerk-1",
    salt: b64(salt),
    iv: b64(iv),
    data: b64(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        await key(p, salt),
        new TextEncoder().encode(JSON.stringify(s)),
      ),
    ),
  };
}
export async function unlock(b, p) {
  if (b.format !== "tagwerk-1") throw Error("Unbekanntes Sicherungsformat");
  return migrate(
    JSON.parse(
      new TextDecoder().decode(
        await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: un(b.iv) },
          await key(p, un(b.salt)),
          un(b.data),
        ),
      ),
    ),
  );
}
