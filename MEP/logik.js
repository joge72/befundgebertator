// Auswertung motorisch evozierter Potentiale nach dem MEP-Rechner des Labors (Excel).
// Zentralmotorische Leitungszeit (ZML) nach der F-Wellen-Methode:
//   ZML = Leitzeit MEP − (minimale F-Wellen-Latenz + distal-motorische Latenz − 1) / 2
// Der Abzug von 1 ms berücksichtigt die Umschaltzeit im Vorderhorn.

const MEP = (function () {
  const ZIELE = {
    adm: { muskel: 'M. abductor digiti minimi', nerv: 'N. ulnaris', extremitaet: 'obere' },
    ah: { muskel: 'M. abductor hallucis', nerv: 'N. tibialis', extremitaet: 'untere' },
  };
  const SEITEN = { re: 're.', li: 'li.' };
  const SEITE_LANG = { re: 'rechts', li: 'links' };

  const zahl = (x, stellen = 1) => x.toLocaleString('de-DE', { maximumFractionDigits: stellen });
  const da = (x) => x !== null && x !== undefined && !Number.isNaN(x);
  const undListe = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} und ${xs[xs.length - 1]}` : xs[0]);

  function zml(d) {
    if (!da(d.leitzeit) || !da(d.dml) || !da(d.fLatenz)) return null;
    return d.leitzeit - (d.fLatenz + d.dml - 1) / 2;
  }

  // ---------- Textbausteine ----------

  const T = {
    ueberschrift: 'MEP-Programm:',
    abschnitt: 'Motorisch evozierte Potentiale:',
    verlaengert: (muskel, wert) => `Nach transkranieller Magnetstimulation und Ableitung über dem ${muskel} findet sich eine verlängerte zentralmotorische Leitungszeit von ${zahl(wert, 2)} ms.`,
    keinMep: (muskel) => `Nach transkranieller Magnetstimulation ist über dem ${muskel} kein motorisch evoziertes Potential ableitbar.`,
    normal: (muskeln) => (muskeln.length > 1
      ? `Die zentralmotorischen Leitungszeiten ${undListe(muskeln.map((m) => `zum ${m}`))} sind regelrecht.`
      : `Die zentralmotorische Leitungszeit zum ${muskeln[0]} ist regelrecht.`),
    beurteilungPath: (wege) => `Verlängerte bzw. fehlende zentralmotorische Leitung ${undListe(wege)}; vereinbar mit einer Läsion der kortikospinalen Bahn.`,
    beurteilungNormal: 'Regelrechte zentralmotorische Leitungszeiten, kein Hinweis auf eine Läsion der kortikospinalen Bahn.',
  };

  // ---------- Auswertung ----------

  function werteAus(eingabe, normwerte) {
    const messungen = [];
    const hinweise = [];
    Object.entries(ZIELE).forEach(([ziel, def]) => Object.keys(SEITEN).forEach((seite) => {
      const d = eingabe[`${ziel}-${seite}`];
      if (!d || (!d.keinMep && ![d.leitzeit, d.dml, d.fLatenz].some(da))) return;
      const uln = normwerte.mep[ziel].zml;
      const muskel = `${def.muskel} ${SEITE_LANG[seite]}`;
      const m = { ziel, seite, def, muskel, name: `${def.muskel} ${SEITEN[seite]}`, keinMep: !!d.keinMep, zml: null, pathologisch: false };
      if (d.keinMep) {
        m.pathologisch = true;
      } else {
        m.zml = zml(d);
        if (m.zml === null) {
          hinweise.push(`${m.name}: ZML nicht berechenbar, es fehlen Leitzeit MEP, DML oder F-Wellen-Latenz`);
        } else if (m.zml <= 0) {
          hinweise.push(`${m.name}: berechnete ZML ${zahl(m.zml, 2)} ms ist nicht plausibel, bitte Eingaben prüfen`);
          m.zml = null;
        } else {
          m.pathologisch = m.zml > uln;
        }
      }
      messungen.push(m);
    }));
    return { messungen, pruefhinweise: hinweise, warnungen: [] };
  }

  function befundtext(eingabe, erg) {
    const z = [T.ueberschrift, '', T.abschnitt];
    erg.messungen.filter((m) => m.pathologisch).forEach((m) => {
      z.push(m.keinMep ? T.keinMep(m.muskel) : T.verlaengert(m.muskel, m.zml));
    });
    const normal = erg.messungen.filter((m) => !m.pathologisch && m.zml !== null).map((m) => m.muskel);
    if (normal.length) z.push(T.normal(normal));

    z.push('', 'Beurteilung:');
    const path = erg.messungen.filter((m) => m.pathologisch);
    if (path.length) {
      const wege = [...new Set(path.map((m) => `zur ${m.def.extremitaet}n Extremität ${SEITE_LANG[m.seite]}`))];
      z.push(T.beurteilungPath(wege));
    } else if (normal.length) {
      z.push(T.beurteilungNormal);
    }
    return z.join('\n');
  }

  return { ZIELE, SEITEN, zml, werteAus, befundtext };
})();

if (typeof module !== 'undefined') module.exports = MEP;
