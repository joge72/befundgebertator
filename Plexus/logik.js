// Auswertung von Plexusläsionen (Plexus brachialis und lumbosacralis).
// Ein Nerv gilt als betroffen, wenn ein Wert außerhalb der Norm liegt oder die
// Amplitude um mehr als 50 % unter der Gegenseite liegt. Aus dem Muster der
// betroffenen und regelrechten Nerven wird der Läsionsort abgeleitet. Die
// Zuordnung der sensiblen Nerven folgt der Übersicht des Labors, die der
// motorischen Nerven den Wurzeln der Kennmuskeln.

const PLEXUS = (function () {
  const SEITENGRENZE = 0.5; // Amplitudenminderung gegenüber der Gegenseite, ab der ein Wert pathologisch ist

  const SEITEN = { re: 're.', li: 'li.' };
  const SEITE_LANG = { re: 'rechts', li: 'links' };
  const GEGENSEITE = { re: 'li', li: 're' };

  const TRUNCI = { superior: 'Truncus superior', medius: 'Truncus medius', inferior: 'Truncus inferior' };
  const FASZIKEL = { lateralis: 'Fasciculus lateralis', posterior: 'Fasciculus posterior', medialis: 'Fasciculus medialis' };
  const LUMBOSAKRAL = { lumbalis: 'Plexus lumbalis', sacralis: 'Plexus sacralis' };

  // norm: Schlüssel in NORMWERTE.sensibel; ohne Norm wird nur der Seitenvergleich gewertet
  const SENSIBEL = {
    cabl: { name: 'N. cutaneus antebrachii lateralis', plexus: 'brachialis', faszikel: ['lateralis'], trunci: ['superior'], norm: 'cutaneusAntebrachiiLateralis' },
    radSup: { name: 'R. superficialis n. radialis', plexus: 'brachialis', faszikel: ['posterior'], trunci: ['superior'], norm: 'radialis' },
    medD1: { name: 'N. medianus (D I)', plexus: 'brachialis', faszikel: ['lateralis'], trunci: ['superior'] },
    medD2: { name: 'N. medianus (D II)', plexus: 'brachialis', faszikel: ['lateralis'], trunci: ['superior', 'medius'], norm: 'medianus' },
    medD3: { name: 'N. medianus (D III)', plexus: 'brachialis', faszikel: ['lateralis'], trunci: ['medius'] },
    medD4: { name: 'N. medianus (D IV)', plexus: 'brachialis', faszikel: ['medialis'], trunci: ['medius', 'inferior'] },
    ulnD4: { name: 'N. ulnaris (D IV)', plexus: 'brachialis', faszikel: ['medialis'], trunci: ['inferior'] },
    ulnD5: { name: 'N. ulnaris (D V)', plexus: 'brachialis', faszikel: ['medialis'], trunci: ['inferior'], norm: 'ulnaris' },
    ulnDors: { name: 'R. dorsalis n. ulnaris', plexus: 'brachialis', faszikel: ['medialis'], trunci: ['inferior'] },
    cabm: { name: 'N. cutaneus antebrachii medialis', plexus: 'brachialis', faszikel: ['medialis'], trunci: ['inferior'] },
    cfl: { name: 'N. cutaneus femoris lateralis', plexus: 'lumbosacralis', anteil: 'lumbalis', norm: 'cutaneusFemorisLateralis' },
    saph: { name: 'N. saphenus', plexus: 'lumbosacralis', anteil: 'lumbalis' },
    pers: { name: 'N. peronaeus superficialis', plexus: 'lumbosacralis', anteil: 'sacralis', norm: 'peronaeusSuperficialis' },
    sural: { name: 'N. suralis', plexus: 'lumbosacralis', anteil: 'sacralis', norm: 'suralis' },
  };

  // proximal: Leitzeit nach Distanz (NORMWERTE.proximal); distal: DML und MSAP (NORMWERTE.motorisch).
  // Ein leeres Faszikel-Feld heißt: Der Nerv geht vor der Faszikelbildung ab.
  const MOTORISCH = {
    supraspinatus: { name: 'N. suprascapularis', muskel: 'M. supraspinatus', plexus: 'brachialis', faszikel: [], trunci: ['superior'], proximal: 'suprascapularisSupraspinatus' },
    infraspinatus: { name: 'N. suprascapularis', muskel: 'M. infraspinatus', plexus: 'brachialis', faszikel: [], trunci: ['superior'], proximal: 'suprascapularisInfraspinatus' },
    axillaris: { name: 'N. axillaris', muskel: 'M. deltoideus', plexus: 'brachialis', faszikel: ['posterior'], trunci: ['superior'], proximal: 'axillaris' },
    musculocutaneus: { name: 'N. musculocutaneus', muskel: 'M. biceps brachii', plexus: 'brachialis', faszikel: ['lateralis'], trunci: ['superior'], proximal: 'musculocutaneus' },
    radialis: { name: 'N. radialis', muskel: 'M. triceps brachii', plexus: 'brachialis', faszikel: ['posterior'], trunci: ['medius'], proximal: 'radialisTriceps' },
    medianus: { name: 'N. medianus', muskel: 'M. abductor pollicis brevis', plexus: 'brachialis', faszikel: ['medialis'], trunci: ['inferior'], distal: 'medianus' },
    ulnaris: { name: 'N. ulnaris', muskel: 'M. abductor digiti minimi', plexus: 'brachialis', faszikel: ['medialis'], trunci: ['inferior'], distal: 'ulnaris' },
    femoralis: { name: 'N. femoralis', muskel: 'M. quadriceps femoris', plexus: 'lumbosacralis', anteil: 'lumbalis', proximal: 'femoralis' },
    peroneus: { name: 'N. peroneus', muskel: 'M. extensor digitorum brevis', plexus: 'lumbosacralis', anteil: 'sacralis', distal: 'peroneus' },
    tibialis: { name: 'N. tibialis', muskel: 'M. abductor hallucis', plexus: 'lumbosacralis', anteil: 'sacralis', distal: 'tibialis' },
  };

  const zahl = (x, stellen = 1) => x.toLocaleString('de-DE', { maximumFractionDigits: stellen });
  const prozent = (x) => Math.round(x * 100) + ' %';
  const da = (x) => x !== null && x !== undefined && !Number.isNaN(x);

  // ---------- Normwerte ----------

  function ausTabelle(tabelle, schluessel, wert) {
    if (!Array.isArray(tabelle)) return tabelle;
    if (!da(wert) || !tabelle.length) return null;
    return tabelle.find((z) => wert <= z[schluessel]) || tabelle[tabelle.length - 1];
  }

  function normNlg(norm, alter) {
    const zeile = ausTabelle(norm.nlg, 'alterBis', alter);
    if (zeile === null || zeile === undefined) return null;
    return typeof zeile === 'object' ? zeile.wert : zeile;
  }

  // Obere Normgrenze der Leitzeit für eine Distanz: linear interpoliert, außerhalb der Tabelle der Randwert.
  // Ohne Distanz (in der Gerätesoftware hinterlegt) gilt die größte Distanz der Tabelle.
  function normLeitzeit(tabelle, distanz) {
    if (tabelle.length === 1) return { wert: tabelle[0].wert, ausserhalb: da(distanz) && distanz !== tabelle[0].distanz };
    if (!da(distanz)) return { wert: tabelle[tabelle.length - 1].wert, ausserhalb: false };
    const erste = tabelle[0], letzte = tabelle[tabelle.length - 1];
    if (distanz <= erste.distanz) return { wert: erste.wert, ausserhalb: distanz < erste.distanz };
    if (distanz >= letzte.distanz) return { wert: letzte.wert, ausserhalb: distanz > letzte.distanz };
    for (let i = 1; i < tabelle.length; i++) {
      const a = tabelle[i - 1], b = tabelle[i];
      if (distanz <= b.distanz) return { wert: a.wert + (b.wert - a.wert) * (distanz - a.distanz) / (b.distanz - a.distanz), ausserhalb: false };
    }
    return { wert: letzte.wert, ausserhalb: true };
  }

  // ---------- Textbausteine ----------

  const ueber = (p) => `${prozent(p)} über dem Upper Limit of Normal`;
  const unter = (p) => `${prozent(p)} unter dem Lower Limit of Normal`;
  const undListe = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} und ${xs[xs.length - 1]}` : xs[0]);
  const aufzaehlung = (teile) => (teile.length > 1 ? `${teile.slice(0, -1).join(', ')} sowie ${teile[teile.length - 1]}` : teile[0]);

  const T = {
    ueberschrift: 'Plexus-Programm:',
    satz: (nerv, teile) => `Nach Ableitung über dem ${nerv} ${teile.length > 1 ? 'finden' : 'findet'} sich ${aufzaehlung(teile)}.`,
    normalSatz: (nerven, variante) => {
      const liste = undListe(nerven.map((n) => `dem ${n}`));
      return variante % 2 === 0
        ? `Über ${liste} finden sich keine Auffälligkeiten.`
        : `Nach Ableitung über ${liste} findet sich ${nerven.length > 1 ? 'jeweils ' : ''}ein regelrechter Befund.`;
    },
    // Amplitude: Norm und/oder Seitenvergleich
    amp: (art, wert, einheit, pNorm, pSeite, gegenseite) => {
      const klammer = [pNorm !== null ? unter(pNorm) : null, pSeite !== null ? `${prozent(pSeite)} niedriger als ${gegenseite}` : null].filter(Boolean).join('; ');
      return `ein reduziertes ${art} von ${zahl(wert)} ${einheit} (${klammer})`;
    },
    keinMsap: 'kein motorisches Antwortpotential',
    keinSnap: 'kein sensibles Nervenaktionspotential',
    latenz: (art, wert, p) => `eine verlängerte ${art} von ${zahl(wert)} ms (${ueber(p)})`,
    sensNlg: 'eine verlangsamte sensible Nervenleitgeschwindigkeit',

    // Beurteilung
    keineLaesion: 'Kein elektrophysiologischer Hinweis auf eine Plexusläsion.',
    ort: (seite, plexus, elemente) => `${seite}: Die Befunde sind vereinbar mit einer Läsion ${plexus === 'brachialis' ? 'des Plexus brachialis' : 'des Plexus lumbosacralis'} im Bereich ${elemente}.`,
    ortUnklar: (seite, plexus) => `${seite}: Auffällige Befunde im Versorgungsgebiet ${plexus === 'brachialis' ? 'des Plexus brachialis' : 'des Plexus lumbosacralis'} ohne eindeutige Zuordnung zu einem Plexusanteil.`,
    betroffen: (nerven) => `Betroffen: ${nerven.join(', ')}.`,
    alternativ: (elemente) => `Alternativ vereinbar mit einer Läsion im Bereich ${elemente}.`,
    axonal: 'Die Amplitudenminderungen sprechen für eine axonale Schädigung.',
    postganglionaer: 'Die sensiblen Potentiale im betroffenen Gebiet sind gemindert; dies spricht für eine postganglionäre Läsion (Plexus).',
    praeganglionaer: 'Die sensiblen Potentiale im betroffenen Gebiet sind erhalten; bei klinischem Sensibilitätsdefizit spricht dies für eine präganglionäre (radikuläre) Läsion.',
  };

  // "des Truncus superior und des Fasciculus lateralis"
  const genitiv = (namen) => undListe(namen.map((n) => `des ${n}`));

  // ---------- Prüfung je Nerv und Seite ----------

  function pruefeSensibel(key, seite, d, gegen, normwerte, eingabe) {
    const def = SENSIBEL[key];
    const norm = def.norm ? normwerte.sensibel[def.norm] : null;
    const teile = [];
    const details = [];
    let betroffen = false;
    let ampPath = false;

    if (da(d.amp)) {
      const pNorm = norm && da(norm.amp) && d.amp < norm.amp ? 1 - d.amp / norm.amp : null;
      const pSeite = gegen && da(gegen.amp) && gegen.amp > 0 && d.amp < (1 - SEITENGRENZE) * gegen.amp ? 1 - d.amp / gegen.amp : null;
      if (d.amp === 0) {
        teile.push(T.keinSnap);
        ampPath = true;
      } else if (pNorm !== null || pSeite !== null) {
        teile.push(T.amp('SNAP', d.amp, 'µV', pNorm, pSeite, SEITE_LANG[GEGENSEITE[seite]]));
        ampPath = true;
      }
      if (ampPath) {
        betroffen = true;
        details.push(`SNAP ${zahl(d.amp)} µV`);
      }
    }
    if (da(d.nlg) && norm) {
      const lln = normNlg(norm, eingabe.alter);
      if (da(lln) && d.nlg < lln) {
        teile.push(T.sensNlg);
        betroffen = true;
        details.push(`NLG ${zahl(d.nlg)} m/s`);
      }
    }
    return {
      art: 'sensibel', key, seite, def, betroffen, ampPath, details,
      name: `${def.name} ${SEITEN[seite]}`, nameLang: `${def.name} ${SEITE_LANG[seite]}`,
      text: teile.length ? T.satz(`${def.name} ${SEITE_LANG[seite]}`, teile) : null,
    };
  }

  function pruefeMotorisch(key, seite, d, gegen, normwerte, hinweise) {
    const def = MOTORISCH[key];
    const name = `${def.name} ${SEITE_LANG[seite]} (${def.muskel})`;
    const teile = [];
    const details = [];
    let betroffen = false;
    let ampPath = false;
    let ampNorm = null;

    if (def.proximal) {
      const norm = normwerte.proximal[def.proximal];
      ampNorm = norm.amp;
      if (da(d.latenz)) {
        const uln = normLeitzeit(norm.leitzeit, d.distanz);
        if (uln.ausserhalb) hinweise.push(`${def.name} ${SEITEN[seite]} (${def.muskel}): Distanz außerhalb der Normtabelle, gerechnet mit ${zahl(uln.wert)} ms`);
        if (d.latenz > uln.wert) {
          teile.push(T.latenz('Leitzeit', d.latenz, d.latenz / uln.wert - 1));
          betroffen = true;
          details.push(`Leitzeit ${zahl(d.latenz)} ms`);
        }
      }
    } else {
      const norm = normwerte.motorisch[def.distal];
      ampNorm = norm.amp;
      if (da(d.latenz) && da(norm.dml) && d.latenz > norm.dml) {
        teile.push(T.latenz('distal-motorische Latenz', d.latenz, d.latenz / norm.dml - 1));
        betroffen = true;
        details.push(`DML ${zahl(d.latenz)} ms`);
      }
    }

    if (da(d.amp)) {
      const pNorm = da(ampNorm) && d.amp < ampNorm ? 1 - d.amp / ampNorm : null;
      const pSeite = gegen && da(gegen.amp) && gegen.amp > 0 && d.amp < (1 - SEITENGRENZE) * gegen.amp ? 1 - d.amp / gegen.amp : null;
      if (d.amp === 0) {
        teile.unshift(T.keinMsap);
        ampPath = true;
      } else if (pNorm !== null || pSeite !== null) {
        teile.unshift(T.amp('MSAP', d.amp, 'mV', pNorm, pSeite, SEITE_LANG[GEGENSEITE[seite]]));
        ampPath = true;
      }
      if (ampPath) {
        betroffen = true;
        details.push(`MSAP ${zahl(d.amp)} mV`);
      }
    }
    return {
      art: 'motorisch', key, seite, def, betroffen, ampPath, details,
      name: `${def.name} ${SEITEN[seite]} (${def.muskel})`, nameLang: name,
      text: teile.length ? T.satz(name, teile) : null,
    };
  }

  // ---------- Läsionsort ----------

  // Kleinste Menge von Plexusanteilen einer Ebene, die alle betroffenen Nerven erklärt.
  // Gleichstand: weniger regelrechte Nerven, die vollständig in diesen Anteilen verlaufen.
  function besteErklaerung(betroffen, regelrecht, ebene, elemente) {
    const schluessel = Object.keys(elemente);
    const mengen = [];
    for (let maske = 1; maske < (1 << schluessel.length); maske++) {
      mengen.push(schluessel.filter((_, i) => maske & (1 << i)));
    }
    let beste = null;
    mengen.forEach((menge) => {
      const erklaert = betroffen.every((n) => (n.def[ebene] || []).some((e) => menge.includes(e)));
      if (!erklaert) return;
      const widerspruch = regelrecht.filter((n) => (n.def[ebene] || []).length && n.def[ebene].every((e) => menge.includes(e))).length;
      const wertung = [menge.length, widerspruch];
      if (!beste || wertung[0] < beste.wertung[0] || (wertung[0] === beste.wertung[0] && wertung[1] < beste.wertung[1])) {
        beste = { menge, wertung, namen: menge.map((e) => elemente[e]) };
      }
    });
    return beste;
  }

  function lokalisiere(nerven) {
    const ergebnisse = [];
    Object.keys(SEITEN).forEach((seite) => {
      ['brachialis', 'lumbosacralis'].forEach((plexus) => {
        const hier = nerven.filter((n) => n.seite === seite && n.def.plexus === plexus);
        const betroffen = hier.filter((n) => n.betroffen);
        if (!betroffen.length) return;
        const regelrecht = hier.filter((n) => !n.betroffen);
        const erg = { seite, plexus, betroffen, regelrecht, elemente: [], alternativ: null };

        if (plexus === 'lumbosacralis') {
          const anteile = [...new Set(betroffen.map((n) => n.def.anteil))];
          erg.elemente = anteile.map((a) => LUMBOSAKRAL[a]);
        } else {
          const trunci = besteErklaerung(betroffen, regelrecht, 'trunci', TRUNCI);
          const faszikel = besteErklaerung(betroffen, regelrecht, 'faszikel', FASZIKEL);
          // Faszikel nur, wenn sie alles erklären und nicht schlechter abschneiden als die Trunci
          const faszikelBesser = faszikel && (!trunci || faszikel.wertung[0] < trunci.wertung[0]
            || (faszikel.wertung[0] === trunci.wertung[0] && faszikel.wertung[1] < trunci.wertung[1]));
          const gewaehlt = faszikelBesser ? faszikel : trunci;
          const andere = faszikelBesser ? trunci : faszikel;
          if (gewaehlt) {
            erg.elemente = gewaehlt.menge.length === 3 && !faszikelBesser ? ['gesamten Plexus brachialis'] : gewaehlt.namen;
            if (andere && andere.wertung[0] === gewaehlt.wertung[0] && andere.wertung[1] === gewaehlt.wertung[1]) erg.alternativ = andere.namen;
          }
        }

        const sens = hier.filter((n) => n.art === 'sensibel');
        const motorBetroffen = betroffen.filter((n) => n.art === 'motorisch');
        erg.axonal = betroffen.some((n) => n.art === 'motorisch' && n.ampPath);
        if (sens.length) {
          if (betroffen.some((n) => n.art === 'sensibel' && n.ampPath)) erg.ganglion = 'post';
          else if (motorBetroffen.length) erg.ganglion = 'prae';
        }
        ergebnisse.push(erg);
      });
    });
    return ergebnisse;
  }

  // ---------- Gesamtauswertung ----------

  const untersucht = (d) => !!d && Object.values(d).some(da);

  function werteAus(eingabe, normwerte) {
    const hinweise = [];
    const sens = [];
    const motor = [];
    Object.keys(SENSIBEL).forEach((key) => Object.keys(SEITEN).forEach((seite) => {
      const d = eingabe.sensibel[`${key}-${seite}`];
      if (untersucht(d)) sens.push(pruefeSensibel(key, seite, d, eingabe.sensibel[`${key}-${GEGENSEITE[seite]}`], normwerte, eingabe));
    }));
    Object.keys(MOTORISCH).forEach((key) => Object.keys(SEITEN).forEach((seite) => {
      const d = eingabe.motorisch[`${key}-${seite}`];
      if (untersucht(d)) motor.push(pruefeMotorisch(key, seite, d, eingabe.motorisch[`${key}-${GEGENSEITE[seite]}`], normwerte, hinweise));
    }));

    const orte = lokalisiere([...sens, ...motor]);

    const warnungen = [];
    if (!da(eingabe.alter) && sens.some((n) => n.key === 'medD2')) {
      warnungen.push('Bitte Alter eingeben: Die sensible NLG des N. medianus hängt vom Alter ab und wird sonst nicht bewertet.');
    }
    const ohneGegenseite = sens.filter((n) => !n.def.norm
      && !untersucht(eingabe.sensibel[`${n.key}-${GEGENSEITE[n.seite]}`])).map((n) => n.name);
    if (ohneGegenseite.length) {
      hinweise.push(`Ohne Normwert nur im Seitenvergleich bewertbar, Gegenseite fehlt: ${ohneGegenseite.join(', ')}`);
    }
    const proxOhneAmp = motor.filter((n) => n.def.proximal && !da(normwerte.proximal[n.def.proximal].amp)
      && !untersucht(eingabe.motorisch[`${n.key}-${GEGENSEITE[n.seite]}`])).map((n) => n.name);
    if (proxOhneAmp.length) {
      hinweise.push(`MSAP ohne Normwert nur im Seitenvergleich bewertbar, Gegenseite fehlt: ${proxOhneAmp.join(', ')}`);
    }
    if (orte.some((o) => o.ganglion === 'prae')) {
      hinweise.push('Erhaltene SNAPs bei motorischen Ausfällen: Wurzelläsion erwägen; eine EMG der paravertebralen Muskulatur kann die Zuordnung klären.');
    }

    return { sens, motor, orte, warnungen, pruefhinweise: hinweise };
  }

  // ---------- Befundtext ----------

  function befundtext(eingabe, erg) {
    const z = [T.ueberschrift];
    let variante = 0;
    const abschnitt = (titel, nerven) => {
      const auff = nerven.filter((n) => n.text).map((n) => n.text);
      const normal = nerven.filter((n) => !n.text).map((n) => n.nameLang);
      if (!auff.length && !normal.length) return;
      z.push('', titel, ...auff);
      if (normal.length) z.push(T.normalSatz(normal, variante++));
    };
    abschnitt('Motorische Neurographie:', erg.motor);
    abschnitt('Sensible Neurographie:', erg.sens);

    z.push('', 'Beurteilung:');
    if (!erg.orte.length) {
      z.push(T.keineLaesion);
    } else {
      erg.orte.forEach((o) => {
        const seite = o.seite === 're' ? 'Rechts' : 'Links';
        const elemente = o.elemente[0] === 'gesamten Plexus brachialis' ? 'des gesamten Plexus brachialis' : genitiv(o.elemente);
        z.push(o.elemente.length ? T.ort(seite, o.plexus, elemente) : T.ortUnklar(seite, o.plexus));
        z.push(T.betroffen(o.betroffen.map((n) => n.name)));
        if (o.alternativ) z.push(T.alternativ(genitiv(o.alternativ)));
        if (o.axonal) z.push(T.axonal);
        if (o.ganglion === 'post') z.push(T.postganglionaer);
        if (o.ganglion === 'prae') z.push(T.praeganglionaer);
      });
    }
    return z.join('\n');
  }

  return { SENSIBEL, MOTORISCH, SEITEN, TRUNCI, FASZIKEL, normNlg, normLeitzeit, werteAus, befundtext };
})();

if (typeof module !== 'undefined') module.exports = PLEXUS;
