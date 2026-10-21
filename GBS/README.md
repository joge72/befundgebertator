# GBS

Befundgenerator für das Guillain-Barré-Syndrom nach den modifizierten elektrodiagnostischen Kriterien
von Rajabally et al. (J Neurol Neurosurg Psychiatry 2015;86:115–119, Box 2).

Einordnung: normal, AIDP, axonale Verlaufsform (AMAN oder AMSAN), unerregbare Form oder nicht eindeutig.
Das AIDP-Kriterium „mindestens eines in mindestens zwei Nerven“ wird großzügig ausgelegt: zwei Nerven mit
irgendeinem der demyelinisierenden Merkmale genügen (Schalter `STRENG` in `logik.js`).

Zusätzlich werden die stützenden Befunde der EAN/PNS-Leitlinie 2023 (van Doorn et al.) ausgegeben:
Sural-Sparing-Muster (N. medianus oder N. ulnaris, ohne Karpaltunnelsyndrom), distale CMAP-Dauer > 8,5 ms
(Filter 2 Hz–10 kHz) und indirekte Entladungen (A-Wellen).

- `index.html` – Eingabemaske und Befund
- `logik.js` – Auswertung und Textbausteine
- `GBS-Befundgenerator.html` – alles in einer Datei für den PC ohne Internet, wird mit
  `python3 einzeldateien.py` im Hauptordner erzeugt

Die Normwerte stehen für alle Programme gemeinsam in [`normwerte.js`](../normwerte.js) im Hauptordner.
