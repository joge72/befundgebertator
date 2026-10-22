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
  // norm: Zeile, für die der Normwert gilt; ausgewertet wird sie, sonst die erste gefüllte Zeile.
  const SENSIBEL_ZEILEN = {
    medianus: { zeilen: [['d3', 'Handgel - Dig III'], ['d1', 'Handgel - Dig I'], ['d2', 'Handgel - Dig II']], norm: 'd2' },
    ulnaris: { zeilen: [['d4', 'Handgel - Dig IV'], ['d5', 'Handgel - Dig V']], norm: 'd5' },
    radialis: { zeilen: [['w', 'R. superficialis']], norm: 'w' },
    suralis: { zeilen: [['w', 'Knöchel - u. Wadenmitte']], norm: 'w' },
  };

  // Werte der ausgewerteten sensiblen Zeile und ein Hinweis, wenn sie nicht die Normzeile ist
  function sensWerte(praefix, nerv, nervName) {
    const def = SENSIBEL_ZEILEN[nerv];
    const werte = (id) => ({ amp: lies(`${praefix}-${id}-amp`), nlg: lies(`${praefix}-${id}-nlg`) });
    const gefuellt = (id) => { const w = werte(id); return w.amp !== null || w.nlg !== null; };
    const id = gefuellt(def.norm) ? def.norm : (def.zeilen.map(([z]) => z).find(gefuellt) || def.norm);
    const zeile = (z) => def.zeilen.find(([k]) => k === z)[1];
    const hinweis = id !== def.norm && gefuellt(id)
      ? `${nervName}: Normwert gilt für ${zeile(def.norm)}, ausgewertet wurde ${zeile(id)}` : null;
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

  function setze(id, text) { const el = $(id); if (el) el.textContent = text; }

  function leeren() {
    document.querySelectorAll('input[type=text]').forEach((el) => { el.value = ''; });
    document.querySelectorAll('input[type=checkbox]:not([data-auswahl])').forEach((el) => { el.checked = false; });
  }

  return { SEITEN, SENSIBEL_ZEILEN, sensWerte, kurz, lies, feld, baueAuswahl, aktiv, zeigeBloecke, block, gebiete, segmente, nlg, setze, leeren };
})();
