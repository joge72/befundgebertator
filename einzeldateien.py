# Erzeugt je Programm eine einzelne HTML-Datei mit eingebetteter Logik und
# Normwerten, die ohne Internet per Doppelklick im Browser läuft, sowie
# Befundgenerator.html mit Startseite und allen Programmen in einer Datei.
# Nach jeder Änderung an einem Programm oder an normwerte.js neu ausführen:
#   python3 einzeldateien.py
import html as html_modul
import re
from pathlib import Path

wurzel = Path(__file__).parent
normwerte = (wurzel / 'normwerte.js').read_text(encoding='utf-8')
oberflaeche = (wurzel / 'oberflaeche.js').read_text(encoding='utf-8')

PROGRAMME = ('CIDP', 'GBS', 'Plexus', 'MEP')
einzeln = {}

for programm in PROGRAMME:
    ordner = wurzel / programm
    html = (ordner / 'index.html').read_text(encoding='utf-8')
    html = html.replace('<script src="../normwerte.js"></script>', f'<script>\n{normwerte}\n</script>')
    html = html.replace('<script src="../oberflaeche.js"></script>', f'<script>\n{oberflaeche}\n</script>')
    logik = (ordner / 'logik.js').read_text(encoding='utf-8')
    html = html.replace('<script src="logik.js"></script>', f'<script>\n{logik}\n</script>')
    # Der Link zur Übersicht funktioniert in der Einzeldatei nicht
    html = html.replace('  <a class="zurueck" href="../">← Übersicht</a>\n', '')
    (ordner / f'{programm}-Befundgenerator.html').write_text(html, encoding='utf-8')
    einzeln[programm] = html

# Gesamtdatei: Startseite aus index.html, jedes Programm als eingebettete Seite (iframe srcdoc)
start = (wurzel / 'index.html').read_text(encoding='utf-8')
start = re.sub(r'\s*<script>.*?</script>', '', start, flags=re.S)  # Service Worker gibt es offline nicht
for programm in PROGRAMME:
    start = start.replace(f'<a class="kachel" href="{programm}/">', f'<a class="kachel" href="#{programm}" data-programm="{programm}">')
rahmen = ''.join(
    f'<iframe id="p-{p}" title="{p}" hidden allow="clipboard-write" srcdoc="{html_modul.escape(einzeln[p], quote=True)}"></iframe>'
    for p in PROGRAMME)
zusatz = f'''
  <div id="programm" hidden>
    <a href="#" id="zurueck" class="zurueck">← Übersicht</a>
    {rahmen}
  </div>
  <style>
    #programm {{ position: fixed; inset: 0; background: #fff; display: flex; flex-direction: column; }}
    #programm[hidden] {{ display: none; }}
    #programm .zurueck {{ padding: 8px 16px; color: #2b6cb0; text-decoration: none; font-family: Arial, sans-serif; }}
    #programm iframe {{ flex: 1; border: 0; width: 100%; }}
  </style>
  <script>
    // Programme in derselben Datei: die Kachel blendet das eingebettete Programm ein
    function zeige() {{
      const p = location.hash.slice(1);
      const rahmen = document.getElementById('p-' + p);
      document.querySelectorAll('#programm iframe').forEach((f) => {{ f.hidden = f !== rahmen; }});
      document.getElementById('programm').hidden = !rahmen;
    }}
    document.getElementById('zurueck').addEventListener('click', (e) => {{ e.preventDefault(); history.pushState(null, '', location.pathname); zeige(); }});
    window.addEventListener('hashchange', zeige);
    zeige();
  </script>
'''
start = start.replace('</body>', zusatz + '</body>')
start = start.replace('<link rel="manifest" href="manifest.json">\n', '').replace('  <link rel="apple-touch-icon" href="icon-180.png">\n', '')
(wurzel / 'Befundgenerator.html').write_text(start, encoding='utf-8')
