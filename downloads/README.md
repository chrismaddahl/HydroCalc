# HydroCalc offline herunterladen

[HydroCalc Offline v0.2.0 als ZIP herunterladen](https://github.com/chrismaddahl/HydroCalc/raw/refs/heads/main/downloads/HydroCalc-Offline-v0.2.0.zip)

ZIP entpacken und **HydroCalc.html** im Browser öffnen. Alle Programmdateien und Styles sind eingebaut; eine Internetverbindung oder ein Server ist nicht erforderlich. Die Düngerdatenbank beginnt leer.

Rezepturen und Produkte regelmäßig über „Sammlung sichern“ als JSON exportieren. Vor einem Update oder Verschieben der HTML-Datei eine Sicherung erstellen; die Browserspeicherung kann vom Dateipfad abhängen. Die beiliegende Anleitung erklärt Datensicherung und Import auf Deutsch und Englisch.

Die Datei `HydroCalc-Offline-v0.2.0.zip.sha256` enthält die SHA-256-Prüfsumme. Die ZIP-Datei enthält die Anwendung, eine Anleitung und die Lizenztexte ihrer Laufzeitbibliotheken. Sie enthält keine persönlichen Produkte oder Rezepturen.

## Paket selbst bauen

Im Projektverzeichnis nach `npm ci`:

```bash
npm run build:offline
```

Das erzeugt die entpackten Dateien unter `dist-offline/HydroCalc-Offline/` sowie ZIP-Datei und Prüfsumme unter `downloads/`. Für Browserprüfungen mit vollständig gesperrtem Netzwerk:

```bash
HYDROCALC_CHROMIUM=/usr/bin/chromium npm run test:offline
```

Falls der Testbrowser lokale Datei-URLs per Administratorrichtlinie sperrt, kann `HYDROCALC_OFFLINE_TEST_MODE=intercept` ergänzt werden. Dieser hier geprüfte Ersatzmodus stellt die unveränderte HTML-Datei aus dem Archiv ohne echte Netzwerkverbindung bereit; er validiert nicht den direkten `file://`-Start. Details und Einschränkungen stehen in der [Projekt-README](../README.md).
