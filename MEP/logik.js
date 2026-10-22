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
    keinMep: (muskel) => `Nach transkranieller Magnetstimulation und Ableitung über dem ${muskel} sind keine Potentiale ableitbar.`,
    normal: (muskeln) => (muskeln.length > 1
      ? `Bei Ableitung über ${undListe(muskeln.map((m) => `dem ${m}`))} sind die zentralmotorischen Leitungszeiten regelrecht.`
      : `Bei Ableitung über dem ${muskeln[0]} ist die zentralmotorische Leitungszeit regelrecht.`),
    // Beurteilung: zuerst die pathologischen, dann die unauffälligen Ableitungen
    verlaengertBeurteilung: (orte) => `Verlängerte zentralmotorische Leitungszeit ${undListe(orte)}.`,
    fehlendBeurteilung: (orte) => `Fehlende MEP ${undListe(orte)}.`,
    unauffaellig: (orte) => `Unauffällige MEP ${orte}.`,
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

  // "zur unteren Extremität links", bei beiden Seiten "beidseits" bzw. ohne Seitenangabe
  function orteText(messungen, beidseitsWort) {
    const orte = [];
    ['obere', 'untere'].forEach((ext) => {
      const seiten = messungen.filter((m) => m.def.extremitaet === ext).map((m) => m.seite);
      if (!seiten.length) return;
      const beide = seiten.includes('re') && seiten.includes('li');
      orte.push({ ext, seite: beide ? beidseitsWort : SEITE_LANG[seiten[0]] });
    });
    return orte;
  }

  function beurteilung(messungen) {
    const saetze = [];
    const zur = (o) => `zur ${o.ext}n Extremität${o.seite ? ` ${o.seite}` : ''}`;
    const verlaengert = messungen.filter((m) => m.pathologisch && !m.keinMep);
    const fehlend = messungen.filter((m) => m.keinMep);
    if (verlaengert.length) saetze.push(T.verlaengertBeurteilung(orteText(verlaengert, 'beidseits').map(zur)));
    if (fehlend.length) saetze.push(T.fehlendBeurteilung(orteText(fehlend, 'beidseits').map(zur)));
    // Unauffällige Seiten: beide Seiten einer Extremität ohne Seitenangabe
    const normal = orteText(messungen.filter((m) => !m.pathologisch && m.zml !== null), '');
    if (normal.length === 2 && normal.every((o) => !o.seite)) saetze.push(T.unauffaellig('zur oberen und unteren Extremität'));
    else if (normal.length) saetze.push(T.unauffaellig(undListe(normal.map(zur))));
    return saetze;
  }

  function befundtext(eingabe, erg) {
    const z = [T.ueberschrift, '', T.abschnitt];
    erg.messungen.filter((m) => m.pathologisch).forEach((m) => {
      z.push(m.keinMep ? T.keinMep(m.muskel) : T.verlaengert(m.muskel, m.zml));
    });
    const normal = erg.messungen.filter((m) => !m.pathologisch && m.zml !== null).map((m) => m.muskel);
    if (normal.length) z.push(T.normal(normal));

    z.push('', 'Beurteilung:');
    z.push(...beurteilung(erg.messungen));
    return z.join('\n');
  }

  return { ZIELE, SEITEN, zml, werteAus, befundtext };
})();

if (typeof module !== 'undefined') module.exports = MEP;
