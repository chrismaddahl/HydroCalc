# HydroCalc – Fachkonzept

Stand: 23.10.2026 · Version 0.1 · Entwurf zur fachlichen Abstimmung

## 1. Ziel und Entscheidungsstand

HydroCalc unterstützt die nachvollziehbare Planung hydroponischer Nährlösungen. Aus Ausgangswasser, gewünschten Nährstoffkonzentrationen, verfügbaren Düngern und Endvolumen entstehen dosierbare Mengen und eine transparente Gegenüberstellung von Ziel und Ergebnis.

Die Anwendung berechnet eine Rezeptur unter dokumentierten Annahmen. Sie bewertet nicht automatisch, ob ein Nährstoffprofil für eine bestimmte Kultur geeignet ist. Eine rechnerisch passende Rezeptur garantiert weder Löslichkeit noch chemische Stabilität.

Dieses Dokument beschreibt die fachliche Spezifikation. Den aktuellen Umsetzungsstand und die noch fehlenden Funktionen dokumentiert die [README](../README.md). Eine vollständige fachliche Freigabe aller beschriebenen Funktionen ist damit nicht verbunden. Zahlenbeispiele sind definierte Testfälle, keine Düngeempfehlungen.

Vom Nutzer bestätigte Produktentscheidungen:

- Zielgruppe: Privatanwender mit einzelnen Nährsalzen.
- Deutsch und Englisch ab der ersten Version, ohne Anmeldung.
- Die Düngerdatenbank startet leer und wird vom Nutzer selbst befüllt. Es werden keine HydroBuddy-Düngerdaten oder Beispielprodukte automatisch eingespielt.
- Pro Nährstoff kann der Nutzer den Elementgehalt oder eine unterstützte Deklarationsform der Verpackung eingeben; HydroCalc rechnet im Hintergrund in Elementgehalte um.

Ergänzende Konzeptvorschläge:

- Offlinefähige Web-App, nutzbar auf Desktop und Mobilgeräten.
- Manuell erfasste Mehrkomponentendünger werden im Datenmodell berücksichtigt; optimierte Bedienabläufe dafür haben zunächst keine Priorität.
- Lokale Speicherung; kein Server, kein Cloud-Konto und keine automatische Datenübertragung.
- HydroCalc entsteht im vorhandenen Repository neu; HydroBuddy dient als fachliche Vergleichsquelle.

## 2. Erkenntnisse aus HydroBuddy

