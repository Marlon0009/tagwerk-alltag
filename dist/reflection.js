import { date, plus, entry } from "./core.mjs";
export function remindersFor(s) {
  let now = new Date(),
    time = now.toTimeString().slice(0, 5),
    q = s.quiet || "22:00",
    w = s.wake || "08:00";
  if (
    (q > w ? time >= q || time < w : time >= q && time < w) ||
    s.entries.some(
      (e) =>
        e.type === "Schlaf" &&
        new Date(e.start) <= now &&
        new Date(e.end) > now,
    )
  )
    return [];
  let d = date(),
    conditions = [
      s.entries.some((e) => e.type === "Frist" && e.day === d),
      "checkin" !==
        s.entries.find((e) => e.day === d && e.kind === "checkin")?.kind,
      s.orders.some((o) =>
        o.people.some((p) => p.status === "Gesendet" && !p.checkedAt),
      ),
      s.entries.some(
        (e) =>
          e.type === "Aufgabe" &&
          e.day < d &&
          !["pausiert", "erledigt"].includes(e.status),
      ),
    ];
  return [
    "Heute ist eine Frist fällig.",
    "Dein heutiger Check-in ist offen.",
    "Für offene Kontakte steht eine Antwortprüfung aus.",
    "Frühere Aufgaben können neu geplant werden.",
  ].filter((_, i) => s.reminders?.[i] && conditions[i]);
}
export function metrics(s, a) {
  let d = date(),
    week = s.entries.filter(
      (e) => e.area === a && e.day <= d && e.day >= plus(d, -6),
    ),
    done = s.entries.filter(
      (e) => e.area === a && e.completed >= plus(d, -6) && e.completed <= d,
    );
  if (a === "Studium") {
    let learn = week.filter(
      (e) => e.type === "Lernzeit" && Number.isFinite(e.minutes),
    );
    return [
      learn.length
        ? learn.reduce((n, e) => n + e.minutes, 0) + " Lernminuten"
        : "Lernzeit offen",
      done.length + " Ergebnisse erledigt",
    ];
  }
  if (a === "Training") {
    let weights = week
      .filter((e) => e.type === "Gewicht" && Number.isFinite(e.value))
      .sort((a, b) => a.day.localeCompare(b.day));
    return [
      week.filter((e) => e.type === "Training").length + " Trainingseinträge",
      weights.length >= 2
        ? "Gewichtsänderung " +
          (weights.at(-1).value - weights[0].value).toFixed(1) +
          " kg"
        : weights.length
          ? "Einzelmessung " + weights[0].value + " kg"
          : "Gewicht offen",
    ];
  }
  return [
    week.filter(
      (e) => !["Aufgabe", "Frist", "Dienst", "Termin"].includes(e.type),
    ).length + " Beobachtungen",
    done.length + " Ergebnisse erledigt",
  ];
}
export function checkin({ modal, field, btn, val, state, save, dlg }) {
  modal(
    "Täglicher Check-in",
    field("Energie · 1 bis 5 (optional)", "energy", "", "number") +
      field("Schritte (optional)", "steps", "", "number") +
      field("Bewegung in Minuten (optional)", "move", "", "number") +
      field("Schlafbeginn (optional)", "start", "", "datetime-local") +
      field("Aufgewacht", "end", "", "datetime-local") +
      btn(
        "Check-in speichern",
        async () => {
          let values = [
              ["energy", "Energie", "von 5"],
              ["steps", "Schritte", "Schritte"],
              ["move", "Bewegung", "min"],
            ],
            rows = [];
          for (let [k, t, u] of values)
            if (val(k) !== "") {
              let n = Number(val(k));
              if (n < 0 || (k === "energy" && (n < 1 || n > 5)))
                throw Error("Messwert prüfen.");
              rows.push(
                entry(t, t, {
                  kind: "checkin",
                  value: n,
                  unit: u,
                  area: "Schlaf & Energie",
                }),
              );
            }
          if (val("start") || val("end")) {
            if (!val("start") || val("end") <= val("start"))
              throw Error("Schlafbeginn und Ende prüfen.");
            rows.push(
              entry("Schlaf", "Schlaf", {
                kind: "checkin",
                area: "Schlaf & Energie",
                day: val("start").slice(0, 10),
                start: val("start"),
                end: val("end"),
                minutes:
                  (new Date(val("end")) - new Date(val("start"))) / 60000,
              }),
            );
          }
          if (!rows.length) throw Error("Mindestens eine Angabe ergänzen.");
          await save({ ...state(), entries: [...state().entries, ...rows] });
          dlg.close();
        },
        "primary",
      ),
  );
}
