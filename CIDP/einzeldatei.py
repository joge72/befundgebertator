# Erzeugt CIDP-Befundgenerator.html: eine einzelne Datei mit eingebetteter
# Logik und Normwerten, die ohne Internet per Doppelklick im Browser läuft.
# Nach jeder Änderung an index.html, logik.js oder normwerte.js neu ausführen:
#   python3 einzeldatei.py
from pathlib import Path

ordner = Path(__file__).parent
html = (ordner / 'index.html').read_text(encoding='utf-8')
for datei in ('normwerte.js', 'logik.js'):
    skript = (ordner / datei).read_text(encoding='utf-8')
    html = html.replace(f'<script src="{datei}"></script>', f'<script>\n{skript}\n</script>')
# Der Link zur Übersicht funktioniert in der Einzeldatei nicht
html = html.replace('  <a class="zurueck" href="../">← Übersicht</a>\n', '')
(ordner / 'CIDP-Befundgenerator.html').write_text(html, encoding='utf-8')
