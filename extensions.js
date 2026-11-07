import { areas, entry, date, uid, seal, unlock, plus } from "./core.mjs";
import { health, calendarImport, promptFor, reconcile } from "./exchange.mjs";
export function extended({
  state,
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
}) {
  let token = "",
    expires = 0,
    pass = "",
    driveTimer,
    busy = false,
    driveError = "";
  const file = async (n) => {
    let f = dlg.querySelector('[name="' + n + '"]').files[0];
    if (!f) throw Error("Bitte Datei auswählen.");
    return f.text();
  };
  const check = (name, label, on = false) =>
      '<label class="field" style="display:flex;align-items:center"><input name="' +
      name +
      '" type="checkbox" ' +
      (on ? "checked" : "") +
      ">" +
      esc(label) +
      "</label>",
    on = (n) => !!dlg.querySelector('[name="' + n + '"]')?.checked;
  const dateTime = (t) =>
    t ? new Date(t).toLocaleString("de-DE") : "Noch nie";
  const backupData = () => ({
    ...state(),
    entries: state().entries.map((e) => {
      let x = { ...e };
      if (!state().backupPhotos) delete x.photo;
      return x;
    }),
  });
  function settings() {
    let s = state();
    modal(
      "Einstellungen",
      heading("Daten & Sicherung") +
        '<div class="actions">' +
        btn("Datei sichern", backup) +
        btn("Wiederherstellen", restore) +
        btn("Google Drive", drive) +
        btn("Vorherigen Stand prüfen", async () => {
          let prev = await read("previous");
          if (!prev) throw Error("Noch kein vorheriger Import.");
          previewRestore(prev);
        }) +
        "</div>" +
        heading("Import & Erinnerungen") +
        '<div class="actions">' +
        btn("Health-Datei", () => imports("Health")) +
        btn("Kalenderdatei", () => imports("Kalender")) +
        btn("Erinnerungen", reminders) +
        "</div>" +
        heading("Persönliche Einstellungen") +
        field("Gewichtsziel in kg", "target", s.goal, "number") +
        check("photos", "Fotos für Haare & Kopfhaut aktivieren", s.photos) +
        check(
          "backupPhotos",
          "Fotos in verschlüsselte Sicherungen aufnehmen",
          s.backupPhotos,
        ) +
        check("hideKcal", "Kalorien ausblenden", s.hideKcal) +
        field("Lebensmittelbudget", "budget", s.budget) +
        field("Vorlieben", "likes", s.likes) +
        field("Unverträgliche Zutaten", "avoid", s.avoid) +
        "<details><summary>Sichtbare Bereiche</summary>" +
        areas.map((a, i) => check("a" + i, a, !s.hidden.includes(a))).join("") +
        "</details>" +
        btn(
          "Einstellungen speichern",
          async () => {
            await save({
              ...s,
              goal: Number(val("target")) || 87,
              photos: on("photos"),
              backupPhotos: on("backupPhotos"),
              hideKcal: on("hideKcal"),
              budget: val("budget"),
              likes: val("likes"),
              avoid: val("avoid"),
              hidden: areas.filter((a, i) => !on("a" + i)),
            });
            dlg.close();
          },
          "primary",
        ),
    );
  }
  function reminders() {
    let s = state();
    modal(
      "Erinnerungen",
      "<p>Hinweise beim Öffnen. Für wichtige Fristen im Eintrag „An Kalender übergeben“ wählen und den Alarm im Kalender prüfen.</p>" +
        [
          "Fristen",
          "Täglicher Check-in",
          "Ausstehende Antworten",
          "Verpasste Pläne",
        ]
          .map((v, i) => check("r" + i, v, s.reminders?.[i]))
          .join("") +
        field("Ruhezeit ab", "quiet", s.quiet || "22:00", "time") +
        field("Ruhezeit bis", "wake", s.wake || "08:00", "time") +
        btn("Speichern", async () => {
          await save({
            ...s,
            reminders: [0, 1, 2, 3].map((i) => on("r" + i)),
            quiet: val("quiet"),
            wake: val("wake"),
          });
          dlg.close();
        }),
    );
  }
  function calendar(e) {
    let stamp = (v) => v.replace(/[-:]/g, "") + "00",
      start = e.start || e.day + "T09:00",
      name = e.title.replace(/[\r\n]/g, " ").replace(/[,;]/g, "\\$&");
    download(
      "tagwerk-termin.ics",
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Tagwerk//DE",
        "BEGIN:VEVENT",
        "UID:" + e.id + "@tagwerk",
        "DTSTAMP:" +
          new Date()
            .toISOString()
            .replace(/[-:]/g, "")
            .replace(/\.\d{3}/, ""),
        "DTSTART:" + stamp(start),
        ...(e.end ? ["DTEND:" + stamp(e.end)] : []),
        "SUMMARY:" + name,
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        "TRIGGER:-PT30M",
        "DESCRIPTION:Termin",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
      ].join("\r\n"),
      "text/calendar",
    );
    toast("Kalenderdatei erstellt. Import und Alarm im Kalender prüfen.");
  }
  function backup() {
    modal(
      "Verschlüsselte Sicherung",
      field(
        "Wiederherstellungspasswort (mindestens 10 Zeichen)",
        "pw",
        "",
        "password",
      ) +
        '<p class="hint">Passwort im Passwortmanager aufbewahren. Ohne Passwort ist die Datei unlesbar.</p>' +
        btn(
          "Datei verschlüsseln",
          async () => {
            if (val("pw").length < 10)
              throw Error("Mindestens 10 Zeichen eingeben.");
            download(
              "tagwerk-" + date() + ".json",
              JSON.stringify(await seal(backupData(), val("pw"))),
            );
            dlg.close();
          },
          "primary",
        ),
    );
  }
  function restore() {
    modal(
      "Sicherung öffnen",
      field("Sicherungsdatei", "file", "", "file") +
        field("Wiederherstellungspasswort", "pw", "", "password") +
        btn("Vorschau prüfen", async () => {
          try {
            previewRestore(
              await unlock(JSON.parse(await file("file")), val("pw")),
            );
          } catch {
            throw Error(
              "Passwort falsch oder Datei beschädigt. Lokale Daten sind sicher.",
            );
          }
        }),
    );
  }
  function previewRestore(n) {
    modal(
      "Übernahme prüfen",
      "<p>" +
        n.entries.length +
        " Einträge und " +
        n.orders.length +
        " E-Mail-Aufträge. Der bisherige Stand bleibt als lokaler Rücksetzpunkt erhalten.</p>" +
        btn(
          "Diesen Stand wiederherstellen",
          async () => {
            await save(n, true);
            dlg.close();
            toast("Sicherung wiederhergestellt");
          },
          "primary",
        ),
    );
  }
  function imports(kind) {
    modal(
      kind + " importieren",
      field("Datei wählen", "file", "", "file") +
        btn("Import prüfen", async () => {
          let raw = await file("file"),
            s = state(),
            r =
              kind === "Health"
                ? health(JSON.parse(raw), s.entries)
                : { out: calendarImport(raw), skip: 0 };
          r.out = r.out.filter(
            (e, i, a) =>
              !s.entries.some((x) => x.id === e.id) &&
              a.findIndex((x) => x.id === e.id) === i,
          );
          modal(
            "Import prüfen",
            "<p>" +
              r.out.length +
              " neue Einträge · " +
              r.skip +
              " identische oder überlappende Messungen ausgelassen</p>" +
              r.out
                .map(
                  (e) =>
                    "<p>" +
                    esc(e.title) +
                    " · " +
                    esc(e.rawStart || e.start) +
                    " – " +
                    esc(e.rawEnd || e.end) +
                    "</p>",
                )
                .join("") +
              btn(
                "Importieren",
                async () => {
                  await save({ ...s, entries: [...s.entries, ...r.out] });
                  dlg.close();
                },
                "primary",
              ),
          );
        }),
    );
  }
  async function api(url, opts = {}) {
    if (!token || Date.now() >= expires)
      throw Error("Google-Anmeldung abgelaufen. Erneut freigeben.");
    let r = await fetch(url, {
      ...opts,
      headers: { Authorization: "Bearer " + token, ...opts.headers },
    });
    if (r.status === 401) {
      token = "";
      throw Error("Google-Anmeldung abgelaufen. Erneut freigeben.");
    }
    if (!r.ok) throw Error("Google Drive meldet HTTP " + r.status);
    return r.json();
  }
  const driveUrl = "https://www.googleapis.com/drive/v3/files";
  async function upload() {
    if (busy) return;
    busy = true;
    try {
      let s = state(),
        data = await seal(backupData(), pass),
        boundary = "tagwerk_" + uid();
      const metadata = {
        name: "tagwerk-" + new Date().toISOString() + ".json",
        parents: ["appDataFolder"],
        mimeType: "application/json",
      };
      const body =
        [metadata, data]
          .map(
            (part) =>
              "--" +
              boundary +
              "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" +
              JSON.stringify(part) +
              "\r\n",
          )
          .join("") +
        "--" +
        boundary +
        "--";
      let result = await api(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
        {
          method: "POST",
          headers: {
            "Content-Type": "multipart/related; boundary=" + boundary,
          },
          body,
        },
      );
      if (!result.id) throw Error("Upload ohne Dateibestätigung.");
      await save({
        ...state(),
        driveAt: new Date().toISOString(),
        driveRev: state().rev === s.rev ? s.rev + 1 : s.rev,
      });
      driveError = "";
    } catch (e) {
      driveError = e.message;
      toast(driveError);
    } finally {
      busy = false;
    }
  }
  function changed() {
    clearTimeout(driveTimer);
    if (token && pass && state().driveRev !== state().rev)
      driveTimer = setTimeout(upload, 5000);
  }
  window.addEventListener("online", changed);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) changed();
  });
  function drive() {
    let s = state();
    modal(
      "Google Drive",
      "<p>Letzte bestätigte Sicherung: " +
        dateTime(s.driveAt) +
        "</p><p>" +
        (!s.driveAt || s.driveRev !== s.rev
          ? "Änderungen ausstehend"
          : "Stand gesichert") +
        " · " +
        (token && Date.now() < expires
          ? "Für diese Sitzung freigegeben"
          : "Anmeldung erforderlich") +
        "</p><p>" +
        esc(driveError) +
        "</p>" +
        field("Eigene Google OAuth-Webclient-ID", "client", s.client) +
        field("Sicherungspasswort", "pw", "", "password") +
        btn("Google-Freigabe öffnen", async () => {
          let client = val("client").trim(),
            p = val("pw");
          if (!client.endsWith(".apps.googleusercontent.com") || p.length < 10)
            throw Error(
              "Webclient-ID und mindestens 10 Zeichen Passwort erforderlich.",
            );
          if (!window.google?.accounts) {
            await new Promise((ok, no) => {
              let el = document.createElement("script");
              el.src = "https://accounts.google.com/gsi/client";
              el.onload = ok;
              el.onerror = () => no(Error("Google nicht erreichbar."));
              document.head.append(el);
            });
          }
          google.accounts.oauth2
            .initTokenClient({
              client_id: client,
              error_callback: () => {
                driveError =
                  "Freigabe unterbrochen. Google-Freigabe erneut öffnen.";
                drive();
              },
              scope: "https://www.googleapis.com/auth/drive.appdata",
              callback: async (r) => {
                if (!r.access_token) {
                  driveError = "Freigabe abgelehnt";
                  drive();
                  return;
                }
                token = r.access_token;
                expires = Date.now() + Number(r.expires_in) * 1000;
                pass = p;
                await save({ ...state(), client });
                drive();
              },
            })
            .requestAccessToken();
        }) +
        btn("Jetzt sichern", async () => {
          if (!pass) throw Error("Zuerst Google freigeben.");
          await upload();
          drive();
        }) +
        btn("Ältere Stände öffnen", async () => {
          let r = await api(
            driveUrl +
              "?spaces=appDataFolder&q=trashed%3Dfalse&orderBy=createdTime%20desc&pageSize=100&fields=files(id,name)",
          );
          modal(
            "Drive-Sicherungen",
            field(
              "Passwort des gewählten Stands",
              "restorePw",
              "",
              "password",
            ) +
              r.files
                .map((f) =>
                  btn(esc(f.name), async () =>
                    previewRestore(
                      await unlock(
                        await api(
                          driveUrl +
                            "/" +
                            encodeURIComponent(f.id) +
                            "?alt=media",
                        ),
                        val("restorePw") || pass,
                      ),
                    ),
                  ),
                )
                .join(""),
          );
        }) +
        btn("Sitzung trennen", () => {
          token = pass = "";
          clearTimeout(driveTimer);
          drive();
        }),
    );
  }
  function scalp(arr) {
    modal(
      "Termin vorbereiten",
      arr.map((e, i) => check("c" + i, e.day + " · " + e.title)).join("") +
        btn("Zusammenfassung prüfen", () => {
          let chosen = arr.filter((_, i) => on("c" + i));
          if (!chosen.length) throw Error("Bitte Einträge auswählen.");
          let txt =
            "Haare & Kopfhaut – Terminvorbereitung\n\n" +
            chosen
              .sort((a, b) => a.day.localeCompare(b.day))
              .map(
                (e) =>
                  e.day +
                  " · " +
                  (e.category || "Verlauf") +
                  "\n" +
                  e.title +
                  "\n" +
                  (e.note || ""),
              )
              .join("\n\n");
          modal(
            "Terminübersicht",
            field("Vor dem Export bearbeiten", "summary", txt, "textarea") +
              btn("Als Text exportieren", () =>
                download(
                  "terminvorbereitung.txt",
                  val("summary"),
                  "text/plain;charset=utf-8",
                ),
              ),
          );
        }),
    );
  }
  function meal() {
    modal(
      "Eigenes Rezept",
      field("Gericht", "title") +
        field(
          "Zutaten je Zeile: Name | Gramm | kcal pro 100 g (Etikett)",
          "ingredients",
          "",
          "textarea",
        ) +
        field("Portionen im Rezept", "serves", 1, "number") +
        field("Gegessene Portionen", "portion", 1, "number") +
        check("estimated", "Mengen oder Nährwerte geschätzt") +
        btn("Mahlzeit speichern", () => {
          let lines = val("ingredients").split("\n"),
            total = 0;
          for (let l of lines) {
            let [name, g, k] = l.split("|").map((a) => a.trim());
            if (
              !name ||
              !g ||
              !k ||
              !Number.isFinite(Number(g) * Number(k)) ||
              +g <= 0 ||
              +k < 0
            )
              throw Error("Bitte jede Zutatenzeile prüfen.");
            total += (g * k) / 100;
          }
          if (!val("title") || +val("serves") <= 0 || +val("portion") <= 0)
            throw Error("Gericht und positive Portionen angeben.");
          return put(
            entry("Mahlzeit", val("title"), {
              area: "Ernährung",
              value: Math.round((total / val("serves")) * val("portion")),
              unit: on("estimated") ? "kcal (Schätzung)" : "kcal",
              ingredients: val("ingredients"),
              serves: val("serves"),
              portion: val("portion"),
              note: val("portion") + " Portion(en)",
            }),
          );
        }),
    );
  }
  function mail() {
    let s = state();
    modal(
      "E-Mail-Auftrag",
      field("Art", "kind", "Erstanschreiben", [
        "Erstanschreiben",
        "Antwort",
        "Nachfassentwurf",
        "Antwortprüfung",
      ]) +
        field("Anlass", "reason") +
        field("Ziel", "goal") +
        field(
          "Kontakte je Zeile: Name / Firma / bekannte Adresse | ausgewählte Anlagen",
          "people",
          "",
          "textarea",
        ) +
        btn(
          "Auftrag erstellen",
          async () => {
            if (!val("people").trim() || !val("reason") || !val("goal"))
              throw Error("Anlass, Ziel und Kontakte ergänzen.");
            let o = {
              id: uid(),
              kind: val("kind"),
              reason: val("reason"),
              goal: val("goal"),
              people: val("people")
                .split("\n")
                .filter((l) => l.trim())
                .map((l) => {
                  let [label, ...files] = l.split("|");
                  return {
                    entryId: uid(),
                    label: label.trim(),
                    files: files.join("|").trim(),
                    status: "Offen",
                  };
                }),
            };
            await save({ ...s, orders: [...s.orders, o] });
            showOrder(o);
          },
          "primary",
        ) +
        s.orders.map((o) => btn(esc(o.reason), () => showOrder(o))).join(""),
    );
  }
  function manual(o) {
    let labels = o.people.map(
      (p, i) => i + 1 + " · " + p.label + " · " + p.entryId.slice(0, 6),
    );
    modal(
      "Manuelles Ergebnis",
      field("Kontakt", "who", labels[0], labels) +
        field("Status", "status", "Entwurf", [
          "Entwurf",
          "Freigegeben",
          "Gesendet",
          "Unklar",
          "Antwort geprüft",
        ]) +
        field(
          "Zeitpunkt",
          "when",
          date() + "T" + new Date().toTimeString().slice(0, 5),
          "datetime-local",
        ) +
        field("Nächster Schritt", "next") +
        field("Bestätigte Gmail-ID bei Versand", "gid") +
        check("checked", "Postfach zu diesem Zeitpunkt tatsächlich geprüft") +
        btn("Übernahme prüfen", () => {
          let at = new Date(val("when")).toISOString(),
            r = reconcile(o, {
              orderId: o.id,
              results: [
                {
                  entryId: o.people[labels.indexOf(val("who"))].entryId,
                  status: val("status"),
                  at,
                  next: val("next"),
                  gmailId: val("gid"),
                  checkedAt: on("checked") ? at : undefined,
                },
              ],
            });
          modal(
            "Übernahme prüfen",
            r.order.people
              .map(
                (p) =>
                  "<p>" +
                  esc(p.label) +
                  " · " +
                  esc(p.status) +
                  " · " +
                  esc(p.next) +
                  "</p>",
              )
              .join("") +
              btn("Geprüft übernehmen", async () => {
                await save({
                  ...state(),
                  orders: state().orders.map((x) =>
                    x.id === o.id ? r.order : x,
                  ),
                });
                showOrder(r.order);
              }),
          );
        }),
    );
  }
  function showOrder(o) {
    let p = promptFor(o);
    modal(
      "E-Mail-Auftrag",
      field("Auftrag für ChatGPT", "prompt", p, "textarea") +
        '<div class="actions">' +
        btn("Auftrag kopieren", async () => {
          try {
            await navigator.clipboard.writeText(val("prompt"));
            toast("Auftrag kopiert");
          } catch {
            dlg.querySelector("textarea").select();
            throw Error("Text ausgewählt. Bitte „Kopieren“ verwenden.");
          }
        }) +
        (navigator.share
          ? btn("Teilen", () => navigator.share({ text: val("prompt") }))
          : "") +
        "</div>" +
        o.people
          .map((x, i) =>
            check(
              "follow" + i,
              x.label +
                " · " +
                x.status +
                " · letzte Prüfung: " +
                dateTime(x.checkedAt),
            ),
          )
          .join("") +
        btn("Folgeauftrag vorbereiten", async () => {
          let people = o.people.filter((x, i) => on("follow" + i));
          if (!people.length) throw Error("Kontakte auswählen.");
          let n = {
            ...o,
            id: uid(),
            kind: "Antwortprüfung",
            people: people.map((p) => ({
              ...p,
              entryId: uid(),
              previousId: p.entryId,
            })),
          };
          await save({ ...state(), orders: [...state().orders, n] });
          showOrder(n);
        }) +
        btn("Manuell eintragen", () => manual(o)) +
        field("JSON-Ergebnis aus ChatGPT einfügen", "result", "", "textarea") +
        btn("Ergebnis übernehmen", () => {
          let r = reconcile(o, JSON.parse(val("result")));
          modal(
            "Übernahme prüfen",
            "<p>" +
              r.changed +
              " Änderungen</p>" +
              r.order.people
                .map(
                  (p) =>
                    "<p>" +
                    esc(p.label) +
                    " · " +
                    esc(p.status) +
                    " · " +
                    esc(p.next) +
                    "</p>",
                )
                .join("") +
              btn(
                "Geprüft übernehmen",
                async () => {
                  await save({
                    ...state(),
                    orders: state().orders.map((x) =>
                      x.id === o.id ? r.order : x,
                    ),
                  });
                  showOrder(r.order);
                },
                "primary",
              ),
          );
        }),
    );
  }
  function exp() {
    modal(
      "Alltagsexperiment",
      field("Frage zum Anfangen, Lernen oder Organisieren", "q") +
        field("Beginn", "from", date(), "date") +
        field("Ende", "to", plus(date(), 6), "date") +
        field("Messgröße", "measure") +
        check(
          "ok",
          "Es geht um eine Alltagshandlung ohne medizinische Behandlung.",
        ) +
        btn("Experiment anlegen", () => {
          if (
            !on("ok") ||
            !val("q") ||
            !val("measure") ||
            val("to") < val("from")
          )
            throw Error("Bitte Frage, Messgröße und Zeitraum prüfen.");
          return put(
            entry("Experiment", val("q"), {
              day: val("from"),
              until: val("to"),
              measure: val("measure"),
              area: "Studium",
              note: val("from") + " bis " + val("to") + " · " + val("measure"),
            }),
          );
        }),
    );
  }
  const sessions = {
    A: [
      "Beinpresse",
      "Sitzendes Kabelrudern",
      "Brustpresse",
      "Beinbeuger",
      "Seitheben am Kabel",
    ],
    B: [
      "Beinpresse",
      "Latzug",
      "Schräge Brustpresse",
      "Beinbeuger",
      "Wadenheben",
    ],
  };
  const guidance = {
    Beinpresse:
      "Rücken anlehnen, Füße stabil aufsetzen. Nur so tief gehen, wie das Becken an der Lehne bleibt.",
    "Sitzendes Kabelrudern":
      "Füße abstützen und den Griff ohne Schwung zu den unteren Rippen ziehen.",
    Brustpresse:
      "Sitz so einstellen, dass die Griffe etwa auf mittlerer Brusthöhe liegen. Kontrolliert nach vorn drücken.",
    Beinbeuger:
      "Kniegelenk auf Höhe der Drehachse einstellen und das Polster knapp oberhalb der Ferse anlegen.",
    "Seitheben am Kabel":
      "Kabel tief einstellen und den Arm bei ruhigem Oberkörper seitlich anheben.",
    Latzug:
      "Oberschenkelpolster einstellen. Griff kontrolliert vor dem Körper Richtung obere Brust ziehen.",
    "Schräge Brustpresse":
      "Sitz und Griffe mit dem Studiopersonal auf deine Körpergröße einstellen und ohne Schwung drücken.",
    Wadenheben:
      "Vorfüße stabil aufsetzen und die Fersen langsam heben und senken.",
  };
  function workout() {
    const s = state();
    const letter = s.nextWorkout === "B" ? "B" : "A";
    const moves = sessions[letter];
    const cursor = Math.min(Math.max(0, s.workoutIndex || 0), moves.length - 1);
    const move = moves[cursor];
    const last = s.entries
      .filter((e) => e.type === "Training" && e.title === move && !e.origin)
      .sort((a, b) =>
        (b.occurred || b.day).localeCompare(a.occurred || a.day),
      )[0];
    modal(
      "Einheit " + letter,
      "<p>" +
        (cursor + 1) +
        " von " +
        moves.length +
        "</p><h3>" +
        esc(move) +
        "</h3><p>" +
        guidance[move] +
        "</p>" +
        (last
          ? "<p>Zuletzt · " +
            esc(summary(last)) +
            " · Einstellung " +
            esc(last.setting || "offen") +
            "</p>"
          : "<p>Beim ersten Besuch Sitz, Polster und Bewegung vor Ort zeigen lassen. Mit leichtem Probesatz beginnen.</p>") +
        field("Sitzeinstellung / Polster", "setting", last?.setting) +
        field("Gewicht in kg", "weight", last?.value, "number") +
        field(
          "Wiederholungen je Satz, z. B. 10, 9",
          "performed",
          last?.performed || "",
        ) +
        btn(
          "Sätze speichern",
          async () => {
            const performed = val("performed").trim();
            const reps = performed.split(/[,/ ]+/).map(Number);
            const weight = Number(val("weight"));
            if (
              !val("weight").trim() ||
              !Number.isFinite(weight) ||
              weight < 0 ||
              reps.some((n) => !Number.isInteger(n) || n <= 0)
            )
              throw Error("Gewicht und tatsächliche Wiederholungen ergänzen.");
            const x = entry("Training", move, {
              area: "Training",
              setting: val("setting"),
              performed,
              sets: reps.length,
              reps: reps[0],
              value: weight,
              note:
                "Wiederholungen je Satz: " +
                performed +
                " · Einstellung: " +
                val("setting"),
            });
            const end = cursor + 1 === moves.length;
            await save({
              ...state(),
              entries: [...state().entries, x],
              workoutIndex: end ? 0 : cursor + 1,
              nextWorkout: end ? (letter === "A" ? "B" : "A") : letter,
            });
            if (end) {
              dlg.close();
              toast("Einheit abgeschlossen");
            } else workout();
          },
          "primary",
        ) +
        btn("Einheit kurz abschließen", async () => {
          if (cursor === 0)
            throw Error(
              "Erst das erste Gerät erfassen oder die Einheit schließen.",
            );
          await save({
            ...state(),
            workoutIndex: 0,
            nextWorkout: letter === "A" ? "B" : "A",
          });
          dlg.close();
        }),
    );
  }
  function products(arr) {
    return (
      arr
        .filter((e) => e.type === "Pflegeprodukt")
        .map((p) => {
          const lengths = p.useDays || [];
          const expected =
            p.opened && lengths.length
              ? plus(
                  p.opened,
                  Math.round(
                    lengths.reduce((a, b) => a + b, 0) / lengths.length,
                  ),
                )
              : "";
          async function update(changes) {
            await put({ ...p, ...changes });
          }
          return (
            '<section class="panel"><h3>' +
            esc(p.title) +
            "</h3><p>" +
            esc(
              p.low
                ? "Fast leer"
                : p.opened
                  ? "Geöffnet am " + p.opened
                  : "Ungeöffnet oder unbekannt",
            ) +
            (expected ? " · geschätzt bis " + esc(expected) : "") +
            '</p><div class="toolbar">' +
            (!p.opened
              ? btn("Packung geöffnet", () =>
                  update({ opened: date(), low: false }),
                )
              : "") +
            (!p.low ? btn("Fast leer", () => update({ low: true })) : "") +
            (p.opened
              ? btn("Aufgebraucht", () => {
                  const days =
                    (Date.parse(date()) - Date.parse(p.opened)) / 86400000;
                  return update({
                    opened: "",
                    low: true,
                    useDays: days > 0 ? [...lengths, days] : lengths,
                  });
                })
              : "") +
            "</div></section>"
          );
        })
        .join("") +
      '<p><a href="https://www.rossmann.de/de/angebote/m/angebote" target="_blank" rel="noopener">Rossmann-Angebote</a> · <a href="https://www.mueller.de/c/online-angebote/online-angebote-drogerie/" target="_blank" rel="noopener">Müller-Angebote</a></p>'
    );
  }
  function area(a, arr) {
    if (a === "Hautpflege") return products(arr);
    if (a === "Haare & Kopfhaut")
      return (
        '<div class="actions">' +
        btn("Termin vorbereiten", () => scalp(arr)) +
        (state().photos
          ? btn("Fotos vergleichen", () =>
              modal(
                "Fotos nach Perspektive",
                arr
                  .filter((x) => x.photo)
                  .sort(
                    (a, b) =>
                      (a.angle || "").localeCompare(b.angle || "") ||
                      a.day.localeCompare(b.day),
                  )
                  .map(
                    (x) =>
                      "<p>" +
                      esc(x.day) +
                      " · " +
                      esc(x.angle) +
                      '</p><img style="max-width:100%" src="' +
                      esc(x.photo) +
                      '" alt="Kopfhautaufnahme">',
                  )
                  .join("") || "Noch keine Aufnahmen.",
              ),
            )
          : "") +
        "</div>"
      );
    if (a === "Karriere") return btn("E-Mail-Auftrag", mail);
    if (a === "Ernährung") {
      let meals = arr.filter((e) => e.type === "Mahlzeit");
      return (
        '<div class="actions">' +
        btn("Rezept erfassen", meal) +
        meals
          .filter((m, i) => meals.findIndex((x) => x.title === m.title) === i)
          .map((m) =>
            btn(esc(m.title) + " portionieren", () =>
              modal(
                m.title,
                '<p class="wrap">' +
                  esc(
                    state().hideKcal
                      ? m.ingredients
                          ?.split("\n")
                          .map((l) => l.split("|").slice(0, 2).join(" · "))
                          .join("\n")
                      : m.ingredients,
                  ) +
                  "</p>" +
                  field("Portionen", "p", m.portion || 1, "number") +
                  btn("Portion speichern", () => {
                    let n = Number(val("p"));
                    if (n <= 0) throw Error("Positive Portion eingeben.");
                    return put({
                      ...m,
                      id: uid(),
                      day: date(),
                      value: Math.round((m.value * n) / (m.portion || 1)),
                      portion: n,
                      note: n + " Portion(en)",
                    });
                  }),
              ),
            ),
          )
          .join("") +
        (meals.length
          ? btn("Letzte Mahlzeit wiederverwenden", () =>
              put({ ...meals.at(-1), id: uid(), day: date() }),
            )
          : "") +
        "</div>"
      );
    }
    if (a === "Training") {
      let why = btn("Warum?", () =>
        modal(
          "Allgemeine Evidenz",
          '<p>Die WHO-Leitlinie für Erwachsene berücksichtigt auch kurze Bewegungseinheiten. Du kannst deshalb auch kurze Wege und einzelne aktive Minuten dokumentieren.</p><p>WHO, Guidelines on physical activity and sedentary behaviour, 2020. Geprüft am 06.11.2026.</p><a href="https://www.who.int/publications/i/item/9789240014886" target="_blank" rel="noopener">Leitlinie bei der WHO öffnen</a>',
        ),
      );
      let w = arr
          .filter((e) => e.type === "Gewicht" && typeof e.value === "number")
          .sort((a, b) => b.day.localeCompare(a.day)),
        recent = w.filter((e) => e.day >= plus(date(), -6) && e.day <= date());
      let last = [...arr]
        .reverse()
        .filter((e) => e.type === "Training" && !e.origin)
        .sort((a, b) =>
          (b.occurred || b.day).localeCompare(a.occurred || a.day),
        );
      return (
        btn("Training starten", workout, "primary") +
        '<div class="panel"><small>Gewicht · Ziel ' +
        esc(state().goal) +
        ' kg</small><p class="metric">' +
        (w[0] ? esc(w[0].value) + " kg" : "—") +
        "</p><small>7-Tage-Mittel · " +
        (recent.length
          ? (recent.reduce((a, e) => a + e.value, 0) / recent.length).toFixed(
              1,
            ) + " kg"
          : "—") +
        "</small><p>" +
        w
          .slice(0, 7)
          .map((e) => esc(e.day) + " · " + esc(e.value) + " kg")
          .join("<br>") +
        "</p>" +
        btn("Gewicht erfassen", () =>
          edit(entry("Gewicht", "Körpergewicht", { area: a })),
        ) +
        "</div>" +
        last
          .filter(
            (e, i) =>
              last.findIndex(
                (x) => x.title.toLowerCase() === e.title.toLowerCase(),
              ) === i,
          )
          .map((e) =>
            btn(esc(e.title) + " · zuletzt " + esc(summary(e)), () =>
              edit({ ...e, id: uid(), day: date() }),
            ),
          )
          .join("") +
        '<p class="panel">Allgemeine Empfehlung · Auch kurze Bewegung zählt. ' +
        why +
        "</p>"
      );
    }
    if (a === "Schlaf & Energie")
      return btn("Schlaf erfassen", () =>
        edit(entry("Schlaf", "Schlaf", { area: a })),
      );
    if (a === "Studium")
      return (
        btn("Alltagsexperiment anlegen", exp) +
        arr
          .filter((e) => e.type === "Experiment")
          .map((e) => {
            let logs = arr.filter(
              (x) => x.expId === e.id && x.day >= e.day && x.day <= e.until,
            );
            return (
              '<div class="panel">' +
              esc(e.title) +
              "<p>" +
              esc(e.measure) +
              " · " +
              new Set(logs.map((x) => x.day)).size +
              " erfasste Tage · " +
              esc(e.day) +
              " bis " +
              esc(e.until) +
              "</p>" +
              logs
                .map(
                  (x) =>
                    "<p>" +
                    esc(x.day) +
                    " · " +
                    esc(x.value) +
                    " · " +
                    esc(x.note) +
                    "</p>",
                )
                .join("") +
              btn("Beobachtung erfassen", () =>
                edit(
                  entry("Notiz", e.measure, {
                    area: a,
                    expId: e.id,
                    note: "Störfaktoren / Schichtwechsel: ",
                  }),
                ),
              ) +
              "</div>"
            );
          })
          .join("")
      );
    return "";
  }
  return { area, calendar, settings, changed, workout };
}
