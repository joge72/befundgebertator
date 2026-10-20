// Auswertung nach der EAN/PNS-Leitlinie CIDP 2021
// (Van den Bergh et al., Eur J Neurol 2021;28:3556–3583), Tabellen 2, 3 und 6.
// Tabelle 2 wird streng ausgelegt: "stark unterstützend" heißt, dass dasselbe
// Kriterium (a–g) mit seinen Zusatzbedingungen erfüllt ist.

const CIDP = (function () {
  const MOTORISCH = {
    medianus: {
      name: 'N. medianus', extremitaet: 'oben', distal: 'Handgelenk', muskel: 'M. abductor pollicis brevis',
      orte: [
        { id: 'ell', name: 'Ellenbogen', segment: 'Unterarm' },
        { id: 'ax', name: 'Axilla', segment: 'Oberarm' },
        { id: 'erb', name: 'Erb', segment: 'Axilla–Erb', erb: true },
      ],
    },
    ulnaris: {
      name: 'N. ulnaris', extremitaet: 'oben', distal: 'Handgelenk', muskel: 'M. abductor digiti minimi',
      orte: [
        { id: 'ue', name: 'unterhalb Ellenbogen', segment: 'Unterarm' },
        // Leitungsblock und Verlangsamung über dem Ellenbogen zählen nicht (Tab. 2, Note 2)
        { id: 'oe', name: 'oberhalb Ellenbogen', segment: 'Ellenbogen', ausgeschlossen: true },
        { id: 'ax', name: 'Axilla', segment: 'Oberarm' },
        { id: 'erb', name: 'Erb', segment: 'Axilla–Erb', erb: true },
      ],
    },
    peroneus: {
      name: 'N. peroneus', extremitaet: 'unten', distal: 'Fußrist', muskel: 'M. extensor digitorum brevis',
      orte: [
        { id: 'fk', name: 'unterhalb Fibulaköpfchen', segment: 'Unterschenkel' },
        // Leitungsblock und Verlangsamung über dem Knie zählen nicht (Tab. 2, Note 2)
        { id: 'kk', name: 'oberhalb Fibulaköpfchen', segment: 'Fibulaköpfchen', ausgeschlossen: true },
      ],
    },
    tibialis: {
      name: 'N. tibialis', extremitaet: 'unten', distal: 'Innenknöchel', muskel: 'M. abductor hallucis',
      keinBlock: true,
      orte: [{ id: 'kk', name: 'Kniekehle', segment: 'Unterschenkel' }],
    },
  };

  const SENSIBEL = {
    medianus: { name: 'N. medianus', extremitaet: 'oben' },
    ulnaris: { name: 'N. ulnaris', extremitaet: 'oben' },
    radialis: { name: 'N. radialis superficialis', extremitaet: 'oben' },
    suralis: { name: 'N. suralis', extremitaet: 'unten' },
  };

  const SEITEN = { re: 're.', li: 'li.' };
  const SEITE_LANG = { re: 'rechts', li: 'links' };

  // Tab. 2 (g): obere Grenzen der distalen CMAP-Dauer (ms) je unterer Filtergrenze (Hz)
  const DAUER_GRENZEN = {
    2: { medianus: 8.4, ulnaris: 9.6, peroneus: 8.8, tibialis: 9.2 },
    5: { medianus: 8.0, ulnaris: 8.6, peroneus: 8.5, tibialis: 8.3 },
    10: { medianus: 7.8, ulnaris: 8.5, peroneus: 8.3, tibialis: 8.2 },
    20: { medianus: 7.4, ulnaris: 7.8, peroneus: 8.1, tibialis: 8.0 },
  };

  const KRITERIEN = {
    a: 'Verlängerung der distal-motorischen Latenz ≥ 50 % über der oberen Normgrenze',
    b: 'Reduktion der motorischen NLG ≥ 30 % unter der unteren Normgrenze',
    c: 'Verlängerung der F-Wellen-Latenz ≥ 20 % über der oberen Normgrenze (≥ 50 % bei distaler CMAP-Amplitude < 80 % der unteren Normgrenze)',
    d: 'Fehlende F-Wellen (bei distaler CMAP-Amplitude ≥ 20 % der unteren Normgrenze)',
    e: 'Motorischer Leitungsblock (≥ 30 % Amplitudenreduktion proximal gegenüber distal, ≥ 50 % zwischen Erb und Handgelenk)',
    f: 'Pathologische temporale Dispersion (> 30 % Zunahme der CMAP-Dauer proximal gegenüber distal, N. tibialis ≥ 100 %)',
    g: 'Verlängerung der distalen CMAP-Dauer',
  };
  const K = Object.keys(KRITERIEN);

  const PHAENOTYPEN = {
    typisch: 'typische CIDP',
    distal: 'distale CIDP',
    multifokal: 'multifokale CIDP',
    fokal: 'fokale CIDP',
    motorisch: 'motorische CIDP',
    sensibel: 'sensible CIDP',
  };

  const UNTERSTUETZEND = {
    therapie: 'objektives Ansprechen auf Immuntherapie',
    bildgebung: 'Bildgebung (Nervensonographie oder MRT)',
    liquor: 'Liquor (Eiweißerhöhung)',
    biopsie: 'Nervenbiopsie',
  };

  const zahl = (x, stellen = 1) => x.toLocaleString('de-DE', { maximumFractionDigits: stellen });
  const prozent = (x) => Math.round(x * 100) + ' %';
  const da = (x) => x !== null && x !== undefined && !Number.isNaN(x);

  // Normwerte können als Zahl oder als Tabelle nach Alter bzw. Körpergröße angegeben sein.
  function ausTabelle(tabelle, schluessel, wert) {
    if (!Array.isArray(tabelle)) return tabelle;
    if (!da(wert) || !tabelle.length) return null;
    const zeile = tabelle.find((z) => wert <= z[schluessel]) || tabelle[tabelle.length - 1];
    return zeile;
  }

  function normNlg(norm, ortId, alter) {
    const zeile = ausTabelle(norm.nlg, 'alterBis', alter);
    if (zeile === null || zeile === undefined) return null;
    return typeof zeile === 'object' ? zeile[ortId] : zeile;
  }

  function normFLatenz(norm, groesse) {
    const zeile = ausTabelle(norm.fLatenz, 'groesseBis', groesse);
    if (zeile === null || zeile === undefined) return null;
    return typeof zeile === 'object' ? zeile.wert : zeile;
  }

  function paare(liste) {
    const p = [];
    for (let i = 0; i < liste.length; i++) for (let j = i + 1; j < liste.length; j++) p.push([liste[i], liste[j]]);
    return p;
  }

  // ---------- Textbausteine ----------
  // Alle Formulierungen des Befundtexts. p ist ein Anteil (0,35 = 35 %).

  const ueber = (p) => `${prozent(p)} über dem Upper Limit of Normal`;
  const unter = (p) => `${prozent(p)} unter dem Lower Limit of Normal`;
  const aufzaehlung = (teile) => (teile.length > 1 ? `${teile.slice(0, -1).join(', ')} sowie ${teile[teile.length - 1]}` : teile[0]);

  const T = {
    ueberschrift: (filter) => `CIDP-Programm (Filter ${filter} Hz – 10 kHz):`,

    // Motorische Neurographie, ein Satz je Nerv und Seite
    motorSatz: (nerv, teile) => (teile.length
      ? `Nach Ableitung über dem ${nerv} findet sich ${aufzaehlung(teile)}.`
      : `Nach Ableitung über dem ${nerv} findet sich ein regelrechter Befund.`),
    dml: (wert, p) => `eine verlängerte distal-motorische Latenz von ${zahl(wert)} ms (${ueber(p)})`,
    ktsNichtGewertet: ', bei bekanntem Karpaltunnelsyndrom nicht als Demyelinisierungskriterium gewertet',
    keinCmap: 'kein motorisches Antwortpotential',
    cmapReduziert: (wert, p) => `eine reduzierte Amplitude des Muskelsummenaktionspotentials von ${zahl(wert)} mV (${unter(p)})`,
    dauer: (wert, p, grenze) => `eine verlängerte distale Potentialdauer von ${zahl(wert)} ms (${prozent(p)} über dem Grenzwert der Leitlinie von ${zahl(grenze)} ms)`,
    nlg: (segment, wert, p) => `eine verlangsamte motorische Nervenleitgeschwindigkeit im Segment ${segment} von ${zahl(wert)} m/s (${unter(p)})`,
    nlgOhneNorm: (segment, wert) => `eine motorische Nervenleitgeschwindigkeit im Segment ${segment} von ${zahl(wert)} m/s (für dieses Alter keine Norm vorhanden)`,
    segmentNichtGewertet: ', über diesem Segment nicht als Demyelinisierungskriterium gewertet',
    leitungsblock: (von, bis, p) => `ein Leitungsblock zwischen ${von} und ${bis} mit einem Amplitudenabfall von ${prozent(p)}`,
    abfallNichtGewertet: (segment, p) => `ein Amplitudenabfall von ${prozent(p)} über dem Segment ${segment}, der dort nicht als Leitungsblock gewertet wird`,
    blockNichtBewertbar: 'Ein Leitungsblock ist bei einer distalen Amplitude unter 20 % des Lower Limit of Normal nicht bewertbar.',
    dispersion: (von, bis, p) => `eine pathologische temporale Dispersion zwischen ${von} und ${bis} mit einer Zunahme der Potentialdauer um ${prozent(p)}`,

    // Sensible Neurographie, ein Satz je Nerv und Seite
    sensSatz: (nerv, teile) => (teile.length
      ? `Nach Ableitung über dem ${nerv} findet sich ${aufzaehlung(teile)}.`
      : `Nach Ableitung über dem ${nerv} findet sich ein regelrechter Befund.`),
    keinSnap: 'kein sensibles Nervenaktionspotential',
    snapReduziert: (wert, p) => `eine reduzierte Amplitude des sensiblen Nervenaktionspotentials von ${zahl(wert)} µV (${unter(p)})`,
    sensNlg: (wert, p) => `eine verlangsamte sensible Nervenleitgeschwindigkeit von ${zahl(wert)} m/s (${unter(p)})`,
    suralSparing: 'Es zeigt sich ein Sural-Sparing-Muster (pathologisches sensibles Potential des N. medianus bzw. N. radialis bei regelrechtem N. suralis).',

    // F-Wellen Antwort, ein Satz je Nerv und Seite
    fNormal: (nerv, wert) => `Nach Stimulation des ${nerv} findet sich eine regelrechte minimale F-Wellen-Latenz von ${zahl(wert)} ms.`,
    fVerlaengert: (nerv, wert, p) => `Nach Stimulation des ${nerv} findet sich eine verlängerte minimale F-Wellen-Latenz von ${zahl(wert)} ms (${ueber(p)}).`,
    fOhneNorm: (nerv, wert) => `Nach Stimulation des ${nerv} findet sich eine minimale F-Wellen-Latenz von ${zahl(wert)} ms (ohne Körpergröße nicht bewertet).`,
    fFehlt: (nerv) => `Nach Stimulation des ${nerv} sind keine F-Wellen auslösbar.`,
    fFehltNichtGewertet: ' Bei einer distalen Amplitude unter 20 % des Lower Limit of Normal wird dies nicht als Demyelinisierungskriterium gewertet.',

    // Beurteilung
    motorStark: 'Die motorischen Neurographiebefunde sind stark unterstützend für eine Demyelinisierung gemäß EAN/PNS-Leitlinie 2021 (Tab. 2):',
    motorSchwach: 'Die motorischen Neurographiebefunde sind schwach unterstützend für eine Demyelinisierung gemäß EAN/PNS-Leitlinie 2021 (Tab. 2), da die Kriterien nur in einem Nerv erfüllt sind:',
    motorNichtErfuellt: 'Die motorischen Neurographiebefunde sind auffällig, erfüllen aber nicht die Kriterien für eine Demyelinisierung gemäß EAN/PNS-Leitlinie 2021 (Tab. 2).',
    motorUnauffaellig: 'Die motorische Neurographie ist unauffällig; die Kriterien für eine Demyelinisierung gemäß EAN/PNS-Leitlinie 2021 (Tab. 2) sind nicht erfüllt.',
    sensAuffaellig: (n, nerven) => `Sensible Leitungsauffälligkeiten in ${n} Nerv${n > 1 ? 'en' : ''} (${nerven.join(', ')}).`,
    sensUnauffaellig: 'Die sensible Neurographie ist in den untersuchten Nerven unauffällig.',
    kategorie: (text, begruendung) => `Diagnostische Einordnung nach EAN/PNS-Leitlinie 2021 (Tab. 6), unter der Voraussetzung erfüllter klinischer Kriterien: ${text} (${begruendung}).`,
  };

  // ---------- Motorik: Prüfung je Nerv ----------

  function pruefeMotorNerv(nerv, seite, d, norm, eingabe) {
    const def = MOTORISCH[nerv];
    const k = {};
    K.forEach((x) => (k[x] = { erfuellt: false, details: [] }));
    const hinweise = [];
    const auffaellig = [];
    const text = [];
    const textHinweise = [];
    const orte = d.orte || {};

    // (a) distal-motorische Latenz
    if (da(d.dml) && da(norm.dml)) {
      const kts = nerv === 'medianus' && eingabe.kts;
      if (d.dml > norm.dml) {
        auffaellig.push('DML verlängert');
        text.push(T.dml(d.dml, d.dml / norm.dml - 1) + (kts && d.dml >= 1.5 * norm.dml ? T.ktsNichtGewertet : ''));
      }
      if (d.dml >= 1.5 * norm.dml) {
        if (kts) {
          hinweise.push('DML-Verlängerung nicht gewertet (Karpaltunnelsyndrom)');
        } else {
          k.a.erfuellt = true;
          k.a.details.push(`DML ${zahl(d.dml)} ms (${prozent(d.dml / norm.dml - 1)} über Norm)`);
        }
      }
    }

    // distale Amplitude
    const ampAusreichend = da(d.amp) && da(norm.amp) && d.amp >= 0.2 * norm.amp;
    if (da(d.amp) && d.amp === 0) {
      auffaellig.push('kein CMAP');
      text.push(T.keinCmap);
    } else if (da(d.amp) && da(norm.amp) && d.amp < norm.amp) {
      auffaellig.push('CMAP-Amplitude reduziert');
      text.push(T.cmapReduziert(d.amp, 1 - d.amp / norm.amp));
    }

    // (g) distale CMAP-Dauer
    const grenze = (DAUER_GRENZEN[eingabe.filter] || {})[nerv];
    if (da(d.dauer) && da(grenze) && d.dauer > grenze) {
      k.g.erfuellt = true;
      k.g.details.push(`distale CMAP-Dauer ${zahl(d.dauer)} ms (Grenze ${zahl(grenze)} ms bei ${eingabe.filter} Hz)`);
      text.push(T.dauer(d.dauer, d.dauer / grenze - 1, grenze));
    }

    // (b) motorische NLG
    def.orte.forEach((ort) => {
      const o = orte[ort.id];
      if (!o || !da(o.nlg)) return;
      const lln = normNlg(norm, ort.id, eingabe.alter);
      if (!da(lln)) {
        if (da(eingabe.alter)) {
          hinweise.push(`NLG ${ort.segment} nicht bewertet (keine Norm für dieses Alter)`);
          text.push(T.nlgOhneNorm(ort.segment, o.nlg));
        }
        return;
      }
      if (o.nlg < lln) {
        auffaellig.push(`NLG ${ort.segment} verlangsamt`);
        text.push(T.nlg(ort.segment, o.nlg, 1 - o.nlg / lln) + (ort.ausgeschlossen && o.nlg <= 0.7 * lln ? T.segmentNichtGewertet : ''));
      }
      if (o.nlg <= 0.7 * lln) {
        if (ort.ausgeschlossen) {
          hinweise.push(`NLG-Reduktion über ${ort.segment} nicht gewertet (Tab. 2, Note 2)`);
        } else {
          k.b.erfuellt = true;
          k.b.details.push(`NLG ${ort.segment} ${zahl(o.nlg)} m/s (${prozent(1 - o.nlg / lln)} unter Norm)`);
        }
      }
    });

    // (e) Leitungsblock
    if (!def.keinBlock && da(d.amp) && d.amp > 0 && da(norm.amp)) {
      const ue = orte.ue, oe = orte.oe;
      const sulcusAbfall = nerv === 'ulnaris' && ue && oe && da(ue.amp) && da(oe.amp) && ue.amp > 0 && 1 - oe.amp / ue.amp >= 0.3;
      if (sulcusAbfall && ampAusreichend) hinweise.push('Amplitudenabfall über dem Ellenbogen; nicht gewertet, proximale Blockbewertung (Axilla/Erb) entfällt');
      let blockUnbewertbar = false;
      def.orte.forEach((ort) => {
        const o = orte[ort.id];
        if (!o || !da(o.amp)) return;
        const abfall = 1 - o.amp / d.amp;
        const schwelle = ort.erb ? 0.5 : 0.3;
        if (abfall < schwelle) return;
        if (!ampAusreichend) {
          blockUnbewertbar = true;
        } else if (ort.ausgeschlossen) {
          hinweise.push(`Amplitudenabfall bis ${ort.name} nicht gewertet (Tab. 2, Note 2)`);
          text.push(T.abfallNichtGewertet(ort.segment, abfall));
        } else if (sulcusAbfall && (ort.id === 'ax' || ort.id === 'erb')) {
          // Abfall stammt aus dem Sulcus, bereits als nicht gewertet vermerkt
        } else {
          k.e.erfuellt = true;
          k.e.details.push(`Leitungsblock ${def.distal}–${ort.name}: Amplitudenabfall ${prozent(abfall)}`);
          text.push(T.leitungsblock(def.distal, ort.name, abfall));
          if (ort.id === 'ell' || ort.id === 'ue') {
            hinweise.push(nerv === 'ulnaris'
              ? 'Leitungsblock am Unterarm: Martin-Gruber-Anastomose ausschließen (N. medianus am Ellenbogen stimulieren, Ableitung ADM)'
              : 'Leitungsblock am Unterarm: Mitstimulation des N. ulnaris am Handgelenk ausschließen');
          }
        }
      });
      if (blockUnbewertbar) {
        hinweise.push('Leitungsblock nicht bewertbar (distale CMAP < 20 % der Norm)');
        textHinweise.push(T.blockNichtBewertbar);
      }
    }

    // (f) temporale Dispersion
    if (da(d.dauer) && d.dauer > 0) {
      def.orte.forEach((ort) => {
        const o = orte[ort.id];
        if (!o || !da(o.dauer)) return;
        const zunahme = o.dauer / d.dauer - 1;
        const erfuellt = nerv === 'tibialis' ? zunahme >= 1.0 : zunahme > 0.3;
        if (erfuellt) {
          k.f.erfuellt = true;
          k.f.details.push(`Dispersion ${def.distal}–${ort.name}: Dauerzunahme ${prozent(zunahme)}`);
          text.push(T.dispersion(def.distal, ort.name, zunahme));
        }
      });
    }

    // F-Wellen: (c) Latenz, (d) fehlende F-Wellen
    let fText = null;
    const nameLang = `${def.name} ${SEITE_LANG[seite]}`;
    const fUln = normFLatenz(norm, eingabe.groesse);
    if (d.fFehlt) {
      auffaellig.push('F-Wellen fehlen');
      fText = T.fFehlt(nameLang);
      if (ampAusreichend) {
        k.d.erfuellt = true;
        k.d.details.push('keine F-Wellen');
      } else if (da(d.amp) && da(norm.amp)) {
        hinweise.push('fehlende F-Wellen nicht gewertet (distale CMAP < 20 % der Norm)');
        fText += T.fFehltNichtGewertet;
      }
    } else if (da(d.fLatenz)) {
      if (!da(fUln)) {
        fText = T.fOhneNorm(nameLang, d.fLatenz);
      } else if (d.fLatenz > fUln) {
        auffaellig.push('F-Wellen-Latenz verlängert');
        fText = T.fVerlaengert(nameLang, d.fLatenz, d.fLatenz / fUln - 1);
      } else {
        fText = T.fNormal(nameLang, d.fLatenz);
      }
      const ampNiedrig = da(d.amp) && da(norm.amp) && d.amp < 0.8 * norm.amp;
      const faktor = ampNiedrig ? 1.5 : 1.2;
      if (da(fUln) && d.fLatenz >= faktor * fUln) {
        k.c.erfuellt = true;
        k.c.details.push(`F-Wellen-Latenz ${zahl(d.fLatenz)} ms (${prozent(d.fLatenz / fUln - 1)} über Norm${ampNiedrig ? ', Schwelle 50 % wegen CMAP < 80 % der Norm' : ''})`);
      }
    }

    const irgendein = K.some((x) => k[x].erfuellt);
    const hatMotorwerte = da(d.dml) || da(d.amp) || da(d.dauer) || Object.values(orte).some((o) => o && Object.values(o).some(da));
    return {
      id: `${nerv}-${seite}`, nerv, seite, extremitaet: def.extremitaet,
      gliedmasse: `${seite}-${def.extremitaet}`,
      name: `${def.name} ${SEITEN[seite]}`,
      kriterien: k, hinweise,
      auffaellig: auffaellig.length > 0 || irgendein,
      auffaelligkeiten: auffaellig,
      distaleAmp: d.amp,
      motorText: hatMotorwerte ? T.motorSatz(nameLang, text) + textHinweise.map((h) => ' ' + h).join('') : null,
      fText,
    };
  }

  // ---------- Motorik: Zusammenführung nach Tab. 2 (streng) ----------

  function kombiniere(nerven) {
    const mit = (x) => nerven.filter((n) => n.kriterien[x].erfuellt);
    const anderer = (n, ohne) => K.some((x) => x !== ohne && n.kriterien[x].erfuellt);
    const erg = {};
    K.forEach((x) => (erg[x] = { stark: [], schwach: [] }));

    ['a', 'b', 'c', 'f'].forEach((x) => {
      const m = mit(x);
      erg[x].stark = paare(m);
      erg[x].schwach = m.map((n) => [n]);
    });

    // (d) zwei Nerven ohne F-Wellen + weiterer Parameter in einem anderen Nerv
    const D = mit('d');
    paare(D).forEach((p) => nerven.forEach((n) => {
      if (!p.includes(n) && anderer(n)) erg.d.stark.push([...p, n]);
    }));
    D.forEach((x) => nerven.forEach((n) => {
      if (n !== x && anderer(n)) erg.d.schwach.push([x, n]);
    }));

    // (e) Block in zwei Nerven, oder in einem + weiterer Parameter (außer fehlenden F-Wellen)
    const E = mit('e');
    erg.e.stark = paare(E);
    E.forEach((x) => nerven.forEach((n) => {
      if (n !== x && anderer(n, 'd')) erg.e.stark.push([x, n]);
    }));
    erg.e.schwach = E.map((n) => [n]);

    // (g) ein Nerv + weiterer Parameter in einem anderen Nerv
    const G = mit('g');
    G.forEach((x) => nerven.forEach((n) => {
      if (n !== x && anderer(n)) erg.g.stark.push([x, n]);
    }));
    erg.g.schwach = G.map((n) => [n]);

    const stark = K.flatMap((x) => erg[x].stark);
    const schwach = K.flatMap((x) => erg[x].schwach);
    return {
      kriterien: erg,
      stark: stark.length > 0,
      schwach: stark.length === 0 && schwach.length > 0,
      starkSets: stark,
      einNerv: stark.length > 0 || schwach.length > 0,
    };
  }

  // ---------- Sensibilität (Tab. 3) ----------

  function pruefeSensNerv(nerv, seite, d, norm, eingabe) {
    const def = SENSIBEL[nerv];
    const ampLln = norm.amp;
    const nlgLln = normNlg(norm, 'wert', eingabe.alter);
    const befunde = [];
    let ampPath = false;
    if (da(d.amp) && da(ampLln) && d.amp < ampLln) { befunde.push('Amplitude reduziert'); ampPath = true; }
    if (da(d.nlg) && da(nlgLln) && d.nlg < nlgLln) befunde.push('NLG verlangsamt');

    // Kriterium für sensible CIDP (Tab. 3, 2a)
    let sensKriterium = false;
    if (da(d.nlg) && da(nlgLln) && da(d.amp) && da(ampLln)) {
      const faktor = d.amp > 0.8 * ampLln ? 0.8 : 0.7;
      sensKriterium = d.nlg < faktor * nlgLln;
    }
    if (da(d.amp) && d.amp === 0) { befunde.push('kein Potential'); ampPath = true; }

    const text = [];
    if (da(d.amp) && d.amp === 0) text.push(T.keinSnap);
    else if (da(d.amp) && da(ampLln) && d.amp < ampLln) text.push(T.snapReduziert(d.amp, 1 - d.amp / ampLln));
    if (da(d.nlg) && da(nlgLln) && d.nlg < nlgLln) text.push(T.sensNlg(d.nlg, 1 - d.nlg / nlgLln));

    return {
      id: `${nerv}-${seite}`, nerv, seite, extremitaet: def.extremitaet,
      gliedmasse: `${seite}-${def.extremitaet}`,
      name: `${def.name} ${SEITEN[seite]}`,
      pathologisch: befunde.length > 0, befunde, ampPath, ampGemessen: da(d.amp), sensKriterium,
      text: T.sensSatz(`${def.name} ${SEITE_LANG[seite]}`, text),
    };
  }

  // ---------- Gesamtauswertung ----------

  function untersucht(d) {
    if (!d) return false;
    return Object.entries(d).some(([key, v]) => {
      if (key === 'orte') return Object.values(v || {}).some((o) => Object.values(o).some(da));
      if (key === 'fFehlt') return v === true;
      return da(v);
    });
  }

  function werteAus(eingabe, normwerte) {
    const motor = [];
    const sens = [];
    Object.keys(MOTORISCH).forEach((nerv) => Object.keys(SEITEN).forEach((seite) => {
      const d = eingabe.motorisch[`${nerv}-${seite}`];
      if (untersucht(d)) motor.push(pruefeMotorNerv(nerv, seite, d, normwerte.motorisch[nerv], eingabe));
    }));
    Object.keys(SENSIBEL).forEach((nerv) => Object.keys(SEITEN).forEach((seite) => {
      const d = eingabe.sensibel[`${nerv}-${seite}`];
      if (untersucht(d)) sens.push(pruefeSensNerv(nerv, seite, d, normwerte.sensibel[nerv], eingabe));
    }));

    const motorik = kombiniere(motor);
    const sensPath = sens.filter((s) => s.pathologisch);
    const alleVier = (liste, keys) => keys.every((k) => liste.some((n) => n.nerv === k));
    const sensNormalVier = alleVier(sens, Object.keys(SENSIBEL)) && sensPath.length === 0;
    const motorNormalVier = alleVier(motor, Object.keys(MOTORISCH)) && motor.every((n) => !n.auffaellig);

    // Sural-Sparing (Tab. 3, 2b)
    const suralGemessen = sens.filter((s) => s.nerv === 'suralis' && s.ampGemessen);
    const suralSparing = suralGemessen.length > 0 && suralGemessen.every((s) => !s.ampPath)
      && sens.some((s) => s.ampPath && (s.nerv === 'radialis' || (s.nerv === 'medianus' && !eingabe.kts)));
    const sensKriteriumNerven = sens.filter((s) => s.sensKriterium);
    const sensCidpKriterium = sensKriteriumNerven.length >= 2 || suralSparing;

    const sensibilitaet = {
      nerven: sens, pathologisch: sensPath, normalVier: sensNormalVier,
      suralSparing, kriteriumNerven: sensKriteriumNerven, cidpKriterium: sensCidpKriterium,
    };

    const kategorie = bestimmeKategorie(eingabe, motor, motorik, sensibilitaet, motorNormalVier);

    const warnungen = [];
    if (eingabe.kts && sensPath.some((s) => s.nerv === 'medianus')) warnungen.push('Pathologischer sensibler N. medianus bei Karpaltunnelsyndrom: Wertung kritisch prüfen');
    warnungen.push(...bereichsWarnungen(eingabe, normwerte, motor, sens));
    warnungen.push(...fehlendeNormen(normwerte, motor, sens, eingabe));

    return { motor, motorik, motorNormalVier, sensibilitaet, kategorie, warnungen };
  }

  // Warnung, wenn Alter oder Größe außerhalb der Normtabellen liegen; gerechnet wird
  // dann mit der nächstliegenden Zeile.
  function bereichsWarnungen(eingabe, normwerte, motor, sens) {
    const w = [];
    const pruefe = (tabellen, wert, von, bis, text) => {
      tabellen = tabellen.filter(Array.isArray);
      if (!tabellen.length || !da(wert)) return;
      const min = Math.max(...tabellen.map((t) => t[0][von]).filter(da));
      const max = Math.min(...tabellen.map((t) => t[t.length - 1][bis]));
      if (wert < min) w.push(text(`ab ${min}`));
      else if (wert > max) w.push(text(`bis ${max}`));
    };
    const motorNorm = motor.map((n) => normwerte.motorisch[n.nerv]);
    pruefe([...motorNorm.map((n) => n.nlg), ...sens.map((n) => normwerte.sensibel[n.nerv].nlg)], eingabe.alter, 'alterVon', 'alterBis',
      (bereich) => `Patient ${zahl(eingabe.alter, 0)} Jahre: Normwerte liegen nur ${bereich} Jahre vor, gerechnet wird mit der nächstliegenden Altersgruppe`);
    pruefe(motorNorm.map((n) => n.fLatenz), eingabe.groesse, 'groesseVon', 'groesseBis',
      (bereich) => `Körpergröße ${zahl(eingabe.groesse, 0)} cm: F-Wellen-Normwerte liegen nur ${bereich} cm vor, gerechnet wird mit der nächstliegenden Größengruppe`);
    return w;
  }

  function fehlendeNormen(normwerte, motor, sens, eingabe) {
    const fehlt = [];
    const felder = { dml: 'DML', amp: 'CMAP-Amplitude', nlg: 'NLG', fLatenz: 'F-Wellen-Latenz' };
    const motorNerven = [...new Set(motor.map((n) => n.nerv))];
    const tabelleNlg = motorNerven.some((nerv) => Array.isArray(normwerte.motorisch[nerv].nlg));
    const tabelleF = motorNerven.some((nerv) => Array.isArray(normwerte.motorisch[nerv].fLatenz));
    if (tabelleNlg && !da(eingabe.alter)) fehlt.push('Bitte Alter eingeben: Die NLG-Normwerte hängen vom Alter ab und werden sonst nicht bewertet.');
    if (tabelleF && !da(eingabe.groesse)) fehlt.push('Bitte Körpergröße eingeben: Die F-Wellen-Normwerte von N. tibialis und N. peroneus hängen von der Größe ab und werden sonst nicht bewertet.');
    motorNerven.forEach((nerv) => {
      const n = normwerte.motorisch[nerv];
      const f = [];
      if (!da(n.dml)) f.push('DML');
      if (!da(n.amp)) f.push('CMAP-Amplitude');
      const nlgLeer = Array.isArray(n.nlg) ? n.nlg.every((z) => Object.entries(z).every(([k, v]) => k === 'alterBis' || !da(v))) : !da(n.nlg);
      if (nlgLeer) f.push('NLG');
      const fLeer = Array.isArray(n.fLatenz) ? n.fLatenz.every((z) => !da(z.wert)) : !da(n.fLatenz);
      if (fLeer) f.push('F-Wellen-Latenz');
      if (f.length) fehlt.push(`Normwert fehlt: ${MOTORISCH[nerv].name} motorisch (${f.join(', ')})`);
    });
    const sfelder = { amp: 'SNAP-Amplitude', nlg: 'NLG' };
    [...new Set(sens.map((n) => n.nerv))].forEach((nerv) => {
      const f = Object.keys(sfelder).filter((x) => !da(normwerte.sensibel[nerv][x]));
      if (f.length) fehlt.push(`Normwert fehlt: ${SENSIBEL[nerv].name} sensibel (${f.map((x) => sfelder[x]).join(', ')})`);
    });
    return fehlt;
  }

  // ---------- Diagnosekategorien (Tab. 6) ----------

  function bestimmeKategorie(eingabe, motor, motorik, sens, motorNormalVier) {
    const typ = eingabe.phaenotyp;
    if (!typ) return null;
    const u = eingabe.unterstuetzend || {};
    const anzahlU = Object.keys(UNTERSTUETZEND).filter((x) => u[x]).length;
    const nSens = sens.pathologisch.length;
    const name = PHAENOTYPEN[typ];

    const sicher = (begruendung) => ({ stufe: 'sicher', text: name.charAt(0).toUpperCase() + name.slice(1), begruendung });
    const moeglich = (begruendung, aufwertbar = true) => {
      if (aufwertbar && anzahlU >= 2) {
        return { stufe: 'sicher', text: name.charAt(0).toUpperCase() + name.slice(1), begruendung: `${begruendung}; aufgewertet durch ${anzahlU} unterstützende Kriterien` };
      }
      return {
        stufe: 'moeglich', text: `Mögliche ${name}`,
        begruendung: begruendung + (aufwertbar ? '' : '; nicht durch unterstützende Kriterien aufwertbar'),
      };
    };
    const nicht = (begruendung) => ({ stufe: 'nicht', text: `Kriterien für eine ${name} nicht erfüllt`, begruendung });

    if (typ === 'typisch') {
      if (motorik.stark && nSens >= 2) return sicher('motorische Kriterien in 2 Nerven, sensible Auffälligkeiten in ≥ 2 Nerven');
      if (motorik.einNerv && nSens >= 2) return moeglich('motorische Kriterien in 1 Nerv, sensible Auffälligkeiten in ≥ 2 Nerven');
      if (motor.some((n) => n.auffaellig) && nSens >= 2 && u.therapie && anzahlU >= 2) {
        return moeglich('motorische Auffälligkeiten ohne erfüllte Kriterien, sensible Auffälligkeiten in ≥ 2 Nerven, Therapieansprechen und ein weiteres unterstützendes Kriterium', false);
      }
      return nicht(`motorische Kriterien ${motorik.einNerv ? 'erfüllt' : 'nicht erfüllt'}, sensible Auffälligkeiten in ${nSens} Nerv(en)`);
    }

    if (typ === 'distal') {
      const oben = kombiniere(motor.filter((n) => n.extremitaet === 'oben' && da(n.distaleAmp) && n.distaleAmp >= 1));
      const unten = kombiniere(motor.filter((n) => n.extremitaet === 'unten'));
      if (oben.stark && nSens >= 2) return sicher('motorische Kriterien in 2 Nerven der oberen Extremität (distale CMAP ≥ 1 mV), sensible Auffälligkeiten in ≥ 2 Nerven');
      if (oben.einNerv && nSens >= 1) return moeglich('motorische Kriterien in 1 Nerv der oberen Extremität, sensible Auffälligkeiten in ≥ 1 Nerv');
      if (unten.stark && nSens >= 2) return moeglich('motorische Kriterien nur in 2 Nerven der unteren Extremität, sensible Auffälligkeiten in ≥ 2 Nerven', false);
      return nicht('motorische Kriterien an der oberen Extremität (distale CMAP ≥ 1 mV) nicht erfüllt');
    }

    if (typ === 'multifokal' || typ === 'fokal') {
      const sensIn = (gliedmassen) => sens.pathologisch.filter((s) => gliedmassen.has(s.gliedmasse)).length;
      const passend = motorik.starkSets.filter((set) => {
        const g = new Set(set.map((n) => n.gliedmasse));
        return typ === 'multifokal' ? g.size > 1 : g.size === 1;
      });
      for (const set of passend) {
        if (sensIn(new Set(set.map((n) => n.gliedmasse))) >= 2) {
          return sicher(`motorische Kriterien in 2 Nerven ${typ === 'multifokal' ? 'an mehr als einer Extremität' : 'einer Extremität'}, sensible Auffälligkeiten in ≥ 2 Nerven der betroffenen Extremität(en)`);
        }
      }
      if (motorik.einNerv && nSens >= 2) return moeglich('motorische Kriterien in 1 Nerv, sensible Auffälligkeiten in ≥ 2 Nerven');
      if (typ === 'fokal' && motorik.einNerv) {
        const betroffen = motor.filter((n) => K.some((x) => n.kriterien[x].erfuellt));
        if (betroffen.some((n) => sensIn(new Set([n.gliedmasse])) >= 1)) {
          return moeglich('motorische Kriterien in 1 Nerv, sensible Auffälligkeit in 1 Nerv der betroffenen Extremität', false);
        }
      }
      return nicht('motorische und/oder sensible Kriterien nicht erfüllt');
    }

    if (typ === 'motorisch') {
      if (sens.normalVier) {
        if (motorik.stark) return sicher('motorische Kriterien in 2 Nerven, sensible Neurographie in 4 Nerven normal');
        if (motorik.einNerv) return moeglich('motorische Kriterien in 1 Nerv, sensible Neurographie in 4 Nerven normal');
      }
      if (nSens >= 2) {
        if (motorik.stark) return { stufe: 'sicher', text: 'Motorisch betonte CIDP', begruendung: 'motorische Kriterien in 2 Nerven, sensible Auffälligkeiten in ≥ 2 Nerven' };
        if (motorik.einNerv) {
          if (anzahlU >= 2) return { stufe: 'sicher', text: 'Motorisch betonte CIDP', begruendung: `motorische Kriterien in 1 Nerv, sensible Auffälligkeiten in ≥ 2 Nerven; aufgewertet durch ${anzahlU} unterstützende Kriterien` };
          return { stufe: 'moeglich', text: 'Mögliche motorisch betonte CIDP', begruendung: 'motorische Kriterien in 1 Nerv, sensible Auffälligkeiten in ≥ 2 Nerven' };
        }
      }
      if (!sens.normalVier && nSens < 2) return nicht('sensible Neurographie nicht in allen 4 Nerven (N. medianus, N. ulnaris, N. radialis, N. suralis) normal untersucht');
      return nicht('motorische Kriterien nicht erfüllt');
    }

    if (typ === 'sensibel') {
      if (sens.cidpKriterium && motorNormalVier) {
        return { stufe: 'moeglich', text: 'Mögliche sensible CIDP', begruendung: `sensible Kriterien erfüllt (${sens.suralSparing ? 'Sural-Sparing-Muster' : 'NLG-Kriterium in ≥ 2 Nerven'}), motorische Neurographie in 4 Nerven normal; nicht aufwertbar` };
      }
      if (nSens >= 2 && motorik.stark) return { stufe: 'sicher', text: 'Sensibel betonte CIDP', begruendung: 'sensible Auffälligkeiten in ≥ 2 Nerven, motorische Kriterien in 2 Nerven' };
      const motorAuff = motor.filter((n) => n.auffaellig).length;
      if (nSens >= 2 && (motorAuff >= 2 || motorik.einNerv)) {
        return { stufe: 'moeglich', text: 'Mögliche sensibel betonte CIDP', begruendung: 'sensible Auffälligkeiten in ≥ 2 Nerven, motorische Auffälligkeiten in 2 Nerven oder Kriterien in 1 Nerv' };
      }
      return nicht(sens.cidpKriterium ? 'motorische Neurographie nicht in allen 4 Nerven normal' : 'sensible Kriterien nicht erfüllt');
    }
    return null;
  }

  // ---------- Befundtext ----------

  function befundtext(eingabe, erg) {
    const z = [T.ueberschrift(eingabe.filter)];
    const motor = erg.motor.filter((n) => n.motorText);
    const fWellen = erg.motor.filter((n) => n.fText);
    if (motor.length) z.push('', 'Motorische Neurographie:', ...motor.map((n) => n.motorText));
    if (erg.sensibilitaet.nerven.length) {
      z.push('', 'Sensible Neurographie:', ...erg.sensibilitaet.nerven.map((n) => n.text));
      if (erg.sensibilitaet.suralSparing) z.push(T.suralSparing);
    }
    if (fWellen.length) z.push('', 'F-Wellen Antwort:', ...fWellen.map((n) => n.fText));

    z.push('', 'Beurteilung:');
    const mk = erg.motorik;
    // Nerven mit dem Kriterium selbst, bei (d), (e), (g) zusätzlich der Nerv mit dem weiteren Parameter
    const betroffen = (x) => {
      const alle = [...new Set(mk.kriterien[x].stark.flat())];
      const mit = alle.filter((n) => n.kriterien[x].erfuellt).map((n) => n.name);
      const weitere = alle.filter((n) => !n.kriterien[x].erfuellt).map((n) => n.name);
      return mit.join(', ') + (weitere.length ? `; weiterer Demyelinisierungsparameter in: ${weitere.join(', ')}` : '');
    };
    const einzeln = (x) => erg.motor.filter((n) => n.kriterien[x].erfuellt).map((n) => n.name);
    if (mk.stark) {
      const krit = K.filter((x) => mk.kriterien[x].stark.length).map((x) => `(${x}) ${KRITERIEN[x]}: ${betroffen(x)}`);
      z.push(T.motorStark, ...krit.map((k) => `- ${k}`));
    } else if (mk.schwach) {
      const krit = K.filter((x) => mk.kriterien[x].schwach.length).map((x) => `(${x}) ${KRITERIEN[x]}: ${einzeln(x).join(', ')}`);
      z.push(T.motorSchwach, ...krit.map((k) => `- ${k}`));
    } else if (erg.motor.length) {
      z.push(erg.motor.some((n) => n.auffaellig) ? T.motorNichtErfuellt : T.motorUnauffaellig);
    }

    const s = erg.sensibilitaet;
    if (s.nerven.length) {
      const n = s.pathologisch.length;
      z.push(n ? T.sensAuffaellig(n, s.pathologisch.map((x) => x.name)) : T.sensUnauffaellig);
    }

    if (erg.kategorie) z.push('', T.kategorie(erg.kategorie.text, erg.kategorie.begruendung));
    return z.join('\n');
  }

  return { MOTORISCH, SENSIBEL, SEITEN, KRITERIEN, PHAENOTYPEN, UNTERSTUETZEND, DAUER_GRENZEN, normNlg, normFLatenz, werteAus, befundtext };
})();

if (typeof module !== 'undefined') module.exports = CIDP;
