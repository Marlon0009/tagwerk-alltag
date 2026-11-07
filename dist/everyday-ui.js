import { date, areas } from "./core.mjs";
import { drafts, groqHints, shiftTimes } from "./everyday.mjs";
let key = "",
  model = "openai/gpt-oss-20b";
export function everyday({
  state,
  save,
  modal,
  btn,
  field,
  val,
  esc,
  dlg,
  edit,
  toast,
}) {
  function configure() {
    modal(
      "Groq für Texteingaben",
      "<p>Offline-Erkennung ist immer verfügbar. Für eine zweite Interpretation kannst du den eingegebenen Text einzeln an Groq senden. Schlüssel und Modell gelten für diese geöffnete Sitzung.</p>" +
        field("Eigener Groq-API-Schlüssel", "key", "", "password") +
        field("Groq-Modell", "model", model) +
        btn("Für diese Sitzung verwenden", () => {
          const next = val("key").trim();
          if (!next || !val("model").trim())
            throw Error("Schlüssel und Modell eingeben.");
          key = next;
          model = val("model").trim();
          dlg.close();
          toast("Schlüssel für diese Sitzung hinterlegt");
        }) +
        (key
          ? btn("Schlüssel vergessen", () => {
              key = "";
              dlg.close();
              toast("Groq deaktiviert");
            })
          : ""),
    );
  }
  function input(raw) {
    const day = date(),
      items = drafts(raw, day);
    if (
      !key &&
      items.length === 1 &&
      ![
        "Nachtschicht",
        "Aufgabe erledigen",
        "Aufgabe verschieben",
        "Kauf",
        "Anwendung",
        "Lesen",
        "Serie",
      ].includes(items[0].kind)
    ) {
      const x = items[0];
      if (
        x.kind === "Notiz" &&
        /mahlzeit|brot|apfel|banane|joghurt|salat|nudel|pizza|müsli|reis|suppe/i.test(
          raw,
        )
      ) {
        x.type = "Mahlzeit";
        x.area = "Ernährung";
      }
      edit(x);
      return;
    }
    review(items, raw, day);
  }
  function review(items, raw, baseDay) {
    const s = state();
    let submitting = false;
    modal(
      "Änderungen prüfen",
      items
        .map((x, i) => {
          const tasks = s.entries.filter(
            (e) => e.type === "Aufgabe" && e.status !== "erledigt",
          );
          return (
            '<fieldset><legend><label><input type="checkbox" name="include' +
            i +
            '" checked> ' +
            esc(x.kind) +
            "</label></legend><small>" +
            esc(x.source) +
            "</small>" +
            (["Aufgabe erledigen", "Aufgabe verschieben"].includes(x.kind)
              ? '<label class="field">Bestehende Aufgabe<select name="target' +
                i +
                '"><option value="">Aufgabe auswählen</option>' +
                tasks
                  .map(
                    (e) =>
                      '<option value="' +
                      esc(e.id) +
                      '" ' +
                      (e.title.toLowerCase() === x.title.toLowerCase()
                        ? "selected"
                        : "") +
                      ">" +
                      esc(e.title) +
                      " · " +
                      esc(e.day) +
                      "</option>",
                  )
                  .join("") +
                "</select></label>"
              : field("Eintrag", "title" + i, x.title) +
                field("Bereich", "area" + i, x.area, [...areas, "Dienst"]) +
                field("Datum", "day" + i, x.day, "date")) +
            (x.kind === "Aufgabe verschieben"
              ? field("Neues Plandatum", "day" + i, x.day, "date")
              : "") +
            (x.kind === "Nachtschicht"
              ? field("Von", "from" + i, "", "time") +
                field("Bis", "to" + i, "", "time")
              : "") +
            (["Lesen", "Serie"].includes(x.kind)
              ? field(x.unit, "amount" + i, x.value, "number")
              : "") +
            "</fieldset>"
          );
        })
        .join("") +
        btn(
          "Auswahl speichern",
          async () => {
            if (submitting) return;
            let out = [...state().entries],
              selected = 0;
            for (const [i, x] of items.entries()) {
              if (!dlg.querySelector("[name=include" + i + "]").checked)
                continue;
              selected++;
              if (
                ["Aufgabe erledigen", "Aufgabe verschieben"].includes(x.kind)
              ) {
                const target = out.find(
                  (e) =>
                    e.id === val("target" + i) &&
                    e.type === "Aufgabe" &&
                    e.status !== "erledigt",
                );
                if (!target)
                  throw Error("Bitte eine offene Aufgabe auswählen.");
                const newDay = val("day" + i);
                if (x.kind === "Aufgabe verschieben" && !newDay)
                  throw Error("Neues Plandatum ergänzen.");
                out = out.map((e) =>
                  e.id === target.id
                    ? x.kind === "Aufgabe verschieben"
                      ? {
                          ...e,
                          day: newDay,
                          acceptedDay: null,
                          acceptedTime: null,
                        }
                      : { ...e, status: "erledigt", completed: date() }
                    : e,
                );
                continue;
              }
              const rec = {
                ...x,
                title: val("title" + i).trim(),
                area: val("area" + i),
                day: val("day" + i),
              };
              if (!rec.title || !rec.day)
                throw Error("Titel und Datum ergänzen.");
              if (x.kind === "Nachtschicht")
                Object.assign(
                  rec,
                  shiftTimes(rec.day, val("from" + i), val("to" + i)),
                );
              if (["Lesen", "Serie"].includes(x.kind)) {
                rec.value = Number(val("amount" + i));
                if (!Number.isInteger(rec.value) || rec.value < 1)
                  throw Error("Positive Anzahl ergänzen.");
              }
              if (
                rec.type === "Dienst" &&
                out.some(
                  (e) =>
                    e.type === "Dienst" &&
                    e.start === rec.start &&
                    e.end === rec.end,
                )
              )
                continue;
              if (rec.kind === "Kauf") rec.purchased = rec.day;
              out.push(rec);
            }
            if (!selected) throw Error("Mindestens einen Eintrag auswählen.");
            submitting = true;
            try {
              await save({ ...state(), entries: out });
              dlg.close();
              toast("Auswahl lokal gespeichert");
            } finally {
              submitting = false;
            }
          },
          "primary",
        ) +
        (key
          ? btn("Originaltext an Groq senden", async () => {
              const request = dlg.innerHTML;
              const hints = await groqHints(raw, key, model);
              if (dlg.open && dlg.innerHTML === request)
                review(drafts(raw, baseDay, hints), raw, baseDay);
            })
          : ""),
    );
  }
  return { input, configure };
}
