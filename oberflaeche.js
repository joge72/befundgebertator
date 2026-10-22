// Gemeinsame Bausteine der Eingabemasken: Auswahl der untersuchten Nerven und
// Tabellen im Aufbau der Gerätesoftware (Gebiete und Segmente je Nerv und Seite).

const OBERFLAECHE = (function () {
  const $ = (id) => document.getElementById(id);
  const SEITEN = [['re', 'Rechts'], ['li', 'Links']];

  // Bezeichnungen der Stimulationsorte wie in der Gerätesoftware
  const KURZ = {
    Handgelenk: 'Handgel', Ellenbogen: 'Ellbogen', 'unterhalb Ellenbogen': 'infracub.',
    'oberhalb Ellenbogen': 'supracubital', Erb: 'Plexus', Fußrist: 'Knöchel', Innenknöchel: 'Knöchel',
    'unterhalb Fibulaköpfchen': 'unt. Knie', 'oberhalb Fibulaköpfchen': 'ob. Knie', Kniekehle: 'Pop Fossa',
  };

  // Sensible Ableitungen wie in der Gerätesoftware (Zeilen in der Reihenfolge des Geräts).
  // norm: Zeilen, für die der Normwert gilt (Medianus Dig II und Dig III mit denselben Werten);
  // ausgewertet wird die erste gefüllte davon, sonst die erste gefüllte Zeile mit Hinweis.
  const SENSIBEL_ZEILEN = {
    medianus: { zeilen: [['d3', 'Handgel - Dig III'], ['d1', 'Handgel - Dig I'], ['d2', 'Handgel - Dig II']], norm: ['d3', 'd2'] },
    ulnaris: { zeilen: [['d4', 'Handgel - Dig IV'], ['d5', 'Handgel - Dig V']], norm: ['d5'] },
    radialis: { zeilen: [['w', 'R. superficialis']], norm: ['w'] },
    suralis: { zeilen: [['w', 'Knöchel - u. Wadenmitte']], norm: ['w'] },
  };

  // Werte der ausgewerteten sensiblen Zeile und ein Hinweis, wenn sie nicht die Normzeile ist
  function sensWerte(praefix, nerv, nervName) {
    const def = SENSIBEL_ZEILEN[nerv];
    const werte = (id) => ({ amp: lies(`${praefix}-${id}-amp`), nlg: lies(`${praefix}-${id}-nlg`) });
    const gefuellt = (id) => { const w = werte(id); return w.amp !== null || w.nlg !== null; };
    const id = def.norm.find(gefuellt) || def.zeilen.map(([z]) => z).find(gefuellt) || def.norm[0];
    const zeile = (z) => def.zeilen.find(([k]) => k === z)[1];
    const hinweis = !def.norm.includes(id) && gefuellt(id)
      ? `${nervName}: Normwert gilt für ${def.norm.map(zeile).join(' bzw. ')}, ausgewertet wurde ${zeile(id)}` : null;
    return { ...werte(id), hinweis };
  }
  const kurz = (name) => KURZ[name] || name;

  function lies(id) {
    const el = $(id);
    if (!el || el.value.trim() === '') return null;
    const v = parseFloat(el.value.replace(',', '.'));
    return Number.isNaN(v) ? null : v;
  }

  const feld = (id) => `<input type="text" inputmode="decimal" id="${id}">`;

  // ---------- Auswahl der untersuchten Nerven ----------

  // gruppen: [{ titel, bloecke: [{ id, name }] }]; je Block gibt es ein Kästchen für rechts und links.
  // Die Auswahl wird im Browser gemerkt (nur auf diesem Gerät).
  function baueAuswahl(container, gruppen, speicherName, beiAenderung) {
    $(container).innerHTML = gruppen.map((g) => `<div class="auswahl-gruppe"><strong>${g.titel}</strong>
      <div class="auswahl">${g.bloecke.flatMap((b) => SEITEN.map(([s, seite]) =>
        `<label><input type="checkbox" id="w-${b.id}-${s}" data-auswahl="${b.id}-${s}"> ${seite} ${b.name}</label>`)).join('')}</div></div>`).join('');
    let gemerkt = [];
    try { gemerkt = JSON.parse(localStorage.getItem(speicherName) || '[]'); } catch (e) { gemerkt = []; }
    gemerkt.forEach((k) => { const el = document.querySelector(`[data-auswahl="${k}"]`); if (el) el.checked = true; });
    $(container).addEventListener('change', () => {
      const aktiv = [...document.querySelectorAll('[data-auswahl]')].filter((el) => el.checked).map((el) => el.dataset.auswahl);
      try { localStorage.setItem(speicherName, JSON.stringify(aktiv)); } catch (e) { /* ohne Speicher weiter */ }
      zeigeBloecke();
      beiAenderung();
    });
  }

  function aktiv(blockId, seite) {
    const el = $(`w-${blockId}-${seite}`);
    return !!el && el.checked;
  }

  function zeigeBloecke() {
    document.querySelectorAll('[data-block]').forEach((el) => { el.hidden = !aktiv(el.dataset.block, el.dataset.seite); });
    document.querySelectorAll('[data-leer]').forEach((el) => {
      el.hidden = !!document.querySelector(`[data-bereich="${el.dataset.leer}"] [data-block]:not([hidden])`);
    });
  }

  // ---------- Tabellen ----------

  // Block für Nerv und Seite mit Überschrift wie in der Gerätesoftware ("Rechts Motorisch Medianus")
  function block(blockId, seite, titel, inhalt) {
    const s = SEITEN.find(([k]) => k === seite)[1];
    return `<div class="block" data-block="${blockId}" data-seite="${seite}" hidden><h3>${s} ${titel}</h3>${inhalt}</div>`;
  }

  // Gebiete: Zeilen = Stimulationsorte, Spalten = Messgrößen; Normwerte in der letzten Zeile
  function gebiete(praefix, zeilen, spalten, normId, normLabel = 'Norm') {
    const kopf = `<tr><th>Gebiete</th>${spalten.map((s) => `<th>${s.label}</th>`).join('')}</tr>`;
    const rumpf = zeilen.map((z) => `<tr><td>${z.label}</td>${spalten.map((s) =>
      `<td>${feld(`${praefix}-${z.id}-${s.key}`)}</td>`).join('')}</tr>`).join('');
    const norm = normId ? `<tr class="normzeile"><td>${normLabel}</td>${spalten.map((s) => `<td class="norm" id="${normId}-${s.key}"></td>`).join('')}</tr>` : '';
    return `<table>${kopf}${rumpf}${norm}</table>`;
  }

  // Segmente: NLG je Segment (die Distanzen sind in der Gerätesoftware hinterlegt)
  function segmente(praefix, zeilen, normId) {
    const kopf = '<tr><th>Segmente</th><th>NLG [m/s]</th><th>Norm</th></tr>';
    const rumpf = zeilen.map((z) => `<tr><td>${z.label}</td><td>${feld(`${praefix}-${z.id}-nlg`)}</td>
      <td class="norm" id="${normId}-${z.id}"></td></tr>`).join('');
    return `<table>${kopf}${rumpf}</table>`;
  }

  const nlg = (praefix, seg) => lies(`${praefix}-${seg.id}-nlg`);

  // ---------- Export aus der Gerätesoftware einlesen ----------

  // Liest den kopierten Text des PDF-Exports "NC Data". Bevorzugt werden die Abschnitte mit
  // -2SD/+2SD-Spalten, weil dort nur Messwerte stehen; die Abschnitte mit Ref.Dev enthalten
  // zusätzlich Abweichungen und werden nur verwendet, wenn die anderen fehlen.
  // Ergebnis: [{ name: 'medianus', art: 'motorisch', seite: 're', zeilen: [{ label, werte }] }]
  function leseExport(text) {
    const abschnitte = { zweiSD: [], refDev: [] };
    let format = 'refDev';
    let nerv = null;
    text.split(/\r?\n/).map((z) => z.trim()).filter(Boolean).forEach((z) => {
      if (/^ms\b/.test(z)) { format = z.includes('-2SD') ? 'zweiSD' : 'refDev'; return; }
      const kopf = z.match(/^(\S+) (Motorisch|Sensorisch) (Rechts|Links)$/);
      if (kopf) {
        nerv = { name: kopf[1].toLowerCase(), art: kopf[2] === 'Motorisch' ? 'motorisch' : 'sensibel', seite: kopf[3] === 'Rechts' ? 're' : 'li', zeilen: [] };
        abschnitte[format].push(nerv);
        return;
      }
      const zeile = z.match(/^(.*?)\s+(-?\d+(?:[.,]\d+)?(?:\s+-?\d+(?:[.,]\d+)?)*)$/);
      if (nerv && zeile) {
        nerv.zeilen.push({
          label: zeile[1].split('|')[0].trim(),
          werte: zeile[2].split(/\s+/).map((v) => parseFloat(v.replace(',', '.'))),
        });
      } else if (!/^(Motor|Sensory|Nerve|NC Data)\b/.test(z)) {
        nerv = null;
      }
    });
    return abschnitte.zweiSD.length ? abschnitte.zweiSD : abschnitte.refDev;
  }

  // Werte einer Exportzeile: motorisch distal [Lat], Segment [Lat, NLG];
  // sensorisch nur eindeutig bei einem Wert (NLG) oder drei Werten (Latenz, Amp, NLG)
  function exportWerte(nerv, zeile) {
    const w = zeile.werte;
    if (nerv.art === 'motorisch') return { lat: w[0], nlg: zeile.label.includes(' - ') ? null : (w[1] ?? null) };
    if (w.length === 1) return { nlg: w[0] };
    if (w.length === 3) return { amp: w[1], nlg: w[2] };
    return null;
  }

  // zuordnung(nerv) liefert { block, felder: (zeile, werte) => [[feldId, wert], ...] } oder null.
  // Übernommene Felder werden grün markiert, leere Felder derselben Tabellenzeile gelb.
  function baueImport(container, zuordnung, nachher) {
    $(container).innerHTML = `<details><summary>Export aus dem Programm einfügen (NC Data)</summary>
      <p class="klein">PDF-Export öffnen, alles markieren (Strg+A), kopieren und hier einfügen. Übernommen werden Latenzen und NLG;
        Amplituden, Dur_neg und min F Lat bitte per Hand ergänzen (gelb markiert).</p>
      <textarea id="${container}-text" rows="6"></textarea>
      <button id="${container}-los" type="button">Übernehmen</button>
      <p id="${container}-meldung" class="klein"></p></details>`;
    $(`${container}-los`).addEventListener('click', () => {
      const nerven = leseExport($(`${container}-text`).value);
      let anzahl = 0;
      const unbekannt = [];
      const markiert = [];
      nerven.forEach((nerv) => {
        const ziel = zuordnung(nerv);
        if (!ziel) { unbekannt.push(`${nerv.name} ${nerv.art}`); return; }
        const kasten = $(`w-${ziel.block}-${nerv.seite}`);
        if (kasten && !kasten.checked) { kasten.checked = true; kasten.dispatchEvent(new Event('change', { bubbles: true })); }
        nerv.zeilen.forEach((zeile) => {
          const werte = exportWerte(nerv, zeile);
          if (!werte) { unbekannt.push(`${nerv.name} ${zeile.label} (Werte nicht eindeutig)`); return; }
          ziel.felder(zeile, werte).forEach(([id, wert]) => {
            const el = $(id);
            if (!el || wert === null || wert === undefined) return;
            el.value = String(wert).replace('.', ',');
            el.classList.add('importiert');
            el.classList.remove('fehlt');
            markiert.push(el);
            anzahl += 1;
          });
        });
      });
      markiert.forEach((el) => {
        const tr = el.closest('tr');
        if (tr) tr.querySelectorAll('input[type=text]').forEach((f) => { if (f.value === '') f.classList.add('fehlt'); });
      });
      zeigeBloecke();
      $(`${container}-meldung`).textContent = `${anzahl} Werte übernommen.${unbekannt.length ? ` Für dieses Programm nicht benötigt oder nicht eindeutig: ${[...new Set(unbekannt)].join(', ')}.` : ''}`;
      nachher();
    });
    // Markierungen verschwinden, sobald ein Feld bearbeitet wird
    document.addEventListener('input', (e) => { if (e.target.classList) e.target.classList.remove('importiert', 'fehlt'); });
  }

  function setze(id, text) { const el = $(id); if (el) el.textContent = text; }

  function leeren() {
    document.querySelectorAll('input[type=text]').forEach((el) => { el.value = ''; el.classList.remove('importiert', 'fehlt'); });
    document.querySelectorAll('input[type=checkbox]:not([data-auswahl])').forEach((el) => { el.checked = false; });
  }

  return { SEITEN, SENSIBEL_ZEILEN, sensWerte, leseExport, baueImport, kurz, lies, feld, baueAuswahl, aktiv, zeigeBloecke, block, gebiete, segmente, nlg, setze, leeren };
})();
