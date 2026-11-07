import { date, entry, plan } from "./core.mjs";
export function journal({
  motionOpened,
  motionClose,
  configureGroq,
  state,
  save,
  go,
  btn,
  modal,
  dlg,
  field,
  val,
  esc,
  toast,
  edit,
  detail,
  settings,
  setup,
  workout,
  quick,
  scanner,
}) {
  function navigate(page, area = "") {
    dlg.close();
    go(page, area);
  }
  function overlay(name, html, kind) {
    modal(name, html);
    dlg.className = kind;
    const control =
      dlg.querySelector(".selected") ||
      dlg.querySelector(".sheethandle,.drawerclose");
    control?.focus({ preventScroll: true });
    motionOpened();
  }
  function drawer() {
    const nav = (label, page) =>
      btn(
        label,
        () => navigate(page),
        current === page ? 'selected" aria-current="page' : "",
      );
    overlay(
      "Navigation",
      btn("Menü schließen", motionClose, "drawerclose") +
        "<nav>" +
        nav("Tagebuch", "Heute") +
        nav("Chat", "Chat") +
        "<hr>" +
        nav("Verlauf", "Verlauf") +
        nav("Statistik", "Statistik") +
        btn("Einstellungen", preferences) +
        "</nav>" +
        btn(
          "„Tagwerk“ teilen",
          async () => {
            const url = new URL("./", location.href).href;
            if (navigator.share)
              await navigator.share({ title: "Tagwerk", url });
            else {
              modal(
                "Tagwerk teilen",
                field("App-Adresse zum Kopieren", "url", url),
              );
              dlg.querySelector("input").select();
            }
          },
          "share",
        ),
      "drawer",
    );
  }
  function preferences() {
    modal(
      "Einstellungen",
      '<div class="sheetrows">' +
        btn("Tagesplanung", () => navigate("Tagesplan")) +
        btn("Meine Bereiche", () => navigate("Bereiche")) +
        btn("Schnelleingabe", quick) +
        btn("Groq für Texteingaben", configureGroq) +
        btn("Anzeige anpassen", appearance) +
        btn("Daten und Sicherung", settings) +
        "</div>",
    );
  }
  function goals() {
    modal(
      "Deine Daten und Ziele",
      '<div class="sheetrows">' +
        (state().demo ? btn("Beispiel · Einrichten", setup) : "") +
        btn("Tagesplan und Ziele", () => navigate("Tagesplan")) +
        btn("Bereiche öffnen", () => navigate("Bereiche")) +
        btn("Nährwertziele", nutrition) +
        btn("Einstellungen und Sicherung", settings) +
        "</div>",
    );
  }
  function appearance() {
    modal(
      "Anzeige anpassen",
      field("Darstellung", "theme", state().theme || "Hell", [
        "Hell",
        "Dunkel",
      ]) +
        field("Kalorien anzeigen", "kcal", state().hideKcal ? "Nein" : "Ja", [
          "Ja",
          "Nein",
        ]) +
        btn("Speichern", async () => {
          await save({
            ...state(),
            theme: val("theme"),
            hideKcal: val("kcal") === "Nein",
          });
          dlg.close();
        }),
    );
  }
  function nutrition() {
    modal(
      "Mikros, Zucker, Ballaststoffe",
      field(
        "Persönliches Tagesziel in kcal (optional)",
        "target",
        state().kcalGoal ?? "",
        "number",
      ) +
        btn("Ziel speichern", async () => {
          let v = val("target");
          if (v && Number(v) <= 0) throw Error("Positives Ziel eingeben.");
          await save({ ...state(), kcalGoal: v ? Number(v) : null });
          dlg.close();
        }) +
        btn("Nährwerte zu einer Mahlzeit erfassen", () =>
          edit(entry("Mahlzeit", "", { area: "Ernährung" })),
        ) +
        btn("Ernährung öffnen", () => navigate("Bereiche", "Ernährung")),
    );
  }
  function sheet() {
    overlay(
      "Tagesübersicht",
      btn(
        '<span class="grab"></span>',
        motionClose,
        'sheethandle" aria-label="Tagesübersicht schließen',
      ) +
        btn("Über deinen Tag chatten　→", () => navigate("Chat"), "askday") +
        '<div class="sheetrows">' +
        btn("Deine Daten und Ziele", goals) +
        btn("Anzeige anpassen", appearance) +
        btn("Mikros, Zucker, Ballaststoffe", nutrition) +
        btn("Training und Gewicht", () =>
          modal(
            "Training und Gewicht",
            btn("Training starten", workout) +
              btn("Gewichtsverlauf", () => navigate("Bereiche", "Training")),
          ),
        ) +
        "</div>",
      "daysheet",
    );
  }
  let current = "Heute";
  function bar() {
    const s = state(),
      meals = s.entries.filter(
        (e) => e.type === "Mahlzeit" && e.day === date(),
      );
    const sum = (key) =>
      meals.some((e) => !Number.isFinite(e[key]))
        ? null
        : meals.reduce((a, e) => a + e[key], 0);
    const calories = sum("value"),
      goal = s.kcalGoal ?? (s.demo ? 2829 : null);
    const metric = (k, label) =>
      "<span><b>" +
      (sum(k) === null ? "—" : Number(sum(k).toFixed(1)) + "g") +
      "</b><small>" +
      label +
      "</small></span>";
    return btn(
      '<i class="grab"></i>' +
        (!s.hideKcal
          ? '<span class="energytotal"><i class="kcalicon"></i><span><b>' +
            (calories ?? "—") +
            (goal ? " / " + goal : "") +
            " kcal</b><small>" +
            (goal && calories !== null
              ? "Noch " + Math.max(0, goal - calories) + " kcal"
              : "Energie") +
            "</small></span></span>"
          : "") +
        metric("protein", "Protein") +
        metric("carbs", "KH") +
        metric("fat", "Fett"),
      sheet,
      'nutribar" aria-label="Tagesübersicht öffnen',
    );
  }
  function home() {
    const entries = state().entries.filter(
      (e) => e.day === date() && (e.journal || e.type === "Mahlzeit"),
    );
    return (
      '<section class="diary"><h1>Heute</h1><form id="foodnote"><input autocomplete="off" aria-label="Eintrag schreiben" placeholder="Eintrag schreiben..." required><button aria-label="Eingabe prüfen">↵</button></form>' +
      entries
        .map((e) =>
          btn(
            esc(e.title) +
              (Number.isFinite(e.value) &&
              e.type === "Mahlzeit" &&
              !state().hideKcal
                ? "<small>" + esc(e.value) + " kcal</small>"
                : ["Lesen", "Serie"].includes(e.type) &&
                    Number.isFinite(e.value)
                  ? "<small>" +
                    esc(e.value) +
                    " " +
                    esc(
                      e.value === 1 && e.type === "Serie" ? "Folge" : e.unit,
                    ) +
                    "</small>"
                  : e.kind === "Kauf"
                    ? "<small>Gekauft</small>"
                    : ""),
            () => detail(e),
            "foodrow",
          ),
        )
        .join("") +
      "</section>" +
      bar()
    );
  }
  const messages = [];
  function reply(question) {
    const q = question.toLowerCase(),
      p = plan(state());
    if (/train|gym/.test(q))
      return (
        "Als Nächstes ist Einheit " +
        (state().nextWorkout === "B" ? "B" : "A") +
        " geplant."
      );
    if (/schritt|priorit|anfang|beginnen/.test(q))
      return (
        p.tasks[0]?.step || "Für heute ist noch kein erster Schritt hinterlegt."
      );
    if (/essen|mahlzeit|gegessen/.test(q))
      return (
        state()
          .entries.filter((e) => e.type === "Mahlzeit" && e.day === date())
          .map((e) => e.title)
          .join(", ") || "Heute ist noch keine Mahlzeit erfasst."
      );
    if (/dienst|plan|ansteh|steht|termin|heute|tag/.test(q))
      return (
        p.blocks
          .map((e) => (e.slot || e.start?.slice(11) || "") + " " + e.title)
          .join(" · ") || "Heute ist noch nichts geplant."
      );
    return "Ich kann deinen lokalen Tagesplan, den nächsten Schritt, die nächste Trainingseinheit oder heutige Mahlzeiten nachschlagen.";
  }
  function ask(q) {
    if (!q.trim()) return;
    messages.push([q.trim(), reply(q)]);
    go("Chat");
  }
  document.addEventListener("submit", (e) => {
    if (e.target.id === "chatquestion") {
      e.preventDefault();
      ask(e.target.elements.question.value);
    }
  });
  function chat() {
    return (
      '<section class="diary"><h1>Chat</h1><small>Lokaler Tagesplan</small>' +
      messages
        .map(
          ([q, a]) =>
            "<p><strong>" + esc(q) + "</strong></p><p>" + esc(a) + "</p>",
        )
        .join("") +
      '<form id="chatquestion"><input name="question" aria-label="Frage zu deinem Tag" placeholder="Frage zu deinem Tag …" required><button>Senden</button></form>' +
      ["Was steht an?", "Was ist mein nächster Schritt?"]
        .map((q) => btn(q, () => ask(q)))
        .join("") +
      "</section>"
    );
  }
  function frame(page, content) {
    current = page;
    document.documentElement.dataset.theme =
      state().theme === "Dunkel" ? "dark" : "light";
    return (
      '<main class="journalframe"><header class="journaltools">' +
      btn(
        '<i class="twolines"></i>',
        drawer,
        'round" aria-label="Menü öffnen',
      ) +
      btn(
        '<i class="scanicon"></i>',
        scanner,
        'round" aria-label="Scanner öffnen',
      ) +
      "</header>" +
      (page === "Heute" ? home() : page === "Chat" ? chat() : content) +
      "</main>"
    );
  }
  return { frame, drawer, sheet, bar };
}
