# HydroCalc

Ein deutsch- und englischsprachiger Nährstoffrechner für hydroponische Lösungen. Die Düngerdatenbank beginnt leer: Nutzer erfassen eigene Produkte als Elementgehalt oder anhand ihrer Verpackungsdeklaration, etwa P₂O₅ oder K₂O.

## Downloadbare Offline-Version

[HydroCalc Offline v0.2.0 herunterladen](https://github.com/chrismaddahl/HydroCalc/raw/refs/heads/main/downloads/HydroCalc-Offline-v0.2.0.zip), ZIP entpacken und **HydroCalc.html** im Browser öffnen. Programmcode und Styles sind vollständig eingebaut; Internet, Node.js und ein Server sind zum Benutzen nicht nötig.

Die Anwendung läuft auch beim ersten Öffnen ohne Netzwerk. Rezepte und Produkte bleiben im Browser; für dauerhafte Sicherungen „Sammlung sichern“ verwenden. Den aktuellen Entwurf dafür zuerst über „Zur Sammlung“ speichern. Vor Updates oder Verschieben der HTML-Datei eine JSON-Sicherung erstellen, da die Dateispeicherung im Browser vom Dateipfad und Browserprofil abhängen kann. JSON-Sicherungen lassen sich zwischen Web- und Offline-Version übertragen.

Die ZIP-Datei enthält eine deutsche und englische Anleitung und die Lizenztexte der Laufzeitbibliotheken. Einzelheiten, Prüfsumme und Bauanleitung: [Offline-Downloads](downloads/README.md).

## Entwicklung

Voraussetzung: Node.js ab 22.12 (hier mit Node 24 geprüft), npm und ein moderner Browser.

```bash
npm ci
npm run dev
```

Der Entwicklungsserver verwendet standardmäßig Port 5173. `npm run build` erstellt den Produktionsstand in `dist`; `npm run preview` startet dessen lokale Prüfung. Vite-Preview ist kein Produktionshosting. Die Anwendung benötigt keine API-Schlüssel oder externen Laufzeitdienste.

## Aktueller Funktionsumfang

- Eigene feste und flüssige Dünger anlegen, bearbeiten und löschen; Element-/Oxidangaben pro Nährstoff mit Umrechnungsvorschau.
- Wasserwerte, Zielkonzentrationen, Toleranzen und Endvolumen erfassen. Fehlende Werte bleiben unbekannt, bis eine Nullannahme ausdrücklich bestätigt wird.
- Nichtnegative, toleranzgewichtete Mengenoptimierung sowie Vorwärtsrechnung mit manuellen Mengen. Feste Mengen bleiben exakt unverändert.
- Bilanz mit Wasser- und Düngerbeiträgen sowie Zielabweichungen. Die Ergebnisbewertung verwendet die gerundeten Ausgabemengen.
- Deutsch/Englisch einschließlich Zahlenformaten; responsive Oberfläche.
- Automatische lokale Speicherung des aktuellen Entwurfs und der Sammlung; benannte Rezepturen öffnen, duplizieren und löschen.
- JSON-Sicherung und geprüfter Import als Kopien, ohne Überschreiben vorhandener Daten.

Die erste Version speichert in `localStorage`, noch nicht in IndexedDB. Die Speicherung ist an Browser und Origin gebunden und kann durch Löschen der Browserdaten verloren gehen. „Sammlung sichern“ exportiert gespeicherte Rezepturen und Produkte; den aktuellen Entwurf dafür zuerst über „Zur Sammlung“ sichern. Ergebnisse werden nach Neuladen neu berechnet. Rezepturen speichern Produktsnapshots und ändern sich bei einer Produktbearbeitung erst nach ausdrücklich gewählter Aktualisierung.

Die herunterladbare HTML-Version ist offline nutzbar; eine installierbare PWA, CSV-Export, eine eigene Wasserprofilverwaltung und Stammlösungen sind noch nicht implementiert. Es wurden keine HydroBuddy-Produktdaten, Grafiken oder Berechnungsdateien übernommen. Es gibt kein öffentliches Webhosting oder eine Serverdatenbank.

## Fachliche Regeln

Details und Referenzfälle stehen im [Fachkonzept](docs/Fachkonzept.md). Intern gelten Liter, Gramm beziehungsweise Milliliter Produkt und mg/L Elementgehalt. Deklarationsformen werden stöchiometrisch normalisiert; die Faktoren stammen aus einer versionierten Tabelle konventioneller Atomgewichte in `src/domain.ts`.

Für die nichtnegative Optimierung wird `ml-fcnnls` 3.1.0 (MIT) verwendet, mit skalierten Spalten, Iterationsgrenze und zusätzlicher Prüfung der Optimalitätsbedingungen (KKT). Rangdefiziente Systeme können mehrere gleich gute Lösungen besitzen. Toleranzen sind weiche Optimierungsziele, keine garantierten Höchstgrenzen. Gesamt-N wird nicht zu seinen Teilformen hinzuaddiert.

Die Berechnung prüft keine Löslichkeit, Mischverträglichkeit, pH-Werte oder Eignung für bestimmte Kulturen. Endvolumen und Ausgangswasservolumen werden näherungsweise gleichgesetzt. Analytische und synthetische Referenzfälle sind geprüft; eine agronomische Validierung mit realen Rezepturen und ausgeführte HydroBuddy-Laufzeitvergleiche stehen aus.

## Prüfung

```bash
npm test
npm run build
npm run build:offline
npm run format:check
```

Bedienungstests benötigen Chromium. Entweder einen von Playwright verwalteten Browser mit `npx playwright install chromium` installieren oder ein vorhandenes Chromium verwenden:

```bash
HYDROCALC_CHROMIUM=/usr/bin/chromium npm run test:e2e
```

`HYDROCALC_CHROMIUM` ist optional und bezeichnet den Pfad zum Browser. Die Tests starten den App-Server selbst, sofern Port 5173 nicht schon durch HydroCalc belegt ist. Für Tests des gebauten Produktionsstands zuerst den laufenden Entwicklungsserver stoppen und anschließend ausführen:

```bash
npm run build
HYDROCALC_E2E_PREVIEW=1 HYDROCALC_CHROMIUM=/usr/bin/chromium npm run test:e2e
```

Die Tests verwenden isolierte Browserkontexte. Synthetische Testprodukte werden nie automatisch in die Nutzerdatenbank eingespielt.

Die ZIP-Datei wird separat ohne Server mit gesperrtem Netzwerk getestet:

```bash
npm run build:offline
HYDROCALC_CHROMIUM=/usr/bin/chromium npm run test:offline
```

Diese Prüfung entpackt das auszuliefernde Archiv in ein temporäres Verzeichnis und öffnet die HTML-Datei standardmäßig direkt über `file://`. Sie prüft Rechnen, Speichern/Neuladen, Sprachwechsel, JSON-Sicherung und -Import sowie den Betrieb bei blockiertem Browserspeicher.

Der verwaltete Chromium-Browser dieser Cloud-Umgebung blockiert `file://` per Administratorrichtlinie. Für diesen Fall ist ein ausdrücklich gewählter Ersatzmodus verfügbar:

```bash
HYDROCALC_OFFLINE_TEST_MODE=intercept HYDROCALC_CHROMIUM=/usr/bin/chromium npm run test:offline
```

Dabei liefert Playwright die unveränderten HTML-Bytes aus dem entpackten ZIP direkt an eine lokale HTTP-Testadresse. Es läuft kein Server, der Browser ist offline und weitere HTTP-Anfragen werden abgebrochen. Dieser Modus prüft den HTML-Inhalt und seine Abläufe ohne Netzwerk, aber nicht das Verhalten des `file://`-Ursprungs oder dessen Browserspeicherung. In dieser Umgebung wurden die Browserprüfungen in diesem Ersatzmodus ausgeführt; ein erfolgreicher direkter Dateistart und andere Browser/Betriebssysteme werden nicht behauptet.
