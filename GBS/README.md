# GBS

Befundgenerator für das Guillain-Barré-Syndrom nach den modifizierten elektrodiagnostischen Kriterien
von Rajabally et al. (J Neurol Neurosurg Psychiatry 2015;86:115–119, Box 2).

Einordnung: normal, AIDP, axonale Verlaufsform (AMAN oder AMSAN), unerregbare Form oder nicht eindeutig.
Das AIDP-Kriterium „mindestens eines in mindestens zwei Nerven“ wird streng ausgelegt: dasselbe Merkmal
muss in zwei Nerven vorliegen (Schalter `STRENG` in `logik.js`).

- `index.html` – Eingabemaske und Befund
- `logik.js` – Auswertung und Textbausteine
- `GBS-Befundgenerator.html` – alles in einer Datei für den PC ohne Internet, wird mit
  `python3 einzeldateien.py` im Hauptordner erzeugt

Die Normwerte stehen für alle Programme gemeinsam in [`normwerte.js`](../normwerte.js) im Hauptordner.
