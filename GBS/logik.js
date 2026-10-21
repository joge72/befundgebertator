// Auswertung nach den modifizierten elektrodiagnostischen GBS-Kriterien
// von Rajabally et al. (J Neurol Neurosurg Psychiatry 2015;86:115–119), Box 2.
//
// Demyelinisierende Merkmale je Nerv: NLG < 70 % LLN, DML > 150 % ULN,
// F-Wellen-Latenz > 120 % ULN (> 150 % bei distaler CMAP < 50 % LLN).
// Fehlende F-Wellen und ein Amplitudenverhältnis proximal/distal < 0,7 zählen
// für die AIDP nur zusammen mit einem demyelinisierenden Merkmal in einem
// anderen Nerv; allein sprechen sie für eine axonale Form.

const GBS = (function () {
  // AIDP-Kriterium "mindestens eines in mindestens zwei Nerven": streng heißt,
  // dasselbe Merkmal muss in zwei Nerven vorliegen (wie bei CIDP).
  const STRENG = true;

  // Untersuchungsprotokoll nach Rajabally: je Nerv eine distale und eine proximale Stimulation
  const MOTORISCH = {
    medianus: { name: 'N. medianus', distal: 'Handgelenk', muskel: 'M. abductor pollicis brevis', ort: { id: 'ell', name: 'Ellenbogen', segment: 'Unterarm' } },
    ulnaris: { name: 'N. ulnaris', distal: 'Handgelenk', muskel: 'M. abductor digiti minimi', ort: { id: 'ue', name: 'unterhalb Ellenbogen', segment: 'Unterarm' } },
    peroneus: { name: 'N. peroneus', distal: 'Fußrist', muskel: 'M. extensor digitorum brevis', ort: { id: 'fk', name: 'unterhalb Fibulaköpfchen', segment: 'Unterschenkel' } },
    tibialis: { name: 'N. tibialis', distal: 'Innenknöchel', muskel: 'M. abductor hallucis', ort: { id: 'kk', name: 'Kniekehle', segment: 'Unterschenkel' }, ohneVerhaeltnis: true },
  };

  const SENSIBEL = {
    medianus: { name: 'N. medianus' },
    ulnaris: { name: 'N. ulnaris' },
    radialis: { name: 'N. radialis superficialis' },
    suralis: { name: 'N. suralis' },
  };

  const SEITEN = { re: 're.', li: 'li.' };
  const SEITE_LANG = { re: 'rechts', li: 'links' };

  const MERKMALE = {
    nlg: 'NLG < 70 % des Lower Limit of Normal',
    dml: 'DML > 150 % des Upper Limit of Normal',
    fLatenz: 'F-Wellen-Latenz > 120 % des Upper Limit of Normal (> 150 % bei distaler CMAP < 50 % des Lower Limit of Normal)',
    fFehlt: 'Fehlende F-Wellen bei distaler CMAP ≥ 20 % des Lower Limit of Normal',
    verhaeltnis: 'Amplitudenverhältnis proximal/distal < 0,7 (ohne N. tibialis)',
    amp80: 'Distale CMAP < 80 % des Lower Limit of Normal',
    amp10: 'Distale CMAP < 10 % des Lower Limit of Normal',
  };
  const DEMYELINISIEREND = ['nlg', 'dml', 'fLatenz'];

  const zahl = (x, stellen = 1) => x.toLocaleString('de-DE', { maximumFractionDigits: stellen });
  const prozent = (x) => Math.round(x * 100) + ' %';
  const da = (x) => x !== null && x !== undefined && !Number.isNaN(x);

  // ---------- Normwerte (Zahl oder Tabelle nach Alter bzw. Körpergröße) ----------

  function ausTabelle(tabelle, schluessel, wert) {
    if (!Array.isArray(tabelle)) return tabelle;
    if (!da(wert) || !tabelle.length) return null;
    return tabelle.find((z) => wert <= z[schluessel]) || tabelle[tabelle.length - 1];
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

  // ---------- Textbausteine ----------

  const ueber = (p) => `${prozent(p)} über dem Upper Limit of Normal`;
  const unter = (p) => `${prozent(p)} unter dem Lower Limit of Normal`;
  const aufzaehlung = (teile) => (teile.length > 1 ? `${teile.slice(0, -1).join(', ')} sowie ${teile[teile.length - 1]}` : teile[0]);
  const QUELLE = 'Rajabally et al. 2015';

  const T = {
    ueberschrift: (tag) => `GBS-Programm${da(tag) ? ` (${zahl(tag, 0)}. Krankheitstag)` : ''}:`,

    // Motorische Neurographie
    motorSatz: (nerv, teile) => (teile.length
      ? `Nach Ableitung über dem ${nerv} findet sich ${aufzaehlung(teile)}.`
      : `Nach Ableitung über dem ${nerv} findet sich ein regelrechter Befund.`),
    dml: (wert, p) => `eine verlängerte distal-motorische Latenz von ${zahl(wert)} ms (${ueber(p)})`,
    keinCmap: 'kein motorisches Antwortpotential',
    cmapReduziert: (wert, p) => `eine reduzierte Amplitude des Muskelsummenaktionspotentials von ${zahl(wert)} mV (${unter(p)})`,
    nlg: (segment, wert, p) => `eine verlangsamte motorische Nervenleitgeschwindigkeit im Segment ${segment} von ${zahl(wert)} m/s (${unter(p)})`,
    nlgOhneNorm: (segment, wert) => `eine motorische Nervenleitgeschwindigkeit im Segment ${segment} von ${zahl(wert)} m/s (für dieses Alter keine Norm vorhanden)`,
    verhaeltnis: (von, bis, v) => `eine Amplitudenreduktion zwischen ${von} und ${bis} (Verhältnis proximal/distal ${zahl(v, 2)})`,
    tibialisNichtGewertet: ', beim N. tibialis nicht als Kriterium gewertet',

    // Sensible Neurographie
    sensSatz: (nerv, teile) => (teile.length
      ? `Nach Ableitung über dem ${nerv} findet sich ${aufzaehlung(teile)}.`
      : `Nach Ableitung über dem ${nerv} findet sich ein regelrechter Befund.`),
    keinSnap: 'kein sensibles Nervenaktionspotential',
    snapReduziert: (wert, p) => `eine reduzierte Amplitude des sensiblen Nervenaktionspotentials von ${zahl(wert)} µV (${unter(p)})`,
    sensNlg: (wert, p) => `eine verlangsamte sensible Nervenleitgeschwindigkeit von ${zahl(wert)} m/s (${unter(p)})`,
    suralSparing: 'Es zeigt sich ein Sural-Sparing-Muster (pathologisches sensibles Potential des N. medianus bzw. N. radialis bei regelrechtem N. suralis).',

    // F-Wellen Antwort
    fNormal: (nerv, wert) => `Nach Stimulation des ${nerv} findet sich eine regelrechte minimale F-Wellen-Latenz von ${zahl(wert)} ms.`,
    fVerlaengert: (nerv, wert, p) => `Nach Stimulation des ${nerv} findet sich eine verlängerte minimale F-Wellen-Latenz von ${zahl(wert)} ms (${ueber(p)}).`,
    fOhneNorm: (nerv, wert) => `Nach Stimulation des ${nerv} findet sich eine minimale F-Wellen-Latenz von ${zahl(wert)} ms (ohne Körpergröße nicht bewertet).`,
    fFehlt: (nerv) => `Nach Stimulation des ${nerv} sind keine F-Wellen ableitbar.`,

    // Beurteilung
    aidp: `Die Befunde erfüllen die elektrophysiologischen Kriterien einer akuten inflammatorischen demyelinisierenden Polyradikuloneuropathie (AIDP) nach ${QUELLE}:`,
    axonal: (form) => `Die Befunde erfüllen die elektrophysiologischen Kriterien einer axonalen Verlaufsform des GBS${form ? ` (${form})` : ''} nach ${QUELLE}:`,
    unerregbar: (form) => `Die Befunde erfüllen die Kriterien einer unerregbaren axonalen Verlaufsform des GBS${form ? ` (${form})` : ''} nach ${QUELLE}: In allen untersuchten motorischen Nerven ist kein Antwortpotential bzw. nur in einem Nerv ein Potential unter 10 % des Lower Limit of Normal ableitbar.`,
    unklar: `Die Befunde sind pathologisch, erfüllen aber weder die Kriterien einer AIDP noch einer axonalen Verlaufsform nach ${QUELLE} (nicht eindeutig zuzuordnen).`,
    normal: `Die motorische Neurographie ist unauffällig (normaler Befund nach ${QUELLE}).`,
    aman: 'AMAN, rein motorisch',
    amsan: 'AMSAN, motorisch-sensibel',
    sensAuffaellig: (n, nerven) => `Sensible Leitungsauffälligkeiten in ${n} Nerv${n > 1 ? 'en' : ''} (${nerven.join(', ')}).`,
    sensUnauffaellig: 'Die sensible Neurographie ist in den untersuchten Nerven unauffällig.',
  };

  // ---------- Prüfung je motorischem Nerv ----------

  function pruefeMotorNerv(nerv, seite, d, norm, eingabe) {
    const def = MOTORISCH[nerv];
    const m = {};
    Object.keys(MERKMALE).forEach((x) => (m[x] = false));
    const details = [];
    const hinweise = [];
    const text = [];
    let auffaellig = false;
    const nameLang = `${def.name} ${SEITE_LANG[seite]}`;
    const ampBekannt = da(d.amp) && da(norm.amp);

    if (da(d.dml) && da(norm.dml) && d.dml > norm.dml) {
      auffaellig = true;
      text.push(T.dml(d.dml, d.dml / norm.dml - 1));
      if (d.dml > 1.5 * norm.dml) {
        m.dml = true;
        details.push(`DML ${zahl(d.dml)} ms (${prozent(d.dml / norm.dml - 1)} über Norm)`);
      }
    }

    if (da(d.amp) && d.amp === 0) {
      auffaellig = true;
      text.push(T.keinCmap);
    } else if (ampBekannt && d.amp < norm.amp) {
      auffaellig = true;
      text.push(T.cmapReduziert(d.amp, 1 - d.amp / norm.amp));
    }
    if (ampBekannt && d.amp < 0.8 * norm.amp) {
      m.amp80 = true;
      details.push(`distale CMAP ${zahl(d.amp)} mV (${prozent(d.amp / norm.amp)} der Norm)`);
    }
    if (ampBekannt && d.amp < 0.1 * norm.amp) m.amp10 = true;

    if (da(d.nlg)) {
      const lln = normNlg(norm, def.ort.id, eingabe.alter);
      if (!da(lln)) {
        if (da(eingabe.alter)) {
          hinweise.push(`NLG ${def.ort.segment} nicht bewertet (keine Norm für dieses Alter)`);
          text.push(T.nlgOhneNorm(def.ort.segment, d.nlg));
        }
      } else if (d.nlg < lln) {
        auffaellig = true;
        text.push(T.nlg(def.ort.segment, d.nlg, 1 - d.nlg / lln));
        if (d.nlg < 0.7 * lln) {
          m.nlg = true;
          details.push(`NLG ${def.ort.segment} ${zahl(d.nlg)} m/s (${prozent(1 - d.nlg / lln)} unter Norm)`);
        }
      }
    }

    // Amplitudenverhältnis proximal/distal; normal ist > 0,7
    if (da(d.proxAmp) && da(d.amp) && d.amp > 0) {
      const v = d.proxAmp / d.amp;
      if (v <= 0.7) {
        auffaellig = true;
        text.push(T.verhaeltnis(def.distal, def.ort.name, v) + (def.ohneVerhaeltnis ? T.tibialisNichtGewertet : ''));
      }
      if (v < 0.7 && !def.ohneVerhaeltnis) {
        m.verhaeltnis = true;
        details.push(`Verhältnis proximal/distal ${zahl(v, 2)}`);
        hinweise.push(nerv === 'ulnaris'
          ? 'Amplitudenreduktion am Unterarm: Martin-Gruber-Anastomose ausschließen (N. medianus am Ellenbogen stimulieren, Ableitung ADM)'
          : nerv === 'medianus'
            ? 'Amplitudenreduktion am Unterarm: Mitstimulation des N. ulnaris am Handgelenk ausschließen'
            : null);
      }
    }

    // F-Wellen
    let fText = null;
    const fUln = normFLatenz(norm, eingabe.groesse);
    if (d.fFehlt) {
      auffaellig = true;
      fText = T.fFehlt(nameLang);
      if (ampBekannt && d.amp >= 0.2 * norm.amp) {
        m.fFehlt = true;
        details.push('keine F-Wellen');
      } else if (ampBekannt) {
        hinweise.push('fehlende F-Wellen nicht gewertet (distale CMAP < 20 % der Norm)');
      }
    } else if (da(d.fLatenz)) {
      if (!da(fUln)) {
        fText = T.fOhneNorm(nameLang, d.fLatenz);
      } else if (d.fLatenz > fUln) {
        auffaellig = true;
        fText = T.fVerlaengert(nameLang, d.fLatenz, d.fLatenz / fUln - 1);
        const faktor = ampBekannt && d.amp < 0.5 * norm.amp ? 1.5 : 1.2;
        if (d.fLatenz > faktor * fUln) {
          m.fLatenz = true;
          details.push(`F-Wellen-Latenz ${zahl(d.fLatenz)} ms (${prozent(d.fLatenz / fUln - 1)} über Norm${faktor === 1.5 ? ', Schwelle 150 % wegen CMAP < 50 % der Norm' : ''})`);
        }
      } else {
        fText = T.fNormal(nameLang, d.fLatenz);
      }
    }

    const hatMotorwerte = da(d.dml) || da(d.amp) || da(d.nlg) || da(d.proxAmp);
    return {
      id: `${nerv}-${seite}`, nerv, seite,
      name: `${def.name} ${SEITEN[seite]}`,
      merkmale: m, details, hinweise: hinweise.filter(Boolean),
      demyelinisierend: DEMYELINISIEREND.filter((x) => m[x]),
      auffaellig, amp: d.amp, ampNorm: norm.amp,
      motorText: hatMotorwerte ? T.motorSatz(nameLang, text) : null,
      fText,
    };
  }

  // ---------- Klassifikation nach Rajabally (Box 2) ----------

  function klassifiziere(nerven) {
    const mit = (x) => nerven.filter((n) => n.merkmale[x]);
    const namen = (liste) => liste.map((n) => n.name);
    const demyelNerven = nerven.filter((n) => n.demyelinisierend.length);
    const erfuellt = [];

    if (!nerven.length) return { typ: null, erfuellt };

    // Unerregbar: kein Potential in allen Nerven, höchstens ein Nerv mit CMAP < 10 % LLN
    const mitAmp = nerven.filter((n) => da(n.amp));
    const ableitbar = mitAmp.filter((n) => n.amp > 0);
    if (mitAmp.length >= 2 && mitAmp.length === nerven.length
      && (ableitbar.length === 0 || (ableitbar.length === 1 && ableitbar[0].merkmale.amp10))) {
      return { typ: 'unerregbar', erfuellt };
    }

    // AIDP
    if (STRENG) {
      DEMYELINISIEREND.forEach((x) => {
        const liste = mit(x);
        if (liste.length >= 2) erfuellt.push({ merkmal: x, nerven: namen(liste) });
      });
    } else if (demyelNerven.length >= 2) {
      erfuellt.push({ merkmal: 'demyelinisierend', nerven: namen(demyelNerven) });
    }
    ['fFehlt', 'verhaeltnis'].forEach((x) => {
      const liste = mit(x);
      const zusatz = demyelNerven.filter((z) => liste.filter((n) => n !== z).length >= 2);
      if (zusatz.length) {
        erfuellt.push({ merkmal: x, nerven: namen(liste), zusatz: namen(zusatz) });
      }
    });
    if (erfuellt.length) return { typ: 'aidp', erfuellt };

    // Axonal: keine Demyelinisierung, außer einem Merkmal in einem Nerv mit CMAP < 10 % LLN
    const keineDemyel = demyelNerven.length === 0
      || (demyelNerven.length === 1 && demyelNerven[0].demyelinisierend.length === 1 && demyelNerven[0].merkmale.amp10);
    if (keineDemyel) {
      const amp80 = mit('amp80');
      if (amp80.length >= 2) erfuellt.push({ merkmal: 'amp80', nerven: namen(amp80) });
      const fFehlt = mit('fFehlt');
      if (fFehlt.length >= 2 && demyelNerven.length === 0) erfuellt.push({ merkmal: 'fFehlt', nerven: namen(fFehlt) });
      const verh = mit('verhaeltnis');
      if (verh.length >= 2) erfuellt.push({ merkmal: 'verhaeltnis', nerven: namen(verh) });
      const einzeln = nerven.filter((n) => n.merkmale.fFehlt || n.merkmale.verhaeltnis);
      einzeln.forEach((a) => {
        const andere = amp80.filter((b) => b !== a);
        if (andere.length && !erfuellt.some((e) => e.merkmal === 'kombiniert')) {
          erfuellt.push({ merkmal: 'kombiniert', nerven: [a.name], zusatz: namen(andere) });
        }
      });
      if (erfuellt.length) return { typ: 'axonal', erfuellt };
    }

    return { typ: nerven.some((n) => n.auffaellig) ? 'unklar' : 'normal', erfuellt };
  }

  // ---------- Sensibilität ----------

  function pruefeSensNerv(nerv, seite, d, norm, eingabe) {
    const def = SENSIBEL[nerv];
    const nlgLln = normNlg(norm, 'wert', eingabe.alter);
    const text = [];
    let ampPath = false;
    let pathologisch = false;
    if (da(d.amp) && d.amp === 0) { text.push(T.keinSnap); ampPath = true; }
    else if (da(d.amp) && da(norm.amp) && d.amp < norm.amp) { text.push(T.snapReduziert(d.amp, 1 - d.amp / norm.amp)); ampPath = true; }
    if (da(d.nlg) && da(nlgLln) && d.nlg < nlgLln) { text.push(T.sensNlg(d.nlg, 1 - d.nlg / nlgLln)); pathologisch = true; }
    return {
      id: `${nerv}-${seite}`, nerv, seite,
      name: `${def.name} ${SEITEN[seite]}`,
      pathologisch: pathologisch || ampPath, ampPath, ampGemessen: da(d.amp),
      // Für AMSAN: SNAP ≤ 50 % des Lower Limit of Normal
      ampHalb: da(d.amp) && da(norm.amp) && d.amp <= 0.5 * norm.amp,
      text: T.sensSatz(`${def.name} ${SEITE_LANG[seite]}`, text),
    };
  }

  // ---------- Gesamtauswertung ----------

  const untersucht = (d) => !!d && Object.entries(d).some(([k, v]) => (k === 'fFehlt' ? v === true : da(v)));

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

    const klasse = klassifiziere(motor);

    // AMAN oder AMSAN: SNAP ≤ 50 % des Lower Limit of Normal in zwei Nerven
    let form = null;
    if (klasse.typ === 'axonal' || klasse.typ === 'unerregbar') {
      if (sens.filter((s) => s.ampHalb).length >= 2) form = T.amsan;
      else if (sens.filter((s) => s.ampGemessen).length >= 2) form = T.aman;
    }

    const suralGemessen = sens.filter((s) => s.nerv === 'suralis' && s.ampGemessen);
    const suralSparing = suralGemessen.length > 0 && suralGemessen.every((s) => !s.ampPath)
      && sens.some((s) => s.ampPath && (s.nerv === 'radialis' || s.nerv === 'medianus'));

    const warnungen = bereichsWarnungen(eingabe, normwerte, motor, sens);
    if (!da(eingabe.alter) && motor.some((n) => Array.isArray(normwerte.motorisch[n.nerv].nlg))) {
      warnungen.push('Bitte Alter eingeben: Die NLG-Normwerte hängen vom Alter ab und werden sonst nicht bewertet.');
    }
    if (!da(eingabe.groesse) && motor.some((n) => Array.isArray(normwerte.motorisch[n.nerv].fLatenz))) {
      warnungen.push('Bitte Körpergröße eingeben: Die F-Wellen-Normwerte von N. tibialis und N. peroneus hängen von der Größe ab und werden sonst nicht bewertet.');
    }
    if (!da(eingabe.tag)) warnungen.push('Bitte Krankheitstag eingeben.');

    const pruefhinweise = motor.flatMap((n) => n.hinweise.map((h) => `${n.name}: ${h}`));
    if (da(eingabe.tag) && eingabe.tag <= 7) {
      pruefhinweise.push('Untersuchung in der ersten Krankheitswoche: Ein normaler oder nicht eindeutiger Befund schließt ein GBS nicht aus, eine Kontrolluntersuchung ist zu erwägen.');
    }
    if (da(eingabe.tag) && eingabe.tag > 21) {
      pruefhinweise.push('Die Kriterien nach Rajabally wurden an Untersuchungen innerhalb von 21 Tagen nach Symptombeginn entwickelt.');
    }
    if (motor.length && (motor.length < 4 || sens.length < 2)) {
      pruefhinweise.push(`Rajabally et al. setzen mindestens 4 motorische und 2 sensible Nerven voraus (untersucht: ${motor.length} motorisch, ${sens.length} sensibel).`);
    }
    if (klasse.typ === 'axonal' && klasse.erfuellt.some((e) => e.merkmal === 'verhaeltnis' || e.merkmal === 'kombiniert')) {
      pruefhinweise.push('Amplitudenreduktionen bei axonalen Formen können einer reversiblen Leitungsstörung entsprechen; eine Verlaufskontrolle kann die Zuordnung ändern.');
    }

    return { motor, sens, klasse, form, suralSparing, warnungen, pruefhinweise };
  }

  // Warnung, wenn Alter oder Größe außerhalb der Normtabellen liegen
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

  // ---------- Befundtext ----------

  const KRITERIUM_TEXT = {
    nlg: MERKMALE.nlg,
    dml: MERKMALE.dml,
    fLatenz: MERKMALE.fLatenz,
    demyelinisierend: 'Demyelinisierende Merkmale (NLG < 70 % LLN, DML > 150 % ULN oder F-Wellen-Latenz > 120 % ULN)',
    fFehlt: MERKMALE.fFehlt,
    verhaeltnis: MERKMALE.verhaeltnis,
    amp80: MERKMALE.amp80,
    kombiniert: 'Fehlende F-Wellen oder Amplitudenverhältnis proximal/distal < 0,7',
  };

  function befundtext(eingabe, erg) {
    const z = [T.ueberschrift(eingabe.tag)];
    const motor = erg.motor.filter((n) => n.motorText);
    const fWellen = erg.motor.filter((n) => n.fText);
    if (motor.length) z.push('', 'Motorische Neurographie:', ...motor.map((n) => n.motorText));
    if (erg.sens.length) {
      z.push('', 'Sensible Neurographie:', ...erg.sens.map((n) => n.text));
      if (erg.suralSparing) z.push(T.suralSparing);
    }
    if (fWellen.length) z.push('', 'F-Wellen Antwort:', ...fWellen.map((n) => n.fText));

    z.push('', 'Beurteilung:');
    const k = erg.klasse;
    const zeile = (e) => {
      const zusatz = e.merkmal === 'kombiniert' ? '; dazu distale CMAP < 80 % des Lower Limit of Normal in: '
        : '; zusätzliches demyelinisierendes Merkmal in: ';
      return `- ${KRITERIUM_TEXT[e.merkmal]}: ${e.nerven.join(', ')}${e.zusatz ? zusatz + e.zusatz.join(', ') : ''}`;
    };
    if (k.typ === 'aidp') z.push(T.aidp, ...k.erfuellt.map(zeile));
    else if (k.typ === 'axonal') z.push(T.axonal(erg.form), ...k.erfuellt.map(zeile));
    else if (k.typ === 'unerregbar') z.push(T.unerregbar(erg.form));
    else if (k.typ === 'unklar') z.push(T.unklar);
    else if (k.typ === 'normal') z.push(T.normal);

    if (erg.sens.length) {
      const path = erg.sens.filter((s) => s.pathologisch);
      z.push(path.length ? T.sensAuffaellig(path.length, path.map((s) => s.name)) : T.sensUnauffaellig);
    }
    return z.join('\n');
  }

  return { MOTORISCH, SENSIBEL, SEITEN, MERKMALE, normNlg, normFLatenz, werteAus, befundtext };
})();

if (typeof module !== 'undefined') module.exports = GBS;
