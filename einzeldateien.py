# Erzeugt je Programm eine einzelne HTML-Datei mit eingebetteter Logik und
# Normwerten, die ohne Internet per Doppelklick im Browser läuft.
# Nach jeder Änderung an einem Programm oder an normwerte.js neu ausführen:
#   python3 einzeldateien.py
from pathlib import Path

wurzel = Path(__file__).parent
normwerte = (wurzel / 'normwerte.js').read_text(encoding='utf-8')
oberflaeche = (wurzel / 'oberflaeche.js').read_text(encoding='utf-8')

for programm in ('CIDP', 'GBS', 'Plexus'):
    ordner = wurzel / programm
    html = (ordner / 'index.html').read_text(encoding='utf-8')
    html = html.replace('<script src="../normwerte.js"></script>', f'<script>\n{normwerte}\n</script>')
    html = html.replace('<script src="../oberflaeche.js"></script>', f'<script>\n{oberflaeche}\n</script>')
    logik = (ordner / 'logik.js').read_text(encoding='utf-8')
    html = html.replace('<script src="logik.js"></script>', f'<script>\n{logik}\n</script>')
    # Der Link zur Übersicht funktioniert in der Einzeldatei nicht
    html = html.replace('  <a class="zurueck" href="../">← Übersicht</a>\n', '')
    (ordner / f'{programm}-Befundgenerator.html').write_text(html, encoding='utf-8')
