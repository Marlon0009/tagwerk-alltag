# Tagwerk für Marlon

## Start in zwei Minuten

1. Am Computer mit Node.js 22 oder neuer im Projektordner `npm start` ausführen. Die App läuft unter http://localhost:5173. Der Kern verwendet Browserfunktionen, die Tests verwenden Playwright als Entwicklungsabhängigkeit.
2. Für das iPhone den Ordner **dist** auf einem statischen HTTPS-Host bereitstellen. Die bereitgestellte Host-Adresse genügt. Beispiel mit GitHub Pages: In einem eigenen öffentlichen Repository ausschließlich den Inhalt von **dist** ins Hauptverzeichnis laden. Unter **Settings → Pages → Deploy from a branch** den Hauptbranch und **/(root)** wählen. Die angezeigte HTTPS-Adresse öffnen. Zum Neubauen `node build.mjs` ausführen. Alle App-Pfade sind relativ.
3. Die HTTPS-Adresse auf dem iPhone in Safari öffnen. **Teilen → Zum Home-Bildschirm → Als Web-App öffnen** (falls angezeigt) → **Hinzufügen**. Tagwerk über das neue Symbol online öffnen, einmal vollständig laden, dann den Offline-Start im Flugmodus prüfen. Die Installation über eine unverschlüsselte LAN-IP unterstützt den Offline-Cache nicht.
4. **Beispiel · Einrichten** wählen. Dienst, echte Frist, Ziele und optional Gewicht angeben. Alle Felder sind überspringbar. Der erste Plan entsteht beim Speichern. Private Angaben erst in der installierten App eingeben, damit sie im richtigen Speicher landen.

Die erste Ansicht ist ein fiktiver, bearbeitbarer Beispieltagesplan. Die eigentliche Einrichtung ersetzt ihn. Die App benötigt weder Login noch Schlüssel. Mit **+** Text eingeben und die Interpretation prüfen. Das Mikrofon der iPhone-Tastatur nutzt die Diktateinstellungen des Geräts. Unter **Bereiche → Einstellungen & Sicherung** sind alle Verwaltungsfunktionen auch mobil erreichbar.

## Heute und Verlauf

Ein Tipp auf eine Priorität zeigt den ersten Schritt. Beim Unterbrechen den Wiedereinstieg speichern. Nach einem freien Tag frühere Aufgaben gesammelt auf heute legen, pausieren oder streichen. Bei einem Training nach Mitternacht das Feld **Wachabschnitt / Plandatum** auf den Tag des Aufstehens setzen. Bei Schichten und Schlaf Beginn und Ende mit beiden Daten eintragen. In einem Bereich zwischen Vorschlägen und automatischen Zeitblöcken wechseln. Ein Zeitkonflikt öffnet den betroffenen Eintrag zur Entscheidung.

Für Fristen **An Kalender übergeben** wählen. Die ICS-Datei öffnen, den Eintrag übernehmen und den Alarm im Zielkalender prüfen. Kalender-Import je nach iOS-Version ggf. über Kalender auf dem Mac und iCloud-Synchronisation. Eine Datei-Erstellung bestätigt ausschließlich die Übergabe. Die vier Erinnerungsarten erscheinen bei geöffneter App außerhalb der Ruhezeiten. Lokale Nacht- und Schlafintervalle unterdrücken diese Hinweise. [WebKit zu Push auf dem Home-Bildschirm](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)

## Eigene Daten sichern und wieder einspielen

**Einstellungen → Datei sichern**. Ein langes einmaliges Passwort wählen und getrennt im Passwortmanager hinterlegen. JSON-Datei in der Dateien-App aufbewahren. Die Sicherung enthält eine Schema-Version, einen zufälligen Salt und IV. PBKDF2-SHA-256 mit 310.000 Durchläufen leitet einen AES-256-GCM-Schlüssel ab. Die Integritätsprüfung geschieht vor der Übernahme. Lokal liegen die Arbeitsdaten in IndexedDB, geschützt durch Gerätesperre und Browser-Speichertrennung. Löschen der Website-Daten kann diesen Speicher leeren.