Untersucht wurde der Quellstand `a1e63b32dcee9f92e34c9c281e090820dfc49def` aus [danielfppps/hydrobuddy](https://github.com/danielfppps/hydrobuddy/tree/a1e63b32dcee9f92e34c9c281e090820dfc49def).

| Befund | Konsequenz für HydroCalc |
| --- | --- |
| Pascal/Lazarus, umfangreiche Hauptdatei mit Oberfläche, Datenzugriff und Berechnung | Rechenkern, Datenhaltung und Oberfläche werden getrennt. |
| DBF-Dateien für Stoffe, Wasser und Rezepturen | Eigenes versioniertes Austauschformat; ein Altimport wird separat bewertet. |
| `hb_main.pas` verwendet `RMatrixSolveLS`; anschließend werden positive Lösungsmengen berücksichtigt | Nichtnegative Optimierung als eigenes fachliches Verhalten spezifizieren; Ergebnisse nicht blind identisch nachbauen. |
| Wasserbeiträge, Stickstoffformen, Reinheit, flüssige Produkte und Oxidumrechnungen vorhanden | Diese Unterscheidungen ausdrücklich modellieren und testen. |
| Weitere Funktionen wie Stammlösungen, Gewebeanalyse und EC-bezogene Modelle vorhanden | Für die erste Version bewusst begrenzen, statt vollständige Funktionsgleichheit zu versprechen. |

Die Altanwendung wurde für dieses Konzept nicht kompiliert oder ausgeführt. Laufzeitvergleiche und vollständige Prüfung des Altalgorithmus stehen aus.

## 3. Fachlicher Umfang

### Erste Version

- Rezept anlegen, benennen, duplizieren und löschen; Endvolumen in Litern festlegen.
- Wasserprofil manuell erfassen, speichern und einem Rezept zuordnen.
- Nährstoffziele manuell eingeben; je Größe zwischen „Ziel festgelegt“ und „nur beobachten“ unterscheiden.
- Eigene feste Dünger mit dokumentierten Gehaltsangaben erfassen und auswählen.
- Leere Düngerverwaltung mit Aktion „Ersten Dünger anlegen“; keine automatische Vorbelegung. Ein Entwurf ist ohne Dünger speicherbar, eine automatische Dosierung benötigt mindestens ein ausgewähltes Produkt.
- Mengen automatisch optimieren oder zur Kontrolle einer vorhandenen Rezeptur manuell eingeben.
- Mengen optional fest vorgeben; fest bedeutet exakt unveränderlich, nicht Mindestmenge.
- Wasserbeitrag, Düngerbeitrag, Gesamtwert und Zielabweichung je Nährstoff anzeigen.
- Rezept lokal speichern, vollständig als JSON sichern und importieren; Ergebnistabelle als CSV exportieren und drucken.
- Überschreitungen, fehlende Angaben, nicht erreichte Ziele und Rundungseffekte sichtbar machen.

Flüssigdünger gehören zum angestrebten ersten Umfang, werden aber erst freigegeben, wenn Gehaltsbasis, Dichteumrechnung und Testfälle vollständig geprüft sind. Die feste Dosierung muss vorher bereits durchgängig funktionieren.

### Spätere Ausbaustufen

- Geprüfter Stoffkatalog und Kulturprofile mit nachvollziehbaren Quellen und Nutzungsrechten.
- Stammlösungen mit Verdünnungsfaktoren und A/B-Trennung.
- Preisvergleich, Kostenoptimierung, Bestandsverwaltung und Produktverfügbarkeit.
- Wasserblends, Osmosewasser-Verschnitte und weitere Einheiten.
- HydroBuddy-Datenimport nach Feld-, Einheiten- und Lizenzprüfung.
- Weitere Sprachen, Synchronisierung und gemeinsame Rezeptverwaltung nach Bedarf.

Nicht Bestandteil der ersten Version: pH-/Säuredosierung, EC-Vorhersage, Fällungs- oder Löslichkeitsmodell, Gewebeanalyse, automatische Kulturberatung, Sensorsteuerung und verbindliche Mischreihenfolgen.

## 4. Nutzerablauf und Bildschirmkonzept

Die Hauptnavigation umfasst „Rezepte“, „Wasserprofile“ und „Dünger“. Ein Rezept führt durch fünf Bereiche; bereits gemachte Angaben bleiben beim Wechsel erhalten.

| Bereich | Eingaben und Aktionen | Sichtbare Rückmeldung |
| --- | --- | --- |
| 1. Ansatz | Name, Notiz, Endvolumen | Einheit und Hinweis: Volumen nach vollständigem Ansetzen |
| 2. Ausgangswasser | Profil wählen/erfassen; Nullwasser ausdrücklich bestätigen | Fehlende Werte, Quelle und Datum der Analyse |
| 3. Zielprofil | Zielwerte und Toleranzen je Nährstoff | Einheit, Bezugsform und aktive Optimierungsziele |
| 4. Dünger | Produkte auswählen; automatische oder feste Menge; manuelle Prüfung als eigener Modus | Zusammensetzung, Quelle, unvollständige Produktdaten |
| 5. Ergebnis | Berechnen, speichern, exportieren, drucken | Dosiertabelle, Konzentrationen, Zielabweichungen und Datenlücken |

Am Desktop stehen Eingaben und Zusammenfassung nebeneinander; mobil folgen sie untereinander. Tabellen behalten ihre Einheiten auch auf kleinen Bildschirmen. Farbe wird durch Text und Symbole ergänzt. Alle Eingaben sind per Tastatur bedienbar; Fehler erscheinen direkt am zugehörigen Feld.

Deutsch und Englisch sind jederzeit umschaltbar; die Auswahl wird lokal gespeichert. Sprachwechsel ändern weder Werte noch Rezeptdaten. Eingaben verwenden das Zahlenformat der gewählten Sprache, etwa `1,5` auf Deutsch und `1.5` auf Englisch. Mehrdeutige Formate werden abgewiesen statt stillschweigend anders interpretiert; Eingabefelder akzeptieren keine Tausendertrennzeichen. Meldungen, Hilfetexte, Ausdrucke und Spaltenüberschriften werden vollständig übersetzt. Chemische Formeln und eigene Produktnamen bleiben unverändert. Austauschdateien speichern sprachunabhängige Feldkennungen und Zahlen.

Änderungen an Wasser, Volumen, Zielen oder Produkten markieren vorhandene Ergebnisse als veraltet. Speichern darf einen unvollständigen Entwurf sichern; „Berechnen“ setzt die fachlich notwendigen Angaben voraus. Nutzer sehen, wann lokal gespeichert wurde. Löschen erfordert eine Bestätigung oder eine Wiederherstellen-Möglichkeit.

### Ergebnisdarstellung

- Dosiertabelle: Produkt, Menge in g beziehungsweise ml, fest/optimiert, bei Flüssigkeiten zugrunde liegende Dichte.
- Nährstofftabelle: Ziel, Toleranz, Wasser, Dünger, Gesamt, Abweichung in mg/L und gegebenenfalls Prozent.
- Status pro Ziel: „innerhalb Toleranz“, „zu niedrig“ oder „zu hoch“; unbekannte Werte separat kennzeichnen.
- Gesamtstatus: „alle Ziele innerhalb Toleranz“, „Ziele teilweise verfehlt“ oder „Berechnung nicht möglich“.
- „Keine Verbesserung gefunden“ und numerischer Fehler sind eigene Meldungen; sie dürfen nicht als Beweis für mathematische Unerreichbarkeit erscheinen.
- Diagnosebeispiele: „Ausgangswasser liegt bereits über dem Calciumziel“ oder „Kein gewählter Dünger enthält Magnesium“.

Die Ergebnisansicht zeigt keine pauschale Aussage „sicher“ oder „pflanzenverträglich“. Ein Hinweis zur fehlenden Prüfung von Mischverträglichkeit steht am Ergebnis und im Ausdruck.

## 5. Fachliche Größen und Einheiten

Intern werden Volumen in L, Produktmassen in g und Konzentrationen als mg/L des jeweiligen Elements geführt. „ppm“ wird nicht als unbeschriftete Alternative verwendet, da die Bezugsdefinition sonst unklar bleibt.

Erfasste Größen: Nitrat-N, Ammonium-N, gegebenenfalls Harnstoff-N, P, K, Ca, Mg, S, Fe, Mn, Zn, B, Cu, Mo und Si; Na und Cl mindestens als beobachtete Begleitstoffe. Gesamt-N ist eine abgeleitete Größe. Harnstoff wird nicht stillschweigend Nitrat oder Ammonium zugerechnet.

- Nitrat-N bedeutet Masse des Stickstoffs in Nitrat, nicht Masse des Nitrations. Analog gilt dies für Ammonium-N.
- Wasseranalysen mit NO₃⁻, NH₄⁺ oder SO₄²⁻ werden anhand ausdrücklich gewählter Bezugsform stöchiometrisch umgerechnet. Originalwert und Originaleinheit bleiben erhalten.
- P₂O₅, K₂O und weitere angebotene Oxidangaben werden in Elementgehalte umgerechnet. Faktoren werden aus einer versionierten Molmassentabelle abgeleitet, nicht aus unbeschrifteten Konstanten.
- Gesamthärte darf nicht ohne zusätzliche Angaben in separate Ca-/Mg-Werte zerlegt werden.
- Fehlend ist nicht null. Fehlende Wasserwerte für aktive Ziele blockieren die Berechnung, bis sie ergänzt oder ausdrücklich als null angenommen werden. Diese Annahme bleibt im Ergebnis sichtbar.
- Unbekannte Begleitstoffe erlauben ein Teilergebnis, werden aber als unbekannt ausgewiesen. Bei einem ausgewählten Dünger muss die Zusammensetzung für jedes aktive Ziel bekannt sein; ein leeres Feld ist kein bestätigter Nullgehalt.
- Leeres Ziel bedeutet „nicht optimieren“. Ein explizites Nullziel ist aktiv und wird über seine absolute Toleranz bewertet.
- Negative Konzentrationen, unendliche Zahlen und Volumen ≤ 0 sind ungültig.

### Produktzusammensetzung

Für feste Produkte wird der Gehalt als Massenanteil erfasst, etwa 13 % N (m/m). Bei Flüssigkeiten muss zwischen % (m/m), % (m/V) und g/L unterschieden werden; eine Prozentangabe ohne Basis reicht nicht.

### Eingabe als Element oder Verpackungsangabe

Jede Nährstoffzeile bietet einen Zahlenwert, eine Gehaltseinheit und eine Auswahl der Bezugsform. Die Bezugsform wird je Zeile gewählt: P₂O₅ für Phosphor und gleichzeitig elementares K für Kalium sind beispielsweise zulässig. Die App benötigt keine einheitliche Deklarationsform für das gesamte Produkt.

| Nährstoff | Unterstützte Bezugsformen in der ersten Version | Umrechnung in Elementgehalt, näherungsweise |
| --- | --- | --- |
| Phosphor | P oder P₂O₅ | P = P₂O₅ × 0,4364 |
| Kalium | K oder K₂O | K = K₂O × 0,8301 |
| Calcium | Ca oder CaO | Ca = CaO × 0,7147 |
| Magnesium | Mg oder MgO | Mg = MgO × 0,6030 |
| Schwefel | S oder SO₃ | S = SO₃ × 0,4005 |
| Silicium | Si oder SiO₂ | Si = SiO₂ × 0,4674 |
| Weitere Elemente | Jeweils der Elementgehalt, etwa Fe, B oder Zn | Keine Oxidumrechnung |

Diese Faktoren dienen der Lesbarkeit; die Berechnung verwendet die versionierte Molmassentabelle. Allgemein gilt für die Masse eines Elements E in einer Deklarationsform: `Elementgehalt = deklarierter Gehalt × (Anzahl E-Atome × Atommasse E) / Molmasse der Deklarationsform`. Die Gehaltsbasis bleibt bei dieser Umrechnung unverändert.

P₂O₅ heißt in der Oberfläche „Phosphor als P₂O₅ (Oxidäquivalent)“. Es ist die auf Verpackungen gebräuchliche Phosphorangabe und nicht mit dem Phosphation PO₄³⁻ gleichzusetzen. Eine Umrechnung dieser Etikettangabe behauptet nicht, dass das Produkt tatsächlich P₂O₅ als Verbindung enthält. Entsprechend ist K₂O ein Kaliumoxidäquivalent.

Beispiele bei Gehalten in % (m/m):

- Eingabe 10 % P₂O₅ ergibt im Hintergrund ungefähr 4,364 % P.
- Eingabe 10 % K₂O ergibt im Hintergrund ungefähr 8,301 % K.
- Bei direkter Eingabe von 4,364 % P wird der Wert ohne weitere Oxidkorrektur übernommen.

Unter dem Eingabefeld erscheint eine Vorschau wie „Entspricht 4,364 % P“. Originalwert, Originalbezugsform und Gehaltseinheit bleiben gespeichert; Optimierung und Ergebnisrechnung verwenden ausschließlich den normalisierten Elementgehalt. Es gibt pro Produkt und Nährstoff genau einen maßgeblichen Gehalt, keine Addition von Element- und Oxidangabe.

Beim Wechsel der Bezugsform wird der vorhandene Wert in die neue Form umgerechnet, sodass die Zusammensetzung unverändert bleibt. Eine tatsächliche Änderung des Gehalts erfolgt durch Bearbeitung des Zahlenwerts. Wiederholtes Umschalten darf keine Rundungsverluste akkumulieren. Die gespeicherte Ursprungsdeklaration wird erst bei bestätigter Änderung ersetzt; Ergebnisse und Exporte bleiben nachvollziehbar.

Auch Oxidäquivalente werden auf ihren jeweiligen Einzelwert geprüft. Die Summe aller deklarierten Oxidäquivalent-Prozente ist jedoch kein allgemeingültiger Massenbilanztest. Nicht unterstützte Verbindungen werden nicht anhand eines freien Namens geraten; die Oberfläche verlangt eine unterstützte Bezugsform oder den belegten Elementgehalt.

### Reinheit und Stickstoffdeklaration

Für ein reines Salz können Zusammensetzung und Hydratstufe dokumentiert werden. Eine Reinheitskorrektur ist nur bei theoretisch berechnetem Reinstoffgehalt zulässig. Deklarierte Produktgehalte werden nicht erneut pauschal mit Reinheit multipliziert. Herkunft und Berechnungsbasis sind Pflichtmetadaten.

Stickstoffgehalte werden auf Doppelzählung geprüft: Gesamt-N und Teilformen dürfen nicht als unabhängige Beiträge addiert werden. Ist nur Gesamt-N bekannt, ist eine Gesamt-N-Optimierung möglich; formbezogene Ziele benötigen die Aufteilung. Bei gleichzeitigen Gesamt- und Formzielen muss ein fachlicher Konsistenzcheck widersprüchliche Vorgaben melden.

## 6. Berechnungsmodell

### Vorwärtsrechnung

Für Produkt j mit Menge xⱼ in g und Elementmassenanteil fᵢⱼ gilt für Nährstoff i:

`cᵢ = wᵢ + (1000 / V) × Σⱼ(fᵢⱼ × xⱼ)`

Dabei ist V das Endvolumen in L und wᵢ der Wasserbeitrag in mg/L. Als erste Näherung wird angenommen, dass das Ausgangswasser das Endvolumen bildet; Volumenänderungen durch Düngerzugabe werden vernachlässigt und diese Annahme wird dokumentiert.

Für Flüssigkeiten mit massenbezogenem Gehalt: `Masse in g = Volumen in ml × Dichte in g/ml`. Bei g/L Produktvolumen erfolgt die Umrechnung direkt. Eine fehlende Dichte blockiert nur Berechnungen, die sie tatsächlich benötigen.

### Automatische Mengenbestimmung

Die Anwendung minimiert die normierte quadratische Zielabweichung bei nichtnegativen Mengen. Feste Mengen werden vorab als konstante Beiträge berücksichtigt:

`min Σᵢ ((wᵢ + bᵢ + (A x)ᵢ − tᵢ) / τᵢ)², unter xⱼ ≥ 0`

- A enthält die Beiträge der variablen Produkte in mg/L je g.
- b enthält die Beiträge fest vorgegebener Mengen; t enthält aktive Ziele.
- τ ist die fachliche Toleranz in mg/L und immer größer als null. Sie steuert sowohl Bewertung als auch Skalierung des Optimierungsproblems.
- Vorgeschlagener editierbarer Startwert: `τᵢ = max(0,05 mg/L; 0,05 × tᵢ)`. Diese Werte sind Produktvorgaben zur numerischen Zielannäherung, keine wissenschaftlich belegten Kulturgrenzen. Für Nullziele gilt die absolute Toleranz.
- Nicht aktive Größen werden nur ausgewertet; ihre Gehalte dürfen sich durch die Lösung erhöhen. Dies wird im Ergebnis ausdrücklich erklärt.
- Zielwerte sind weiche Ziele. Ein Nullziel ist daher kein garantiertes Verbot. Harte Höchstgrenzen sind ein eigener späterer Funktionsumfang und dürfen nicht durch Toleranzen suggeriert werden.
- Negative Restziele durch hohe Wasser- oder feste Düngerbeiträge werden nicht auf null gekürzt. Überschreitungen bleiben im Optimierungsproblem und im Ergebnis sichtbar.
- Es gibt zunächst keine Kosten- oder Minimalanzahl-Optimierung. Mehrere gleich gute Lösungen sind möglich. Reproduzierbarkeit erfolgt über stabile Produktreihenfolge und versionierte Solverkonfiguration; eine Eindeutigkeit wird nicht behauptet.

Der Solver muss Konvergenzstatus und numerische Diagnosen liefern. Vor der Bibliotheksauswahl werden Nichtnegativität, schlecht konditionierte Matrizen, Rangdefizite, Lizenz und Browser-/Offlinefähigkeit geprüft. Ein unbeschränkter Solver mit nachträglichem Abschneiden negativer Werte erfüllt die Anforderung nicht.

### Rundung und Dosierbarkeit

Intern wird mit voller Rechengenauigkeit gerechnet. Anzeige und Ausgabe verwenden konfigurierbare Dosierschritte, als Startwert 0,01 g beziehungsweise 0,1 ml. Das sind keine zugesicherten Waagengenauigkeiten.

Die Anwendung berechnet Konzentrationen aus den tatsächlich ausgegebenen gerundeten Mengen erneut und verwendet diese für den sichtbaren Zielstatus. Ungerundete Werte bleiben zur Nachvollziehbarkeit verfügbar. Wird eine benötigte Menge zu null gerundet oder verändert die Rundung die Zielbewertung, erscheint ein Hinweis mit der Option, Volumen oder Dosierschritt anzupassen.

## 7. Fachliches Datenmodell

| Objekt | Wesentliche Inhalte |
| --- | --- |
| Wasserprofil | ID, Name, Analysequelle/-datum, Originalwerte mit Einheiten und Bezugsformen, normalisierte Werte, bekannte/fehlende/angenommene Werte |
| Dünger | ID, Name, Hersteller optional, fest/flüssig, Gehaltsbasis, Originaldeklaration, normalisierte Gehalte, bekannte Nullwerte, Dichte falls erforderlich, Quelle, Datenrevision |
| Zielprofil | Name, aktive Ziele, Werte, Toleranzen, Stickstoffbezugsform, Notizen und Herkunft optional |
| Rezept | ID, Name, Endvolumen, Wasser- und Zielprofilsnapshot, Produktsnapshots, Mengenmodus je Produkt, feste/manuelle Mengen, Dosierschritte, Zeitstempel |
| Berechnung | Eingabesnapshot, Modell-/Solver-/Molmassenversion, ungerundete und ausgegebene Mengen, Beiträge, Abweichungen, Annahmen, Warnungen und Solverstatus |
| Exportdatei | Formatkennung, Schemaversion, vollständige Rezeptdaten und Berechnungsversionen |

Gespeicherte Rezepte behalten den damaligen Produktdatenstand. Änderungen am Katalog verändern sie nicht rückwirkend. Aktualisierung ist eine bewusste Aktion und macht eine Neuberechnung erforderlich. Ergebnisse werden beim Import nicht ungeprüft als aktuelle Berechnung übernommen.

## 8. Speicherung, Austausch und Betrieb

- Lokale Datenhaltung im Browser, vorzugsweise IndexedDB. Der erste vollständige Aufruf benötigt Internet; nach erfolgreichem Caching muss der Kernablauf offline funktionieren.
- Browserdaten können gelöscht werden und synchronisieren sich nicht automatisch zwischen Geräten. Die Oberfläche bietet deshalb einen vollständigen JSON-Export an; CSV ist kein vollständiges Backup.
- JSON-Import mit Schema-, Werte- und Versionsprüfung. Unbekannte neuere Versionen erzeugen eine verständliche Fehlermeldung. Keine stillen Überschreibungen bei ID-Konflikten; standardmäßig als Kopie importieren.
- Migrationen lokaler Daten erfolgen versioniert und mit Wiederherstellungsmöglichkeit. Ein App-Update darf lokale Rezepte nicht stillschweigend entfernen.
- Offline-Cache und Rechenkernversion müssen zusammenpassen. Ein Update wird angezeigt und bewusst aktiviert; alte Ergebnisse behalten ihre Versionsangaben.
- CSV enthält Einheitenspalten und dokumentierte Exportvarianten: Deutsch mit Semikolon und Dezimalkomma, Englisch mit Komma und Dezimalpunkt, jeweils mit korrekter Textmaskierung. JSON bleibt sprachunabhängig. Texte aus Importen werden für Tabellenexport und Darstellung sicher behandelt.
- Keine externen Schriftarten, Analysewerkzeuge oder Laufzeitdienste für den Kernablauf notwendig. Zusätzliche Netzwerkfunktionen werden als solche kenntlich gemacht.

## 9. Referenzfälle und Abnahmekriterien

Folgende Fälle werden bei der Umsetzung automatisiert geprüft. Synthetische Gehalte vermeiden Abhängigkeiten von noch ungeprüften Produktdaten.

| Fall | Eingabe | Erwartung |
| --- | --- | --- |
| R1: einfacher Beitrag | 100 L, Wasser 0 mg/L N, Produkt 10 % N, Menge 10 g | 10 mg/L N |
| R2: Wasserabzug | 100 L, Wasser 5 mg/L N, Ziel 15 mg/L N, Produkt 10 % N | 10 g Produkt und insgesamt 15 mg/L N |
| R3: Volumenskalierung | R2 mit 200 L | 20 g Produkt, gleiche Endkonzentration |
| R4: gekoppelte Ziele | 100 L; A: 10 % N und 20 % K; B: 10 % K; Wasser null; Ziel N 10, K 30 mg/L | A 10 g, B 10 g; beide Ziele erreicht |
| R5: unerreichbares Verhältnis | Nur A aus R4; Ziele N 10 und K 5 mg/L | Nichtnegative Menge; mindestens ein Ziel außerhalb Toleranz; Abweichung sichtbar |
| R6: Wasserüberschuss | Wasser 20 mg/L Ca, Ziel 10 mg/L Ca; nur Ca-haltige variable Dünger | Keine negative Dosierung, kein künstliches Entfernen von Ca; Überschreitung sichtbar |
| R7: feste Menge | R2, Produkt exakt auf 20 g festgelegt | Menge bleibt 20 g, Ergebnis 25 mg/L N, Ziel verfehlt |
| R8: Flüssigkeit | 100 L; 10 ml mit Dichte 1,2 g/ml, Gehalt 10 % N (m/m) | 12 g Produktmasse und 12 mg/L N |
| R9: unterschiedliche Deklarationen | Fachlich identische P- beziehungsweise P₂O₅-Angaben | Gleicher normalisierter P-Gehalt innerhalb Umrechnungstoleranz |
| R10: Null versus unbekannt | Aktives Ziel; zugehöriger Wasserwert fehlt | Berechnung blockiert, bis Wert oder ausdrücklich bestätigte Nullannahme vorliegt |
| R11: Nullziel | Ziel 0 mg/L mit positiver absoluter Toleranz | Keine Division durch null; absolute Abweichung wird bewertet |
| R12: Rundung | 100 L, Wasser null, 10 % N, Ziel 0,104 mg/L; Dosierschritt 0,01 g | Rechnerisch 0,104 g, Ausgabe 0,10 g; sichtbares Ergebnis 0,10 mg/L |
| R13: Format und Persistenz | Deutsches Dezimalkomma; Speichern, Neuladen, JSON-Rundreise | Gleiche fachliche Werte, Einheiten und Datenrevisionen |
| R14: Rangdefizit | Zwei identische Produktzusammensetzungen | Kein Absturz; nichtnegative zulässige Lösung, keine behauptete Eindeutigkeit |
| R15: vollständiger Stickstoff | Produkt mit Gesamt-N und ausgewiesenen Teilformen | Gesamt-N wird nicht doppelt gezählt; inkonsistente Angaben werden gemeldet |

Für einfache analytische Fälle gilt vor Rundung als technische Prüftoleranz `max(10⁻⁶ mg/L; 10⁻⁶ × Referenzwert)`. Fachliche Zieltoleranzen und numerische Prüftoleranzen sind voneinander unabhängig. Die Solverprüfung umfasst zusätzlich Nichtnegativität, Optimalitätsbedingungen und explizite Fehlerzustände.

Zur funktionalen Abnahme gehören außerdem:

- Neuer Nutzer kann Wasser, zwei Dünger, Ziele und Volumen eingeben und ein Ergebnis ohne Entwicklerwerkzeuge erhalten.
- Nach Neuladen bleiben Rezept und Datenquellen erhalten; spätere Katalogänderungen ändern das gespeicherte Rezept nicht.
- Nach dem ersten vollständigen Laden funktionieren Erstellen, Berechnen, Speichern und Exportieren ohne Internet.
- Änderung einer Eingabe entwertet das alte Ergebnis sichtbar; ungültige Eingaben erzeugen kein scheinbar gültiges Rezept.
- Tastaturbedienung, verständliche Feldbeschriftungen und Ergebnislesbarkeit werden auf Desktop und Mobilansicht geprüft.
- Der gesamte Kernablauf ist auf Deutsch und Englisch nutzbar. `1,5` in deutscher und `1.5` in englischer Oberfläche ergeben denselben Wert; ein Sprachwechsel bewahrt gespeicherte und noch nicht gespeicherte Eingaben. Beide CSV-Varianten werden mit den entsprechenden Zahlenformaten geprüft.
- Bei Erstbenutzung ist die Düngerdatenbank leer. Selbst angelegte Produkte bleiben nach Neuladen erhalten; Beispieldaten aus Tests erscheinen nicht in der Nutzerdatenbank.
- 10 % P₂O₅ und der aus derselben Molmassentabelle abgeleitete P-Gehalt liefern dieselbe Dosierung; analog gilt dies für K₂O/K und die weiteren unterstützten Oxidformen. Die Vorschau darf gerundet sein, der Rechenwert nicht.
- Verschiedene Bezugsformen innerhalb eines Produkts, wiederholtes Umschalten und JSON-Export/-Import bewahren Elementgehalte ohne doppelte Anrechnung und innerhalb der numerischen Prüftoleranz. P₂O₅ wird nicht mit PO₄³⁻ verwechselt.
- HydroBuddy-Vergleiche werden mit dokumentiertem Ausgangsdatensatz tatsächlich ausgeführt. Erwartete Unterschiede durch Solver, Rundung oder Definitionen werden begründet, statt automatisch als Fehler behandelt.

## 10. Technische Leitplanken

Empfohlen: React und TypeScript für die Oberfläche, ein davon unabhängiges TypeScript-Fachmodul, IndexedDB für lokale Daten und eine PWA für den Offlinebetrieb. Diese Auswahl ist eine Empfehlung, keine Voraussetzung der fachlichen Regeln.

Abhängigkeiten verlaufen von der Oberfläche zum Fachmodul; das Fachmodul kennt weder Browserdatenbank noch UI. Einheitenkonvertierung, Produktnormalisierung, Vorwärtsrechnung und Optimierung sind getrennt prüfbar. Ein eigener umfangreicher Numeriksolver wird nur erwogen, wenn geeignete geprüfte Bibliotheken fehlen.

Die Umgebung benötigt für die erste Version keine API-Schlüssel, Konten oder Datenbankdienste. Implementierung und reproduzierbare Build-/Testbefehle werden erst im anschließenden Entwicklungsschritt eingerichtet.

## 11. Umsetzung in überprüfbaren Etappen

1. **Fachliche Grundlage:** Zielgruppe und Produktumfang abstimmen; Einheiten, Deklarationsregeln und Referenzfälle fachlich prüfen; Rechte an übernommenen Bestandteilen klären. Ergebnis: belastbare Daten- und Rechenregeln.
2. **Durchgängiger Rechner:** Eingabe fester Dünger, Wasser, Ziele und Endvolumen; Vorwärtsrechnung, nichtnegative Optimierung und Ergebnisansicht. Ergebnis: R1–R7 und grundlegende Fehlerfälle bestanden.
3. **Alltagstaugliche erste Version:** Produktverwaltung, Flüssigkeiten nach Prüfung, Rundung, lokale Speicherung, Import/Export, Offlinebetrieb und mobile Bedienung. Ergebnis: gesamte erste Version mit Abnahmekriterien geprüft.
4. **Fachliche Validierung:** Dokumentierte Altvergleiche, unabhängig nachgerechnete reale Rezepturen und Erprobung durch Zielnutzer. Ergebnis: nachvollziehbarer Freigabestand mit bekannten Grenzen.
5. **Erweiterungen:** Stammlösungen und weitere Funktionen jeweils mit eigenem Fachkonzept; keine stillschweigende Erweiterung der chemischen Zusicherungen.

## 12. Offene Entscheidungen und Abhängigkeiten

| Entscheidung | Vorläufiger Vorschlag | Wann erforderlich? |
| --- | --- | --- |
| Hauptzielgruppe und Düngertypen | Bestätigt: Privatanwender mit einzelnen Nährsalzen | Entschieden; Mehrkomponentenprodukte nachrangig |
| Sprache und Konten | Bestätigt: Deutsch und Englisch, ohne Anmeldung | Entschieden; Offlinebetrieb als ergänzender Vorschlag |
| Düngerdatenbank | Bestätigt: leerer Start, vom Nutzer selbst befüllt; Element- oder unterstützte Verpackungsangabe je Nährstoff | Entschieden; kein Katalog als Voraussetzung der ersten Version |
| Reale Referenzprodukte und Wasseranalysen | Belegte Angaben nur zur Validierung auswählen, ohne automatische Übernahme in die Nutzerdatenbank | Vor fachlicher Freigabe; synthetische Tests sind vorher möglich |
| Lizenz für HydroCalc und zulässige Übernahmen | Zunächst keine ungeprüfte Übernahme von Code, DBF-Daten oder Grafiken | Vor Übernahme beziehungsweise Veröffentlichung |
| Erweiterte Prioritäten | Erst nach funktionsfähigem Kern festlegen | Vor nachfolgenden Ausbaustufen |

Im untersuchten HydroBuddy-Stand wurde keine zentrale Lizenzdatei gefunden. Die README bezeichnet die Anwendung als Open Source; eingebundene Numerikdateien wie `densesolver.pas` nennen GPL Version 2 oder später. Daraus lässt sich die Rechtslage aller Anwendungsdateien und Daten nicht pauschal ableiten. Vergleich und eigene Spezifikation ersetzen daher keine Klärung der Rechte für eine konkrete Übernahme.

## 13. Quellen und Nachvollziehbarkeit

- [HydroBuddy README](https://github.com/danielfppps/hydrobuddy/blob/a1e63b32dcee9f92e34c9c281e090820dfc49def/README.md): Zweck und Lazarus-Buildhinweise.
- [hb_main.pas](https://github.com/danielfppps/hydrobuddy/blob/a1e63b32dcee9f92e34c9c281e090820dfc49def/hb_main.pas): unter anderem `RMatrixSolveLS`, Wasser-/Düngerbeiträge und Ergebnisbehandlung.
- [hb_newcustomsalt.pas](https://github.com/danielfppps/hydrobuddy/blob/a1e63b32dcee9f92e34c9c281e090820dfc49def/hb_newcustomsalt.pas): Produktfelder, Reinheit, Dichte und Oxidumrechnungen.
- [hb_waterquality.pas](https://github.com/danielfppps/hydrobuddy/blob/a1e63b32dcee9f92e34c9c281e090820dfc49def/hb_waterquality.pas): Wasserprofilfelder.
- [densesolver.pas](https://github.com/danielfppps/hydrobuddy/blob/a1e63b32dcee9f92e34c9c281e090820dfc49def/densesolver.pas): Solver und Lizenzhinweis.

Die vorgeschlagenen Regeln, Toleranzen und Produktentscheidungen in diesem Dokument sind HydroCalc-Spezifikation; sie werden nicht als bereits belegtes Verhalten von HydroBuddy ausgegeben.
