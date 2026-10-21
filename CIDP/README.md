# CIDP

Befundgenerator für die chronisch inflammatorische demyelinisierende Polyneuropathie (CIDP)
nach der EAN/PNS-Leitlinie 2021 (Van den Bergh et al., Eur J Neurol 2021;28:3556–3583).

**Auf dem iPhone:** https://joge72.github.io/befundgebertator/ in Safari öffnen, „Teilen“ → „Zum Home-Bildschirm“.
Die App einmal mit Internet vom Home-Bildschirm starten, danach funktioniert sie auch offline. Mit Internet lädt sie
automatisch die neueste Version.

**Ohne Internet am PC:** `CIDP-Befundgenerator.html` herunterladen (auf GitHub die Datei öffnen, dann „Download raw file“),
z. B. per USB-Stick auf den Arbeitsrechner kopieren und per Doppelklick öffnen. Die Datei enthält alles,
es wird nichts installiert und keine Daten verlassen den Rechner.

- `index.html` – Eingabemaske und Ergebnisanzeige
- `logik.js` – Auswertung nach Tabelle 2 (motorisch, streng: dasselbe Kriterium in 2 Nerven),
  Tabelle 3 (sensibel) und Tabelle 6 (Diagnosekategorien)
- `CIDP-Befundgenerator.html` – alles in einer Datei, wird mit `python3 einzeldateien.py` im Hauptordner erzeugt

Die Normwerte stehen für alle Programme gemeinsam in [`normwerte.js`](../normwerte.js) im Hauptordner.
