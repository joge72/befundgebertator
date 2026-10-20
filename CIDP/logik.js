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
      name: 'N. peroneus', extremitaet: 'unten', distal: 'Sprunggelenk', muskel: 'M. extensor digitorum brevis',
      orte: [
        { id: 'fk', name: 'unterhalb Fibulaköpfchen', segment: 'Unterschenkel' },
        // Leitungsblock und Verlangsamung über dem Knie zählen nicht (Tab. 2, Note 2)
        { id: 'kk', name: 'Kniekehle', segment: 'Fibulaköpfchen', ausgeschlossen: true },
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

  // ---------- Motorik: Prüfung je Nerv ----------

  function pruefeMotorNerv(nerv, seite, d, norm, eingabe) {
    const def = MOTORISCH[nerv];
    const k = {};
    K.forEach((x) => (k[x] = { erfuellt: false, details: [] }));
    const hinweise = [];
    const auffaellig = [];
    const orte = d.orte || {};

    // (a) distal-motorische Latenz
    if (da(d.dml) && da(norm.dml)) {
      if (d.dml > norm.dml) auffaellig.push('DML verlängert');
      if (d.dml >= 1.5 * norm.dml) {
        if (nerv === 'medianus' && eingabe.kts) {
          hinweise.push('DML-Verlängerung nicht gewertet (Karpaltunnelsyndrom)');
        } else {
          k.a.erfuellt = true;
          k.a.details.push(`DML ${zahl(d.dml)} ms (${prozent(d.dml / norm.dml - 1)} über Norm)`);
        }
      }
    }

    // (b) motorische NLG
    def.orte.forEach((ort) => {
      const o = orte[ort.id];
      if (!o || !da(o.nlg)) return;
      const lln = normNlg(norm, ort.id, eingabe.alter);
      if (!da(lln)) return;
      if (o.nlg < lln) auffaellig.push(`NLG ${ort.segment} verlangsamt`);
      if (o.nlg <= 0.7 * lln) {
        if (ort.ausgeschlossen) {
          hinweise.push(`NLG-Reduktion über ${ort.segment} nicht gewertet (Tab. 2, Note 2)`);
        } else {
          k.b.erfuellt = true;
          k.b.details.push(`NLG ${ort.segment} ${zahl(o.nlg)} m/s (${prozent(1 - o.nlg / lln)} unter Norm)`);
        }
      }
    });

    // (c) F-Wellen-Latenz
    const fUln = normFLatenz(norm, eingabe.groesse);
    if (da(d.fLatenz) && da(fUln)) {
      if (d.fLatenz > fUln) auffaellig.push('F-Wellen-Latenz verlängert');
      const ampNiedrig = da(d.amp) && da(norm.amp) && d.amp < 0.8 * norm.amp;
      const faktor = ampNiedrig ? 1.5 : 1.2;
      if (d.fLatenz >= faktor * fUln) {
        k.c.erfuellt = true;
        k.c.details.push(`F-Wellen-Latenz ${zahl(d.fLatenz)} ms (${prozent(d.fLatenz / fUln - 1)} über Norm${ampNiedrig ? ', Schwelle 50 % wegen CMAP < 80 % der Norm' : ''})`);
      }
    }

    const ampAusreichend = da(d.amp) && da(norm.amp) && d.amp >= 0.2 * norm.amp;
    if (da(d.amp) && da(norm.amp) && d.amp < norm.amp) auffaellig.push('CMAP-Amplitude reduziert');

    // (d) fehlende F-Wellen
    if (d.fFehlt) {
      auffaellig.push('F-Wellen fehlen');
      if (ampAusreichend) {
        k.d.erfuellt = true;
        k.d.details.push('keine F-Wellen');
      } else if (da(d.amp) && da(norm.amp)) {
        hinweise.push('fehlende F-Wellen nicht gewertet (distale CMAP < 20 % der Norm)');
      }
    }

    // (e) Leitungsblock
    if (!def.keinBlock && da(d.amp) && d.amp > 0) {
      if (!da(norm.amp)) {
        // ohne Normwert lässt sich die Bedingung "distale CMAP ≥ 20 % der Norm" nicht prüfen
      } else if (!ampAusreichend) {
        hinweise.push('Leitungsblock nicht bewertbar (distale CMAP < 20 % der Norm)');
      } else {
        const ue = orte.ue, oe = orte.oe;
        const sulcusAbfall = nerv === 'ulnaris' && ue && oe && da(ue.amp) && da(oe.amp) && ue.amp > 0 && 1 - oe.amp / ue.amp >= 0.3;
        if (sulcusAbfall) hinweise.push('Amplitudenabfall über dem Ellenbogen; nicht gewertet, proximale Blockbewertung (Axilla/Erb) entfällt');
        def.orte.forEach((ort) => {
          const o = orte[ort.id];
          if (!o || !da(o.amp)) return;
          const abfall = 1 - o.amp / d.amp;
          const schwelle = ort.erb ? 0.5 : 0.3;
          if (abfall < schwelle) return;
          if (ort.ausgeschlossen) {
            hinweise.push(`Amplitudenabfall bis ${ort.name} nicht gewertet (Tab. 2, Note 2)`);
          } else if (sulcusAbfall && (ort.id === 'ax' || ort.id === 'erb')) {
            // bereits oben vermerkt
          } else {
            k.e.erfuellt = true;
            k.e.details.push(`Leitungsblock ${def.distal}–${ort.name}: Amplitudenabfall ${prozent(abfall)}`);
            if (ort.id === 'ell' || ort.id === 'ue') {
              hinweise.push(nerv === 'ulnaris'
                ? 'Leitungsblock am Unterarm: Martin-Gruber-Anastomose ausschließen (N. medianus am Ellenbogen stimulieren, Ableitung ADM)'
                : 'Leitungsblock am Unterarm: Mitstimulation des N. ulnaris am Handgelenk ausschließen');
            }
          }
        });
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
        }
      });
    }

    // (g) distale CMAP-Dauer
    const grenze = (DAUER_GRENZEN[eingabe.filter] || {})[nerv];
    if (da(d.dauer) && da(grenze) && d.dauer > grenze) {
      k.g.erfuellt = true;
      k.g.details.push(`distale CMAP-Dauer ${zahl(d.dauer)} ms (Grenze ${zahl(grenze)} ms bei ${eingabe.filter} Hz)`);
    }

    const irgendein = K.some((x) => k[x].erfuellt);
    return {
      id: `${nerv}-${seite}`, nerv, seite, extremitaet: def.extremitaet,
      gliedmasse: `${seite}-${def.extremitaet}`,
      name: `${def.name} ${SEITEN[seite]}`,
      kriterien: k, hinweise,
      auffaellig: auffaellig.length > 0 || irgendein,
      auffaelligkeiten: auffaellig,
      distaleAmp: d.amp,
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
    const ampLln = (nerv === 'suralis' && da(eingabe.alter) && eingabe.alter >= 60 && da(norm.ampAb60)) ? norm.ampAb60 : norm.amp;
    const nlgLln = normNlg(norm, 'wert', eingabe.alter);
    const befunde = [];
    let ampPath = false;
    if (da(d.latenz) && da(norm.latenz) && d.latenz > norm.latenz) befunde.push('Latenz verlängert');
    if (da(d.amp) && da(ampLln) && d.amp < ampLln) { befunde.push('Amplitude reduziert'); ampPath = true; }
    if (da(d.nlg) && da(nlgLln) && d.nlg < nlgLln) befunde.push('NLG verlangsamt');

    // Kriterium für sensible CIDP (Tab. 3, 2a)
    let sensKriterium = false;
    if (da(d.nlg) && da(nlgLln) && da(d.amp) && da(ampLln)) {
      const faktor = d.amp > 0.8 * ampLln ? 0.8 : 0.7;
      sensKriterium = d.nlg < faktor * nlgLln;
    }
    if (da(d.amp) && d.amp === 0) { befunde.push('kein Potential'); ampPath = true; }

    return {
      id: `${nerv}-${seite}`, nerv, seite, extremitaet: def.extremitaet,
      gliedmasse: `${seite}-${def.extremitaet}`,
      name: `${def.name} ${SEITEN[seite]}`,
      pathologisch: befunde.length > 0, befunde, ampPath, ampGemessen: da(d.amp), sensKriterium,
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
    if (da(eingabe.tempHand) && eingabe.tempHand < 33) warnungen.push(`Hauttemperatur Hand ${zahl(eingabe.tempHand)} °C (Leitlinie: ≥ 33 °C)`);
    if (da(eingabe.tempFuss) && eingabe.tempFuss < 30) warnungen.push(`Hauttemperatur Außenknöchel ${zahl(eingabe.tempFuss)} °C (Leitlinie: ≥ 30 °C)`);
    if (eingabe.kts && sensPath.some((s) => s.nerv === 'medianus')) warnungen.push('Pathologischer sensibler N. medianus bei Karpaltunnelsyndrom: Wertung kritisch prüfen');
    warnungen.push(...fehlendeNormen(normwerte, motor, sens, eingabe));

    return { motor, motorik, motorNormalVier, sensibilitaet, kategorie, warnungen };
  }

  function fehlendeNormen(normwerte, motor, sens, eingabe) {
    const fehlt = [];
    const felder = { dml: 'DML', amp: 'CMAP-Amplitude', nlg: 'NLG', fLatenz: 'F-Wellen-Latenz' };
    const motorNerven = [...new Set(motor.map((n) => n.nerv))];
    const tabelleNlg = motorNerven.some((nerv) => Array.isArray(normwerte.motorisch[nerv].nlg));
    const tabelleF = motorNerven.some((nerv) => Array.isArray(normwerte.motorisch[nerv].fLatenz));
    if (tabelleNlg && !da(eingabe.alter)) fehlt.push('Alter fehlt: altersabhängige NLG-Normwerte können nicht angewandt werden');
    if (tabelleF && !da(eingabe.groesse)) fehlt.push('Körpergröße fehlt: größenabhängige F-Wellen-Normwerte können nicht angewandt werden');
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
    const sfelder = { latenz: 'Latenz', amp: 'SNAP-Amplitude', nlg: 'NLG' };
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

  function messtext(eingabe) {
    const zeilen = [];
    const wert = (v, einheit) => (da(v) ? `${zahl(v)} ${einheit}` : null);
    Object.entries(MOTORISCH).forEach(([nerv, def]) => Object.entries(SEITEN).forEach(([seite, s]) => {
      const d = eingabe.motorisch[`${nerv}-${seite}`];
      if (!untersucht(d)) return;
      const teile = [];
      if (da(d.dml)) teile.push(`DML ${wert(d.dml, 'ms')}`);
      if (da(d.amp)) teile.push(`CMAP ${def.distal} ${wert(d.amp, 'mV')}${da(d.dauer) ? ` (Dauer ${wert(d.dauer, 'ms')})` : ''}`);
      def.orte.forEach((ort) => {
        const o = (d.orte || {})[ort.id];
        if (!o || !Object.values(o).some(da)) return;
        const t = [];
        if (da(o.amp)) t.push(`CMAP ${ort.name} ${wert(o.amp, 'mV')}${da(o.dauer) ? ` (Dauer ${wert(o.dauer, 'ms')})` : ''}`);
        if (da(o.nlg)) t.push(`NLG ${ort.segment} ${wert(o.nlg, 'm/s')}`);
        teile.push(t.join(', '));
      });
      if (d.fFehlt) teile.push('keine F-Wellen');
      else if (da(d.fLatenz)) teile.push(`F-Wellen-Latenz ${wert(d.fLatenz, 'ms')}`);
      zeilen.push(`- ${def.name} ${s} (${def.muskel}): ${teile.join('; ')}`);
    }));
    const sens = [];
    Object.entries(SENSIBEL).forEach(([nerv, def]) => Object.entries(SEITEN).forEach(([seite, s]) => {
      const d = eingabe.sensibel[`${nerv}-${seite}`];
      if (!untersucht(d)) return;
      const teile = [];
      if (da(d.latenz)) teile.push(`Latenz ${wert(d.latenz, 'ms')}`);
      if (da(d.amp)) teile.push(d.amp === 0 ? 'kein SNAP ableitbar' : `SNAP ${wert(d.amp, 'µV')}`);
      if (da(d.nlg)) teile.push(`NLG ${wert(d.nlg, 'm/s')}`);
      sens.push(`- ${def.name} ${s}: ${teile.join(', ')}`);
    }));
    return { motorisch: zeilen, sensibel: sens };
  }

  function befundtext(eingabe, erg) {
    const z = [];
    const bed = [`Filter ${eingabe.filter} Hz – 10 kHz`];
    if (da(eingabe.tempHand)) bed.push(`Hauttemperatur Hand ${zahl(eingabe.tempHand)} °C`);
    if (da(eingabe.tempFuss)) bed.push(`Außenknöchel ${zahl(eingabe.tempFuss)} °C`);
    z.push(`Elektroneurographie (${bed.join(', ')}):`);
    const m = messtext(eingabe);
    if (m.motorisch.length) z.push('', 'Motorische Neurographie:', ...m.motorisch);
    if (m.sensibel.length) z.push('', 'Sensible Neurographie:', ...m.sensibel);

    z.push('', 'Beurteilung:');
    const mk = erg.motorik;
    const betroffen = (x) => [...new Set(mk.kriterien[x].stark.flat().filter((n) => n.kriterien[x].erfuellt).map((n) => n.name))];
    const einzeln = (x) => erg.motor.filter((n) => n.kriterien[x].erfuellt).map((n) => n.name);
    if (mk.stark) {
      const krit = K.filter((x) => mk.kriterien[x].stark.length).map((x) => `(${x}) ${KRITERIEN[x]}: ${betroffen(x).join(', ')}`);
      z.push(`Die motorischen Neurographiebefunde sind stark unterstützend für eine Demyelinisierung gemäß EAN/PNS-Leitlinie 2021 (Tab. 2):`, ...krit.map((k) => `- ${k}`));
    } else if (mk.schwach) {
      const krit = K.filter((x) => mk.kriterien[x].schwach.length).map((x) => `(${x}) ${KRITERIEN[x]}: ${einzeln(x).join(', ')}`);
      z.push(`Die motorischen Neurographiebefunde sind schwach unterstützend für eine Demyelinisierung gemäß EAN/PNS-Leitlinie 2021 (Tab. 2), da die Kriterien nur in einem Nerv erfüllt sind:`, ...krit.map((k) => `- ${k}`));
    } else if (erg.motor.length) {
      const auff = erg.motor.filter((n) => n.auffaellig);
      z.push(auff.length
        ? `Die motorischen Kriterien für eine Demyelinisierung gemäß EAN/PNS-Leitlinie 2021 (Tab. 2) sind nicht erfüllt. Auffällig: ${auff.map((n) => `${n.name} (${n.auffaelligkeiten.join(', ')})`).join('; ')}.`
        : 'Die motorische Neurographie ist unauffällig; die Kriterien für eine Demyelinisierung gemäß EAN/PNS-Leitlinie 2021 (Tab. 2) sind nicht erfüllt.');
    }

    const s = erg.sensibilitaet;
    if (s.nerven.length) {
      if (s.pathologisch.length) {
        z.push(`Sensible Leitungsauffälligkeiten in ${s.pathologisch.length} Nerv${s.pathologisch.length > 1 ? 'en' : ''}: ${s.pathologisch.map((n) => `${n.name} (${n.befunde.join(', ')})`).join('; ')}.`);
      } else {
        z.push(`Die sensible Neurographie ist in den untersuchten Nerven unauffällig.`);
      }
      if (s.suralSparing) z.push('Es zeigt sich ein Sural-Sparing-Muster.');
    }

    if (erg.kategorie) {
      z.push('', `Diagnostische Einordnung nach EAN/PNS-Leitlinie 2021 (Tab. 6), unter der Voraussetzung erfüllter klinischer Kriterien: ${erg.kategorie.text} (${erg.kategorie.begruendung}).`);
    }
    return z.join('\n');
  }

  return { MOTORISCH, SENSIBEL, SEITEN, KRITERIEN, PHAENOTYPEN, UNTERSTUETZEND, DAUER_GRENZEN, normNlg, normFLatenz, werteAus, befundtext };
})();

if (typeof module !== 'undefined') module.exports = CIDP;
