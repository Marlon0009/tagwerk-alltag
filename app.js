import {
  areas,
  uid,
  date,
  plus,
  fresh,
  migrate,
  entry,
  demo,
  parse,
  plan,
  seal,
  unlock,
} from "./core.mjs";
import { metrics, remindersFor, checkin } from "./reflection.js";
import { icon, ai } from "./icons.js";
import { extended } from "./extensions.js";
const db = await new Promise((ok, no) => {
  let r = indexedDB.open("tagwerk", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("data");
  r.onsuccess = () => ok(r.result);
  r.onerror = () => no(r.error);
});
const read = (k) =>
  new Promise((ok, no) => {
    let r = db.transaction("data").objectStore("data").get(k);
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
let s = migrate((await read("current")) || demo()),
  page = "Heute",
  area = "",
  filter = "",
  dlg = document.querySelector("dialog"),
  actions = {},
  i = 0,
  timer;
const esc = (v) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
function pruneActions() {
  let alive = new Set(
    [...document.querySelectorAll("[data-action]")].map(
      (e) => e.dataset.action,
    ),
  );
  for (let k of Object.keys(actions)) if (!alive.has(k)) delete actions[k];
}
const act = (fn) => {
  let id = ++i;
  actions[id] = fn;
  return 'data-action="' + id + '"';
};
const btn = (t, fn, cls = "") =>
  '<button type="button" class="' +
  cls +
  '" ' +
  act(fn) +
  ">" +
  t +
  "</button>";
const val = (n) => dlg.querySelector('[name="' + n + '"]')?.value || "";
const field = (label, n, v = "", type = "text") =>
  '<label class="field">' +
  esc(label) +
  (Array.isArray(type)
    ? '<select name="' +
      n +
      '">' +
      type
        .map(
          (x) =>
            "<option " +
            (v === x ? "selected" : "") +
            ">" +
            esc(x) +
            "</option>",
        )
        .join("") +
      "</select>"
    : type === "textarea"
      ? '<textarea name="' + n + '">' + esc(v) + "</textarea>"
      : '<input name="' +
        n +
        '" type="' +
        type +
        '" value="' +
        esc(v) +
        '" ' +
        (type === "number" ? 'step="any"' : "") +
        ">") +
  "</label>";
function modal(t, html) {
  dlg.innerHTML =
    '<header class="pair"><h2>' +
    esc(t) +
    "</h2>" +
    btn("×", () => dlg.close(), 'close" aria-label="Schließen') +
    "</header>" +
    html;
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  pruneActions();
}
function toast(t, undo) {
  let el = document.querySelector("#toast");
  clearTimeout(timer);
  el.innerHTML = esc(t) + (undo ? btn("Wiederherstellen", undo) : "");
  timer = setTimeout(() => el.replaceChildren(), undo ? 15000 : 4500);
}
document.addEventListener("click", async (ev) => {
  let b = ev.target.closest("[data-action]");
  if (b)
    try {
      await actions[b.dataset.action]?.();
    } catch (e) {
      let msg = e.message || "Aktion fehlgeschlagen";
      if (dlg.open) {
        dlg.querySelector("[role=alert]")?.remove();
        let p = document.createElement("p");
        p.setAttribute("role", "alert");
        p.textContent = msg;
        dlg.append(p);
      } else toast(msg);
    }
});
async function save(next, protect = false) {
  let expected = s.rev;
  next = { ...next, rev: expected + 1 };
  await new Promise((ok, no) => {
    let tx = db.transaction("data", "readwrite"),
      st = tx.objectStore("data"),
      r = st.get("current");
    r.onsuccess = () => {
      if (r.result && (r.result.rev ?? 0) !== expected) {
        tx.abort();
        return;
      }
      if (protect) st.put(s, "previous");
      st.put(next, "current");
    };
    tx.oncomplete = ok;
    tx.onabort = () =>
      no(Error("Speichern abgebrochen. Vor weiteren Änderungen neu laden."));
    tx.onerror = () => no(tx.error);
  });
  s = next;
  render();
  ext.changed();
}
async function put(e) {
  await save({ ...s, entries: [...s.entries.filter((x) => x.id !== e.id), e] });
  dlg.close();
  toast("Lokal gespeichert");
}
function go(p, a = "") {
  page = p;
  area = a;
  filter = "";
  render();
  window.scrollTo(0, 0);
}
function heading(t) {
  return '<div class="sectionhead"><h2>' + esc(t) + "</h2></div>";
}
const navs = [
  ["Heute", "sun"],
  ["Verlauf", "history"],
  ["Bereiche", "grid"],
];
function nav(m = false) {
  return navs
    .map(([n, k]) =>
      btn(
        icon(k) + "<span>" + n + "</span>",
        () => go(n),
        (m ? "" : "nav ") + (page === n ? "on" : ""),
      ),
    )
    .join("");
}
function render() {
  document.querySelector("#app").innerHTML =
    '<div class="shell"><aside><div class="brand"><i class="mark"></i>Tagwerk</div><div class="sidecap">Arbeitsplatz</div>' +
    nav() +
    '<div class="sidegroup"><div class="sidecap">Meine Bereiche</div>' +
    areas
      .filter((a) => !s.hidden.includes(a))
      .slice(0, 4)
      .map((a) =>
        btn(icon(ai(a)) + esc(a), () => go("Bereiche", a), "shortcut"),
      )
      .join("") +
    '</div><div class="bottomside">' +
    btn(icon("settings") + "Einstellungen", settings, "nav") +
    '<div class="person"><span class="avatar">M</span><div>Marlon<small>Persönlicher Raum</small></div></div></div></aside><main class="page"><div class="topline"><span class="mobilehead"><i class="mark"></i>Tagwerk</span><span class="row crumb">' +
    icon("layers") +
    "Arbeitsplatz　/　" +
    esc(page) +
    '</span><div class="row"><span class="local">Lokal gespeichert</span>' +
    (s.demo
      ? btn("Beispiel · Einrichten", setup, "deskSetup")
      : btn(
          icon("settings"),
          settings,
          'deskSetup" aria-label="Einstellungen',
        )) +
    "</div></div>" +
    (page === "Heute" ? today() : page === "Verlauf" ? history() : sections()) +
    '</main><nav aria-label="Hauptnavigation" class="mobile">' +
    nav(true) +
    "</nav>" +
    btn(
      icon("plus") + "<span>Schnelleingabe</span>",
      quick,
      'fab" aria-label="Schnelleingabe',
    ) +
    "</div>";
  pruneActions();
}
function today() {
  let d = date(),
    p = plan(s),
    f =
      p.fixed
        .filter(
          (e) =>
            e.type !== "Schlaf" && (!e.end || new Date(e.end) >= new Date()),
        )
        .sort((a, b) =>
          (a.start || a.day).localeCompare(b.start || b.day),
        )[0] ||
      s.entries
        .filter(
          (e) => ["Termin", "Dienst", "Frist"].includes(e.type) && e.day > d,
        )
        .sort((a, b) => a.day.localeCompare(b.day))[0];
  let old = s.entries.filter(
    (e) =>
      e.type === "Aufgabe" &&
      e.day < d &&
      !["pausiert", "erledigt"].includes(e.status),
  );
  return (
    '<div class="headline"><div><div class="label">' +
    new Date().toLocaleDateString("de-DE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    }) +
    '</div><h1>Heute</h1></div><label class="controls"><span class="energy muted">Energie</span><select aria-label="Energie" id="energy">' +
    ["Minimum", "Normal", "Viel Energie"]
      .map(
        (v) =>
          "<option " +
          (s.energy === v ? "selected" : "") +
          ">" +
          v +
          "</option>",
      )
      .join("") +
    '</select></label></div><section class="hero"><div><div class="label row">' +
    icon("moon") +
    " Nächste Verpflichtung</div><h2>" +
    esc(f?.title || "Zeit für deinen Plan") +
    '</h2><div class="row">' +
    icon("clock") +
    esc(
      f
        ? (f.day === d ? "Heute" : f.day) +
            " · " +
            (f.start?.slice(11) || "Frist") +
            (f.end ? " – " + f.end.slice(11) + " Uhr" : "")
        : "Ersten Termin eintragen",
    ) +
    "</div></div>" +
    btn(
      icon("arrow"),
      () => (f ? detail(f) : edit(entry("Termin", ""))),
      'heroOpen" aria-label="Verpflichtung öffnen',
    ) +
    '</section><div class="sectionhead"><h2>Deine Prioritäten</h2><span class="count">' +
    String(p.tasks.length).padStart(2, "0") +
    ' / 03</span></div><div class="prioritylist">' +
    (p.tasks.map((e, j) => item(e, j)).join("") ||
      btn("Priorität hinzufügen", () => edit(entry("Aufgabe", "")))) +
    '</div><div class="sectionhead"><h2>Tagesplan</h2>' +
    btn(
      icon("plus") + " Eintrag",
      () => edit(entry("Termin", "")),
      "row link",
    ) +
    '</div><div class="timeline">' +
    p.blocks
      .map((e) =>
        btn(
          '<span class="time">' +
            esc(e.slot || e.start?.slice(11) || "Frist") +
            '</span><i class="dot"></i><span><strong>' +
            esc(e.title) +
            "</strong><small>" +
            esc(
              e.suggest
                ? "Vorschlag · " + e.area
                : e.type === "Aufgabe"
                  ? "Geplant"
                  : e.type,
            ) +
            '</small></span><span class="tail">' +
            (e.end ? "bis " + esc(e.end.slice(11)) : "") +
            icon("arrow") +
            "</span>",
          () =>
            s.entries.some((x) => x.id === e.id)
              ? detail(s.entries.find((x) => x.id === e.id))
              : edit(e),
          "item",
        ),
      )
      .join("") +
    "</div>" +
    p.fixed
      .filter((e, j) =>
        p.fixed.slice(0, j).some((o) => e.start < o.end && e.end > o.start),
      )
      .map((e) => btn("Zeitkonflikt prüfen · " + esc(e.title), () => edit(e)))
      .join("") +
    remindersFor(s)
      .map((t) => '<p class="panel">' + esc(t) + "</p>")
      .join("") +
    '<div class="actions">' +
    btn("Täglicher Check-in", () =>
      checkin({ modal, field, btn, val, state: () => s, save, dlg }),
    ) +
    "</div>" +
    (old.length
      ? btn(old.length + " frühere Aufgaben neu planen", () => overdue(old))
      : "")
  );
}
document.addEventListener("change", async (e) => {
  if (e.target.id === "energy") await save({ ...s, energy: e.target.value });
});
function item(e, j) {
  return btn(
    (j !== undefined ? '<span class="num">0' + (j + 1) + "</span>" : "") +
      '<span class="tile ' +
      ai(e.area) +
      '">' +
      icon(ai(e.area)) +
      "</span><span><strong>" +
      esc(e.title) +
      "</strong><small>" +
      esc(e.area) +
      " · " +
      esc(e.status || e.type) +
      '</small></span><span class="tail">' +
      esc(
        e.minutes
          ? (page === "Heute" && s.energy === "Minimum" ? 5 : e.minutes) +
              " min"
          : "",
      ) +
      icon("arrow") +
      "</span>",
    () => detail(e),
    "item",
  );
}
function detail(e) {
  modal(
    e.title,
    '<div class="label">' +
      esc(e.area) +
      " · " +
      esc(e.type) +
      "</div><p>" +
      esc(e.day) +
      " " +
      esc(e.start?.slice(11)) +
      (e.end ? " – " + esc(e.end) : "") +
      (e.occurred
        ? " · Erfasst für " + esc(e.occurred.replace("T", " "))
        : "") +
      (e.module ? " · Modul " + esc(e.module) : "") +
      "</p>" +
      (e.goal ? "<p>Ziel · " + esc(e.goal) + "</p>" : "") +
      (e.contact
        ? Object.entries(e.contact)
            .filter(([, v]) => v)
            .map(([k, v]) => "<p>" + esc(k) + " · " + esc(v) + "</p>")
            .join("")
        : "") +
      (e.step
        ? '<div class="panel"><small>' +
          (e.resume ? "Hier weitermachen" : "Erster Schritt") +
          "</small><p>" +
          esc(e.step) +
          "</p></div>"
        : "") +
      '<p class="wrap">' +
      esc(summary(e)) +
      '</p><p class="wrap">' +
      esc(e.note) +
      "</p>" +
      (e.photo
        ? '<img alt="Dokumentation ' +
          esc(e.angle) +
          '" style="max-width:100%" src="' +
          esc(e.photo) +
          '">'
        : "") +
      '<div class="actions">' +
      (e.type === "Aufgabe"
        ? (e.status === "begonnen"
            ? btn("Unterbrechen", () =>
                modal(
                  "Hier weitermachen",
                  field("Wiedereinstieg", "step", e.step, "textarea") +
                    btn(
                      "Unterbrechung speichern",
                      () =>
                        put({
                          ...e,
                          step: val("step"),
                          resume: true,
                          status: "unterbrochen",
                        }),
                      "primary",
                    ),
                ),
              )
            : btn(
                "Beginnen",
                () =>
                  put({
                    ...e,
                    status: "begonnen",
                    began: new Date().toISOString(),
                  }),
                "primary",
              )) +
          btn("Erledigt", () =>
            put({ ...e, status: "erledigt", completed: date() }),
          ) +
          btn("Verschieben", () => edit({ ...e, day: plus(date(), 1) })) +
          btn("Verkleinern", () => edit({ ...e, minutes: 5 }))
        : "") +
      btn("Bearbeiten", () => edit(e)) +
      btn("Löschen", async () => {
        await save({ ...s, entries: s.entries.filter((x) => x.id !== e.id) });
        dlg.close();
        toast("Eintrag gelöscht", () => put(e));
      }) +
      (["Termin", "Frist", "Dienst"].includes(e.type)
        ? btn("An Kalender übergeben", () => ext.calendar(e))
        : "") +
      "</div>",
  );
}
function summary(e) {
  if (e.origin && e.unit) return e.value + " " + e.unit;
  if (e.type === "Gewicht" && e.value == null) return "";
  return e.type === "Training"
    ? [
        e.value != null ? e.value + " kg" : "",
        e.sets ? e.sets + " × " + e.reps : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : e.type === "Gewicht"
      ? e.value + " kg"
      : e.type === "Mahlzeit" && s.hideKcal
        ? ""
        : e.value != null
          ? String(e.value) + (e.unit ? " " + e.unit : "")
          : e.minutes
            ? e.minutes + " min"
            : "";
}
const types = [
  "Notiz",
  "Aufgabe",
  "Dienst",
  "Frist",
  "Termin",
  "Training",
  "Gewicht",
  "Lernzeit",
  "Schlaf",
  "Schritte",
  "Bewegung",
  "Energie",
  "Pflege",
  "Kontakt",
  "Mahlzeit",
  "Experiment",
];
function edit(e) {
  let t = e.type;
  modal(
    "Eintrag prüfen",
    field("Eintragstyp", "type", t, types) +
      field("Titel", "title", e.title) +
      field("Bereich", "area", e.area, [...areas, "Dienst"]) +
      field("Wachabschnitt / Plandatum", "day", e.day, "date") +
      (t === "Training"
        ? field(
            "Tatsächlicher Trainingsbeginn",
            "occurred",
            e.occurred || date() + "T" + new Date().toTimeString().slice(0, 5),
            "datetime-local",
          )
        : "") +
      (e.area === "Studium"
        ? field("Modul (optional)", "module", e.module)
        : "") +
      (["Dienst", "Termin", "Schlaf", "Frist"].includes(t)
        ? field(
            "Beginn",
            "start",
            e.start || e.day + "T09:00",
            "datetime-local",
          ) + field("Ende", "end", e.end, "datetime-local")
        : "") +
      (t === "Dienst"
        ? field("Weitere wöchentliche Wiederholungen", "repeat", 0, "number")
        : "") +
      (["Aufgabe", "Lernzeit"].includes(t)
        ? field("Nächster Schritt / Hier weitermachen", "step", e.step) +
          field("Minuten", "minutes", e.minutes, "number") +
          field("Echte Frist (optional)", "due", e.due, "date")
        : "") +
      (t === "Training"
        ? field("Sätze", "sets", e.sets, "number") +
          field("Wiederholungen", "reps", e.reps, "number")
        : "") +
      field(
        t === "Training" || t === "Gewicht"
          ? "Gewicht in kg"
          : "Messwert (optional)",
        "value",
        e.value,
        "number",
      ) +
      (t === "Kontakt"
        ? [
            "Arbeitgeber",
            "Stellenlink",
            "Ansprechpartner",
            "Adresse",
            "Quelle",
            "Status",
            "Letzte Nachricht",
            "Anlagen",
            "Nächste Aktion",
            "Frist",
          ]
            .map((n) => field(n, n, e.contact?.[n]))
            .join("")
        : "") +
      (t === "Pflege"
        ? field("Kategorie", "category", e.category, [
            "Beginn",
            "Veränderung",
            "Beschwerden",
            "Produkt / Behandlung",
            "Verträglichkeit",
            "Arzttermin",
            "Offene Frage",
            "Ärztlich besprochene Routine",
          ]) +
          (s.photos
            ? field("Perspektive", "angle", e.angle) +
              field("Foto (optional)", "photo", "", "file")
            : "")
        : "") +
      field("Ziel (optional)", "goal", e.goal) +
      (!["Aufgabe", "Lernzeit"].includes(t)
        ? field("Nächster Schritt (optional)", "step", e.step)
        : "") +
      field("Notiz / Ergebnis", "note", e.note, "textarea") +
      btn(
        "Eintrag speichern",
        async () => {
          let x = {
            ...e,
            title: val("title").trim(),
            area: val("area"),
            day: val("day"),
            note: val("note"),
            goal: val("goal"),
          };
          if (
            ["Gewicht", "Training"].includes(t) &&
            val("value") !== "" &&
            Number(val("value")) < 0
          )
            throw Error("Bitte ein positives Gewicht eintragen.");
          if (!x.title || !x.day)
            throw Error("Bitte Titel und Datum ergänzen.");
          for (let k of [
            "start",
            "end",
            "step",
            "category",
            "angle",
            "due",
            "module",
            "occurred",
          ])
            if (dlg.querySelector('[name="' + k + '"]')) x[k] = val(k);
          for (let k of ["minutes", "sets", "reps", "value"])
            if (dlg.querySelector('[name="' + k + '"]'))
              x[k] = val(k) === "" ? null : Number(val(k));
          if (
            ["minutes", "sets", "reps"].some(
              (k) => x[k] != null && (!Number.isFinite(x[k]) || x[k] <= 0),
            )
          )
            throw Error(
              "Bitte positive Minuten, Sätze und Wiederholungen eintragen.",
            );
          if (["Dienst", "Schlaf"].includes(t) && (!x.start || !x.end))
            throw Error("Bitte Beginn und Ende angeben.");
          if (["Dienst", "Schlaf", "Termin"].includes(t) && x.start)
            x.day = x.start.slice(0, 10);
          if (x.end && x.end <= x.start)
            throw Error("Das Ende muss nach dem Beginn liegen.");
          if (t === "Kontakt") {
            x.contact = {};
            for (let n of [
              "Arbeitgeber",
              "Stellenlink",
              "Ansprechpartner",
              "Adresse",
              "Quelle",
              "Status",
              "Letzte Nachricht",
              "Anlagen",
              "Nächste Aktion",
              "Frist",
            ])
              x.contact[n] = val(n);
          }
          let file = dlg.querySelector("[name=photo]")?.files[0];
          if (file) {
            if (
              !/^image\/(jpeg|png|webp|gif|heic|heif)$/.test(file.type) ||
              file.size > 6000000
            )
              throw Error("Bitte ein Bild unter 6 MB wählen.");
            x.photo = await new Promise((ok, no) => {
              let r = new FileReader();
              r.onload = () => ok(r.result);
              r.onerror = no;
              r.readAsDataURL(file);
            });
          }
          let n = Number(val("repeat"));
          if (n < 0 || n > 52 || !Number.isInteger(n))
            throw Error("0 bis 52 Wiederholungen möglich.");
          let copies = Array.from({ length: n }, (_, i) => ({
            ...x,
            id: uid(),
            day: plus(x.day, 7 * (i + 1)),
            start: plus(x.start.slice(0, 10), 7 * (i + 1)) + x.start.slice(10),
            end: x.end
              ? plus(x.end.slice(0, 10), 7 * (i + 1)) + x.end.slice(10)
              : "",
          }));
          await save({
            ...s,
            lastType: t,
            entries: [...s.entries.filter((a) => a.id !== x.id), x, ...copies],
          });
          dlg.close();
          toast("Eintrag gespeichert");
        },
        "primary",
      ),
  );
  dlg.querySelector("[name=type]").onchange = (ev) =>
    edit({
      ...e,
      title: val("title"),
      day: val("day"),
      area: val("area"),
      type: ev.target.value,
      note: val("note"),
    });
}
function quick() {
  modal(
    "Schnelleingabe",
    field("Was möchtest du festhalten?", "text", "", "textarea") +
      '<small>Zum Diktieren das Mikrofon der iPhone-Tastatur verwenden.</small><div class="actions">' +
      btn(
        "Eingabe prüfen",
        () => {
          if (!val("text").trim()) throw Error("Bitte Text eingeben.");
          edit(parse(val("text").trim()));
        },
        "primary",
      ) +
      '</div><div class="toolbar">' +
      [
        ...new Set([
          s.lastType || "Notiz",
          "Training",
          "Lernzeit",
          "Gewicht",
          "Dienst",
          "Aufgabe",
        ]),
      ]
        .map((t) =>
          btn(t, () =>
            edit(
              entry(t, "", {
                area:
                  t === "Training" || t === "Gewicht"
                    ? "Training"
                    : t === "Dienst"
                      ? "Dienst"
                      : area || "Studium",
              }),
            ),
          ),
        )
        .join("") +
      "</div>",
  );
  dlg.querySelector("textarea").placeholder = "z. B. Latzug 55 kg 3x10";
}
function setup() {
  modal(
    "Dein erster Tag",
    '<p class="hint">Alle Angaben sind freiwillig. Mit dem Speichern endet die Beispielansicht.</p>' +
      field("Nächster Dienst · Beginn", "start", "", "datetime-local") +
      field("Dienstende", "end", "", "datetime-local") +
      field("Nächste echte Frist · wofür?", "deadline") +
      field("Fällig am", "due", "", "date") +
      field("Wichtigste Ziele · eines je Zeile", "goals", "", "textarea") +
      field("Aktuelles Gewicht (kg, optional)", "weight", "", "number") +
      btn(
        "Meinen Tag öffnen",
        async () => {
          let n = fresh();
          if (val("start") || val("end")) {
            if (!val("start") || val("end") <= val("start"))
              throw Error("Beginn und späteres Dienstende ergänzen.");
            n.entries.push(
              entry("Dienst", "Dienst", {
                area: "Dienst",
                day: val("start").slice(0, 10),
                start: val("start"),
                end: val("end"),
              }),
            );
          }
          if (val("deadline") || val("due")) {
            if (!val("due") || !val("deadline"))
              throw Error("Bitte Frist und Datum ergänzen.");
            n.entries.push(
              entry("Frist", val("deadline"), { day: val("due") }),
            );
          }
          for (let g of val("goals").split("\n").filter(Boolean))
            n.entries.push(
              entry("Aufgabe", g, {
                step: "Öffne deine Unterlagen und notiere den ersten konkreten Schritt.",
                minutes: 10,
              }),
            );
          if (val("weight"))
            n.entries.push(
              entry("Gewicht", "Körpergewicht", {
                area: "Training",
                value: Number(val("weight")),
              }),
            );
          await save(n, true);
          dlg.close();
        },
        "primary",
      ),
  );
}
function overdue(old) {
  modal(
    "Frühere Aufgaben",
    "<p>" +
      old.map((e) => esc(e.title)).join(" · ") +
      "</p>" +
      ["Heute neu planen", "Pausieren", "Streichen"]
        .map((a, i) =>
          btn(a, async () => {
            let ids = old.map((e) => e.id);
            await save({
              ...s,
              entries: s.entries
                .filter((e) => i !== 2 || !ids.includes(e.id))
                .map((e) =>
                  ids.includes(e.id)
                    ? {
                        ...e,
                        day: date(),
                        status: i === 1 ? "pausiert" : "offen",
                      }
                    : e,
                ),
            });
            dlg.close();
            if (i === 2)
              toast("Frühere Aufgaben gestrichen", async () => {
                await save({
                  ...s,
                  entries: [
                    ...s.entries,
                    ...old.filter((o) => !s.entries.some((e) => e.id === o.id)),
                  ],
                });
                toast("Wiederhergestellt");
              });
          }),
        )
        .join(""),
  );
}
function history() {
  let recent = s.entries.filter(
      (e) =>
        e.day >= plus(date(), -6) &&
        e.day <= date() &&
        !["Dienst", "Aufgabe", "Termin", "Frist"].includes(e.type),
    ),
    done = s.entries.filter(
      (e) => e.completed >= plus(date(), -6) && e.completed <= date(),
    );
  return (
    '<div class="headline"><div><div class="label">Letzte sieben Tage</div><h1>Verlauf</h1></div></div><div class="panel"><h2>Wochenrückblick</h2><p>' +
    new Set([...recent.map((e) => e.day), ...done.map((e) => e.completed)])
      .size +
    " von 7 Tagen erfasst · " +
    done.length +
    " Aufgaben erledigt</p>" +
    areas
      .filter(
        (a) => [...recent, ...done].some((e) => e.area === a) || s.focus === a,
      )
      .map(
        (a) => "<p>" + esc(a) + " · " + esc(metrics(s, a).join(" · ")) + "</p>",
      )
      .join("") +
    btn("Nächste Woche festhalten", () =>
      edit(entry("Notiz", "Was ich beibehalten oder ausprobieren möchte")),
    ) +
    "</div>" +
    heading("Einträge") +
    list(s.entries)
  );
}
function list(arr) {
  return (
    '<div class="prioritylist">' +
    (arr
      .slice()
      .sort((a, b) => b.day.localeCompare(a.day))
      .map((e) => item(e))
      .join("") || '<p class="panel muted">Noch keine Einträge.</p>') +
    "</div>"
  );
}
function sections() {
  if (!area)
    return (
      '<div class="headline"><h1>Bereiche</h1></div><div class="areaGrid">' +
      areas
        .filter((a) => !s.hidden.includes(a))
        .map((a) => btn(icon(ai(a)) + esc(a), () => go("Bereiche", a)))
        .join("") +
      "</div>" +
      heading("Verwaltung") +
      btn("Einstellungen & Sicherung", settings)
    );
  let arr = s.entries.filter((e) => e.area === area);
  return (
    '<div class="headline"><div>' +
    btn("‹ Bereiche", () => go("Bereiche"), "link") +
    "<h1>" +
    esc(area) +
    '</h1></div></div><div class="actions">' +
    btn(
      icon("plus") + " Eintrag",
      () =>
        edit(
          entry(
            area === "Haare & Kopfhaut"
              ? "Pflege"
              : area === "Karriere"
                ? "Kontakt"
                : area === "Training"
                  ? "Training"
                  : "Notiz",
            "",
            { area },
          ),
        ),
      "row",
    ) +
    btn(
      s.auto.includes(area)
        ? "Zeitblöcke automatisch"
        : "Zeitblöcke vorschlagen",
      () =>
        save({
          ...s,
          auto: s.auto.includes(area)
            ? s.auto.filter((a) => a !== area)
            : [...s.auto, area],
        }),
    ) +
    btn("Als Ziel priorisieren", () => save({ ...s, focus: area })) +
    "</div>" +
    ext.area(area, arr) +
    list(arr)
  );
}
function settings() {
  ext.settings();
}
function download(name, data, type = "application/json") {
  let a = document.createElement("a"),
    url = URL.createObjectURL(new Blob([data], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
const ext = extended({
  state: () => s,
  save,
  read,
  modal,
  field,
  btn,
  val,
  esc,
  toast,
  edit,
  detail,
  put,
  download,
  dlg,
  heading,
  summary,
  settings,
});
render();
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .catch(() => toast("Offline-Installation noch ausstehend"));
setInterval(() => {
  if (!dlg.open) render();
}, 60000);