**Wiederherstellen → Datei und Passwort → Vorschau prüfen**. Erst **Diesen Stand wiederherstellen** ersetzt die Daten. Der letzte vorherige Stand bleibt unter **Vorherigen Stand prüfen** erreichbar. Fotos sind separat zuschaltbar. Die Entscheidung zur Fotosicherung gilt für Datei und Drive. Bereits erstellte Dateien behalten ihren damaligen Inhalt.

**Umzug**: Auf dem alten Gerät einen verschlüsselten Dateiexport anfertigen. App-Dateien auf dem neuen HTTPS-Host bereitstellen, unter dessen Adresse installieren, Datei wie oben wiederherstellen. Einträge und letzte Trainingswerte prüfen, bevor der alte Stand gelöscht wird. Für Google die neue Origin autorisieren. Beim App-Update die Cacheversion in sw.js erhöhen, alle Dateien gemeinsam veröffentlichen und alle alten App-Fenster schließen. Unbekannte Schema-Versionen werden zurückgewiesen.

## Google Drive optional

Einmalig in der Google Cloud Console ein eigenes Projekt erstellen, **Drive API** aktivieren, Google-Auth-Zustimmungsbildschirm konfigurieren, bei Testbetrieb das eigene Google-Konto als Testnutzer aufnehmen. Eine OAuth-Client-ID vom Typ **Webanwendung** erstellen. Unter **Autorisierte JavaScript-Quellen** die exakte HTTPS-Origin des Hosts eintragen (für lokale Tests http://localhost:5173). In Tagwerk unter **Google Drive** die öffentliche Client-ID und das Sicherungspasswort eingeben, dann Google-Freigabe öffnen. Das Passwort verschlüsselt auf dem Gerät. Token und Passwort bleiben im Arbeitsspeicher.

Der einzige angeforderte Drive-Bereich ist **drive.appdata**. Jede bestätigte Sicherung erzeugt eine neue Version im App-Datenordner. Die Auswahl zeigt bis zu 100 jüngste Stände. Beim ersten Verbinden und nach Änderungen erfolgt die Sicherung bei geöffneter App. Wiederverbinden holt ausstehende Änderungen nach. Ohne gültige Sitzung erneut anmelden. Bei einem Netzwerkfehler bleibt die lokale Datenbank erhalten. **Jetzt sichern** wiederholt den Versuch. Der Erfolgszeitpunkt wird erst nach einer von Drive zurückgegebenen Datei-ID gesetzt. [Google-Dokumentation zum App-Datenordner](https://developers.google.com/workspace/drive/api/guides/appdata)

## Apple Health und Watch

Die Beispieldatei **examples/health.json** enthält vier fiktive Messungen. Unter **Health-Datei** zunächst Herkunft und Zeitintervalle prüfen. Gleiche Quell-IDs sowie überlappende Intervalle desselben Typs werden konservativ ausgelassen. Deshalb je Datentyp vorab eine bevorzugte Quelle wählen. Bei teilweise überlappenden Intervallen kann diese Regel einen gültigen Teil verwerfen. Das Beispiel enthält Minuten und kg, keine lb oder kcal als Trainingsdauer.

**Eigener Kurzbefehl** (deutsche Aktionsnamen können je nach iOS abweichen): In Kurzbefehle einen neuen Kurzbefehl anlegen. „Gesundheitsproben suchen“ hinzufügen. Typ, Zeitraum und möglichst Quelle filtern. „Mit jedem wiederholen“ verwenden. Pro Probe Start, Ende, Wert und Quelle aus den Details holen. Datum als ISO 8601 einschließlich Zeitzone formatieren. Ein Wörterbuch je Probe mit den Schlüsseln aus der Beispieldatei erzeugen und einer Liste hinzufügen. Als stabile ID bei fehlender UUID eine Kombination aus Quellname, Typ, Start, Ende und Wert verwenden. Die Liste als JSON-Text mit eckigen Klammern speichern (Wörterbücher als JSON-Text konvertieren, mit Komma verbinden). „Datei sichern“ ausführen, die erzeugte JSON-Datei in Tagwerk prüfen. Lesefreigabe pro gewünschtem Datentyp am Gerät erteilen.

| Typ | Einrichtung und Einschränkung |
|---|---|
| Schritte | Schritte einer Quelle, Einzelintervall und Anzahl, unit=count. Aggregierte Tageswerte und Einzelintervalle getrennt halten. |
| Gewicht | Körpermasse auswählen und in kg umrechnen. Start und Ende können identisch sein. |
| Schlaf | Schlafanalyse nach tatsächlich schlafenden Zuständen filtern, Bettzeit und parallele Summen auslassen. Dauer aus Ende minus Start in Minuten. |
| Training | Auf dem Gerät prüfen, ob Trainingseinheiten samt Anfang und Dauer als Kurzbefehl verfügbar sind. Andernfalls die Einheit in Health ablesen und manuell dokumentieren. |

Die Dateiübernahme ist getestet. Verfügbarkeit von Trainingsobjekten, Feldnamen, Quellfiltern und erteilten Leserechten hängen vom Gerät ab. Ein automatischer Watch-Abgleich ist nicht eingerichtet. [Apple zu Suchaktionen einschließlich Gesundheitsproben](https://support.apple.com/en-mt/guide/shortcuts/apd3c845e881/ios)

## Karriere und Terminvorbereitung

**Karriere → E-Mail-Auftrag**. Eine Zeile je Person oder Arbeitgeber, dahinter nach einem senkrechten Strich die ausdrücklich ausgewählten Dateinamen. Beispiel: `Alex Beispiel, Firma Nord | Lebenslauf-A.pdf`. Jede Zeile erhält eine eigene ID. **Auftrag kopieren** oder **Teilen**. In ChatGPT einfügen. Eine dortige Gmail-Freigabe und die tatsächlich verfügbaren Funktionen müssen separat geprüft werden. Dateinamen sind Hinweise zur Auswahl, keine hochgeladenen Anlagen. Bei fehlender Freigabe kann der Text als Entwurfsauftrag verwendet werden. Als Ergebnis JSON einfügen oder **Manuell eintragen**, dann **Übernahme prüfen**. Die App übernimmt nur zum Auftrag passende IDs. Die Gmail-ID stammt aus dem zurückgegebenen Ergebnis. Der angezeigte Prüfzeitpunkt stammt aus deiner manuellen Angabe oder dem übernommenen Prüfergebnis. Ein Versand wird in Tagwerk nicht ausgelöst.

Für die Praxis unter **Haare & Kopfhaut → Termin vorbereiten** nur die gewünschten Einträge auswählen, Zusammenfassung bearbeiten und als Text exportieren. Die App dokumentiert persönliche Beobachtungen und wortgetreu eingegebene Routinen. Sie erzeugt keine medizinischen Behandlungsempfehlungen.

## Prüfung und Quellcode

`npm install`, `npm test`, anschließend `node tests/browser.mjs` mit installiertem Microsoft Edge. Für einen installierten Chromium-Kanal kann BROWSER_CHANNEL gesetzt werden. **PRUEFLISTE.md** trennt geprüfte Funktionen und offene Geräteabnahme. **examples/email.txt** ist ein fiktiver vollständiger Übergabeauftrag.

app.js enthält Ansicht und lokale Transaktionen, core.mjs Datenmodell, Planung und Verschlüsselung, exchange.mjs Import- und Auftragsabgleich, extensions.js Fachbereiche und Drive-Anbindung, reflection.js Check-in und Wochenwerte. Der Offline-Cache enthält ausschließlich öffentliche Programmdateien. Die beiden ersten öffentlichen Mist-Screenshots wurden angesehen. Besonders die kurze Texteingabe mit sichtbarer Ergebnisliste diente als Bedienreferenz. [Mist im App Store](https://apps.apple.com/us/app/mist-nutrition-tracker/id6743011052)

