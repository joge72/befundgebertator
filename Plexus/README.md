# Plexus

Befundgenerator für Läsionen des Plexus brachialis und des Plexus lumbosacralis.

- Ein Nerv gilt als betroffen, wenn ein Wert außerhalb der Norm liegt oder die Amplitude um mehr als 50 %
  unter der Gegenseite liegt. Nerven ohne Normwert werden nur im Seitenvergleich bewertet.
- Die sensiblen Nerven sind nach der Übersicht des Labors den Faszikeln und Trunci bzw. dem Plexus lumbalis
  oder sacralis zugeordnet, die motorischen Nerven nach den Wurzeln ihrer Kennmuskeln.
- Der Läsionsort ist die kleinste Gruppe von Trunci bzw. Faszikeln, die alle betroffenen Nerven erklärt;
  bei Gleichstand entscheidet, wie viele regelrechte Nerven ebenfalls durch diese Anteile ziehen.
- Erhaltene SNAPs bei motorischen Ausfällen sprechen für eine präganglionäre, geminderte SNAPs für eine
  postganglionäre Läsion.
- Die Leitzeit-Normen der proximalen Nerven werden zwischen den Distanzen der Normtabelle linear interpoliert.

Dateien wie bei CIDP und GBS: `index.html`, `logik.js`, `Plexus-Befundgenerator.html` (PC ohne Internet,
erzeugt mit `python3 einzeldateien.py` im Hauptordner). Normwerte in [`normwerte.js`](../normwerte.js).
