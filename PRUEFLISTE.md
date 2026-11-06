# Abnahme von Tagwerk

Alle aufgeführten Tests verwenden fiktive Daten. Testdatum 6. November 2026.

| Ablauf | Bereits geprüft | Auf dem iPhone prüfen |
|---|---|---|
| 22–6 Uhr, Schlaf und Frist | Regeltest mit echtem Datumswechsel. Schlaf bis 14 Uhr blockiert die freiwillige Aufgabe im Minimum-Modus. | Eigene Dienstzeiten und Frist eintragen. Kalenderalarm im Zielkalender kontrollieren. |
| Letzter Trainingssatz offline | Edge-Browsertest mit IndexedDB, aktivem Service Worker und abgeschaltetem Netzwerk. Nach Neuladen steht „Latzug · zuletzt 55 kg · 3 × 10“ zur Verfügung. | App vom Home-Bildschirm im Flugmodus beenden und neu öffnen. |
| Lernblock fortsetzen | Regeltest mit gespeichertem Wiedereinstieg und Verschieben auf heute. | Aufgabe beginnen, unterbrechen, Notiz über Nacht erhalten. |
| Woche ausgesetzt | Sieben Tage alter Eintrag verdrängt im Regeltest keine heutige Aufgabe. Nach Neuplanung bleibt die Notiz erhalten. | Sammelaktionen mit eigenen Beispielen ausprobieren. |
| E-Mail-Übergabe | Regeltest mit zwei gleichnamigen Personen, getrennten IDs, zwei Anlagen, Unternehmen ohne Adresse und Teilfreigabe. Doppeltes und älteres Ergebnis verworfen. | Teilen, Zwischenablage, Gmail-Freigabe, verfügbare Anlagen und tatsächliche Bestätigung in ChatGPT prüfen. |
| Health/ICS | Vier Typen aus examples/health.json, wiederholter Import und überlappende Quelle getestet. ICS-UID bleibt stabil. | Eigene Schritte, Körpermasse, Schlaf und verfügbare Trainingsdaten getrennt gegen Health vergleichen. |
| Sicherung | AES-GCM-Rundlauf, Manipulation und falsches Passwort getestet. Echte Datei in leeres Browserprofil eingespielt, Training nach Neustart wiedergefunden. Simulierter Google-Login und abgebrochener Upload im Browser erzeugen keine Erfolgsmeldung. | Mit eigener OAuth-ID echten Upload freigeben, zweite Version erzeugen, ältere Version öffnen. Dateien-App und Passwortmanager testen. |
| Termin vorbereiten | Im Browser nur Kopfhaut-Eintrag ausgewählt und erzeugten editierbaren Text auf Ausschluss von Training und Studium geprüft. | Textdatei in Dateien öffnen. Freiwillige Fotos, verwendetes Bildformat und Perspektiven prüfen. |
| Update | Automatisierte Migration von Schema 1 auf 2 erhält die bestehende Eintrags-ID. Browser-Neustart erhält gespeicherte Daten. | Neues Release über derselben Origin installieren und einen vorhandenen Eintrag öffnen. |
| Bedienung | Desktopansicht visuell geprüft. Browser bei 375 und 320 Pixeln, vergrößertem Text, reduzierter Bewegung und Offline-Betrieb geprüft. | Dynamic Type, VoiceOver-Reihenfolge, Displayausschnitt, Diktat, Ablehnung von Systemfreigaben und Rückkehr aus dem Teilen-Dialog prüfen. |

## Verbleibende Grenzen

Zusätzlich im Browser bestätigt: Ein IndexedDB-Bestand mit Schema 1 lässt sich nach dem Update öffnen, bearbeiten und erneut speichern. Bei simulierter Ablehnung der Zwischenablage markiert die App den vollständigen Auftrag zum manuellen Kopieren.

- Google-Sitzung und Verschlüsselungspasswort für automatische Sicherungen gelten pro geöffneter Sitzung. Nach Neustart meldet die Drive-Ansicht den Anmeldebedarf.
- Erinnerungen werden bei geöffneter App geprüft. Die tatsächliche Alarmzustellung übernimmt nach Import und Freigabe der Geräte-Kalender.
- Der Health-Import verwirft überlappende Daten konservativ. Teilintervalle werden nicht statistisch rekonstruiert.
- Der Kalenderimport unterstützt einzelne VEVENTs mit UTC oder lokaler Gerätezeitzone. Wiederholte Schichten lassen sich in Tagwerk anlegen. Kalender-Serien müssen als einzelne Ereignisse exportiert werden.
- Der Wochenrückblick beschreibt erfasste Arbeit und eigene Messungen. Alltagsexperimente zeigen einzelne Messungen und selbst dokumentierte Störfaktoren.
- Für die Geräteabnahme steht hier kein physisches iPhone und kein von Marlon freigegebenes Google-Konto zur Verfügung.

